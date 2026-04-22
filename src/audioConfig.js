'use strict';

const { GAME_AUDIO_EVENTS } = require('../shared/gameEvents');

// Replace these files with your own assets at any time.
// Paths are relative to the mini game root directory.
const AUDIO_SFX_MAP = {
  [GAME_AUDIO_EVENTS.uiTransition]: 'assets/audio/ui.wav',
  [GAME_AUDIO_EVENTS.gameIntro]: {
    src: 'assets/audio/bgm-game.mp3',
    startAtMs: 0,
    stopAfterMs: 1160,
    volume: 0.9,
    holdBgmScene: 'game',
  },
  [GAME_AUDIO_EVENTS.avatarMorph]: {
    src: 'assets/audio/avatar-morph.wav',
    volume: 0.82,
  },
  [GAME_AUDIO_EVENTS.tileBlocked]: 'assets/audio/pop.wav',
  [GAME_AUDIO_EVENTS.tilePick]: 'assets/audio/pick.wav',
  [GAME_AUDIO_EVENTS.tripleMatch]: 'assets/audio/bubble-pop.wav',
  [GAME_AUDIO_EVENTS.comboBurst]: 'assets/audio/combo.wav',
  [GAME_AUDIO_EVENTS.levelUp]: 'assets/audio/win.wav',
  [GAME_AUDIO_EVENTS.goalReached]: 'assets/audio/win.wav',
  [GAME_AUDIO_EVENTS.rebound]: 'assets/audio/rebound.wav',
  [GAME_AUDIO_EVENTS.timeout]: 'assets/audio/pop.wav',
  [GAME_AUDIO_EVENTS.sweetSlashStart]: 'assets/audio/slash-start.wav',
  [GAME_AUDIO_EVENTS.sweetSlashHit]: 'assets/audio/fruit-slice.wav',
  [GAME_AUDIO_EVENTS.sweetSlashFinish]: 'assets/audio/win.wav',
};

// Scene layering is intentionally more granular than the current shipped asset set.
// You can replace any scene below with a dedicated file later without touching gameplay code.
const AUDIO_BGM_MAP = {
  characterSelect: 'assets/audio/bgm-home.mp3',
  input: 'assets/audio/bgm-home.mp3',
  home: 'assets/audio/bgm-home.mp3',
  game: 'assets/audio/bgm-game.mp3',
  slash: 'assets/audio/bgm-slash.mp3',
  resultSuccess: 'assets/audio/bgm-result-success.mp3',
  resultFail: 'assets/audio/bgm-result-fail.mp3',
};

const AUDIO_BGM_OPTIONS = {
  game: {
    startAtMs: 1160,
  },
};

const AUDIO_VOLUME = {
  sfx: 0.72,
  bgm: {
    characterSelect: 0.34,
    input: 0.32,
    home: 0.32,
    game: 0.28,
    slash: 0.36,
    resultSuccess: 0.3,
    resultFail: 0.26,
  },
};

module.exports = {
  AUDIO_SFX_MAP,
  AUDIO_BGM_MAP,
  AUDIO_BGM_OPTIONS,
  AUDIO_VOLUME,
};
