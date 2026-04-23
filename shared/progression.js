'use strict';

function getTotalLevels(totalWeightToLose) {
  return Math.max(10, 5 + Math.floor(totalWeightToLose / 2));
}

function getTripletsThisLevel(level) {
  return Math.min(60, 8 + level * 2 + Math.floor((level * level) / 10));
}

function getBaseWeightDrop(totalWeightToLose, totalLevels, level) {
  return (totalWeightToLose / totalLevels) / getTripletsThisLevel(level);
}

function getMatchWeightDrop(totalWeightToLose, totalLevels, level, multiplier = 1) {
  return getBaseWeightDrop(totalWeightToLose, totalLevels, level) * multiplier;
}

function getSlashWeightDrop(totalWeightToLose, totalLevels, level, slashedCount, factor) {
  const baseDrop = getBaseWeightDrop(totalWeightToLose, totalLevels, level);
  const countFactor = Math.sqrt(Math.max(1, slashedCount));
  const levelFactor = 0.9 + Math.min(0.7, level / Math.max(8, totalLevels));
  return baseDrop * countFactor * levelFactor * factor;
}

function getMaxReboundsThisLevel(level) {
  return level >= 8 ? 2 : 1;
}

function getReboundProbability(level, stage) {
  if (stage <= 1) return 0;

  const safeLevel = Math.max(1, level);
  const configs = {
    2: { base: 0.03, bonusStart: 4, bonusStep: 0.004, cap: 0.055 },
    3: { base: 0.045, bonusStart: 5, bonusStep: 0.005, cap: 0.075 },
    4: { base: 0.06, bonusStart: 6, bonusStep: 0.006, cap: 0.095 },
  };
  const config = configs[stage] || configs[4];
  const levelBonus = Math.max(0, safeLevel - config.bonusStart) * config.bonusStep;
  return Math.min(config.cap, config.base + levelBonus);
}

function getReboundWeightGain(initialWeight, currentWeight, targetWeight, totalLevels, stage, randomFactor) {
  const totalWeightToLose = Math.max(0.1, initialWeight - targetWeight);
  const lostWeight = Math.max(0, initialWeight - currentWeight);
  if (stage <= 1 || lostWeight <= 0) return 0;

  const safeRandom = Math.max(0, Math.min(1, randomFactor));
  const ratioRanges = {
    2: { min: 0.03, max: 0.04 },
    3: { min: 0.04, max: 0.05 },
    4: { min: 0.05, max: 0.06 },
  };
  const range = ratioRanges[stage] || ratioRanges[4];
  const ratio = range.min + (range.max - range.min) * safeRandom;
  const gain = lostWeight * ratio;
  const safetyCap = totalWeightToLose * range.max;
  const baselineFloor = Math.min(safetyCap, totalWeightToLose / Math.max(80, totalLevels * 6));
  return Math.min(safetyCap, Math.max(baselineFloor, gain));
}

module.exports = {
  getTotalLevels,
  getTripletsThisLevel,
  getBaseWeightDrop,
  getMatchWeightDrop,
  getSlashWeightDrop,
  getMaxReboundsThisLevel,
  getReboundProbability,
  getReboundWeightGain,
};
