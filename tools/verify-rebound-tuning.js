'use strict';

const assert = require('assert');
const {
  getReboundProbability,
  getReboundWeightGain,
  getTotalLevels,
} = require('../shared/progression');
const { getBodyStageForWeight } = require('../shared/bodyStage');

function getStage(initialWeight, currentWeight, targetWeight) {
  return getBodyStageForWeight(initialWeight, currentWeight, targetWeight).stage;
}

const initialWeight = 130;
const targetWeight = 100;
const totalLevels = getTotalLevels(initialWeight - targetWeight);

assert.strictEqual(
  getReboundProbability(1, 1),
  0,
  '第一阶段不应触发反弹概率'
);

assert.ok(
  getReboundProbability(6, 2) > 0,
  '第二阶段开始应允许出现反弹'
);

assert.ok(
  getReboundProbability(9, 4) > getReboundProbability(6, 2),
  '更后期阶段的反弹概率应更高一些'
);

const stage2Weight = 121;
const stage4Weight = 102;
const stage2Gain = getReboundWeightGain(initialWeight, stage2Weight, targetWeight, totalLevels, 2, 0.5);
const stage4Gain = getReboundWeightGain(initialWeight, stage4Weight, targetWeight, totalLevels, 4, 1);

const stage2Lost = initialWeight - stage2Weight;
const stage4Lost = initialWeight - stage4Weight;

assert.ok(
  stage2Gain > 0 && stage2Gain <= stage2Lost * 0.04,
  '第二阶段单次反弹应只回退当前减重量的一小部分'
);

assert.ok(
  stage4Gain > stage2Gain,
  '后期阶段的单次反弹应比中期略强'
);

assert.ok(
  stage4Gain <= stage4Lost * 0.06,
  '后期阶段单次反弹也不应超过当前减重量的 6%'
);

assert.strictEqual(getStage(initialWeight, initialWeight, targetWeight), 1, '初始应处于第一阶段');
assert.strictEqual(getStage(initialWeight, stage2Weight, targetWeight), 2, '121 斤应处于第二阶段');
assert.strictEqual(getStage(initialWeight, stage4Weight, targetWeight), 4, '102 斤应处于第四阶段');

console.log('verify-rebound-tuning: ok');
