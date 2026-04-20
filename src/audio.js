'use strict';

const {
  AUDIO_SFX_MAP,
  AUDIO_BGM_MAP,
  AUDIO_VOLUME,
} = require('./audioConfig');

const sfxCache = new Map();

let bgmCtx = null;
let currentBgm = null;
let audioUnlocked = false;
let appHidden = false;
let bgmPlaying = false;

function canUseAudio() {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
}

function ensureSfxCtx(src) {
  if (sfxCache.has(src)) return sfxCache.get(src);
  if (!canUseAudio()) return null;

  const ctx = wx.createInnerAudioContext();
  ctx.src = src;
  ctx.volume = AUDIO_VOLUME.sfx;
  ctx.loop = false;
  ctx.obeyMuteSwitch = true;
  ctx.autoplay = false;
  sfxCache.set(src, ctx);
  return ctx;
}

function createBgmCtx(scene) {
  const src = AUDIO_BGM_MAP[scene];
  if (!src || !canUseAudio()) return null;

  const ctx = wx.createInnerAudioContext();
  ctx.src = src;
  ctx.loop = true;
  ctx.volume = AUDIO_VOLUME.bgm[scene] || 0.3;
  ctx.obeyMuteSwitch = true;
  ctx.autoplay = false;
  return ctx;
}

function safeRestart(ctx) {
  if (!ctx) return;
  try {
    ctx.stop();
  } catch (_) {
    // no-op
  }
  try {
    ctx.seek(0);
  } catch (_) {
    // no-op
  }
}

function safePlay(ctx) {
  if (!ctx) return;
  try {
    ctx.play();
  } catch (_) {
    // no-op
  }
}

function safePause(ctx) {
  if (!ctx) return;
  try {
    ctx.pause();
  } catch (_) {
    // no-op
  }
}

function safeDestroy(ctx) {
  if (!ctx) return;
  try {
    ctx.destroy();
  } catch (_) {
    // no-op
  }
}

function unlockAudio() {
  audioUnlocked = true;
  if (!appHidden && bgmCtx && currentBgm && !bgmPlaying) {
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function syncBgm(scene) {
  if (!AUDIO_BGM_MAP[scene]) return;

  if (currentBgm !== scene) {
    safeDestroy(bgmCtx);
    bgmCtx = createBgmCtx(scene);
    currentBgm = scene;
    bgmPlaying = false;
  }

  if (audioUnlocked && !appHidden && !bgmPlaying) {
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function playEvent(eventName) {
  if (!audioUnlocked) return;
  const src = AUDIO_SFX_MAP[eventName];
  if (!src) return;

  const ctx = ensureSfxCtx(src);
  if (!ctx) return;

  try {
    safeRestart(ctx);
    ctx.play();
  } catch (_) {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  }
}

function pauseAudio() {
  appHidden = true;
  safePause(bgmCtx);
  bgmPlaying = false;
}

function resumeAudio() {
  appHidden = false;
  if (audioUnlocked && bgmCtx && currentBgm && !bgmPlaying) {
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function disposeAudio() {
  sfxCache.forEach((ctx) => {
    safeDestroy(ctx);
  });
  sfxCache.clear();
  safeDestroy(bgmCtx);
  bgmCtx = null;
  currentBgm = null;
  appHidden = false;
  audioUnlocked = false;
  bgmPlaying = false;
}

module.exports = {
  playEvent,
  unlockAudio,
  syncBgm,
  pauseAudio,
  resumeAudio,
  disposeAudio,
};
