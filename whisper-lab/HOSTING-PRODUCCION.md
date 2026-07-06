# Hosting de producción · Whisper en tu PC + Cloudflare Tunnel

Objetivo: que la app de Vercel (HTTPS) hable con el servidor Whisper que corre en
**tu ordenador**, sin abrir puertos del router y sin mixed-content. Coste: solo el
dominio (~10 €/año). Cloudflare Tunnel es gratis.

```
Navegador del docente ──HTTPS──> whisper.tudominio.com (Cloudflare)
                                        │  (túnel cifrado saliente)
                                        ▼
                           cloudflared en TU PC ──> 127.0.0.1:8000 (servidor.py)
```

`cloudflared` ya está instalado (winget · Cloudflare.cloudflared).

---

## 1. Dominio en Cloudflare (una sola vez)

1. Registra un dominio (donde quieras) si no tienes.
2. En https://dash.cloudflare.com → **Add a site** → escribe tu dominio → plan **Free**.
3. Cloudflare te da 2 *nameservers*. Ponlos en tu registrador (donde compraste el
   dominio), sustituyendo los que tenía. Tarda de minutos a unas horas en activarse.
4. Cuando el dominio aparezca como **Active** en Cloudflare, sigue.

## 2. Crear el túnel (una sola vez)

Abre PowerShell y ejecuta:

```powershell
cloudflared tunnel login
```
Se abre el navegador → elige tu dominio → Authorize. Guarda un certificado en
`C:\Users\obent\.cloudflared\cert.pem`.

```powershell
cloudflared tunnel create lectoria-whisper
```
Crea el túnel y un fichero de credenciales `C:\Users\obent\.cloudflared\<UUID>.json`.
Apunta el **UUID** que imprime.

```powershell
cloudflared tunnel route dns lectoria-whisper whisper.tudominio.com
```
Crea el registro DNS que apunta ese subdominio al túnel.

## 3. Configurar el túnel

Copia `config-tunel.ejemplo.yml` (de esta carpeta) a
`C:\Users\obent\.cloudflared\config.yml` y rellena el **UUID** y tu **subdominio**
(`whisper.tudominio.com`). El `service` debe quedar en `http://127.0.0.1:8000`.

## 4. Arrancar (cada vez que quieras dar servicio)

Necesitas **dos procesos** encendidos a la vez. Deja tu PC encendido mientras algún
docente vaya a leer.

**Terminal A — servidor Whisper:**
```powershell
cd C:\Users\obent\lectura-app\whisper-lab
.\arrancar-produccion.ps1
```
Antes de la primera vez, edita `arrancar-produccion.ps1` y pon en `ALLOWED_ORIGINS`
la URL real de tu app en Vercel. Espera a ver `[whisper] modelo listo`.

**Terminal B — túnel:**
```powershell
cloudflared tunnel run lectoria-whisper
```

Comprueba desde cualquier sitio que responde:
`https://whisper.tudominio.com/salud` → `{"ok": true, ...}`

## 5. (Opcional) Que arranque solo con Windows

Para no lanzarlo a mano, instala el túnel como servicio de Windows:
```powershell
cloudflared service install
```
Y crea una tarea programada que ejecute `arrancar-produccion.ps1` al iniciar sesión
(Programador de tareas → Crear tarea básica → Al iniciar sesión).

---

## Seguridad

- `/evaluar` **exige un JWT de Supabase válido** (lo verifica contra
  `${SUPABASE_URL}/auth/v1/user`). Sin sesión → 401. El frontend lo manda solo.
- CORS restringido a `ALLOWED_ORIGINS` (tu dominio de Vercel). Otras webs no pueden
  usar tu servidor desde el navegador.
- El túnel es **saliente**: no abres ningún puerto de tu router.

## Qué falta para "encender" producción

Cuando el `/salud` responda por HTTPS:
1. Pon `https://whisper.tudominio.com` en `config.js` → `WHISPER_API_URL`.
2. Fusiona la rama `whisper-local` en `main` y haz push (Vercel despliega solo).

Hasta entonces, producción sigue con el código viejo y no se rompe nada.
