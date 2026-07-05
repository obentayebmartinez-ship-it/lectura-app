"""
Evaluador de lectura: transcribe A CIEGAS y compara vs texto esperado.
Detecta omisiones, sustituciones e inventadas + fluidez (palabras/min).

Uso:
    python evaluar.py <audio> "<texto esperado>" [--model medium] [--device cpu]
"""
import sys
import argparse
import unicodedata
import re
from difflib import SequenceMatcher
from faster_whisper import WhisperModel


def normaliza(txt):
    """minusculas, sin puntuacion; conserva tildes y ñ (son fonemas reales)."""
    txt = txt.lower()
    txt = re.sub(r"[^\wáéíóúüñ\s]", " ", txt, flags=re.UNICODE)
    return txt.split()


def transcribe(audio, model_name, device, lang):
    compute = "int8" if device == "cpu" else "int8_float16"
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, info = model.transcribe(
        audio, language=lang, task="transcribe", beam_size=5,
        temperature=0, condition_on_previous_text=False,
        vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
        hallucination_silence_threshold=2.0, no_speech_threshold=0.6,
        log_prob_threshold=-1.0, compression_ratio_threshold=2.4,
        word_timestamps=True,
    )
    palabras = []
    for seg in segments:
        if seg.words:
            palabras.extend(seg.words)
    return palabras


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("esperado")
    ap.add_argument("--model", default="medium")
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    ap.add_argument("--lang", default="es")
    args = ap.parse_args()

    palabras = transcribe(args.audio, args.model, args.device, args.lang)
    leidas_raw = [w.word.strip() for w in palabras]
    leidas = normaliza(" ".join(leidas_raw))
    esperado = normaliza(args.esperado)

    # Alineacion palabra a palabra
    sm = SequenceMatcher(a=esperado, b=leidas, autojunk=False)
    correctas, omisiones, sustituciones, inventadas = 0, [], [], []
    detalle = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i1, i2):
                correctas += 1
                detalle.append(("OK", esperado[k], esperado[k]))
        elif tag == "delete":                       # esperada pero no leida
            for k in range(i1, i2):
                omisiones.append(esperado[k])
                detalle.append(("OMISION", esperado[k], "—"))
        elif tag == "insert":                        # leida pero no esperada
            for k in range(j1, j2):
                inventadas.append(leidas[k])
                detalle.append(("INVENTADA", "—", leidas[k]))
        elif tag == "replace":                        # cambiada
            exp = esperado[i1:i2]
            got = leidas[j1:j2]
            for a, b in zip(exp, got):
                sustituciones.append((a, b))
                detalle.append(("SUSTITUCION", a, b))
            for a in exp[len(got):]:
                omisiones.append(a); detalle.append(("OMISION", a, "—"))
            for b in got[len(exp):]:
                inventadas.append(b); detalle.append(("INVENTADA", "—", b))

    total_esp = len(esperado)
    errores = len(omisiones) + len(sustituciones) + len(inventadas)
    precision = 100 * correctas / total_esp if total_esp else 0

    # Fluidez: palabras correctas por minuto (usa el tramo real de habla)
    ppm = None
    if palabras:
        span = palabras[-1].end - palabras[0].start
        if span > 0:
            ppm = correctas / (span / 60)

    # Confianza media (senal de calidad acustica / posibles errores)
    conf = sum(w.probability for w in palabras) / len(palabras) if palabras else 0

    print("=" * 64)
    print("EVALUACION DE LECTURA")
    print("=" * 64)
    print(f"Esperado : {' '.join(esperado)}")
    print(f"Leido    : {' '.join(leidas)}")
    print("-" * 64)
    print("ALINEACION:")
    for tag, exp, got in detalle:
        if tag == "OK":
            print(f"  ✓ {exp}")
        elif tag == "OMISION":
            print(f"  ✗ OMISION      → falta '{exp}'")
        elif tag == "SUSTITUCION":
            print(f"  ✗ SUSTITUCION  → esperaba '{exp}', dijo '{got}'")
        elif tag == "INVENTADA":
            print(f"  ✗ INVENTADA    → dijo '{got}' (no estaba)")
    print("-" * 64)
    print(f"Palabras esperadas : {total_esp}")
    print(f"Correctas          : {correctas}")
    print(f"Omisiones          : {len(omisiones)}")
    print(f"Sustituciones      : {len(sustituciones)}")
    print(f"Inventadas         : {len(inventadas)}")
    print(f"PRECISION          : {precision:.1f}%")
    if ppm is not None:
        print(f"FLUIDEZ            : {ppm:.0f} palabras correctas/min")
    print(f"Confianza acustica : {conf:.2f}")
    print("=" * 64)


if __name__ == "__main__":
    main()
