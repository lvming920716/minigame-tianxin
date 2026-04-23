'use strict';

const assert = require('assert');
const { ACTIONS, createInitialState, update } = require('../shared/engine');

function makeBaseGameState() {
  let state = createInitialState();
  state = update(state, { type: ACTIONS.SET_WEIGHTS, initialWeight: 130, targetWeight: 100 }).state;
  state = update(state, { type: ACTIONS.GO_PAGE, page: 'HOME' }).state;
  state = update(state, { type: ACTIONS.START_GAME, mode: 'INFINITE', now: Date.now() }).state;
  return state;
}

function verifyTapTileGoalCompletion() {
  const state = makeBaseGameState();
  const result = update(
    {
      ...state,
      currentWeight: 100.05,
      tiles: [
        { id: 'tap-match', type: 1, x: 1, y: 1, z: 0, status: 'board' },
        { id: 'dock-a', type: 1, x: 2, y: 1, z: 0, status: 'dock' },
        { id: 'dock-b', type: 1, x: 3, y: 1, z: 0, status: 'dock' },
        { id: 'board-extra', type: 2, x: 5, y: 5, z: 0, status: 'board' },
      ],
      dock: [
        { id: 'dock-a', type: 1, x: 2, y: 1, z: 0, status: 'dock' },
        { id: 'dock-b', type: 1, x: 3, y: 1, z: 0, status: 'dock' },
      ],
    },
    { type: ACTIONS.TAP_TILE, tileId: 'tap-match', now: Date.now() }
  );

  assert.equal(result.state.page, 'RESULT', '普通三消达标后应立刻进入成功结算');
  assert.equal(result.state.success, true, '普通三消达标后应标记为成功');
  assert.equal(result.state.resultReason, '减肥成功', '普通三消达标后应显示减肥成功');
}

function verifyPowerUpGoalCompletion() {
  const state = makeBaseGameState();
  const result = update(
    {
      ...state,
      currentWeight: 100.2,
      tiles: [
        { id: 'p1', type: 1, x: 1, y: 1, z: 0, status: 'board' },
        { id: 'p2', type: 2, x: 2, y: 1, z: 0, status: 'board' },
        { id: 'p3', type: 3, x: 3, y: 1, z: 0, status: 'board' },
        { id: 'p4', type: 4, x: 4, y: 1, z: 0, status: 'board' },
      ],
      dock: [],
    },
    { type: ACTIONS.USE_POWERUP, powerUp: 'remove3', now: Date.now(), random: 0.1 }
  );

  assert.equal(result.state.page, 'RESULT', '道具减重达标后应立刻进入成功结算');
  assert.equal(result.state.success, true, '道具减重达标后应标记为成功');
}

function verifySlashGoalCompletion() {
  const state = makeBaseGameState();
  const result = update(
    {
      ...state,
      currentWeight: 100.05,
      tiles: [
        { id: 'slash-extra', type: 5, x: 4, y: 4, z: 0, status: 'board' },
      ],
      dock: [],
      slash: {
        active: true,
        pendingTileIds: [],
        slashedCount: 8,
        feverScore: 1200,
        combo: 3,
        lastHitAt: Date.now() - 200,
        timeLeftMs: 3000,
      },
    },
    { type: ACTIONS.END_SLASH, now: Date.now() }
  );

  assert.equal(result.state.page, 'RESULT', '狂切结算达标后应立刻进入成功结算');
  assert.equal(result.state.success, true, '狂切结算达标后应标记为成功');
}

verifyTapTileGoalCompletion();
verifyPowerUpGoalCompletion();
verifySlashGoalCompletion();

console.log('verify-goal-completion: ok');
