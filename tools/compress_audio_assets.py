#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from mutagen.mp3 import MP3


def kb(size_bytes: int) -> float:
    return size_bytes / 1024.0


def describe_mp3(path: Path) -> tuple[float, int]:
    audio = MP3(path)
    duration = float(audio.info.length)
    bitrate_kbps = int(audio.info.bitrate / 1000)
    return duration, bitrate_kbps


def compress_mp3(path: Path, bitrate_kbps: int) -> tuple[int, int]:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    before = path.stat().st_size

    with tempfile.NamedTemporaryFile(delete=False, suffix=path.suffix, dir=path.parent) as temp_file:
      temp_path = Path(temp_file.name)

    try:
        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(path),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            f"{bitrate_kbps}k",
            "-ar",
            "44100",
            str(temp_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        after = temp_path.stat().st_size
        if after < before:
            shutil.copyfile(temp_path, path)
            return before, after
        return before, before
    finally:
        if temp_path.exists():
            temp_path.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description="Compress MP3 audio assets for WeChat mini game package budget.")
    parser.add_argument("paths", nargs="+", help="One or more MP3 files to compress in place")
    parser.add_argument("--bitrate", type=int, default=96, help="Target MP3 bitrate in kbps. Default: 96")
    args = parser.parse_args()

    total_before = 0
    total_after = 0

    for raw_path in args.paths:
        path = Path(raw_path).resolve()
        if not path.exists():
            raise SystemExit(f"Missing file: {path}")

        before_duration, before_bitrate = describe_mp3(path)
        before, after = compress_mp3(path, args.bitrate)
        after_duration, after_bitrate = describe_mp3(path)
        total_before += before
        total_after += after
        print(
            f"{path.name}: {kb(before):.1f} KB -> {kb(after):.1f} KB | "
            f"{before_bitrate} kbps -> {after_bitrate} kbps | "
            f"duration {before_duration:.2f}s -> {after_duration:.2f}s"
        )

    print()
    print(f"Total: {kb(total_before):.1f} KB -> {kb(total_after):.1f} KB")
    print(f"Saved: {kb(total_before - total_after):.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
