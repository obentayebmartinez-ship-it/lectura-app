// ─── LectorIA · configuración compartida ─────────────────────────────────────
// Proyecto de Supabase (julio 2026). Este archivo lo cargan todas las páginas;
// las claves solo se cambian aquí. La publishable key es pública por diseño:
// la seguridad la aporta el RLS de la base de datos.
const SUPABASE_URL = "https://smmnrxcpgynkrqaaogie.supabase.co";
const SUPABASE_KEY = "sb_publishable_AaNY-lUFZOtL13_W_QQ0nw_SPp-5Nj8";

// Objetivo de velocidad lectora (palabras/minuto) por curso
const OBJETIVOS_PPM = { "1P": 65, "2P": 90, "3P": 105, "4P": 115, "5P": 125, "6P": 135 };

// Motor de reconocimiento propio (Whisper local) — sustituye a Azure Speech.
// El navegador graba la lectura completa y la manda aquí; el servidor devuelve
// las palabras con timestamps (misma forma que usaba Azure) y motor.js analiza.
// PRODUCCIÓN: servidor Whisper en el PC del autor, expuesto por Cloudflare Tunnel.
// (Para desarrollo local, cambia temporalmente a "http://127.0.0.1:8000".)
const WHISPER_API_URL = "https://whisper.lectometro.com";
