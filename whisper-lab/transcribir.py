"""
Transcripcion "imaginacion 0" con faster-whisper.
Pensado para evaluar lectura: transcribe A CIEGAS lo que suena
(sin pistas del texto esperado) y saca timestamps + probabilidad por palabra.

Uso:
    python transcribir.py <ruta_audio> [--model medium] [--device cpu]

Ideas clave de la config anti-alucinacion (ver abajo):
  - temperature=0                 -> nada de creatividad / muestreo
  - condition_on_previous_text=F  -> no inventa a partir del contexto previo
  - vad_filter=True               -> recorta silencios (donde mas alucina)
  - hallucination_silence_threshold -> se salta huecos silenciosos sospechosos
  - SIN initial_prompt del texto  -> no "lee por el nino"; transcribe lo real
"""

import sys
import argparse
import time
from faster_whisper import WhisperModel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", help="ruta al archivo de audio (wav/mp3/m4a/...)")
    ap.add_argument("--model", default="medium",
                    help="tiny|base|small|medium|large-v3 (def: medium)")
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"],
                    help="cpu (def) o cuda")
    ap.add_argument("--lang", default="es")
    args = ap.parse_args()

    compute = "int8" if args.device == "cpu" else "int8_float16"
    print(f"[carga] modelo={args.model} device={args.device} compute={compute}")
    t0 = time.time()
    model = WhisperModel(args.model, device=args.device, compute_type=compute)
    print(f"[carga] listo en {time.time()-t0:.1f}s\n")

    t0 = time.time()
    segments, info = model.transcribe(
        args.audio,
        language=args.lang,
        task="transcribe",
        beam_size=5,
        # --- ANTI-ALUCINACION ---
        temperature=0,                       # sin muestreo, salida determinista
        condition_on_previous_text=False,    # no arrastra contexto inventado
        vad_filter=True,                     # Silero VAD: fuera silencios
        vad_parameters=dict(min_silence_duration_ms=500),
        hallucination_silence_threshold=2.0, # salta huecos silenciosos > 2s
        no_speech_threshold=0.6,             # descarta segmentos "sin voz"
        log_prob_threshold=-1.0,             # descarta baja confianza
        compression_ratio_threshold=2.4,     # descarta texto repetitivo/inventado
        # initial_prompt=None  -> IMPORTANTE: NO le damos el texto esperado
        word_timestamps=True,
    )

    print(f"[info] idioma detectado: {info.language} "
          f"(prob {info.language_probability:.2f}) | "
          f"duracion audio: {info.duration:.1f}s\n")

    texto_total = []
    palabras = []
    for seg in segments:
        texto_total.append(seg.text.strip())
        if seg.words:
            palabras.extend(seg.words)

    texto = " ".join(t for t in texto_total if t).strip()
    print("=" * 60)
    print("TRANSCRIPCION (a ciegas):")
    print(texto if texto else "  <<VACIO>>  (no detecto voz -> imaginacion 0 OK)")
    print("=" * 60)

    if palabras:
        print("\nPALABRA A PALABRA  [inicio-fin s | prob]:")
        for w in palabras:
            print(f"  {w.start:6.2f}-{w.end:6.2f} | {w.probability:.2f} | {w.word.strip()}")
        media = sum(w.probability for w in palabras) / len(palabras)
        print(f"\n  {len(palabras)} palabras | confianza media {media:.2f}")

    print(f"\n[tiempo] transcripcion en {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
