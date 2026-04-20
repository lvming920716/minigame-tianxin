'use strict';

const { ACTIONS, createInitialState, update } = require('../shared/engine');
const { validateWeightInputs } = require('../shared/setupValidation');
const { FOODS, isBlocked } = require('../shared/tileMatchLogic');
const { CHARACTER_OPTIONS } = require('../shared/characters');
const {
  SWEET_SLASH_BASE_DURATION_MS,
  SWEET_SLASH_MAX_DURATION_MS,
  SWEET_SLASH_BONUS_PER_HIT_MS,
  SWEET_SLASH_CONCURRENT_TARGETS,
} = require('../shared/gameBalance');
const { render, findHit } = require('./renderer');
const {
  playEvent,
  unlockAudio,
  syncBgm,
  pauseAudio,
  resumeAudio,
  disposeAudio,
} = require('./audio');
const { STYLE_CONTRACT } = require('./styleContract');

function createImage(path) {
  if (typeof wx === 'undefined' || !wx.createImage) return null;
  const img = wx.createImage();
  img.src = path;
  return img;
}

function isNeutralLightPixel(data, offset) {
  const alpha = data[offset + 3];
  if (alpha < 8) return false;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return avg >= 214 && avg <= 252 && max - min <= 26;
}

function cleanupCharacterImage(image) {
  try {
    if (typeof wx === 'undefined' || !wx.createOffscreenCanvas) return image;
    const width = image.width || image.naturalWidth || 0;
    const height = image.height || image.naturalHeight || 0;
    if (!width || !height) return image;

    const canvas = wx.createOffscreenCanvas({ type: '2d', width, height });
    const ctx = canvas.getContext('2d');
    if (!ctx || !ctx.getImageData || !ctx.putImageData) return image;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const total = width * height;
    const visited = new Uint8Array(total);
    const queue = new Uint32Array(total);
    let head = 0;
    let tail = 0;

    function push(index) {
      if (visited[index]) return;
      visited[index] = 1;
      queue[tail] = index;
      tail += 1;
    }

    for (let x = 0; x < width; x += 1) {
      const top = x;
      const bottom = (height - 1) * width + x;
      if (isNeutralLightPixel(data, top * 4)) push(top);
      if (isNeutralLightPixel(data, bottom * 4)) push(bottom);
    }
    for (let y = 0; y < height; y += 1) {
      const left = y * width;
      const right = left + width - 1;
      if (isNeutralLightPixel(data, left * 4)) push(left);
      if (isNeutralLightPixel(data, right * 4)) push(right);
    }

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);

      if (x > 0) {
        const next = index - 1;
        if (!visited[next] && isNeutralLightPixel(data, next * 4)) push(next);
      }
      if (x < width - 1) {
        const next = index + 1;
        if (!visited[next] && isNeutralLightPixel(data, next * 4)) push(next);
      }
      if (y > 0) {
        const next = index - width;
        if (!visited[next] && isNeutralLightPixel(data, next * 4)) push(next);
      }
      if (y < height - 1) {
        const next = index + width;
        if (!visited[next] && isNeutralLightPixel(data, next * 4)) push(next);
      }
    }

    for (let index = 0; index < total; index += 1) {
      if (!visited[index]) continue;
      const offset = index * 4;
      data[offset + 3] = 0;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch (error) {
    return image;
  }
}

function createProcessedImage(path, runtime) {
  if (typeof wx === 'undefined' || !wx.createImage) return null;
  const image = wx.createImage();
  runtime.images[path] = image;
  image.onload = () => {
    runtime.images[path] = cleanupCharacterImage(image);
  };
  image.onerror = () => {
    runtime.images[path] = image;
  };
  image.src = path;
  return image;
}

function clampWeight(value) {
  return Math.max(30, Math.min(300, value));
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ox = px - ax;
    const oy = py - ay;
    return Math.sqrt(ox * ox + oy * oy);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = ax + t * dx;
  const ny = ay + t * dy;
  const ox = px - nx;
  const oy = py - ny;
  return Math.sqrt(ox * ox + oy * oy);
}

function createRuntime(canvas) {
  const sys = wx.getSystemInfoSync();
  const pixelRatio = sys.pixelRatio || 1;
  const width = sys.windowWidth || 375;
  const height = sys.windowHeight || 667;
  const safeArea = sys.safeArea || { left: 0, top: 0, width, height };

  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in current environment.');
  }
  ctx.scale(pixelRatio, pixelRatio);

  return {
    canvas,
    ctx,
    width,
    height,
    pixelRatio,
    safeInsets: {
      top: Math.max(0, safeArea.top || 0),
      left: Math.max(0, safeArea.left || 0),
      right: Math.max(0, width - (safeArea.left || 0) - (safeArea.width || width)),
      bottom: Math.max(0, height - (safeArea.top || 0) - (safeArea.height || height)),
    },
    hits: [],
    images: {},
    state: createInitialState(),
    lastTs: Date.now(),
    pauseUntil: 0,
    transition: null,
    toast: null,
    blockedTapHintUntil: 0,
    screenFlash: null,
    reboundModal: null,
    levelUpOverlay: null,
    specialOverlay: null,
    tileFlights: [],
    matchBursts: [],
    slashCuts: [],
    slash: {
      entities: [],
      pendingQueue: [],
      availableTypes: [],
      pointerLast: null,
      trail: [],
      spawnCooldown: 0,
      endingQueued: false,
      elapsedMs: 0,
      timeLeftMs: 0,
      maxTimeMs: SWEET_SLASH_MAX_DURATION_MS,
      bonusPerHitMs: SWEET_SLASH_BONUS_PER_HIT_MS,
      displayScore: 0,
      scorePulseUntil: 0,
      virtualSerial: 0,
    },
    style: STYLE_CONTRACT,
  };
}

function preloadAssets(runtime) {
  const paths = [];
  CHARACTER_OPTIONS.forEach((character) => {
    Object.keys(character.stageAssetPaths).forEach((stageKey) => {
      const key = Number(stageKey);
      if (character.stageAssetPaths[key]) {
        paths.push(character.stageAssetPaths[key]);
      }
    });
  });

  const unique = new Set(paths);
  unique.forEach((path) => {
    createProcessedImage(path, runtime);
  });
}

function dispatch(runtime, action) {
  const prevPage = runtime.state.page;
  const result = update(runtime.state, action);
  runtime.state = result.state;
  if (runtime.state.page !== prevPage) {
    runtime.transition = {
      from: prevPage,
      to: runtime.state.page,
      start: Date.now(),
      durationMs: runtime.style.motion.pageMs,
    };
  }
  applyEffects(runtime, result.effects);
  syncSceneAudio(runtime);
}

function resolveBgmScene(page) {
  return page === 'GAME' ? 'game' : 'menu';
}

function syncSceneAudio(runtime) {
  syncBgm(resolveBgmScene(runtime.state.page));
}

function showToast(runtime, text, durationMs) {
  runtime.toast = {
    text,
    start: Date.now(),
    until: Date.now() + (durationMs || runtime.style.motion.toastMs),
  };
}

function applyEffects(runtime, effects) {
  effects.forEach((effect) => {
    if (effect.type === 'play_audio' || effect.type === 'audio') {
      playEvent(effect.event);
      return;
    }

    if (effect.type === 'show_toast' || effect.type === 'toast') {
      showToast(runtime, effect.text, runtime.style.motion.toastMs);
      return;
    }

    if (effect.type === 'show_screen_flash') {
      runtime.screenFlash = {
        text: effect.text,
        tone: effect.tone || 'pink',
        start: Date.now(),
        durationMs: effect.durationMs || runtime.style.motion.flashMs,
      };
      return;
    }

    if (effect.type === 'pause_gameplay') {
      runtime.pauseUntil = Math.max(runtime.pauseUntil || 0, Date.now() + (effect.durationMs || 520));
      return;
    }

    if (effect.type === 'show_rebound_modal') {
      runtime.reboundModal = {
        oldWeight: effect.oldWeight,
        newWeight: effect.newWeight,
        incomingFoods: effect.incomingFoods || [],
        start: Date.now(),
        durationMs: effect.durationMs || runtime.style.motion.reboundMs,
      };
      return;
    }

    if (effect.type === 'show_levelup_overlay') {
      runtime.levelUpOverlay = {
        level: effect.level,
        start: Date.now(),
        durationMs: runtime.style.motion.levelUpMs,
      };
      return;
    }

    if (effect.type === 'show_special_overlay') {
      runtime.specialOverlay = {
        oldWeight: effect.oldWeight,
        newWeight: effect.newWeight,
        start: Date.now(),
        durationMs: effect.durationMs || runtime.style.motion.specialMs,
      };
      return;
    }

    if (effect.type === 'show_tile_transfer') {
      runtime.tileFlights.push({
        tile: effect.tile,
        dockIndex: effect.dockIndex,
        start: Date.now(),
        durationMs: effect.durationMs || 320,
      });
      return;
    }

    if (effect.type === 'show_match_burst') {
      runtime.matchBursts.push({
        tiles: (effect.tiles || []).slice(),
        start: Date.now() + (effect.delayMs || 0),
        durationMs: 720,
      });
      return;
    }

    if (effect.type === 'start_slash_arena' || effect.type === 'startSlash') {
      runtime.slash.entities = [];
      runtime.slash.pendingQueue = (effect.targets || []).map((target) => ({ ...target, real: true }));
      runtime.slash.availableTypes = Array.from(new Set((effect.targets || []).map((target) => target.type)));
      runtime.slash.pointerLast = null;
      runtime.slash.trail = [];
      runtime.slash.spawnCooldown = 0;
      runtime.slash.endingQueued = false;
      runtime.slash.elapsedMs = 0;
      runtime.slash.timeLeftMs = effect.durationMs || SWEET_SLASH_BASE_DURATION_MS;
      runtime.slash.maxTimeMs = effect.maxDurationMs || SWEET_SLASH_MAX_DURATION_MS;
      runtime.slash.bonusPerHitMs = effect.bonusPerHitMs || SWEET_SLASH_BONUS_PER_HIT_MS;
      runtime.slash.displayScore = 0;
      runtime.slash.scorePulseUntil = 0;
      runtime.slash.virtualSerial = 0;
      runtime.slashCuts = [];
      showToast(runtime, '甜心狂切开始，滑动切开零食', 1400);
      return;
    }
  });
}

function updateTransientEffects(runtime, now) {
  if (runtime.toast && runtime.toast.until < now) {
    runtime.toast = null;
  }
  if (runtime.screenFlash && now > runtime.screenFlash.start + runtime.screenFlash.durationMs) {
    runtime.screenFlash = null;
  }
  if (runtime.reboundModal && now > runtime.reboundModal.start + runtime.reboundModal.durationMs) {
    runtime.reboundModal = null;
  }
  if (runtime.levelUpOverlay && now > runtime.levelUpOverlay.start + runtime.levelUpOverlay.durationMs) {
    runtime.levelUpOverlay = null;
  }
  if (runtime.specialOverlay && now > runtime.specialOverlay.start + runtime.specialOverlay.durationMs) {
    runtime.specialOverlay = null;
  }
  runtime.tileFlights = runtime.tileFlights.filter((flight) => now <= flight.start + flight.durationMs);
  runtime.matchBursts = runtime.matchBursts.filter((burst) => now <= burst.start + burst.durationMs);
  runtime.slashCuts = runtime.slashCuts.filter((cut) => now <= cut.start + cut.durationMs);
  runtime.slash.trail = runtime.slash.trail.filter((point) => now - point.t <= 220);
  if (runtime.transition && now > runtime.transition.start + runtime.transition.durationMs) {
    runtime.transition = null;
  }
}

function spawnSlashEntity(runtime) {
  if (runtime.slash.entities.filter((e) => e.active).length >= SWEET_SLASH_CONCURRENT_TARGETS) return;
  const target = pullSlashTarget(runtime);
  if (!target) return;
  const side = Math.floor(Math.random() * 4);
  const r = 26 + Math.random() * 12;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  if (side === 0) {
    x = Math.random() * runtime.width;
    y = -40;
    vx = -2 + Math.random() * 4;
    vy = 4 + Math.random() * 3;
  } else if (side === 1) {
    x = runtime.width + 40;
    y = Math.random() * runtime.height * 0.7 + 120;
    vx = -5 - Math.random() * 2;
    vy = -1 + Math.random() * 2;
  } else if (side === 2) {
    x = Math.random() * runtime.width;
    y = runtime.height + 40;
    vx = -2 + Math.random() * 4;
    vy = -6 - Math.random() * 2;
  } else {
    x = -40;
    y = Math.random() * runtime.height * 0.7 + 120;
    vx = 5 + Math.random() * 2;
    vy = -1 + Math.random() * 2;
  }

  runtime.slash.entities.push({
    tileId: target.id,
    type: target.type,
    emoji: FOODS[target.type] || '🍩',
    real: !!target.real,
    x,
    y,
    vx,
    vy,
    r,
    active: true,
    hit: false,
    hitMs: 0,
    rotation: (Math.random() - 0.5) * 0.28,
    spin: (Math.random() - 0.5) * 0.014,
    speedScale: 0.92 + Math.random() * 0.18,
    cutAngle: 0,
  });
}

function pullSlashTarget(runtime) {
  const hasRealTargets = runtime.slash.pendingQueue.length > 0;
  const shouldUseReal = hasRealTargets && (Math.random() < 0.42 || runtime.slash.pendingQueue.length > 16);
  if (shouldUseReal) {
    return runtime.slash.pendingQueue.shift();
  }

  const typePool = runtime.slash.availableTypes && runtime.slash.availableTypes.length > 0
    ? runtime.slash.availableTypes
    : Array.from({ length: Math.min(12, FOODS.length) }, (_, index) => index);
  const type = typePool[Math.floor(Math.random() * typePool.length)];
  return {
    id: `virtual_${runtime.slash.virtualSerial++}`,
    type,
    real: false,
  };
}

function updateSlash(runtime, deltaMs) {
  if (!runtime.state.slash.active) return;

  runtime.slash.timeLeftMs = Math.max(0, runtime.slash.timeLeftMs - deltaMs);
  runtime.slash.elapsedMs += deltaMs;
  const scoreDelta = runtime.state.slash.feverScore - runtime.slash.displayScore;
  runtime.slash.displayScore += scoreDelta * Math.min(1, deltaMs / 120);
  const elapsedRamp = Math.min(1, runtime.slash.elapsedMs / 8500);
  const speedMultiplier = 1 + elapsedRamp * 1.15;
  const spawnIntervalScale = 1 - elapsedRamp * 0.34;
  const frameScale = deltaMs / 16.6667;

  runtime.slash.spawnCooldown -= deltaMs;
  if (runtime.slash.timeLeftMs > 0 && runtime.slash.spawnCooldown <= 0) {
    const activeCount = runtime.slash.entities.filter((e) => e.active).length;
    const burst = activeCount < 6 ? 6 : 4;
    for (let i = 0; i < burst; i += 1) {
      spawnSlashEntity(runtime);
    }
    runtime.slash.spawnCooldown = (65 + Math.random() * 55) * spawnIntervalScale;
  }

  runtime.slash.entities.forEach((entity) => {
    if (!entity.active) return;
    if (entity.hit) {
      entity.hitMs += deltaMs;
      entity.rotation += entity.spin * deltaMs * 0.5;
      if (entity.hitMs >= 240) {
        entity.active = false;
      }
      return;
    }
    const movementScale = frameScale * speedMultiplier * (entity.speedScale || 1);
    entity.x += entity.vx * movementScale;
    entity.y += entity.vy * movementScale;
    entity.rotation += entity.spin * deltaMs;
    entity.vy += 0.08 * frameScale * (0.85 + elapsedRamp * 0.55);
    if (
      entity.x < -80 || entity.x > runtime.width + 80 ||
      entity.y < -80 || entity.y > runtime.height + 80
    ) {
      entity.active = false;
    }
  });

  runtime.slash.entities = runtime.slash.entities.filter((entity) => entity.active);

  if (
    !runtime.slash.endingQueued &&
    runtime.slash.timeLeftMs <= 0 &&
    runtime.slash.entities.length === 0
  ) {
    runtime.slash.endingQueued = true;
    dispatch(runtime, { type: ACTIONS.END_SLASH, now: Date.now() });
  }
}

function pushSlashTrailPoint(runtime, x, y, boost) {
  runtime.slash.trail.push({
    x,
    y,
    w: boost ? 20 : 16,
    t: Date.now(),
  });
  if (runtime.slash.trail.length > 14) {
    runtime.slash.trail = runtime.slash.trail.slice(-14);
  }
}

function handleSlashSwipe(runtime, x, y) {
  const last = runtime.slash.pointerLast;
  if (!last) {
    runtime.slash.pointerLast = { x, y };
    pushSlashTrailPoint(runtime, x, y, false);
    return;
  }

  pushSlashTrailPoint(runtime, x, y, true);
  const dx = x - last.x;
  const dy = y - last.y;
  const cutAngle = Math.atan2(dy, dx);

  runtime.slash.entities.forEach((entity) => {
    if (!entity.active || entity.hit) return;
    const d = distancePointToSegment(entity.x, entity.y, last.x, last.y, x, y);
    if (d <= entity.r + 20) {
      entity.hit = true;
      entity.hitMs = 0;
      entity.cutAngle = cutAngle;
      entity.spin = (Math.random() - 0.5) * 0.08;
      runtime.slashCuts.push({
        x: entity.x,
        y: entity.y,
        angle: cutAngle,
        start: Date.now(),
        durationMs: 220,
      });
      dispatch(runtime, {
        type: ACTIONS.SLASH_HIT,
        tileId: entity.tileId,
        virtual: !entity.real,
        currentTimeLeftMs: runtime.slash.timeLeftMs,
        now: Date.now(),
      });
      runtime.slash.timeLeftMs = Math.min(runtime.slash.maxTimeMs, runtime.state.slash.timeLeftMs);
      runtime.slash.scorePulseUntil = Date.now() + 180;
    }
  });

  runtime.slash.pointerLast = { x, y };
}

function toCanvasTouch(touch) {
  const x = typeof touch.x === 'number'
    ? touch.x
    : (typeof touch.clientX === 'number' ? touch.clientX : touch.pageX);
  const y = typeof touch.y === 'number'
    ? touch.y
    : (typeof touch.clientY === 'number' ? touch.clientY : touch.pageY);
  return { x, y };
}

function handleTap(runtime, x, y) {
  const hit = findHit(runtime, x, y);
  if (!hit) return;

  if (hit.kind === 'character') {
    dispatch(runtime, { type: ACTIONS.SELECT_CHARACTER, characterId: hit.id, now: Date.now() });
    return;
  }

  if (hit.kind === 'go_input') {
    dispatch(runtime, { type: ACTIONS.GO_PAGE, page: 'INPUT', now: Date.now() });
    return;
  }

  if (hit.kind === 'dec_initial') {
    dispatch(runtime, {
      type: ACTIONS.SET_WEIGHTS,
      initialWeight: clampWeight(runtime.state.initialWeight - 1),
      targetWeight: runtime.state.targetWeight,
      now: Date.now(),
    });
    return;
  }

  if (hit.kind === 'inc_initial') {
    dispatch(runtime, {
      type: ACTIONS.SET_WEIGHTS,
      initialWeight: clampWeight(runtime.state.initialWeight + 1),
      targetWeight: runtime.state.targetWeight,
      now: Date.now(),
    });
    return;
  }

  if (hit.kind === 'dec_target') {
    dispatch(runtime, {
      type: ACTIONS.SET_WEIGHTS,
      initialWeight: runtime.state.initialWeight,
      targetWeight: clampWeight(runtime.state.targetWeight - 1),
      now: Date.now(),
    });
    return;
  }

  if (hit.kind === 'inc_target') {
    dispatch(runtime, {
      type: ACTIONS.SET_WEIGHTS,
      initialWeight: runtime.state.initialWeight,
      targetWeight: clampWeight(runtime.state.targetWeight + 1),
      now: Date.now(),
    });
    return;
  }

  if (hit.kind === 'go_confirm') {
      const err = validateWeightInputs(runtime.state.initialWeight, runtime.state.targetWeight);
      if (err) {
        showToast(runtime, err, 1800);
        return;
      }
      dispatch(runtime, { type: ACTIONS.GO_PAGE, page: 'HOME', now: Date.now() });
      return;
    }

  if (hit.kind === 'go_home') {
    dispatch(runtime, { type: ACTIONS.GO_PAGE, page: 'HOME', now: Date.now() });
    return;
  }

  if (hit.kind === 'set_mode') {
    runtime.state.gameMode = hit.id;
    return;
  }

  if (hit.kind === 'start_game') {
    dispatch(runtime, { type: ACTIONS.START_GAME, mode: runtime.state.gameMode, now: Date.now() });
    return;
  }

  if (hit.kind === 'tile') {
    const tile = runtime.state.tiles.find((item) => item.id === hit.id);
    if (tile && tile.status === 'board' && isBlocked(tile, runtime.state.tiles)) {
      if (typeof wx !== 'undefined' && wx.vibrateShort) {
        try {
          wx.vibrateShort({ type: 'light' });
        } catch (_) {
          // no-op
        }
      }
      const now = Date.now();
      if ((runtime.blockedTapHintUntil || 0) <= now) {
        showToast(runtime, '上层食物压住了，先清上面的', 900);
        runtime.blockedTapHintUntil = now + 450;
      }
    }
    dispatch(runtime, { type: ACTIONS.TAP_TILE, tileId: hit.id, now: Date.now() });
    return;
  }

  if (hit.kind === 'reshuffle') {
    dispatch(runtime, { type: ACTIONS.USE_POWERUP, powerUp: 'shuffle', now: Date.now() });
    return;
  }

  if (hit.kind === 'finish_game') {
    runtime.state.page = 'RESULT';
    runtime.state.runFinished = true;
    runtime.state.success = false;
    runtime.state.resultReason = '主动结束';
    showToast(runtime, '已结束本局', 1200);
    syncSceneAudio(runtime);
    return;
  }

  if (hit.kind === 'back_home') {
    dispatch(runtime, { type: ACTIONS.GO_PAGE, page: 'HOME', now: Date.now() });
    return;
  }

  if (hit.kind === 'restart') {
    dispatch(runtime, { type: ACTIONS.RESTART, now: Date.now() });
    return;
  }

  if (hit.kind === 'end_slash') {
    dispatch(runtime, { type: ACTIONS.END_SLASH, now: Date.now() });
  }
}

function bindTouch(runtime) {
  wx.onTouchStart((event) => {
    unlockAudio();
    syncSceneAudio(runtime);
    if (!event.touches || event.touches.length === 0) return;
    if ((runtime.pauseUntil || 0) > Date.now()) return;
    const point = toCanvasTouch(event.touches[0]);

    if (runtime.state.page === 'GAME' && runtime.state.slash.active) {
      handleSlashSwipe(runtime, point.x, point.y);
      return;
    }

    handleTap(runtime, point.x, point.y);
  });

  wx.onTouchMove((event) => {
    if ((runtime.pauseUntil || 0) > Date.now()) return;
    if (!runtime.state.slash.active || !event.touches || event.touches.length === 0) return;
    const point = toCanvasTouch(event.touches[0]);
    handleSlashSwipe(runtime, point.x, point.y);
  });

  wx.onTouchEnd(() => {
    runtime.slash.pointerLast = null;
  });
}

function gameLoop(runtime) {
  const now = Date.now();
  const delta = Math.min(120, now - runtime.lastTs);
  runtime.lastTs = now;

  const paused = (runtime.pauseUntil || 0) > now;
  if (!paused) {
    if (
      runtime.state.page === 'GAME' &&
      !runtime.state.runFinished &&
      runtime.state.gameMode === 'CLASSIC' &&
      !runtime.state.slash.active
    ) {
      dispatch(runtime, { type: ACTIONS.TICK, deltaMs: delta, now });
    }
    updateSlash(runtime, delta);
  }
  updateTransientEffects(runtime, now);

  render(runtime.ctx, runtime.state, runtime);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => gameLoop(runtime));
    return;
  }

  setTimeout(() => gameLoop(runtime), 16);
}

function boot() {
  try {
    const canvas = (typeof GameGlobal !== 'undefined' && GameGlobal.canvas)
      ? GameGlobal.canvas
      : wx.createCanvas();
    const runtime = createRuntime(canvas);
    preloadAssets(runtime);
    bindTouch(runtime);
    syncSceneAudio(runtime);

    wx.onHide(() => {
      pauseAudio();
    });

    wx.onShow(() => {
      resumeAudio();
      syncSceneAudio(runtime);
    });

    gameLoop(runtime);
  } catch (error) {
    console.error('[minigame boot error]', error);
    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal({
        title: '启动失败',
        content: String((error && error.message) || error),
        showCancel: false,
      });
    }
  }
}

module.exports = {
  boot,
};
