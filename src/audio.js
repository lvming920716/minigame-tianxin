'use strict';

const {
  AUDIO_SFX_MAP,
  AUDIO_BGM_MAP,
  AUDIO_BGM_OPTIONS,
  AUDIO_VOLUME,
} = require('./audioConfig');

const sfxCache = new Map();
const transientSfxContexts = new Set();

let bgmCtx = null;
let currentBgm = null;
let currentBgmSrc = null;
let audioUnlocked = false;
let appHidden = false;
let bgmPlaying = false;
let bgmHold = null;
let bgmHoldTimer = null;
const bgmContexts = new Set();
const bgmTweenIds = new WeakMap();

const BGM_FADE_OUT_MS = 220;
const BGM_FADE_IN_MS = 260;
const BGM_VOLUME_TWEEN_MS = 180;
const BGM_TWEEN_STEP_MS = 32;
const AUDIO_SEEK_RETRY_MS = 48;

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

function getBgmOptions(scene) {
  return AUDIO_BGM_OPTIONS[scene] || null;
}

function getSfxSpec(eventName) {
  const entry = AUDIO_SFX_MAP[eventName];
  if (!entry) return null;
  if (typeof entry === 'string') {
    return {
      src: entry,
      volume: AUDIO_VOLUME.sfx,
      cacheable: true,
    };
  }
  return {
    src: entry.src,
    startAtMs: Math.max(0, entry.startAtMs || 0),
    stopAfterMs: Math.max(0, entry.stopAfterMs || 0),
    volume: typeof entry.volume === 'number' ? entry.volume : AUDIO_VOLUME.sfx,
    holdBgmScene: entry.holdBgmScene || null,
    cacheable: false,
  };
}

function getBgmStartAtSec(scene) {
  const options = getBgmOptions(scene);
  if (!options || !(options.startAtMs > 0)) return 0;
  return options.startAtMs / 1000;
}

function safeSeek(ctx, positionSec) {
  if (!ctx) return false;
  try {
    ctx.seek(Math.max(0, positionSec));
    return true;
  } catch (_) {
    return false;
  }
}

function applySeekWithRetry(ctx, positionSec, guard) {
  if (!(positionSec > 0)) return;
  safeSeek(ctx, positionSec);
  setTimeout(() => {
    if (guard && !guard()) return;
    safeSeek(ctx, positionSec);
  }, AUDIO_SEEK_RETRY_MS);
}

function safeStop(ctx) {
  if (!ctx) return;
  try {
    ctx.stop();
  } catch (_) {
    // no-op
  }
}

function destroyTransientSfxCtx(ctx) {
  if (!ctx) return;
  transientSfxContexts.delete(ctx);
  safeStop(ctx);
  safeDestroy(ctx);
}

function clearBgmHold() {
  bgmHold = null;
  if (bgmHoldTimer) {
    clearTimeout(bgmHoldTimer);
    bgmHoldTimer = null;
  }
}

function scheduleBgmHold(scene, durationMs) {
  clearBgmHold();
  if (!scene || !(durationMs > 0)) return;
  bgmHold = {
    scene,
    until: Date.now() + durationMs,
  };
  bgmHoldTimer = setTimeout(() => {
    const hold = bgmHold;
    bgmHoldTimer = null;
    if (!hold || hold.scene !== currentBgm) {
      bgmHold = null;
      return;
    }
    bgmHold = null;
    syncBgm(hold.scene);
  }, durationMs + 12);
}

function isBgmHeld(scene) {
  return !!(bgmHold && bgmHold.scene === scene && bgmHold.until > Date.now());
}

function createBgmCtx(scene) {
  const src = AUDIO_BGM_MAP[scene];
  if (!src || !canUseAudio()) return null;
  const startAtSec = getBgmStartAtSec(scene);

  const ctx = wx.createInnerAudioContext();
  ctx.src = src;
  ctx.loop = startAtSec <= 0;
  ctx.volume = AUDIO_VOLUME.bgm[scene] || 0.3;
  ctx.obeyMuteSwitch = true;
  ctx.autoplay = false;
  if (startAtSec > 0 && typeof ctx.onEnded === 'function') {
    ctx.onEnded(() => {
      if (ctx !== bgmCtx || currentBgm !== scene || !audioUnlocked || appHidden) return;
      applySeekWithRetry(ctx, startAtSec, () => ctx === bgmCtx && currentBgm === scene);
      safePlay(ctx);
    });
  }
  bgmContexts.add(ctx);
  return ctx;
}

function getBgmVolume(scene) {
  return AUDIO_VOLUME.bgm[scene] || 0.3;
}

function setCtxVolume(ctx, volume) {
  if (!ctx) return;
  ctx.volume = Math.max(0, Math.min(1, volume));
}

function getCtxVolume(ctx, fallback) {
  if (!ctx || typeof ctx.volume !== 'number' || Number.isNaN(ctx.volume)) {
    return typeof fallback === 'number' ? fallback : 0.3;
  }
  return ctx.volume;
}

function applyBgmVolume(scene) {
  if (!bgmCtx) return;
  setCtxVolume(bgmCtx, getBgmVolume(scene));
}

function destroyBgmCtx(ctx) {
  if (!ctx) return;
  bgmContexts.delete(ctx);
  safeDestroy(ctx);
}

function cleanupRetiredBgmContexts() {
  bgmContexts.forEach((ctx) => {
    if (ctx === bgmCtx) return;
    destroyBgmCtx(ctx);
  });
}

function cancelTween(ctx) {
  if (!ctx) return;
  const nextId = (bgmTweenIds.get(ctx) || 0) + 1;
  bgmTweenIds.set(ctx, nextId);
}

function tweenVolume(ctx, from, to, durationMs, options) {
  const opts = options || {};
  if (!ctx) return;
  const tweenId = (bgmTweenIds.get(ctx) || 0) + 1;
  bgmTweenIds.set(ctx, tweenId);

  if (durationMs <= 0 || Math.abs(to - from) < 0.001) {
    setCtxVolume(ctx, to);
    if (opts.pauseAtEnd) safePause(ctx);
    if (opts.destroyAtEnd) destroyBgmCtx(ctx);
    return;
  }

  const startedAt = Date.now();
  setCtxVolume(ctx, from);

  function step() {
    if (bgmTweenIds.get(ctx) !== tweenId) return;
    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    const nextVolume = from + (to - from) * progress;
    setCtxVolume(ctx, nextVolume);
    if (progress < 1) {
      setTimeout(step, BGM_TWEEN_STEP_MS);
      return;
    }
    if (opts.pauseAtEnd) safePause(ctx);
    if (opts.destroyAtEnd) destroyBgmCtx(ctx);
  }

  setTimeout(step, 0);
}

function safeRestart(ctx) {
  if (!ctx) return;
  safeStop(ctx);
  safeSeek(ctx, 0);
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
    applySeekWithRetry(
      bgmCtx,
      getBgmStartAtSec(currentBgm),
      () => bgmCtx && currentBgm && !appHidden
    );
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function syncBgm(scene) {
  const nextSrc = AUDIO_BGM_MAP[scene];
  if (!nextSrc) return;
  if (bgmHold && bgmHold.scene !== scene) {
    clearBgmHold();
  }

  if (isBgmHeld(scene)) {
    const previousCtx = bgmCtx;
    const previousScene = currentBgm;
    bgmCtx = null;
    currentBgm = scene;
    currentBgmSrc = nextSrc;
    bgmPlaying = false;

    if (previousCtx) {
      if (audioUnlocked && !appHidden) {
        tweenVolume(
          previousCtx,
          getCtxVolume(previousCtx, getBgmVolume(previousScene)),
          0,
          BGM_FADE_OUT_MS,
          { pauseAtEnd: true, destroyAtEnd: true }
        );
      } else {
        destroyBgmCtx(previousCtx);
      }
    }
    return;
  }

  if (currentBgmSrc === nextSrc && bgmCtx) {
    currentBgm = scene;
    tweenVolume(
      bgmCtx,
      getCtxVolume(bgmCtx, getBgmVolume(scene)),
      getBgmVolume(scene),
      BGM_VOLUME_TWEEN_MS
    );
  } else {
    cleanupRetiredBgmContexts();
    const previousCtx = bgmCtx;
    const previousScene = currentBgm;
    const nextCtx = createBgmCtx(scene);

    bgmCtx = nextCtx;
    currentBgm = scene;
    currentBgmSrc = nextSrc;
    bgmPlaying = false;

    if (nextCtx) {
      const targetVolume = getBgmVolume(scene);
      if (audioUnlocked && !appHidden) {
        setCtxVolume(nextCtx, 0);
        applySeekWithRetry(nextCtx, getBgmStartAtSec(scene), () => nextCtx === bgmCtx);
        safePlay(nextCtx);
        bgmPlaying = true;
        tweenVolume(nextCtx, 0, targetVolume, BGM_FADE_IN_MS);
      } else {
        setCtxVolume(nextCtx, targetVolume);
      }
    }

    if (previousCtx) {
      if (audioUnlocked && !appHidden) {
        tweenVolume(
          previousCtx,
          getCtxVolume(previousCtx, getBgmVolume(previousScene)),
          0,
          BGM_FADE_OUT_MS,
          { pauseAtEnd: true, destroyAtEnd: true }
        );
      } else {
        destroyBgmCtx(previousCtx);
      }
    }
  }

  if (audioUnlocked && !appHidden && !bgmPlaying) {
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function playEvent(eventName) {
  if (!audioUnlocked) return;
  const spec = getSfxSpec(eventName);
  if (!spec || !spec.src) return;

  try {
    if (spec.holdBgmScene && spec.stopAfterMs > 0) {
      scheduleBgmHold(spec.holdBgmScene, spec.stopAfterMs);
    }

    if (spec.cacheable) {
      const ctx = ensureSfxCtx(spec.src);
      if (!ctx) return;
      ctx.volume = spec.volume;
      safeRestart(ctx);
      ctx.play();
      return;
    }

    if (!canUseAudio()) return;
    const ctx = wx.createInnerAudioContext();
    ctx.src = spec.src;
    ctx.loop = false;
    ctx.volume = spec.volume;
    ctx.obeyMuteSwitch = true;
    ctx.autoplay = false;
    transientSfxContexts.add(ctx);

    applySeekWithRetry(ctx, (spec.startAtMs || 0) / 1000, () => transientSfxContexts.has(ctx));
    safePlay(ctx);

    const destroyLater = () => destroyTransientSfxCtx(ctx);
    if (spec.stopAfterMs > 0) {
      setTimeout(destroyLater, spec.stopAfterMs + 20);
    } else if (typeof ctx.onEnded === 'function') {
      ctx.onEnded(destroyLater);
    }
  } catch (_) {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  }
}

function pauseAudio() {
  appHidden = true;
  bgmContexts.forEach((ctx) => {
    cancelTween(ctx);
    safePause(ctx);
  });
  transientSfxContexts.forEach((ctx) => {
    destroyTransientSfxCtx(ctx);
  });
  bgmPlaying = false;
}

function resumeAudio() {
  appHidden = false;
  cleanupRetiredBgmContexts();
  if (audioUnlocked && bgmCtx && currentBgm && !bgmPlaying) {
    applyBgmVolume(currentBgm);
    safePlay(bgmCtx);
    bgmPlaying = true;
  }
}

function disposeAudio() {
  sfxCache.forEach((ctx) => {
    safeDestroy(ctx);
  });
  sfxCache.clear();
  clearBgmHold();
  transientSfxContexts.forEach((ctx) => {
    destroyTransientSfxCtx(ctx);
  });
  bgmContexts.forEach((ctx) => {
    cancelTween(ctx);
    destroyBgmCtx(ctx);
  });
  bgmCtx = null;
  currentBgm = null;
  currentBgmSrc = null;
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
