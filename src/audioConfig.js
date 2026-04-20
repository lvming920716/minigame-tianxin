'use strict';

const { GAME_AUDIO_EVENTS } = require('../shared/gameEvents');

// Replace these files with your own assets at any time.
// Paths are relative to the mini game root directory.
const AUDIO_SFX_MAP = {
  [GAME_AUDIO_EVENTS.uiTransition]: 'assets/audio/ui.wav',
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

const AUDIO_BGM_MAP = {
  menu: 'assets/audio/bgm-menu.wav',
  game: 'assets/audio/bgm-game.wav',
};

const AUDIO_VOLUME = {
  sfx: 0.72,
  bgm: {
    menu: 0.34,
    game: 0.28,
  },
};

module.exports = {
  AUDIO_SFX_MAP,
  AUDIO_BGM_MAP,
  AUDIO_VOLUME,
};
