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
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

MODEL_NAME = os.environ.get("WHISPER_MODEL", "medium")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE = "int8" if DEVICE == "cpu" else "int8_float16"
TICKS = 10_000_000  # 1 s = 10.000.000 ticks de 100 ns (como Azure)

print(f"[whisper] cargando modelo={MODEL_NAME} device={DEVICE} compute={COMPUTE} ...")
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE)
print("[whisper] modelo listo")

app = FastAPI(title="LectorIA Whisper API")

# CORS abierto para desarrollo local (frontend en localhost).
# En produccion: restringir a tu dominio y anadir verificacion de sesion.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/salud")
def salud():
    return {"ok": True, "modelo": MODEL_NAME, "device": DEVICE}


@app.post("/evaluar")
async def evaluar(audio: UploadFile = File(...)):
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
