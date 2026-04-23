'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { STYLE_CONTRACT } = require('../src/styleContract');

const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');

assert.ok(
  STYLE_CONTRACT.motion.avatarMorphMs >= 1150,
  '角色变身时长应明显拉长到至少 1150ms'
);

assert.ok(
  mainSource.includes('stageLabel'),
  '角色变身运行时数据应包含阶段提示文案'
);

assert.ok(
  rendererSource.includes('morph.stageLabel'),
  '角色变身渲染应显示阶段提示文案'
);

console.log('verify-avatar-morph-upgrade: ok');
