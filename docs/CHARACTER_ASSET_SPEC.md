# 微信小游戏角色资产生产规范

## 目标

为《轻盈甜心消除》建立一套稳定可批量扩展的角色资产规范，保证：

- 同一个角色从胖到瘦看起来始终是同一个人。
- UI 风格统一为浅底、Ins 风、轻甜时尚感。
- 游戏过程中既能看到连续变瘦反馈，也能在阶段阈值处看到明显立绘升级。

## 当前建议生产节奏

优先完整做 3 个主角色：

1. `peach-soda` 蜜桃汽水
2. `cream-latte` 奶霜拿铁
3. `mint-breeze` 薄荷清风

这 3 个角色先各做 4 阶段完整立绘，跑通小游戏体验后，再扩到其余 6 个角色。

## 目录契约

每个角色一套目录，固定如下：

```text
minigame/assets/characters/<character-id>/
  stage-1.png
  stage-2.png
  stage-3.png
  stage-4.png
```

可选附加资源：

```text
  portrait.png
  card.png
```

当前小游戏运行时实际依赖的是 `stage-1.png ~ stage-4.png`。

## 推荐画布与导出

- 主立绘尺寸：`1024 x 1536`
- 背景：透明背景 PNG
- 构图：角色正面站姿，全身完整露出，头顶和脚底都要留白
- 主体位置：水平居中，脚底基线固定
- 导出格式：`PNG`
- 颜色：sRGB

## 统一母版要求

所有阶段必须保持以下内容完全一致或高度一致：

- 发型结构
- 刘海轮廓
- 眼睛位置和大小
- 服装款式
- 镜头远近
- 站姿方向
- 肩膀和脚底基线

允许变化的内容：

- 脸颊圆润度
- 下颌线清晰度
- 手臂与腿部粗细
- 腰线与躯干宽度
- 整体精神状态
- 高光、气色、自信感

## 四阶段变化规则

### Stage 1

- 最圆润的初始状态
- 脸颊更饱满
- 腰腹更宽
- 手臂和腿部更有肉感
- 表情柔和，状态偏松弛

### Stage 2

- 轻微收腰
- 下颌线开始更清楚
- 姿态比 stage 1 更挺拔
- 仍然保留明显的柔软感

### Stage 3

- 明显进入轻盈状态
- 腰线更清晰
- 手臂、小腿更纤细
- 眼神和神态更有精神

### Stage 4

- 最终达标状态
- 线条最长最干净
- 不是骨感，而是轻盈、匀称、好状态
- 姿态最自信，整体最有“完成蜕变”的感觉

## 游戏内表现建议

程序里建议继续保留两层变化：

1. 连续变化
每次三连后，角色做轻微 scale/收腰/高光反馈，让玩家感觉“每次都在变瘦”。

2. 阶段切图
达到阈值后切到下一个 `stage-n`，并叠加柔和屏闪、光晕或提示文案。

## 风格关键词

统一风格建议：

- ins style
- light pastel background
- minimal fashion doll character
- cute but refined
- clean silhouette
- soft glossy shading
- no heavy game rendering
- not childish sticker style

避免：

- 过厚描边
- 卡通贴纸感过强
- 过于幼态
- 厚重二次元赛璐璐
- 镜头距离每张都不同
- 胖瘦变化直接像换了一个人

## 首批角色母版设定

### peach-soda / 蜜桃汽水

- 气质：甜酷舞台系
- 主色：蜜桃粉、玫瑰粉、奶油肤色
- 发型：黑色高丸子头，齐刘海
- 服装：粉色贴身小裙，干净利落
- 关键词：元气、轻舞台感、自信、微闪感

### cream-latte / 奶霜拿铁

- 气质：温柔知性系
- 主色：奶咖、浅米、暖粉
- 发型：深棕低丸子头，柔和刘海
- 服装：米咖贴身针织裙
- 关键词：温柔、轻熟、知性、暖感

### mint-breeze / 薄荷清风

- 气质：清新校园系
- 主色：薄荷绿、海盐青、浅水蓝
- 发型：偏青黑色短发/包头感，整齐刘海
- 服装：薄荷色轻运动甜感裙
- 关键词：清爽、轻透、校园、活力

## 统一提示词母版

下面这段作为所有角色的基础母版，先不要动构图：

```text
full body front-facing fashion character, centered composition, transparent background, same camera distance, same standing pose, ins style pastel game character, soft glossy shading, refined cute proportions, clean silhouette, no heavy outlines, no complex background, fashion doll style but not childish, keep hairstyle and outfit structure consistent across stages
```

## 单角色四阶段生成模板

### 通用模板

```text
Character: <角色名>
Style: ins pastel fashion character, soft glossy shading, clean silhouette
Pose: front-facing, full body, centered, same pose as other stages
Hair: <发型>
Outfit: <服装>
Palette: <主色>
Mood: <气质>
Body stage: <阶段说明>
Constraints: transparent background, same character identity, same hairstyle, same outfit design, same camera distance, same body base proportions, only adjust body fullness and confidence level, no text, no props, no extra background
```

### `peach-soda` 示例

#### Stage 1

```text
Character: 蜜桃汽水
Style: ins pastel fashion character, soft glossy shading, clean silhouette
Pose: front-facing, full body, centered, same pose as other stages
Hair: black high bun with blunt bangs
Outfit: pink fitted mini dress
Palette: peach pink, rose pink, cream
Mood: sweet pop, gentle confidence
Body stage: soft round cheeks, fuller waist and hips, plush silhouette, relaxed posture
Constraints: transparent background, same character identity, same hairstyle, same outfit design, same camera distance, no props, no text
```

#### Stage 2

```text
Character: 蜜桃汽水
Style: ins pastel fashion character, soft glossy shading, clean silhouette
Pose: front-facing, full body, centered, same pose as other stages
Hair: black high bun with blunt bangs
Outfit: pink fitted mini dress
Palette: peach pink, rose pink, cream
Mood: sweet pop, becoming more energetic
Body stage: slightly slimmer waist, face still soft, posture more lifted, still cute and rounded
Constraints: transparent background, same character identity, same hairstyle, same outfit design, same camera distance, no props, no text
```

#### Stage 3

```text
Character: 蜜桃汽水
Style: ins pastel fashion character, soft glossy shading, clean silhouette
Pose: front-facing, full body, centered, same pose as other stages
Hair: black high bun with blunt bangs
Outfit: pink fitted mini dress
Palette: peach pink, rose pink, cream
Mood: brighter, more polished, confident
Body stage: noticeably slimmer waist and arms, cleaner jawline, lighter silhouette
Constraints: transparent background, same character identity, same hairstyle, same outfit design, same camera distance, no props, no text
```

#### Stage 4

```text
Character: 蜜桃汽水
Style: ins pastel fashion character, soft glossy shading, clean silhouette
Pose: front-facing, full body, centered, same pose as other stages
Hair: black high bun with blunt bangs
Outfit: pink fitted mini dress
Palette: peach pink, rose pink, cream
Mood: final glow-up, polished and confident
Body stage: lightest silhouette, longest cleanest lines, healthy slim finish, strongest confidence
Constraints: transparent background, same character identity, same hairstyle, same outfit design, same camera distance, no props, no text
```

## 批量出图时的检查清单

- 四张图是否一眼看出是同一个角色
- 四张图脚底是否在同一高度
- 头身比是否一致
- 服装是否没有被模型私自改款
- stage 1 到 stage 4 是否是逐步变瘦，而不是突变
- 透明背景是否干净
- 导入小游戏后角色是否居中，不会被裁头或裁脚

## 接下来最推荐的执行顺序

1. 先把 `peach-soda` 四阶段做完并导入小游戏测试
2. 确认胖瘦变化自然以后，再补 `cream-latte`
3. 再补 `mint-breeze`
4. 跑通首批 3 角色后，再扩展其余 6 角色
