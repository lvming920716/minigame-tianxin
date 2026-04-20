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
  return level >= 7 ? 3 : 2;
}

function getReboundProbability(level) {
  const baseReboundProb = Math.min(0.22, 0.07 + (level - 2) * 0.018);
  return Math.min(0.242, baseReboundProb * 1.1);
}

function getReboundWeightGain(totalWeightToLose, totalLevels, randomFactor) {
  return (totalWeightToLose / totalLevels) * randomFactor;
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
