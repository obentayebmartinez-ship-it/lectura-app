# Arranca el servidor Whisper de LectorIA en modo PRODUCCION.
# Fija las variables de entorno necesarias y lanza uvicorn.
#   Uso:  .\arrancar-produccion.ps1
# El servidor escucha en 127.0.0.1:8000; Cloudflare Tunnel lo expone por HTTPS.

# --- Supabase (para verificar la sesion del docente en /evaluar) ---
# Son los MISMOS valores publicos que config.js (la anon/publishable key es publica).
$env:SUPABASE_URL      = "https://smmnrxcpgynkrqaaogie.supabase.co"
$env:SUPABASE_ANON_KEY = "sb_publishable_AaNY-lUFZOtL13_W_QQ0nw_SPp-5Nj8"

# --- CORS: dominio(s) desde los que se sirve la app (coma-separados) ---
# Origenes de la app (coma-separados, sin barra final). Prod Vercel + local para pruebas.
$env:ALLOWED_ORIGINS   = "https://lectura-app-ivory.vercel.app,http://localhost:5500"

# --- Modelo / dispositivo ---
# medium en CPU int8 (~8-9 s/lectura). Si algun dia montas GPU: WHISPER_DEVICE=cuda
$env:WHISPER_MODEL     = "medium"
$env:WHISPER_DEVICE    = "cpu"

Write-Host "[LectorIA] Origenes CORS permitidos: $($env:ALLOWED_ORIGINS)" -ForegroundColor Cyan
& "$PSScriptRoot\.venv\Scripts\python.exe" -m uvicorn servidor:app --host 127.0.0.1 --port 8000
