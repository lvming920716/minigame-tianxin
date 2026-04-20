from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


def is_checker_background(rgba: tuple[int, int, int, int]) -> bool:
    r, g, b, a = rgba
    if a < 8:
        return False
    avg = (r + g + b) / 3
    spread = max(r, g, b) - min(r, g, b)
    return 210 <= avg <= 252 and spread <= 28


def iter_stage_images(root: Path) -> Iterable[Path]:
    if root.is_file():
        yield root
        return
    yield from sorted(root.rglob("stage-*.png"))


def remove_checker_background(path: Path) -> tuple[int, int]:
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    visited = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height or visited[y][x]:
            return
        if not is_checker_background(pixels[x, y]):
            return
        visited[y][x] = True
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)

    removed = 0
    for y in range(height):
        for x in range(width):
            if not visited[y][x]:
                continue
            removed += 1
            pixels[x, y] = (255, 255, 255, 0)

    img.save(path, optimize=True)
    return removed, width * height


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Remove light checkerboard backgrounds from character stage PNGs."
    )
    parser.add_argument(
        "target",
        nargs="?",
        default="minigame/assets/characters",
        help="Character folder or a single PNG file. Defaults to minigame/assets/characters",
    )
    args = parser.parse_args()

    target = Path(args.target).resolve()
    if not target.exists():
        raise SystemExit(f"Target does not exist: {target}")

    files = list(iter_stage_images(target))
    if not files:
        raise SystemExit(f"No stage PNGs found under: {target}")

    print(f"Processing {len(files)} file(s) under {target}")
    for path in files:
        try:
            removed, total = remove_checker_background(path)
            percent = (removed / total) * 100 if total else 0
            print(f"- {path.name}: removed {removed} px ({percent:.1f}%), saved in place")
        except Exception as exc:
            print(f"- {path.name}: skipped ({exc})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
