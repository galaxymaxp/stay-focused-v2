"""Build the tiny, bundled feedback tones used by the mobile study flow."""

from math import pi, sin
from pathlib import Path
import struct
import wave


RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "apps/mobile/assets/sounds"
OUT.mkdir(parents=True, exist_ok=True)


def write(name: str, notes: list[tuple[float, float]], volume: float = 0.22) -> None:
    samples: list[int] = []
    for frequency, duration in notes:
        count = int(duration * RATE)
        for index in range(count):
            progress = index / max(count - 1, 1)
            envelope = min(1.0, progress * 20) * (1.0 - progress) ** 2
            tone = sin(2 * pi * frequency * index / RATE)
            overtone = 0.18 * sin(4 * pi * frequency * index / RATE)
            samples.append(round(32767 * volume * envelope * (tone + overtone)))
    with wave.open(str(OUT / name), "wb") as sound:
        sound.setnchannels(1)
        sound.setsampwidth(2)
        sound.setframerate(RATE)
        sound.writeframes(struct.pack(f"<{len(samples)}h", *samples))


write("tick.wav", [(540, 0.055)], 0.12)
write("correct.wav", [(660, 0.085), (880, 0.12)])
write("wrong.wav", [(310, 0.15)], 0.15)
write("complete.wav", [(587, 0.085), (740, 0.085), (988, 0.16)])
