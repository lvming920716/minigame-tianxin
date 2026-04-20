'use strict';

const { MAX_EARNED_DOCK_BOOSTS } = require('./gameBalance');

const BASE_FOODS = [
  '🧋','🍟','🍬','🍜','🍦','🍣','🍙','🍩','🍰','🍔','🍕','🌮','🧁','🍿','🌭','🥤','🍡','🥞','🍫','🧇',
];

const REBOUND_ONLY_FOODS = [
  '🍪','🥨','🍭','🍮','🍯','🥜','🍘','🍥','🥮','🍨','🍧','🍠','🌰','🥓','🍗','🍖','🍤','🧀','🍞','🥪',
];

const FOODS = BASE_FOODS.concat(REBOUND_ONLY_FOODS);
const NORMAL_FOOD_COUNT = BASE_FOODS.length;

function weightedChoice(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let cursor = Math.random() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.type;
  }
  return entries[entries.length - 1].type;
}

function choosePowerUpForLevel(level, canSpawnAddSlot, addSlotSpawned) {
  const entries = [
    { type: 'remove3', weight: level >= 1 ? 38 : 0 },
    { type: 'revealTop', weight: level >= 3 ? 34 : 0 },
    { type: 'attractSame', weight: level >= 4 ? 28 : 0 },
  ];

  if (canSpawnAddSlot && addSlotSpawned < 1 && level >= 6) {
    entries.push({ type: 'addSlot', weight: 12 });
  }

  return weightedChoice(entries.filter((entry) => entry.weight > 0));
}

function createCandidatePositions(startX, endX, startY, endY) {
  const positions = [];
  for (let x = startX; x <= endX; x += 1.5) {
    for (let y = startY; y <= endY; y += 1.5) {
      positions.push({
        x: x + (Math.random() * 0.6 - 0.3),
        y: y + (Math.random() * 0.6 - 0.3),
      });
    }
  }

  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = positions[index];
    positions[index] = positions[swapIndex];
    positions[swapIndex] = tmp;
  }

  return positions;
}

function buildReshuffledBoardPositions(boardTiles) {
  const countsByLayer = new Map();
  boardTiles.forEach((tile) => {
    countsByLayer.set(tile.z, (countsByLayer.get(tile.z) || 0) + 1);
  });

  const nextPositions = [];
  const sortedLayers = Array.from(countsByLayer.keys()).sort((left, right) => left - right);
  sortedLayers.forEach((layer) => {
    const required = countsByLayer.get(layer) || 0;
    const inset = Math.min(2, Math.floor(layer / 2));
    const candidates = createCandidatePositions(inset, 8 - inset, inset, 8 - inset);

    for (let index = 0; index < required; index += 1) {
      const fallback = {
        x: Math.random() * 6 + 1,
        y: Math.random() * 6 + 1,
      };
      const candidate = candidates[index] || fallback;
      nextPositions.push({ x: candidate.x, y: candidate.y, z: layer });
    }
  });

  for (let index = nextPositions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = nextPositions[index];
    nextPositions[index] = nextPositions[swapIndex];
    nextPositions[swapIndex] = tmp;
  }

  return nextPositions;
}

function reshuffleBoardPositionsPermutation(allTiles) {
  const boardTiles = allTiles.filter((tile) => tile.status === 'board');
  if (boardTiles.length === 0) return allTiles;

  const positions = buildReshuffledBoardPositions(boardTiles);
  let posIndex = 0;

  return allTiles.map((tile) => {
    if (tile.status !== 'board') return tile;
    const pos = positions[posIndex++];
    return { ...tile, x: pos.x, y: pos.y, z: pos.z };
  });
}

function isBlocked(tile, allTiles) {
  if (tile.status !== 'board') return false;

  return allTiles.some((other) =>
    other.status === 'board' &&
    other.z > tile.z &&
    Math.abs(other.x - tile.x) < 1.5 &&
    Math.abs(other.y - tile.y) < 1.5
  );
}

function generateTileLevel(level = 1, earnedSlotBoosts = 0) {
  const tiles = [];
  const layers = Math.min(8, 2 + Math.floor(level / 4));
  const totalTriplets = Math.min(60, 8 + level * 2 + Math.floor((level * level) / 10));
  const numTypes = Math.min(NORMAL_FOOD_COUNT, level <= 2 ? 5 : 5 + (level - 2));
  const availableTypes = Array.from({ length: NORMAL_FOOD_COUNT }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, numTypes);

  const types = [];
  for (let i = 0; i < totalTriplets; i += 1) {
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    types.push(type, type, type);
  }

  types.sort(() => Math.random() - 0.5);

  let idCounter = 0;
  let addSlotSpawned = 0;
  const canSpawnAddSlot = level >= 6 && earnedSlotBoosts < MAX_EARNED_DOCK_BOOSTS;

  const addLayer = (z, density) => {
    const startX = Math.floor(Math.random() * 2);
    const endX = 8 - Math.floor(Math.random() * 2);
    const startY = Math.floor(Math.random() * 2);
    const endY = 8 - Math.floor(Math.random() * 2);

    for (let x = startX; x <= endX; x += 1.5) {
      for (let y = startY; y <= endY; y += 1.5) {
        if (types.length === 0) return;
        if (Math.random() > density) continue;

        const isPowerUp = Math.random() < 0.032;
        let powerUpType;
        if (isPowerUp) {
          powerUpType = choosePowerUpForLevel(level, canSpawnAddSlot, addSlotSpawned);
          if (powerUpType === 'addSlot') {
            addSlotSpawned += 1;
          }
        }

        tiles.push({
          id: `tile_${level}_${idCounter++}`,
          type: types.pop(),
          x: x + (Math.random() * 0.6 - 0.3),
          y: y + (Math.random() * 0.6 - 0.3),
          z,
          status: 'board',
          powerUp: powerUpType,
        });
      }
    }
  };

  for (let i = 0; i < layers; i += 1) {
    const density = Math.max(0.4, 0.9 - (i * 0.1));
    addLayer(i, density);
  }

  while (types.length > 0) {
    tiles.push({
      id: `tile_${level}_${idCounter++}`,
      type: types.pop(),
      x: Math.random() * 6 + 1,
      y: Math.random() * 6 + 1,
      z: Math.floor(Math.random() * layers),
      status: 'board',
    });
  }

  return tiles;
}

function generateReboundTiles(currentTiles, level, reboundOrdinal = 1) {
  const newTiles = [];
  const baseTriplets = Math.min(10, 3 + Math.floor(level / 5));
  const ordinalBonus = Math.min(2, Math.max(0, reboundOrdinal - 1));
  const reboundTriplets = Math.min(14, baseTriplets + ordinalBonus);

  const maxZ = currentTiles.reduce((max, tile) => Math.max(max, tile.z), 0);

  const reboundTypeIndices = Array.from({ length: REBOUND_ONLY_FOODS.length }, (_, i) => NORMAL_FOOD_COUNT + i);
  const reboundTypeCount = Math.min(reboundTypeIndices.length, 3 + Math.floor(level / 2));
  const availableTypes = reboundTypeIndices.sort(() => Math.random() - 0.5).slice(0, reboundTypeCount);

  const types = [];
  for (let i = 0; i < reboundTriplets; i += 1) {
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    types.push(type, type, type);
  }
  types.sort(() => Math.random() - 0.5);

  let idCounter = Date.now();
  while (types.length > 0) {
    newTiles.push({
      id: `rebound_${idCounter++}`,
      type: types.pop(),
      x: Math.random() * 6 + 1,
      y: Math.random() * 6 + 1,
      z: maxZ + 1 + Math.floor(Math.random() * 2),
      status: 'board',
    });
  }

  return newTiles;
}

module.exports = {
  BASE_FOODS,
  REBOUND_ONLY_FOODS,
  FOODS,
  isBlocked,
  generateTileLevel,
  generateReboundTiles,
  reshuffleBoardPositionsPermutation,
};
