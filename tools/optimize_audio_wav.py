from __future__ import annotations

import argparse
import audioop
import wave
from pathlib import Path


def optimize_wav_in_place(path: Path, sample_rate: int, sample_width: int) -> tuple[int, int]:
    with wave.open(str(path), "rb") as reader:
        channels = reader.getnchannels()
        width = reader.getsampwidth()
        rate = reader.getframerate()
        frames = reader.readframes(reader.getnframes())

    if channels > 1:
        frames = audioop.tomono(frames, width, 0.5, 0.5)
        channels = 1

    if rate != sample_rate:
        frames, _ = audioop.ratecv(frames, width, channels, rate, sample_rate, None)
        rate = sample_rate

    if width != sample_width:
        frames = audioop.lin2lin(frames, width, sample_width)
        width = sample_width

    if sample_width == 1:
        # WAV 8-bit PCM expects unsigned data.
        frames = audioop.bias(frames, 1, 128)

    before = path.stat().st_size
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(channels)
        writer.setsampwidth(width)
        writer.setframerate(rate)
        writer.writeframes(frames)
    after = path.stat().st_size
    return before, after


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimize mini game WAV files for package size.")
    parser.add_argument(
        "targets",
        nargs="*",
        default=[
            "minigame/assets/audio/bgm-menu.wav",
            "minigame/assets/audio/bgm-game.wav",
        ],
        help="WAV files to optimize in place.",
    )
    parser.add_argument("--sample-rate", type=int, default=11025, help="Target sample rate.")
    parser.add_argument("--sample-width", type=int, default=1, choices=[1, 2], help="Target sample width in bytes.")
    args = parser.parse_args()

    for raw_target in args.targets:
        path = Path(raw_target).resolve()
        if not path.exists():
            raise SystemExit(f"Missing file: {path}")
        before, after = optimize_wav_in_place(path, args.sample_rate, args.sample_width)
        saved = before - after
        print(f"{path.name}: {before} -> {after} bytes (saved {saved})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
