# LectorIA · Whisper local (sustituye a Azure)

Reconocimiento de lectura **100% local**, imaginación 0, coste ~0.

## Arrancar (necesitas los DOS servidores)

**1. Servidor Whisper** (transcribe el audio):
```
cd C:\Users\obent\lectura-app\whisper-lab
.\.venv\Scripts\python.exe -m uvicorn servidor:app --host 127.0.0.1 --port 8000
```
Espera a ver `[whisper] modelo listo` (la 1ª vez tarda unos segundos).

**2. Servir la app** (en otra terminal):
```
python -m http.server 5500 --directory C:\Users\obent\lectura-app
```
Abre http://localhost:5500/index.html , inicia sesión y lee.

## Flujo
1. El navegador graba la lectura completa (MediaRecorder).
2. Al terminar, envía el audio a `POST http://127.0.0.1:8000/evaluar`.
3. El servidor devuelve `allWords` con la forma de Azure
   (`Word/Offset/Duration/PronunciationAssessment.AccuracyScore`).
4. `motor.js` (sin cambios) alinea contra el texto y puntúa.

## Piezas
- `servidor.py`   — API FastAPI (lo que usa la app). Config anti-alucinación.
- `evaluar.py`    — evaluador de línea de comandos (transcribe + compara).
- `transcribir.py`— transcripción cruda de un audio.
- `record.py`     — graba un WAV por micro para pruebas.

## Pendiente para PRODUCCIÓN
La app en Vercel apunta a `http://127.0.0.1:8000` (ver `config.js` →
`WHISPER_API_URL`). En producción hay que hospedar este servidor en un sitio
alcanzable (VPS con GPU / servidor casero con túnel) y poner esa URL ahí, más
verificación de sesión Supabase en el endpoint. **No desplegar a Vercel hasta
entonces**, o los usuarios reales no tendrán reconocimiento.

## Modelo / rendimiento
- `medium` en **GPU** (RTX 3050, CUDA) por defecto → ~1-2 s por lectura, usa
  ~0.8 GB de los 4 GB de VRAM. En CPU serian ~8-9 s.
- Las librerias CUDA (cuBLAS/cuDNN 9) estan como paquetes pip en el venv
  (`nvidia-cublas-cu12`, `nvidia-cudnn-cu12`); `servidor.py` registra sus DLLs
  al arrancar (`_registrar_dlls_cuda`). No hace falta instalar el CUDA Toolkit.
- Si la GPU diera problemas, cambia `WHISPER_DEVICE` a `cpu` en el lanzador.
- `large-v3` (mas preciso) NO cabe en 4 GB de GPU; se quedaria en CPU.
- Diagnostico rapido de GPU: `.venv\Scripts\python.exe test_gpu.py`.
