# Character Asset Guide

This folder stores the mini game character stage art.

## Required files per character

```text
minigame/assets/characters/<character-id>/
  stage-1.png
  stage-2.png
  stage-3.png
  stage-4.png
```

## Recommended export

- Transparent PNG
- 1024 x 1536
- Centered full body
- Same pose and framing for all four stages
- If the generated image still has a light checkerboard preview background, it can be auto-cleaned after import

## Current primary production targets

- `peach-soda`
- `cream-latte`
- `mint-breeze`

Detailed stage and prompt guidance:

- `minigame/docs/CHARACTER_ASSET_SPEC.md`

## Auto Cleanup For Generated Images

If you upload PNGs from an image generator and they still contain a light checkerboard preview background, run the cleanup script once after placing them in the character folder.

Example folder structure:

```text
minigame/assets/characters/moon-iris/
  stage-1.png
  stage-2.png
  stage-3.png
  stage-4.png
```

Run for all character folders:

```bash
npm run process:characters
```

Run for one character folder only:

```bash
python minigame/tools/process_character_assets.py minigame/assets/characters/moon-iris
```

Run for a single PNG:

```bash
python minigame/tools/process_character_assets.py minigame/assets/characters/moon-iris/stage-1.png
```

What it does:

- Scans `stage-*.png`
- Detects border-connected light neutral checkerboard pixels
- Converts those pixels to transparent alpha
- Saves the PNG in place

Notes:

- The script is idempotent, so repeated runs are safe.
- It is meant for light preview-grid backgrounds like the ones produced by many AI tools.
- The mini game runtime also keeps a fallback cleanup path, but the recommended workflow is to process the files once and keep the assets transparent on disk.
- Requires Pillow: `python -m pip install pillow`
