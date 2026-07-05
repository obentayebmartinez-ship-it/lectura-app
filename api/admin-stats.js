// api/admin-stats.js — datos GLOBALES de toda la plataforma para el panel de
// administración. Salta el RLS con la service_role key (que vive SOLO aquí, en
// las variables de entorno de Vercel, nunca en el navegador).
//
// Seguridad: exige un token de sesión de Supabase válido Y que el email del que
// llama esté en ADMIN_EMAILS. Cualquier otro usuario recibe 403.
//
// Variables de entorno necesarias en Vercel (además de las que ya usa
// azure-token.js):
//   SUPABASE_URL          (ya existe)
//   SUPABASE_ANON_KEY     (ya existe)
//   SUPABASE_SERVICE_KEY  ← NUEVA: la clave "service_role" del proyecto Supabase
//   ADMIN_EMAILS          ← NUEVA: emails de admin separados por comas
//
// Devuelve { usuarios, alumnos, sesiones } con los datos de TODOS los usuarios.
// PRIVACIDAD: solo los USUARIOS (profesionales) llevan nombre/email. De los
// alumnos NO se devuelve el nombre — únicamente su id seudonimizado, curso y
// métricas, en línea con la política de seudonimización de la plataforma.

const REST_PAGE = 1000;

async function fetchAllRest(base, key, pathAndQuery) {
  const rows = [];
  for (let from = 0; ; from += REST_PAGE) {
    const sep = pathAndQuery.includes("?") ? "&" : "?";
    const r = await fetch(`${base}/rest/v1/${pathAndQuery}${sep}limit=${REST_PAGE}&offset=${from}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!r.ok) throw new Error(`REST ${pathAndQuery}: ${r.status} ${await r.text()}`);
    const chunk = await r.json();
    rows.push(...chunk);
    if (chunk.length < REST_PAGE) break;
  }
  return rows;
}

async function fetchUsuarios(base, key) {
  const usuarios = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!r.ok) throw new Error(`admin/users: ${r.status} ${await r.text()}`);
    const data = await r.json();
    const list = data.users || data || [];
    usuarios.push(...list.map(u => ({
      id: u.id,
      email: u.email,
      nombre: (u.user_metadata && u.user_metadata.nombre) || null,
      creado: u.created_at,
      ultimo_acceso: u.last_sign_in_at || null
    })));
    if (list.length < 200) break;
  }
  return usuarios;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const base = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const faltan = [];
    if (!base) faltan.push("SUPABASE_URL");
    if (!serviceKey) faltan.push("SUPABASE_SERVICE_KEY");
    if (!process.env.SUPABASE_ANON_KEY) faltan.push("SUPABASE_ANON_KEY");
    if (!process.env.ADMIN_EMAILS) faltan.push("ADMIN_EMAILS");
    if (faltan.length) {
      return res.status(500).json({ error: "Faltan estas variables de entorno en Vercel: " + faltan.join(", ") });
    }

    // 1. Verificar la sesión de Supabase del que llama
    const auth = req.headers.authorization || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) return res.status(401).json({ error: "No autorizado: falta sesión" });

    const uResp = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: process.env.SUPABASE_ANON_KEY }
    });
    if (!uResp.ok) return res.status(401).json({ error: "No autorizado: sesión no válida" });
    const usuario = await uResp.json();

    // 2. Comprobar que es administrador
    const admins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const email = (usuario.email || "").toLowerCase();
    if (!admins.length || !admins.includes(email)) {
      return res.status(403).json({ error: "Esta cuenta no tiene acceso de administrador" });
    }

    // 3. Con la service_role key (salta el RLS) traemos TODO, pero SIN nombres
    //    de alumnos (solo id seudonimizado, curso y métricas).
    const COLS_SES = [
      "id", "user_id", "alumno_id", "curso", "texto_id", "texto_titulo",
      "ppm", "precision", "fluency", "prosody",
      "omisiones", "sustituciones", "adiciones", "inversiones",
      "repeticiones", "rectificaciones", "vacilaciones", "pausas_largas",
      "duracion_segundos", "estado", "niveles", "fecha"
    ].join(",");
    const [usuarios, alumnos, sesiones] = await Promise.all([
      fetchUsuarios(base, serviceKey),
      fetchAllRest(base, serviceKey, "alumnos?select=id,user_id,curso,creado"),
      fetchAllRest(base, serviceKey, `sesiones?select=${COLS_SES}&order=fecha.asc`)
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ usuarios, alumnos, sesiones });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
