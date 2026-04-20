'use strict';

const { MIN_ALLOWED_WEIGHT, MAX_ALLOWED_WEIGHT } = require('./gameBalance');

function validateWeightInputs(initialWeight, targetWeight) {
  if (
    initialWeight < MIN_ALLOWED_WEIGHT ||
    initialWeight > MAX_ALLOWED_WEIGHT ||
    targetWeight < MIN_ALLOWED_WEIGHT ||
    targetWeight > MAX_ALLOWED_WEIGHT
  ) {
    return '请输入有效的体重';
  }

  if (targetWeight >= initialWeight) {
    return '目标体重必须小于当前体重哦！';
  }

  return null;
}

module.exports = {
  validateWeightInputs,
};
