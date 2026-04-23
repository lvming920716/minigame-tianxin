'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

assert.ok(
  rendererSource.includes('h: Math.min(454, sheet.h - 202),'),
  '输入体重卡片高度应回到更安全的范围，避免中段内容被压扁'
);

assert.ok(
  rendererSource.includes("drawWeightSection('当前体重 (斤)', state.initialWeight, card.y + 182"),
  '当前体重区块应重新上提到更合理的位置'
);

assert.ok(
  rendererSource.includes("drawWeightSection('目标体重 (斤)', state.targetWeight, card.y + 300"),
  '目标体重区块应与上一组重新拉开间距'
);

assert.ok(
  rendererSource.includes('const labelY = centerY - 42;'),
  '输入体重页的标题文字应上提，避免压到加减按钮区域'
);

assert.ok(
  rendererSource.includes('const hintY = centerY + 56;'),
  '输入体重页的提示文字应固定在安全区域内'
);

console.log('verify-weight-page-spacing: ok');
