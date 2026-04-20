# 微信小游戏工程（minigame）

本目录是 `轻盈甜心消除` 的微信小游戏原生实现（Canvas + 微信小游戏 API）。

## 打开方式

1. 打开微信开发者工具。
2. 选择“小游戏”项目。
3. 项目目录指向本目录：`C:\project\tianxin\minigame`。
4. 使用测试 AppID（`touristappid`）或替换为你自己的小游戏 AppID。

## 结构

- `game.js` / `game.json`: 小游戏入口与基础配置
- `app.js` / `app.json`: 应用配置
- `project.config.json`: 开发者工具工程配置
- `shared/`: 可复用纯逻辑（消除、进度、结算、状态机）
- `src/`: 小游戏运行时（渲染、输入、音频）
- `assets/`: 本地资源（角色图、音频）

## 当前实现范围

- 角色选择、体重输入、确认、首页、游戏、结算页面
- 无限/经典(60s)模式
- 堆叠点选 + 三消 + 连击 + 道具（洗牌/清3/加槽）
- 反弹机制（关卡>=9）
- 甜心狂切（独立场景态，滑动切中）
- 音频事件封装（`wx.createInnerAudioContext`）

## 备注

- 音频文件为本地占位素材，可替换 `assets/audio/*.wav` 以获得更好的听感。
- 背景音乐若要控制主包体积，可执行 `npm run optimize:audio` 将 BGM 压成更轻的小游戏专用 WAV。
- 角色图片为本地静态资源，避免外链域名依赖。
- 角色 PNG 若带生成器棋盘格背景，可执行 `npm run process:characters` 自动转成透明底，详见 `assets/characters/README.md`。
