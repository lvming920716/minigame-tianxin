'use strict';

const DEFAULT_STAGE_THRESHOLDS = [25, 50, 80];
const RELATIVE_STAGE_META = {
  1: { label: '起点期', shortLabel: '起点', hint: '从你的当前状态出发，先稳稳打开节奏。' },
  2: { label: '燃动期', shortLabel: '燃动', hint: '轮廓开始收紧，整个人更轻快了。' },
  3: { label: '轻盈期', shortLabel: '轻盈', hint: '线条更干净，轻盈感已经很明显。' },
  4: { label: '定型期', shortLabel: '定型', hint: '接近目标状态，气质和体态都更利落。' },
};
const JOURNEY_PROFILES = [
  { maxLoss: 12, key: 'lite', label: '轻盈微调', avatarScaleBoost: 0.01, summary: '更像线条微调，不强调大体型反差。' },
  { maxLoss: 24, key: 'shape', label: '线条重塑', avatarScaleBoost: 0.03, summary: '从起点到目标会有比较自然的体态收紧。' },
  { maxLoss: 40, key: 'boost', label: '蜕变加速', avatarScaleBoost: 0.055, summary: '属于明显变化的减重旅程，起点会更丰盈一些。' },
  { maxLoss: Infinity, key: 'major', label: '大跨度目标', avatarScaleBoost: 0.08, summary: '用相对进度表达蜕变过程，不把立绘当作绝对斤数写实。' },
];

function clampProgress(progress) {
  return Math.max(0, Math.min(100, progress));
}

function getWeightProgress(initialWeight, currentWeight, targetWeight) {
  if (initialWeight <= targetWeight) {
    return 100;
  }

  const totalWeightToLose = Math.max(0.1, initialWeight - targetWeight);
  const lostWeight = initialWeight - currentWeight;
  return clampProgress((lostWeight / totalWeightToLose) * 100);
}

function getSlimmingStage(progress, thresholds = DEFAULT_STAGE_THRESHOLDS) {
  if (progress < thresholds[0]) return 1;
  if (progress < thresholds[1]) return 2;
  if (progress < thresholds[2]) return 3;
  return 4;
}

function getBodyStageForWeight(initialWeight, currentWeight, targetWeight, thresholds = DEFAULT_STAGE_THRESHOLDS) {
  const progress = getWeightProgress(initialWeight, currentWeight, targetWeight);
  return {
    progress,
    stage: getSlimmingStage(progress, thresholds),
  };
}

function getRelativeStageMeta(stage) {
  return RELATIVE_STAGE_META[stage] || RELATIVE_STAGE_META[1];
}

function getJourneyProfile(initialWeight, targetWeight) {
  const totalWeightToLose = Math.max(0, initialWeight - targetWeight);
  return JOURNEY_PROFILES.find((profile) => totalWeightToLose <= profile.maxLoss) || JOURNEY_PROFILES[JOURNEY_PROFILES.length - 1];
}

module.exports = {
  DEFAULT_STAGE_THRESHOLDS,
  getWeightProgress,
  getSlimmingStage,
  getBodyStageForWeight,
  getRelativeStageMeta,
  getJourneyProfile,
};
