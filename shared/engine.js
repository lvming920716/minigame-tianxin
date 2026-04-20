'use strict';

const {
  DEFAULT_INITIAL_WEIGHT,
  DEFAULT_TARGET_WEIGHT,
  CLASSIC_MODE_DURATION_SECONDS,
  BASE_DOCK_SIZE,
  MAX_EARNED_DOCK_BOOSTS,
  COMBO_WINDOW_MS,
  MATCH_SCORE,
  SLASH_SCORE_PER_TILE,
  SLASH_WEIGHT_DROP_FACTOR,
  SLIM_BOOST_CONSECUTIVE_SAME_TYPE,
  SLIM_BOOST_COOLDOWN_TRIPLES,
  SLIM_BOOST_WEIGHT_MULTIPLIER,
  SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE,
  SWEET_SLASH_MAX_PER_GAME,
  SWEET_SLASH_BASE_DURATION_MS,
  SWEET_SLASH_MAX_DURATION_MS,
  SWEET_SLASH_BONUS_PER_HIT_MS,
  SWEET_SLASH_SCORE_BASE,
  SWEET_SLASH_SCORE_COMBO_STEP,
  REBOUND_MODAL_DURATION_MS,
  SPECIAL_EFFECT_DURATION_MS,
} = require('./gameBalance');
const {
  FOODS,
  generateTileLevel,
  generateReboundTiles,
  isBlocked,
  reshuffleBoardPositionsPermutation,
} = require('./tileMatchLogic');
const { getLevelOutcome } = require('./levelOutcome');
const { getBodyStageForWeight, getRelativeStageMeta } = require('./bodyStage');
const {
  getMatchWeightDrop,
  getMaxReboundsThisLevel,
  getReboundProbability,
  getReboundWeightGain,
  getSlashWeightDrop,
  getTotalLevels,
} = require('./progression');
const { GAME_AUDIO_EVENTS } = require('./gameEvents');
const { CHARACTER_OPTIONS } = require('./characters');

const ACTIONS = {
  SELECT_CHARACTER: 'SELECT_CHARACTER',
  SET_WEIGHTS: 'SET_WEIGHTS',
  GO_PAGE: 'GO_PAGE',
  START_GAME: 'START_GAME',
  TAP_TILE: 'TAP_TILE',
  USE_POWERUP: 'USE_POWERUP',
  TICK: 'TICK',
  ENTER_SLASH: 'ENTER_SLASH',
  SLASH_HIT: 'SLASH_HIT',
  END_SLASH: 'END_SLASH',
  NEXT_LEVEL: 'NEXT_LEVEL',
  RESTART: 'RESTART',
};

function nowFrom(action) {
  return typeof action.now === 'number' ? action.now : Date.now();
}

function randomFrom(action) {
  return typeof action.random === 'number' ? action.random : Math.random();
}

function emitAudio(effects, event) {
  effects.push({ type: 'play_audio', event });
}

function emitToast(effects, text) {
  effects.push({ type: 'show_toast', text });
}

function emitFlash(effects, text, tone) {
  effects.push({ type: 'show_screen_flash', text, tone: tone || 'pink' });
}

function emitPause(effects, durationMs) {
  effects.push({ type: 'pause_gameplay', durationMs: durationMs || 520 });
}

function emitTileTransfer(effects, tile, dockIndex) {
  effects.push({
    type: 'show_tile_transfer',
    tile: {
      id: tile.id,
      type: tile.type,
      x: tile.x,
      y: tile.y,
      z: tile.z,
    },
    dockIndex,
    durationMs: 320,
  });
}

function emitMatchBurst(effects, tiles, delayMs) {
  effects.push({
    type: 'show_match_burst',
    tiles: tiles.map((tile) => ({
      id: tile.id,
      type: tile.type,
      dockIndex: tile.dockIndex,
    })),
    delayMs: delayMs || 0,
  });
}

function createInitialState() {
  const initialWeight = DEFAULT_INITIAL_WEIGHT;
  const targetWeight = DEFAULT_TARGET_WEIGHT;
  const stage = getBodyStageForWeight(initialWeight, initialWeight, targetWeight).stage;

  return {
    page: 'CHARACTER_SELECT',
    selectedCharacterId: CHARACTER_OPTIONS[0].id,
    gameMode: 'INFINITE',
    initialWeight,
    targetWeight,
    currentWeight: initialWeight,
    score: 0,
    matchCount: 0,
    slimmingStage: stage,
    level: 1,
    totalLevels: getTotalLevels(Math.max(0.1, initialWeight - targetWeight)),
    tiles: [],
    dock: [],
    reshufflesRemaining: 6,
    maxDockSize: BASE_DOCK_SIZE,
    earnedSlotBoosts: 0,
    combo: 0,
    lastMatchAt: 0,
    timeLeftMs: CLASSIC_MODE_DURATION_SECONDS * 1000,
    timeLeft: CLASSIC_MODE_DURATION_SECONDS,
    slash: {
      active: false,
      pendingTileIds: [],
      slashedCount: 0,
      feverScore: 0,
      combo: 0,
      lastHitAt: 0,
      timeLeftMs: 0,
    },
    lastMatchedType: null,
    sameTypeStreak: 0,
    slimBoostCooldown: 0,
    slashLastType: null,
    slashSameTypeStreak: 0,
    slashTriggersThisGame: 0,
    reboundsThisLevel: 0,
    runFinished: false,
    success: false,
    resultReason: '',
  };
}

function boardCount(state) {
  return state.tiles.filter((tile) => tile.status === 'board').length;
}

function buildActiveTypeCounts(state) {
  const counts = new Map();
  state.dock.forEach((tile) => {
    counts.set(tile.type, (counts.get(tile.type) || 0) + 1);
  });
  state.tiles.forEach((tile) => {
    if (tile.status !== 'board') return;
    counts.set(tile.type, (counts.get(tile.type) || 0) + 1);
  });
  return counts;
}

function rescuePlayableBoard(state) {
  let boardTiles = state.tiles.filter((tile) => tile.status === 'board');
  if (boardTiles.length === 0) return;

  const activeCounts = buildActiveTypeCounts(state);
  const alreadyPlayable = Array.from(activeCounts.values()).every((count) => count % 3 === 0);
  if (alreadyPlayable) return;

  let totalActive = state.dock.length + boardTiles.length;
  let removeCount = totalActive % 3;

  while (removeCount > 0 && boardTiles.length > 0) {
    const counts = buildActiveTypeCounts(state);
    const pickIndex = boardTiles.findIndex((tile) => ((counts.get(tile.type) || 0) % 3) === 1);
    const chosen = boardTiles[pickIndex >= 0 ? pickIndex : boardTiles.length - 1];
    state.tiles = state.tiles.map((tile) => {
      if (tile.id !== chosen.id) return tile;
      return { ...tile, status: 'eliminated' };
    });
    boardTiles = state.tiles.filter((tile) => tile.status === 'board');
    removeCount -= 1;
  }

  boardTiles = state.tiles.filter((tile) => tile.status === 'board');
  if (boardTiles.length === 0) return;

  const dockCounts = new Map();
  state.dock.forEach((tile) => {
    dockCounts.set(tile.type, (dockCounts.get(tile.type) || 0) + 1);
  });

  const desiredTypes = [];
  dockCounts.forEach((count, type) => {
    const remainder = count % 3;
    if (remainder > 0) {
      const needed = 3 - remainder;
      for (let i = 0; i < needed; i += 1) {
        desiredTypes.push(type);
      }
    }
  });

  if (desiredTypes.length > boardTiles.length) {
    return;
  }

  const boardTypePool = Array.from(new Set(boardTiles.map((tile) => tile.type)));
  const dockTypePool = Array.from(dockCounts.keys());
  const typePool = Array.from(new Set(boardTypePool.concat(dockTypePool)));
  if (typePool.length === 0) {
    typePool.push(0);
  }

  while (desiredTypes.length < boardTiles.length) {
    const type = typePool[Math.floor(Math.random() * typePool.length)];
    desiredTypes.push(type, type, type);
  }

  desiredTypes.length = boardTiles.length;
  for (let index = desiredTypes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = desiredTypes[index];
    desiredTypes[index] = desiredTypes[swapIndex];
    desiredTypes[swapIndex] = tmp;
  }

  const nextTypesById = new Map();
  boardTiles.forEach((tile, index) => {
    nextTypesById.set(tile.id, desiredTypes[index]);
  });

  state.tiles = state.tiles.map((tile) => {
    if (tile.status !== 'board') return tile;
    const nextType = nextTypesById.get(tile.id);
    if (typeof nextType !== 'number' || nextType === tile.type) return tile;
    return { ...tile, type: nextType };
  });
}

function insertDockGrouped(dock, tile) {
  const next = dock.slice();
  const firstIndex = next.findIndex((item) => item.type === tile.type);
  if (firstIndex < 0) {
    next.push(tile);
    return next;
  }

  let insertIndex = firstIndex;
  while (insertIndex < next.length && next[insertIndex].type === tile.type) {
    insertIndex += 1;
  }
  next.splice(insertIndex, 0, tile);
  return next;
}

function applyWeightStage(state, effects) {
  const stageRes = getBodyStageForWeight(state.initialWeight, state.currentWeight, state.targetWeight);
  if (stageRes.stage !== state.slimmingStage) {
    state.slimmingStage = stageRes.stage;
    const tips = {
      2: '进入燃动期，轮廓开始收紧啦！',
      3: '进入轻盈期，线条感越来越明显！',
      4: '进入定型期，已经很接近目标状态了！',
    };
    if (tips[state.slimmingStage]) {
      emitToast(effects, tips[state.slimmingStage]);
    } else {
      const meta = getRelativeStageMeta(state.slimmingStage);
      if (meta && meta.hint) emitToast(effects, meta.hint);
    }
  }
}

function countTilesBlockedBy(targetTile, tiles) {
  return tiles.filter((tile) =>
    tile.status === 'board' &&
    tile.id !== targetTile.id &&
    tile.z < targetTile.z &&
    Math.abs(tile.x - targetTile.x) < 1.5 &&
    Math.abs(tile.y - targetTile.y) < 1.5
  ).length;
}

function findRevealTargets(state, count) {
  return state.tiles
    .filter((tile) => tile.status === 'board')
    .map((tile) => ({
      tile,
      blockedCount: countTilesBlockedBy(tile, state.tiles),
    }))
    .sort((left, right) => {
      if (right.blockedCount !== left.blockedCount) return right.blockedCount - left.blockedCount;
      if (right.tile.z !== left.tile.z) return right.tile.z - left.tile.z;
      return left.tile.id.localeCompare(right.tile.id);
    })
    .slice(0, count)
    .map((entry) => entry.tile);
}

function findAttractTarget(state, matchType) {
  const boardTiles = state.tiles.filter((tile) => tile.status === 'board' && tile.type === matchType);
  if (boardTiles.length === 0) return null;
  const unblocked = boardTiles.filter((tile) => !isBlocked(tile, state.tiles));
  const pool = unblocked.length > 0 ? unblocked : boardTiles;
  return pool.sort((left, right) => {
    if (right.z !== left.z) return right.z - left.z;
    const leftCenterDist = Math.abs(left.x - 4.5) + Math.abs(left.y - 4.5);
    const rightCenterDist = Math.abs(right.x - 4.5) + Math.abs(right.y - 4.5);
    return leftCenterDist - rightCenterDist;
  })[0];
}

function resolveImmediateMatches(state, action, effects) {
  let triggeredRebound = false;
  let matchedType = selectMatchType(state.dock);
  while (matchedType !== null) {
    triggeredRebound = handleTripleMatch(state, action, effects, matchedType, nowFrom(action)) || triggeredRebound;
    matchedType = selectMatchType(state.dock);
  }
  return triggeredRebound;
}

function resetLevelState(state) {
  state.tiles = generateTileLevel(state.level, state.earnedSlotBoosts);
  state.dock = [];
  state.maxDockSize = BASE_DOCK_SIZE + state.earnedSlotBoosts;
  state.combo = 0;
  state.lastMatchAt = 0;
  state.reboundsThisLevel = 0;
  state.lastMatchedType = null;
  state.sameTypeStreak = 0;
  state.slimBoostCooldown = 0;
  state.slashLastType = null;
  state.slashSameTypeStreak = 0;
}

function resetRunState(state, mode) {
  const stage = getBodyStageForWeight(state.initialWeight, state.initialWeight, state.targetWeight).stage;
  state.page = 'GAME';
  state.gameMode = mode || state.gameMode;
  state.currentWeight = state.initialWeight;
  state.score = 0;
  state.matchCount = 0;
  state.slimmingStage = stage;
  state.level = 1;
  state.earnedSlotBoosts = 0;
  state.reshufflesRemaining = 6;
  state.maxDockSize = BASE_DOCK_SIZE;
  state.combo = 0;
  state.lastMatchAt = 0;
  state.timeLeftMs = CLASSIC_MODE_DURATION_SECONDS * 1000;
  state.timeLeft = CLASSIC_MODE_DURATION_SECONDS;
  state.slash = { active: false, pendingTileIds: [], slashedCount: 0 };
  state.slash.feverScore = 0;
  state.slash.combo = 0;
  state.slash.lastHitAt = 0;
  state.slash.timeLeftMs = 0;
  state.slashTriggersThisGame = 0;
  state.runFinished = false;
  state.success = false;
  state.resultReason = '';
  state.totalLevels = getTotalLevels(Math.max(0.1, state.initialWeight - state.targetWeight));
  resetLevelState(state);
}

function resolveBoardOutcome(state, triggeredRebound, effects) {
  const outcome = getLevelOutcome({
    remainingBoardCount: boardCount(state),
    triggeredRebound: !!triggeredRebound,
    currentWeight: state.currentWeight,
    targetWeight: state.targetWeight,
  });

  if (outcome === 'CONTINUE' || state.slash.active) {
    return;
  }

  if (outcome === 'NEXT_LEVEL') {
    state.level += 1;
    resetLevelState(state);
    emitAudio(effects, GAME_AUDIO_EVENTS.levelUp);
    emitToast(effects, `第 ${state.level} 关开始！`);
    effects.push({ type: 'show_levelup_overlay', level: state.level });
    return;
  }

  if (outcome === 'RESULT') {
    state.page = 'RESULT';
    state.runFinished = true;
    state.success = true;
    state.resultReason = '目标达成';
    emitAudio(effects, GAME_AUDIO_EVENTS.goalReached);
  }
}

function applyPowerUp(state, powerUp, action, effects) {
  if (!powerUp) return;

  if (powerUp === 'shuffle') {
    if (state.reshufflesRemaining <= 0) {
      emitToast(effects, '重新排列次数已用完');
      emitFlash(effects, '次数已空', 'pink');
      return;
    }
    state.reshufflesRemaining -= 1;
    state.tiles = reshuffleBoardPositionsPermutation(state.tiles);
    emitToast(effects, `重新排列：布局已重排，剩余 ${state.reshufflesRemaining} 次`);
    emitFlash(effects, '重新排列', 'pink');
    emitPause(effects, 420);
    return;
  }

  if (powerUp === 'remove3') {
    const boardTiles = state.tiles.filter((tile) => tile.status === 'board');
    const removable = boardTiles.sort(() => randomFrom(action) - 0.5).slice(0, Math.min(3, boardTiles.length));
    if (removable.length === 0) return;
    const idSet = new Set(removable.map((tile) => tile.id));

    state.tiles = state.tiles.map((tile) => {
      if (!idSet.has(tile.id)) return tile;
      return { ...tile, status: 'eliminated' };
    });

    const totalWeightToLose = Math.max(0.1, state.initialWeight - state.targetWeight);
    const extraDrop = getMatchWeightDrop(totalWeightToLose, state.totalLevels, state.level) * removable.length;
    state.currentWeight = Math.max(state.targetWeight - 20, state.currentWeight - extraDrop);
    state.score += removable.length * 10;
    applyWeightStage(state, effects);
    rescuePlayableBoard(state);
    emitToast(effects, '轻盈清盘：随机消除 3 个食物');
    emitFlash(effects, '轻盈清盘', 'gold');
    emitPause(effects, 560);
    return;
  }

  if (powerUp === 'revealTop') {
    const revealTargets = findRevealTargets(state, 2);
    if (revealTargets.length === 0) return;
    const idSet = new Set(revealTargets.map((tile) => tile.id));
    state.tiles = state.tiles.map((tile) => {
      if (!idSet.has(tile.id)) return tile;
      return { ...tile, status: 'eliminated' };
    });
    const totalWeightToLose = Math.max(0.1, state.initialWeight - state.targetWeight);
    const extraDrop = getMatchWeightDrop(totalWeightToLose, state.totalLevels, state.level, 0.9) * revealTargets.length;
    state.currentWeight = Math.max(state.targetWeight - 20, state.currentWeight - extraDrop);
    state.score += revealTargets.length * 12;
    applyWeightStage(state, effects);
    rescuePlayableBoard(state);
    emitToast(effects, '揭盖轻食：顶层遮挡已被清开');
    emitFlash(effects, '揭盖轻食', 'pink');
    emitPause(effects, 620);
    return;
  }

  if (powerUp === 'attractSame') {
    const matchType = action.matchType;
    if (typeof matchType !== 'number') return;
    const target = findAttractTarget(state, matchType);
    if (!target) {
      emitToast(effects, '同味吸附：场上暂无可吸附同类');
      emitFlash(effects, '同味落空', 'gold');
      emitPause(effects, 460);
      return;
    }

    state.tiles = state.tiles.map((tile) => {
      if (tile.id !== target.id) return tile;
      return { ...tile, status: 'dock' };
    });
    state.dock = insertDockGrouped(state.dock, { ...target, status: 'dock' });
    const dockIndex = state.dock.findIndex((item) => item.id === target.id);
    emitTileTransfer(effects, target, dockIndex);
    emitToast(effects, `同味吸附：${FOODS[matchType] || '食物'} 自动飞入甜心盘`);
    emitFlash(effects, '同味吸附', 'gold');
    emitPause(effects, 680);
    resolveImmediateMatches(state, action, effects);
    return;
  }

  if (powerUp === 'addSlot') {
    if (state.earnedSlotBoosts >= MAX_EARNED_DOCK_BOOSTS) {
      emitToast(effects, '甜心盘槽位已满');
      return;
    }
    state.earnedSlotBoosts += 1;
    state.maxDockSize = BASE_DOCK_SIZE + state.earnedSlotBoosts;
    emitToast(effects, `甜心扩容：甜心盘已扩容到 ${state.maxDockSize} 格`);
    emitFlash(effects, '甜心扩容', 'pink');
    emitPause(effects, 560);
  }
}

function selectMatchType(dock) {
  const counts = new Map();
  dock.forEach((tile) => {
    counts.set(tile.type, (counts.get(tile.type) || 0) + 1);
  });
  for (const [type, count] of counts.entries()) {
    if (count >= 3) return type;
  }
  return null;
}

function tryTriggerRebound(state, action, effects) {
  if (state.level < 2) return false;
  if (boardCount(state) <= 0) return false;

  const maxRebounds = getMaxReboundsThisLevel(state.level);
  if (state.reboundsThisLevel >= maxRebounds) return false;
  if (randomFrom(action) >= getReboundProbability(state.level)) return false;

  const reboundOrdinal = state.reboundsThisLevel + 1;
  const reboundTiles = generateReboundTiles(state.tiles, state.level, reboundOrdinal);
  const oldWeight = state.currentWeight;
  const totalWeightToLose = Math.max(0.1, state.initialWeight - state.targetWeight);
  const gain = getReboundWeightGain(totalWeightToLose, state.totalLevels, randomFrom(action) * 0.5 + 0.5);

  state.reboundsThisLevel = reboundOrdinal;
  state.tiles = state.tiles.concat(reboundTiles);
  state.currentWeight = Math.min(state.initialWeight, state.currentWeight + gain);

  applyWeightStage(state, effects);
  emitAudio(effects, GAME_AUDIO_EVENTS.rebound);
  emitToast(effects, '反弹来袭！新零食掉落');
  effects.push({
    type: 'show_rebound_modal',
    oldWeight,
    newWeight: state.currentWeight,
    incomingFoods: reboundTiles.map((tile) => FOODS[tile.type] || '🍩'),
    durationMs: REBOUND_MODAL_DURATION_MS,
  });
  return true;
}

function canTriggerSweetSlash(state, slashTargets) {
  return (
    !state.slash.active &&
    slashTargets.length > 0 &&
    state.slashTriggersThisGame < SWEET_SLASH_MAX_PER_GAME
  );
}

function startSweetSlash(state, effects, slashTargets) {
  if (!canTriggerSweetSlash(state, slashTargets)) {
    return false;
  }

  state.slash.active = true;
  state.slash.pendingTileIds = slashTargets.map((target) => target.id);
  state.slash.slashedCount = 0;
  state.slash.feverScore = 0;
  state.slash.combo = 0;
  state.slash.lastHitAt = 0;
  state.slash.timeLeftMs = SWEET_SLASH_BASE_DURATION_MS;
  state.slashTriggersThisGame += 1;
  state.slashSameTypeStreak = 0;
  state.slashLastType = null;

  emitAudio(effects, GAME_AUDIO_EVENTS.sweetSlashStart);
  emitToast(effects, '同味四连命中，甜心狂切爆发');
  emitFlash(effects, '甜心狂切爆发', 'gold');
  effects.push({
    type: 'start_slash_arena',
    targets: slashTargets,
    durationMs: SWEET_SLASH_BASE_DURATION_MS,
    maxDurationMs: SWEET_SLASH_MAX_DURATION_MS,
    bonusPerHitMs: SWEET_SLASH_BONUS_PER_HIT_MS,
  });
  return true;
}

function handleTripleMatch(state, action, effects, matchType, now) {
  const matchedTiles = [];
  let removed = 0;
  const nextDock = [];
  for (let dockIndex = 0; dockIndex < state.dock.length; dockIndex += 1) {
    const tile = state.dock[dockIndex];
    if (tile.type === matchType && removed < 3) {
      matchedTiles.push({ ...tile, dockIndex });
      removed += 1;
      continue;
    }
    nextDock.push(tile);
  }
  state.dock = nextDock;

  const matchedIdSet = new Set(matchedTiles.map((tile) => tile.id));
  state.tiles = state.tiles.map((tile) => {
    if (!matchedIdSet.has(tile.id)) return tile;
    return { ...tile, status: 'eliminated' };
  });

  state.matchCount += 1;

  if (state.lastMatchAt > 0 && now - state.lastMatchAt <= COMBO_WINDOW_MS) {
    state.combo += 1;
  } else {
    state.combo = 1;
  }
  state.lastMatchAt = now;

  if (state.lastMatchedType === matchType) {
    state.sameTypeStreak += 1;
  } else {
    state.lastMatchedType = matchType;
    state.sameTypeStreak = 1;
  }

  if (state.slashLastType === matchType) {
    state.slashSameTypeStreak += 1;
  } else {
    state.slashLastType = matchType;
    state.slashSameTypeStreak = 1;
  }

  let weightMultiplier = 1;
  if (state.slimBoostCooldown > 0) {
    state.slimBoostCooldown -= 1;
  } else if (state.sameTypeStreak >= SLIM_BOOST_CONSECUTIVE_SAME_TYPE) {
    weightMultiplier = SLIM_BOOST_WEIGHT_MULTIPLIER;
    state.slimBoostCooldown = SLIM_BOOST_COOLDOWN_TRIPLES;
    emitToast(effects, '加速变瘦触发');
    emitFlash(effects, `连续同类 x${SLIM_BOOST_CONSECUTIVE_SAME_TYPE}`, 'gold');
  }

  const comboMultiplier = state.combo >= 2 ? 3 : 1;
  state.score += MATCH_SCORE * comboMultiplier;

  const totalWeightToLose = Math.max(0.1, state.initialWeight - state.targetWeight);
  const oldWeight = state.currentWeight;
  const weightDrop = getMatchWeightDrop(totalWeightToLose, state.totalLevels, state.level, weightMultiplier);
  state.currentWeight = Math.max(state.targetWeight, state.currentWeight - weightDrop);

  applyWeightStage(state, effects);
  emitMatchBurst(effects, matchedTiles, 150);

  emitAudio(effects, GAME_AUDIO_EVENTS.tripleMatch);
  if (state.combo >= 2) {
    emitAudio(effects, GAME_AUDIO_EVENTS.comboBurst);
  }
  if (weightMultiplier > 1) {
    effects.push({
      type: 'show_special_overlay',
      oldWeight,
      newWeight: state.currentWeight,
      durationMs: SPECIAL_EFFECT_DURATION_MS,
    });
  }

  matchedTiles.forEach((tile) => {
    applyPowerUp(state, tile.powerUp, { ...action, matchType }, effects);
  });

  const slashTargets = state.tiles
    .filter((tile) => tile.status === 'board')
    .map((tile) => ({ id: tile.id, type: tile.type }));

  if (
    state.slashSameTypeStreak === SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE - 1 &&
    canTriggerSweetSlash(state, slashTargets)
  ) {
    emitToast(effects, '再来一次同类三消，可直接触发狂切');
    emitFlash(effects, '四连可直开狂切', 'gold');
  }

  const triggeredRebound = tryTriggerRebound(state, action, effects);

  if (state.slashSameTypeStreak >= SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE) {
    startSweetSlash(state, effects, slashTargets);
  }

  return triggeredRebound;
}

function update(state, action) {
  const effects = [];
  if (action.type === ACTIONS.TICK) {
    if (state.page !== 'GAME' || state.runFinished) {
      return { state, effects };
    }
    if (state.gameMode !== 'CLASSIC' || state.slash.active) {
      return { state, effects };
    }

    const next = { ...state };
    const deltaMs = Math.max(0, action.deltaMs || 16);
    next.timeLeftMs = Math.max(0, next.timeLeftMs - deltaMs);
    next.timeLeft = Math.ceil(next.timeLeftMs / 1000);

    if (next.timeLeftMs <= 0) {
      next.page = 'RESULT';
      next.runFinished = true;
      next.success = false;
      next.resultReason = '时间耗尽';
      emitAudio(effects, GAME_AUDIO_EVENTS.timeout);
    }

    return { state: next, effects };
  }

  const next = {
    ...state,
    slash: {
      active: state.slash.active,
      pendingTileIds: [...state.slash.pendingTileIds],
      slashedCount: state.slash.slashedCount,
      feverScore: state.slash.feverScore,
      combo: state.slash.combo,
      lastHitAt: state.slash.lastHitAt,
      timeLeftMs: state.slash.timeLeftMs,
    },
    tiles: state.tiles.slice(),
    dock: state.dock.slice(),
  };

  switch (action.type) {
    case ACTIONS.SELECT_CHARACTER: {
      next.selectedCharacterId = action.characterId;
      return { state: next, effects };
    }
    case ACTIONS.SET_WEIGHTS: {
      next.initialWeight = action.initialWeight;
      next.targetWeight = action.targetWeight;
      next.currentWeight = action.initialWeight;
      next.totalLevels = getTotalLevels(Math.max(0.1, action.initialWeight - action.targetWeight));
      next.slimmingStage = getBodyStageForWeight(action.initialWeight, action.initialWeight, action.targetWeight).stage;
      return { state: next, effects };
    }
    case ACTIONS.GO_PAGE: {
      next.page = action.page;
      return { state: next, effects };
    }
    case ACTIONS.START_GAME: {
      resetRunState(next, action.mode);
      emitAudio(effects, GAME_AUDIO_EVENTS.uiTransition);
      return { state: next, effects };
    }
    case ACTIONS.RESTART: {
      resetRunState(next, next.gameMode);
      return { state: next, effects };
    }
    case ACTIONS.NEXT_LEVEL: {
      next.level += 1;
      resetLevelState(next);
      return { state: next, effects };
    }
    case ACTIONS.USE_POWERUP: {
      applyPowerUp(next, action.powerUp, action, effects);
      resolveBoardOutcome(next, false, effects);
      return { state: next, effects };
    }
    case ACTIONS.TAP_TILE: {
      if (next.page !== 'GAME' || next.runFinished || next.slash.active) {
        return { state: next, effects };
      }
      const tile = next.tiles.find((item) => item.id === action.tileId);
      if (!tile || tile.status !== 'board') {
        return { state: next, effects };
      }

      if (isBlocked(tile, next.tiles)) {
        emitAudio(effects, GAME_AUDIO_EVENTS.tileBlocked);
        return { state: next, effects };
      }

      next.tiles = next.tiles.map((item) => {
        if (item.id !== action.tileId) return item;
        return { ...item, status: 'dock' };
      });
      next.dock = insertDockGrouped(next.dock, { ...tile, status: 'dock' });
      const dockIndex = next.dock.findIndex((item) => item.id === action.tileId);
      emitTileTransfer(effects, tile, dockIndex);
      emitAudio(effects, GAME_AUDIO_EVENTS.tilePick);

      const matchedType = selectMatchType(next.dock);
      let triggeredRebound = false;
      if (matchedType !== null) {
        triggeredRebound = handleTripleMatch(next, action, effects, matchedType, nowFrom(action));
      }

      resolveBoardOutcome(next, triggeredRebound, effects);

      if (!next.runFinished && !next.slash.active && next.dock.length >= next.maxDockSize) {
        next.page = 'RESULT';
        next.runFinished = true;
        next.success = false;
        next.resultReason = '甜心盘满了';
        emitAudio(effects, GAME_AUDIO_EVENTS.timeout);
      }

      return { state: next, effects };
    }
    case ACTIONS.SLASH_HIT: {
      if (next.page !== 'GAME' || !next.slash.active) {
        return { state: next, effects };
      }
      const isVirtualHit = !!action.virtual;
      if (!isVirtualHit && !next.slash.pendingTileIds.includes(action.tileId)) {
        return { state: next, effects };
      }

      const tile = isVirtualHit ? null : next.tiles.find((item) => item.id === action.tileId);
      if (!isVirtualHit && (!tile || tile.status !== 'board')) {
        return { state: next, effects };
      }

      if (!isVirtualHit) {
        next.tiles = next.tiles.map((item) => {
          if (item.id !== action.tileId) return item;
          return { ...item, status: 'eliminated' };
        });
        next.slash.pendingTileIds = next.slash.pendingTileIds.filter((id) => id !== action.tileId);
      }
      next.slash.slashedCount += 1;
      const hitNow = nowFrom(action);
      if (next.slash.combo > 0 && hitNow - next.slash.lastHitAt <= 450) {
        next.slash.combo += 1;
      } else {
        next.slash.combo = 1;
      }
      const hitScore = SWEET_SLASH_SCORE_BASE + Math.min(8, next.slash.combo - 1) * SWEET_SLASH_SCORE_COMBO_STEP;
      next.slash.feverScore += hitScore;
      next.score += Math.round(hitScore * 0.32);
      next.slash.lastHitAt = hitNow;
      const currentSlashTimeLeft = typeof action.currentTimeLeftMs === 'number'
        ? action.currentTimeLeftMs
        : next.slash.timeLeftMs;
      next.slash.timeLeftMs = Math.max(0, Math.min(SWEET_SLASH_MAX_DURATION_MS, currentSlashTimeLeft));
      emitAudio(effects, GAME_AUDIO_EVENTS.sweetSlashHit);
      return { state: next, effects };
    }
    case ACTIONS.END_SLASH: {
      if (!next.slash.active) {
        return { state: next, effects };
      }
      const count = next.slash.slashedCount;
      const feverScore = next.slash.feverScore;
      const oldWeight = next.currentWeight;
      const totalWeightToLose = Math.max(0.1, next.initialWeight - next.targetWeight);
      const scoreFactor = 0.8 + Math.min(0.55, feverScore / 3200);
      const drop = getSlashWeightDrop(
        totalWeightToLose,
        next.totalLevels,
        next.level,
        Math.max(1, count),
        SLASH_WEIGHT_DROP_FACTOR * scoreFactor
      );
      next.slash.active = false;
      next.slash.pendingTileIds = [];
      next.slash.slashedCount = 0;
      next.slash.combo = 0;
      next.slash.lastHitAt = 0;
      next.slash.timeLeftMs = 0;
      next.slash.feverScore = 0;
      next.currentWeight = Math.max(next.targetWeight, next.currentWeight - drop);
      applyWeightStage(next, effects);
      rescuePlayableBoard(next);
      emitAudio(effects, GAME_AUDIO_EVENTS.sweetSlashFinish);
      emitToast(effects, `甜心狂切结算：${feverScore} 燃脂分 · -${drop.toFixed(1)} 斤`);
      emitFlash(effects, `燃脂 -${drop.toFixed(1)}斤`, 'gold');
      effects.push({
        type: 'show_special_overlay',
        oldWeight,
        newWeight: next.currentWeight,
        durationMs: SPECIAL_EFFECT_DURATION_MS,
      });
      resolveBoardOutcome(next, false, effects);
      return { state: next, effects };
    }
    default:
      return { state: next, effects };
  }
}

module.exports = {
  ACTIONS,
  createInitialState,
  update,
};
