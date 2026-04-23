'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

assert.ok(
  mainSource.includes('wx.showKeyboard'),
  '体重页应接入微信键盘唤起逻辑'
);

assert.ok(
  mainSource.includes('edit_initial') && mainSource.includes('edit_target'),
  '主逻辑应处理直接编辑当前体重和目标体重'
);

assert.ok(
  rendererSource.includes('edit_initial') && rendererSource.includes('edit_target'),
  '输入页应为两个体重数字区域提供直接点击命中区'
);

console.log('verify-weight-keyboard-input: ok');
