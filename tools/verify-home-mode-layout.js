'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

assert.ok(
  rendererSource.includes("getBottomActionRect(layout, compact ? 50 : 54, compact ? 18 : 22)"),
  '选择模式页的开始按钮应整体上移一些'
);

assert.ok(
  rendererSource.includes('const modeStartGap = compact ? 24 : 28;'),
  '模式卡与开始按钮之间的距离应收紧'
);

assert.ok(
  rendererSource.includes('const infoToModeGap = compact ? 8 : 10;'),
  '信息卡与模式卡之间的距离应收紧'
);

console.log('verify-home-mode-layout: ok');
