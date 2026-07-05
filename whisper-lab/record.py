"""
Graba desde el microfono y guarda un WAV 16kHz mono (lo que quiere Whisper).

Uso:
    python record.py [segundos] [nombre.wav]
    python record.py 8               -> graba 8s en grabacion.wav
    python record.py 10 prueba.wav   -> graba 10s en prueba.wav
"""
import os
import sys
import wave
import sounddevice as sd

# Guardar SIEMPRE junto a este script (carpeta whisper-lab), da igual desde donde se ejecute
AQUI = os.path.dirname(os.path.abspath(__file__))
segs = int(sys.argv[1]) if len(sys.argv) > 1 else 8
nombre = sys.argv[2] if len(sys.argv) > 2 else "grabacion.wav"
nombre = os.path.join(AQUI, nombre)
SR = 16000

print(f"\n>>> Grabando {segs}s... EMPIEZA A LEER YA <<<\n")
audio = sd.rec(int(segs * SR), samplerate=SR, channels=1, dtype="int16")
sd.wait()
print(">>> Grabacion terminada <<<")

with wave.open(nombre, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(audio.tobytes())

print(f"Guardado: {nombre}")
