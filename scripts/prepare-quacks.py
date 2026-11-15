"""Prepare CC0 recorded duck calls. Requires ffmpeg; see public/audio/CREDITS.md."""
import math
from pathlib import Path
import re
import struct
import subprocess
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
SOURCES = [
    ("single", "Mikes-MultiMedia", "418509", 0, .20),
    ("bright", "Mari0411", "791152", .03, .245),
    ("chatter", "gibarroule", "365133", .32, 1.23),
]


def prepare(name, author, sound_id, start, end):
    raw = ROOT / "outputs" / "audio-source"
    raw.mkdir(parents=True, exist_ok=True)
    mp3 = raw / f"{name}-real.mp3"
    if not mp3.exists():
        url = f"https://freesound.org/people/{author}/sounds/{sound_id}/"
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request) as response:
            html = response.read().decode()
        preview = re.search(r'https://cdn.freesound.org/previews/[^\s"<>]+-hq\.mp3', html).group()
        urllib.request.urlretrieve(preview, mp3)
    decoded = mp3.with_suffix(".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3),
                    "-ac", "1", "-ar", str(RATE), str(decoded)], check=True)
    with wave.open(str(decoded), "rb") as source:
        data = struct.unpack("<" + "h" * source.getnframes(), source.readframes(source.getnframes()))
    samples = list(data[round(start * RATE):round(end * RATE)])
    mean = sum(samples) / len(samples)
    samples = [x - mean for x in samples]
    for i in range(len(samples)):
        samples[i] *= min(1, i / (.004 * RATE), (len(samples) - 1 - i) / (.012 * RATE))
    # Preserve the recordings' pitch and timing; normalize to a shared peak.
    scale = .78 * 32767 / max(map(abs, samples))
    with wave.open(str(ROOT / "public" / "audio" / f"quack-{name}.wav"), "wb") as output:
        output.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(b"".join(struct.pack("<h", round(x * scale)) for x in samples))
    rms = math.sqrt(sum((x * scale / 32767) ** 2 for x in samples) / len(samples))
    print(f"quack-{name}.wav: {len(samples) / RATE:.3f}s, RMS {rms:.3f}")


if __name__ == "__main__":
    for entry in SOURCES:
        prepare(*entry)
