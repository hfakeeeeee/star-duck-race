"""Render three original rubber-duck calls (no external recordings)."""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 32000
DEST = Path(__file__).resolve().parents[1] / "public" / "audio"


def render(name, duration, syllables):
    samples = [0.0] * round(duration * RATE)
    rng = random.Random(name)
    for start, length, high, low, rebound in syllables:
        phase = 0.0
        for i in range(round(length * RATE)):
            t = i / RATE
            u = t / length
            pitch = low + (high - low) * math.exp(-u * 7) + rebound * u ** 3
            pitch *= 1 + .025 * math.sin(2 * math.pi * 24 * t)
            phase += 2 * math.pi * pitch / RATE
            # Moving nasal vowel resonances produce a toy-duck "wah".
            f1 = 1000 - 400 * u + 100 * math.sin(math.pi * u)
            f2 = 2200 - 500 * u
            value = 0.0
            for harmonic in range(1, 31):
                hz = harmonic * pitch
                weight = (.12 + 1.8 * math.exp(-((hz - f1) / 330) ** 2)
                          + .6 * math.exp(-((hz - f2) / 500) ** 2)) / harmonic ** .8
                value += weight * math.sin(harmonic * phase)
            envelope = min(1, t / .007) * min(1, (length - t) / .045)
            envelope *= (.8 + .2 * math.sin(math.pi * u)) * math.exp(-.5 * u)
            index = round(start * RATE) + i
            if index < len(samples):
                samples[index] += (value + rng.uniform(-.025, .025)) * envelope
    peak = max(map(abs, samples))
    with wave.open(str(DEST / f"quack-{name}.wav"), "wb") as output:
        output.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(b"".join(struct.pack("<h", round(x / peak * .78 * 32767)) for x in samples))


if __name__ == "__main__":
    render("boing", .38, [(0, .34, 440, 230, 170)])
    render("giggle", .55, [(0, .17, 420, 290, 50), (.2, .27, 510, 340, 90)])
    render("squeaky", .46, [(0, .22, 560, 320, 160), (.26, .15, 660, 410, 80)])
