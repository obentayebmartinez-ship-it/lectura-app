"""
Servidor Whisper local para LectorIA — sustituye a Azure Speech.

Recibe el audio de una lectura (POST /evaluar) y devuelve las palabras
transcritas A CIEGAS con la MISMA forma que Azure producia, para que
motor.js las consuma sin cambiar ni una linea:

    { "allWords": [ { "Word", "Offset", "Duration",
                      "PronunciationAssessment": { "AccuracyScore", "ErrorType" } } ],
      "duracion": <segundos> }

  - Offset/Duration en ticks de 100 ns (como Azure).
  - AccuracyScore = probabilidad de Whisper * 100 (proxy de confianza).
  - ErrorType = "None": la deteccion de errores la hace el alineamiento NW
    de motor.js sobre el texto transcrito a ciegas.

Arranque:
    .venv\\Scripts\\python.exe -m uvicorn servidor:app --host 127.0.0.1 --port 8000
"""
import os
import tempfile
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

MODEL_NAME = os.environ.get("WHISPER_MODEL", "medium")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE = "int8" if DEVICE == "cpu" else "int8_float16"
TICKS = 10_000_000  # 1 s = 10.000.000 ticks de 100 ns (como Azure)

# --- Verificacion de sesion (Supabase) ---
# El endpoint /evaluar exige un JWT de Supabase valido, igual que hacia
# api/azure-token.js: se valida contra ${SUPABASE_URL}/auth/v1/user.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
# Origenes permitidos para CORS (coma-separados). En produccion pon el dominio
# de la app (p.ej. https://lectoria.vercel.app). Por defecto, desarrollo local.
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500",
    ).split(",") if o.strip()
]

print(f"[whisper] cargando modelo={MODEL_NAME} device={DEVICE} compute={COMPUTE} ...")
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE)
print("[whisper] modelo listo")
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("[whisper] AVISO: SUPABASE_URL/SUPABASE_ANON_KEY sin definir → /evaluar "
          "rechazara todo. Definelas antes de exponer el servidor.")

app = FastAPI(title="LectorIA Whisper API")

# CORS restringido a los origenes de la app (evita que otras webs usen tu servidor).
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


async def verificar_sesion(authorization: str = Header(default="")):
    """Valida el JWT de Supabase del header Authorization. Lanza 401 si no vale."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="servidor sin configurar (Supabase)")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="falta el token de sesion")
    token = authorization[7:].strip()
    try:
        async with httpx.AsyncClient(timeout=10) as cliente:
            r = await cliente.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="no se pudo verificar la sesion")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="sesion invalida o caducada")
    return r.json()  # datos del usuario (id, email, ...)


@app.get("/salud")
def salud():
    return {"ok": True, "modelo": MODEL_NAME, "device": DEVICE}


@app.post("/evaluar")
async def evaluar(audio: UploadFile = File(...), usuario: dict = Depends(verificar_sesion)):
    datos = await audio.read()
    if not datos:
        raise HTTPException(status_code=400, detail="audio vacio")

    # Guardar a temporal: PyAV/ffmpeg decodifica webm/opus, wav, m4a, etc.
    sufijo = os.path.splitext(audio.filename or "")[1] or ".webm"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=sufijo)
    try:
        tmp.write(datos)
        tmp.close()

        segments, info = model.transcribe(
            tmp.name,
            language="es",
            task="transcribe",
            beam_size=5,
            # --- ANTI-ALUCINACION (imaginacion 0) ---
            temperature=0,
            condition_on_previous_text=False,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            hallucination_silence_threshold=2.0,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
            # SIN initial_prompt: transcribe lo real, no "lee por el alumno"
            word_timestamps=True,
        )

        all_words = []
        for seg in segments:
            for w in (seg.words or []):
                texto = w.word.strip()
                if not texto:
                    continue
                all_words.append({
                    "Word": texto,
                    "Offset": round(w.start * TICKS),
                    "Duration": round(max(w.end - w.start, 0) * TICKS),
                    "PronunciationAssessment": {
                        "AccuracyScore": round((w.probability or 0) * 100),
                        "ErrorType": "None",
                    },
                })

        return {"allWords": all_words, "duracion": round(info.duration, 2)}
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
