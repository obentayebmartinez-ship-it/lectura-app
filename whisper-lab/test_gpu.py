"""Prueba de GPU para faster-whisper. NO toca el servidor de produccion.
Carga el modelo en CUDA y transcribe un wav de muestra, midiendo el tiempo."""
import os, sys, glob, time

# --- Localizar y registrar los DLLs de CUDA (cublas/cudnn/nvrtc) del venv ---
# En Windows hay que anadir estas carpetas ANTES de importar ctranslate2.
base = os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "nvidia")
dll_dirs = []
for sub in ("cublas", "cudnn", "cuda_nvrtc", "cuda_runtime"):
    d = os.path.join(base, sub, "bin")
    if os.path.isdir(d):
        ad = os.path.abspath(d)
        os.add_dll_directory(ad)
        os.environ["PATH"] = ad + os.pathsep + os.environ.get("PATH", "")
        dll_dirs.append(ad)
print("[gpu] carpetas DLL anadidas:")
for d in dll_dirs:
    print("   ", d, "->", [os.path.basename(x) for x in glob.glob(os.path.join(d, "*.dll"))][:4], "...")

from faster_whisper import WhisperModel

MODEL = os.environ.get("WHISPER_MODEL", "medium")
COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8_float16")
wav = sys.argv[1] if len(sys.argv) > 1 else "lectura_test.wav"

print(f"\n[gpu] cargando {MODEL} en CUDA (compute={COMPUTE}) ...")
t0 = time.time()
model = WhisperModel(MODEL, device="cuda", compute_type=COMPUTE)
print(f"[gpu] modelo cargado en {time.time()-t0:.1f}s")

print(f"[gpu] transcribiendo {wav} ...")
t1 = time.time()
segments, info = model.transcribe(wav, language="es", beam_size=5,
                                  temperature=0, vad_filter=True, word_timestamps=True)
palabras = [w.word.strip() for seg in segments for w in (seg.words or [])]
dt = time.time() - t1
print(f"[gpu] transcrito en {dt:.2f}s  (audio {info.duration:.1f}s)")
print("[gpu] texto:", " ".join(palabras))
