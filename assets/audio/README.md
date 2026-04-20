# Audio Replacement Guide

Put replacement audio files in this folder:

- `minigame/assets/audio/`

The mini game currently looks up these file names from `src/audioConfig.js`.

## Background Music

- `bgm-menu.wav`
  Used on character select, weight pages, home, and result pages.
- `bgm-game.wav`
  Used during gameplay.

## Key Sound Effects

- `bubble-pop.wav`
  Used for triple-match elimination. Replace this with your bubble burst sound.
- `fruit-slice.wav`
  Used when sweet slash hits a food item.
- `slash-start.wav`
  Used when sweet slash starts.

## Other Existing Effect Files

- `ui.wav`
- `pop.wav`
- `pick.wav`
- `combo.wav`
- `rebound.wav`
- `win.wav`

## Recommended Format

- Keep using `.wav` if you want the safest drop-in replacement.
- Recommended export:
  - BGM: 8-bit PCM, 11025 Hz, mono when package size is important
  - SFX: PCM 16-bit
  - 11025 Hz, 22050 Hz or 44100 Hz depending on sound importance
  - mono or stereo

## Size Optimization

To shrink the packaged BGM files in place, run:

```bash
npm run optimize:audio
```

This currently rewrites:

- `bgm-menu.wav`
- `bgm-game.wav`

to a lighter mini game friendly WAV format.

## How To Replace

1. Generate your own audio file.
2. Rename it to one of the file names above and overwrite the existing file in this folder.
3. If you want to use a different file name, edit `minigame/src/audioConfig.js`.
4. Reload the mini game in WeChat DevTools.
