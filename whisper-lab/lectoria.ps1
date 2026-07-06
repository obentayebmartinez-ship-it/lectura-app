<#
  Control de encendido/apagado del servicio LectorIA (Whisper + tunel Cloudflare).
  Uso:  lectoria.ps1 encender | apagar | estado
  Pensado para llamarse desde los accesos directos del escritorio.
#>
param([ValidateSet('encender','apagar','estado')][string]$Accion = 'estado')

$ErrorActionPreference = 'SilentlyContinue'
$Cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$LabDir      = 'C:\Users\obent\lectura-app\whisper-lab'
$Python      = Join-Path $LabDir '.venv\Scripts\python.exe'
$SaludLocal  = 'http://127.0.0.1:8000/salud'
$SaludTunel  = 'https://whisper.lectometro.com/salud'

# Configuracion del servidor (misma que arrancar-produccion.ps1). La anon key es
# publica (igual que en config.js). Cambia ALLOWED_ORIGINS si mueves el dominio.
$env:SUPABASE_URL      = 'https://smmnrxcpgynkrqaaogie.supabase.co'
$env:SUPABASE_ANON_KEY = 'sb_publishable_AaNY-lUFZOtL13_W_QQ0nw_SPp-5Nj8'
$env:ALLOWED_ORIGINS   = 'https://lectura-app-ivory.vercel.app,http://localhost:5500'
$env:WHISPER_MODEL     = 'medium'
$env:WHISPER_DEVICE    = 'cpu'

function Puerto8000Ocupado {
  [bool](Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)
}
function TunelVivo {
  [bool](Get-Process cloudflared -ErrorAction SilentlyContinue)
}
function ProbarSalud($url) {
  try { $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8; return ($r.StatusCode -eq 200) }
  catch { return $false }
}

function Encender {
  Write-Host ""
  Write-Host "  Encendiendo LectorIA..." -ForegroundColor Cyan

  if (Puerto8000Ocupado) {
    Write-Host "  - Servidor Whisper: ya estaba encendido." -ForegroundColor DarkGray
  } else {
    # Lanzamos python (uvicorn) directamente; hereda las variables $env de arriba.
    Start-Process -FilePath $Python -WorkingDirectory $LabDir -WindowStyle Minimized `
      -ArgumentList '-m','uvicorn','servidor:app','--host','127.0.0.1','--port','8000'
    Write-Host "  - Servidor Whisper: arrancando (ventana minimizada)."
  }

  if (TunelVivo) {
    Write-Host "  - Tunel Cloudflare: ya estaba encendido." -ForegroundColor DarkGray
  } else {
    Start-Process $Cloudflared -WindowStyle Minimized `
      -ArgumentList 'tunnel','run','lectoria-whisper'
    Write-Host "  - Tunel Cloudflare: arrancando (ventana minimizada)."
  }

  Write-Host ""
  Write-Host "  Esperando a que el modelo cargue (puede tardar ~30 s la 1a vez)..." -ForegroundColor Yellow
  $listo = $false
  for ($i = 0; $i -lt 45; $i++) {
    if (ProbarSalud $SaludLocal) { $listo = $true; break }
    Start-Sleep -Seconds 2
  }

  Write-Host ""
  if ($listo) {
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "     LectorIA ENCENDIDO y listo para leer" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
    if (ProbarSalud $SaludTunel) {
      Write-Host "     Acceso publico HTTPS: OK" -ForegroundColor Green
    } else {
      Write-Host "     Aviso: el tunel aun no responde por HTTPS; reintenta en unos segundos." -ForegroundColor Yellow
    }
  } else {
    Write-Host "  El servidor no respondio a tiempo. Mira la ventana minimizada" -ForegroundColor Red
    Write-Host "  'arrancar-produccion' por si dio algun error." -ForegroundColor Red
  }
}

function Apagar {
  Write-Host ""
  Write-Host "  Apagando LectorIA..." -ForegroundColor Cyan

  # Servidor Whisper: matar el proceso que escucha en el 8000 (y su ventana).
  $paradoWhisper = $false
  foreach ($c in (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    $paradoWhisper = $true
  }
  # Procesos que aun estan cargando el modelo (uvicorn) o el lanzador manual.
  Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='powershell.exe'" |
    Where-Object { $_.CommandLine -like '*uvicorn servidor:app*' -or $_.CommandLine -like '*arrancar-produccion.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $script:paradoWhisper = $true }
  Write-Host ("  - Servidor Whisper: " + $(if ($paradoWhisper) {'apagado.'} else {'no estaba encendido.'}))

  # Tunel.
  $t = Get-Process cloudflared -ErrorAction SilentlyContinue
  if ($t) { $t | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Host "  - Tunel Cloudflare: apagado." }
  else    { Write-Host "  - Tunel Cloudflare: no estaba encendido." }

  Write-Host ""
  Write-Host "  LectorIA APAGADO. (Ya puedes cerrar / apagar el portatil.)" -ForegroundColor Green
}

function Estado {
  Write-Host ""
  Write-Host "  Estado de LectorIA:" -ForegroundColor Cyan
  $w = Puerto8000Ocupado
  $t = TunelVivo
  Write-Host ("  - Servidor Whisper (puerto 8000): " + $(if ($w) {'ENCENDIDO'} else {'apagado'})) -ForegroundColor $(if ($w) {'Green'} else {'DarkGray'})
  Write-Host ("  - Tunel Cloudflare:               " + $(if ($t) {'ENCENDIDO'} else {'apagado'})) -ForegroundColor $(if ($t) {'Green'} else {'DarkGray'})
  if ($w) { Write-Host ("  - /salud local:  " + $(if (ProbarSalud $SaludLocal) {'OK'} else {'sin respuesta'})) }
  if ($t) { Write-Host ("  - /salud HTTPS:  " + $(if (ProbarSalud $SaludTunel) {'OK'} else {'sin respuesta'})) }
}

switch ($Accion) {
  'encender' { Encender }
  'apagar'   { Apagar }
  default    { Estado }
}
