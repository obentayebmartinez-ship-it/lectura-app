// api/azure-token.js — emite tokens temporales de Azure Speech.
// PROTEGIDO: exige un token de sesión de Supabase válido. Sin login en
// LectorIA nadie puede pedir tokens (y por tanto nadie puede gastar Azure).
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verificar la sesión de Supabase del que llama
    const auth = req.headers.authorization || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) {
      return res.status(401).json({ error: "No autorizado: falta sesión" });
    }

    const verificacion = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: process.env.SUPABASE_ANON_KEY
      }
    });
    if (!verificacion.ok) {
      return res.status(401).json({ error: "No autorizado: sesión no válida" });
    }

    // 2. Emitir el token temporal de Azure (la clave nunca sale del backend)
    const response = await fetch(
      `https://${process.env.AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
          "Content-Length": "0"
        }
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const token = await response.text();
    res.status(200).json({ token, region: process.env.AZURE_REGION });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
