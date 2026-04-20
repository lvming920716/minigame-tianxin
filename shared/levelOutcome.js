'use strict';

function getLevelOutcome(input) {
  const {
    remainingBoardCount,
    triggeredRebound,
    currentWeight,
    targetWeight,
  } = input;

  if (remainingBoardCount > 0 || triggeredRebound) {
    return 'CONTINUE';
  }

  if (currentWeight <= targetWeight) {
    return 'RESULT';
  }

  return 'NEXT_LEVEL';
}

module.exports = {
  getLevelOutcome,
};
