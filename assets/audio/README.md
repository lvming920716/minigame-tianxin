# Audio Replacement Guide

Put replacement audio files in this folder:

- `minigame/assets/audio/`

The mini game currently looks up these file names from `src/audioConfig.js`.

## Background Music

- `bgm-home.mp3`
  Used on character select, weight pages, and home.
- `bgm-game.mp3`
  Used during core gameplay.
- `bgm-slash.mp3`
  Used during sweet slash mode.
- `bgm-result-success.mp3`
  Used on the success result page.
- `bgm-result-fail.mp3`
  Used on the fail result page.

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

- For BGM, prefer MP3 around `96 kbps` when package size is important.
- For SFX, `.wav` is still a good default.
- Recommended export:
  - BGM: MP3, 44100 Hz, 96 kbps
  - SFX: PCM 16-bit
  - 11025 Hz, 22050 Hz or 44100 Hz depending on sound importance
  - mono or stereo

## Size Optimization

To shrink MP3 BGM files in place, run:

```bash
python tools/compress_audio_assets.py assets/audio/bgm-home.mp3 assets/audio/bgm-game.mp3 assets/audio/bgm-slash.mp3 assets/audio/bgm-result-success.mp3 assets/audio/bgm-result-fail.mp3
```

To shrink WAV files in place, run:

```bash
npm run optimize:audio
```

This only applies to any WAV files you explicitly keep in the project.

## How To Replace

1. Generate your own audio file.
2. Rename it to one of the file names above and overwrite the existing file in this folder.
3. If you want to use a different file name, edit `minigame/src/audioConfig.js`.
4. Reload the mini game in WeChat DevTools.
