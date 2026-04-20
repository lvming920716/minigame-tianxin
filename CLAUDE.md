# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

`轻盈甜心消除` 是减肥主题微信消消乐小游戏，使用 Canvas 与微信小游戏原生 API，无框架依赖。

## 运行方式

无构建步骤。用微信开发者工具打开项目目录，选择"小游戏"类型即可运行：
- AppID：`wx5cdbe49e6cd4a189`（或测试号）
- `npm run optimize:audio` — 压缩 BGM 为小游戏专用 WAV
- `npm run process:characters` — 清理角色 PNG 背景为透明

## 架构分层

**`shared/`（纯逻辑，无运行时依赖）**
- `engine.js` — 核心状态机。`update(state, action)` 返回 `{state, effects}`，所有游戏规则均在此。`ACTIONS` 枚举定义全部动作类型
- `tileMatchLogic.js` — 棋盘生成、三消匹配、反弹格逻辑
- `gameBalance.js` — 游戏平衡参数（权重掉落系数、连击窗口、甜心狂切参数等）
- `progression.js` — 关卡数量与难度曲线（依赖目标体重差）
- `characters.js` — 角色信息与阶段资源路径

**`src/`（运行时，依赖微信 API 与 Canvas）**
- `main.js` — 游戏循环、触摸路由、特效调度、甜心狂切场景实体
- `renderer.js` — 全部页面与 UI 的 Canvas 2D 绘制
- `audio.js` — 微信音频 API 封装，首次触摸后解锁音频上下文
- `styleContract.js` — 颜色、字体、动画时长等设计系统常量

## 页面流程

```
CHARACTER_SELECT → INPUT → HOME → GAME → RESULT
                                    └─ 甜心狂切（独立场景状态）
```

## 关键机制定位

| 机制 | 文件 | 说明 |
|------|------|------|
| 三消触发 | `engine.js` ~617 | 甜心盘内3个同类食物 → 消除棋盘同类行 |
| 连击 / 同类加速 | `engine.js` ~641 | 4秒内连消 ×3 分；连续3次同类 →权重掉落 ×1.5 |
| 反弹 | `engine.js` ~528 | 关卡 ≥9 时概率增加体重 |
| 甜心狂切触发 | `engine.js` ~704 | 连续4次同类三消 |
| 甜心狂切场景 | `main.js` ~389 | 独立实体生成与碰撞检测，滑动切中食物 |
| 道具系统 | `engine.js` ~419 | shuffle / remove3 / revealTop / attractSame / addSlot |

## 协作原则

1. **改动前先读**相关文件，确认受影响范围。
2. `shared/` 放纯逻辑，`src/` 放运行时，**不跨层混写**。
3. **资源路径、音频路径、角色素材引用**改动需格外谨慎。
4. 仅修改任务所需范围，对未要求的重构保持克制。

## 输出格式

完成任务时说明：做了什么 / 改动哪些文件 / 验证情况 / 待确认事项。
