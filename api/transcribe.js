// api/transcribe.js
export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Recogemos el body en bruto (FormData con el audio)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'];

    // Llamamos a Whisper con la key guardada en Vercel (invisible para el usuario)
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': contentType,
      },
      body: buffer,
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Error en /api/transcribe:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}