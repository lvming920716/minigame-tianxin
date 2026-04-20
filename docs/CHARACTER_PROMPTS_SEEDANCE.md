# Seedance 角色出图提示词

## 本轮最推荐的角色方向

先不要继续做 `蜜桃汽水` 那种甜酷舞台感。

更适合你现在这款产品、也更容易被女生喜欢且不俗套的方向是：

## 角色方案：月雾鸢尾

- 风格定位：`动漫 + Ins + 轻杂志感 + 冷甜芭蕾系`
- 关键词：`高级、轻盈、柔雾感、不是幼态萌妹、不是俗气网红风`
- 配色：`灰粉、鸢尾紫、奶白、冷黑发`
- 气质：`安静、精致、温柔偏清冷、很会拍照的时髦女生`

这个方向的优点：

- 比高饱和粉色更高级
- 比纯校园风更有记忆点
- 比浓重二次元偶像风更适合 Ins 气质
- 从胖到瘦的变化会更自然，不会显得“换了一个人”

## Seedance 使用建议

### 最优流程

1. 先生成 `stage-2`
2. 从 `stage-2` 里选一张最像“母版角色”的
3. 固定同一个 `seed`
4. 再分别生成 `stage-1 / stage-3 / stage-4`

如果 Seedance 支持参考图或角色一致性功能：

- 把选中的 `stage-2` 作为参考图
- 其它三张都基于它出

### 推荐参数

- 比例：`2:3`
- 尺寸：`1024 x 1536`
- 背景：`透明背景` 优先
- 如果不支持透明背景：
  - 先生成纯浅灰白纯色背景
  - 后续再抠图

### 一致性原则

四张图必须保持完全一致：

- 发型结构
- 刘海形状
- 脸部五官位置
- 衣服款式
- 站姿
- 镜头远近
- 身体朝向
- 手脚位置

只允许变化：

- 脸颊圆润度
- 手臂粗细
- 腰线
- 腿部线条
- 神态和自信感

## 通用反向提示词

下面这段建议四张图都固定带上：

```text
nsfw, sexy pose, vulgar, cheap fashion, childish, chibi, loli, exaggerated smile, heavy makeup, thick eyelashes, overly glossy skin, giant breasts, fanservice, dynamic action pose, side view, profile view, turning body, different hairstyle, different outfit, extra fingers, extra arms, extra legs, deformed hands, cropped feet, cropped head, cluttered background, props, microphone, bag, crown, wings, text, watermark, logo, blurry, low detail, low quality
```

## 母版通用正向提示词

下面这段作为四张图共同的“固定母版”，尽量不要改：

```text
masterpiece, best quality, anime girl character design, ins fashion illustration aesthetic, editorial pastel mood, refined and feminine, high-end cute style, not childish, full body, front-facing, standing straight, centered composition, same camera distance, same pose, transparent background, isolated character, soft glossy shading, clean silhouette, slim elegant limbs, delicate hands, natural proportions, gentle facial expression, large but not exaggerated eyes, small nose, soft lips, black hair with cool violet sheen, half-up bun hairstyle, airy bangs, two soft side locks, iris lavender and dusty rose ballet-inspired fitted mini dress, subtle ribbon detail, cream socks, dark mary jane shoes, soft studio lighting, consistent character identity across all stages
```

---

## Stage 2 母版提示词

先生成这张。

```text
masterpiece, best quality, anime girl character design, ins fashion illustration aesthetic, editorial pastel mood, refined and feminine, high-end cute style, not childish, full body, front-facing, standing straight, centered composition, same camera distance, same pose, transparent background, isolated character, soft glossy shading, clean silhouette, slim elegant limbs, delicate hands, natural proportions, gentle facial expression, large but not exaggerated eyes, small nose, soft lips, black hair with cool violet sheen, half-up bun hairstyle, airy bangs, two soft side locks, iris lavender and dusty rose ballet-inspired fitted mini dress, subtle ribbon detail, cream socks, dark mary jane shoes, soft studio lighting, consistent character identity across all stages, stage 2 body design, slightly soft cheeks, slightly fuller waist, soft but tidy silhouette, gentle and photogenic posture, sweet cool and sophisticated, very popular among girls, anime ins style, quiet luxury, balletcore, clean fashion doll feeling
```

## Stage 1 提示词

比 stage 2 更圆润，但仍然是漂亮、可爱的同一个人。

```text
masterpiece, best quality, anime girl character design, ins fashion illustration aesthetic, editorial pastel mood, refined and feminine, high-end cute style, not childish, full body, front-facing, standing straight, centered composition, same camera distance, same pose, transparent background, isolated character, soft glossy shading, clean silhouette, slim elegant limbs, delicate hands, natural proportions, gentle facial expression, large but not exaggerated eyes, small nose, soft lips, black hair with cool violet sheen, half-up bun hairstyle, airy bangs, two soft side locks, iris lavender and dusty rose ballet-inspired fitted mini dress, subtle ribbon detail, cream socks, dark mary jane shoes, soft studio lighting, same character identity as stage 2, stage 1 body design, rounder cheeks, fuller upper arms, fuller waist and hips, softer belly line, plush overall silhouette, relaxed and sweet posture, still stylish and pretty, no loss of elegance, anime ins style, soft girly editorial feeling
```

## Stage 3 提示词

明显变轻盈，但不是骨感，不要过瘦。

```text
masterpiece, best quality, anime girl character design, ins fashion illustration aesthetic, editorial pastel mood, refined and feminine, high-end cute style, not childish, full body, front-facing, standing straight, centered composition, same camera distance, same pose, transparent background, isolated character, soft glossy shading, clean silhouette, slim elegant limbs, delicate hands, natural proportions, gentle facial expression, large but not exaggerated eyes, small nose, soft lips, black hair with cool violet sheen, half-up bun hairstyle, airy bangs, two soft side locks, iris lavender and dusty rose ballet-inspired fitted mini dress, subtle ribbon detail, cream socks, dark mary jane shoes, soft studio lighting, same character identity as stage 2, stage 3 body design, cleaner jawline, slimmer waist, slimmer upper arms, lighter leg silhouette, more lifted posture, brighter eyes, more confident aura, elegant and airy, anime ins style, refined balletcore fashion girl
```

## Stage 4 提示词

最终完成态，要最有“蜕变完成”的高级感。

```text
masterpiece, best quality, anime girl character design, ins fashion illustration aesthetic, editorial pastel mood, refined and feminine, high-end cute style, not childish, full body, front-facing, standing straight, centered composition, same camera distance, same pose, transparent background, isolated character, soft glossy shading, clean silhouette, slim elegant limbs, delicate hands, natural proportions, gentle facial expression, large but not exaggerated eyes, small nose, soft lips, black hair with cool violet sheen, half-up bun hairstyle, airy bangs, two soft side locks, iris lavender and dusty rose ballet-inspired fitted mini dress, subtle ribbon detail, cream socks, dark mary jane shoes, soft studio lighting, same character identity as stage 2, stage 4 body design, lightest and cleanest silhouette, long elegant lines, defined but healthy waistline, slender arms and legs, most confident posture, softly glowing skin, polished final transformation, fashion magazine feeling, anime ins style, high-end feminine, very charming but not vulgar
```

---

## 如果第一轮容易跑偏，补这一句

如果你发现 Seedance 容易把四张图做成不同的人，可以在每一张 prompt 末尾额外加上：

```text
same girl, same face, same hairstyle, same bangs, same outfit, same body base proportions, only change body fullness and confidence level
```

## 如果第一轮容易太俗，补这一句

如果你发现生成结果太像廉价网红图，可以额外加上：

```text
muted luxury palette, understated elegance, soft editorial styling, no cheap idol feeling, no overly sweet cliche
```

## 如果第一轮不够动漫，补这一句

如果你发现出来偏写实，可以额外加上：

```text
stylized anime illustration, clean anime facial features, anime fashion character, not realistic photo
```

---

## 备选角色方向

如果你跑完 `月雾鸢尾` 还想再试两种，我建议优先试这两个：

### 1. 海盐蓝调

- 关键词：`雾蓝、海盐、清冷、日杂、轻海风`
- 适合：喜欢清爽、冷淡、耐看的女生

替换母版里的关键描述：

```text
inky blue hair, soft short bob, sea blue and salt white fitted dress, fresh cool ocean breeze mood
```

### 2. 乌龙奶霜

- 关键词：`奶咖、乌龙棕、轻熟、柔和知性`
- 适合：喜欢温柔、松弛、耐看高级感的女生

替换母版里的关键描述：

```text
dark brown low bun hairstyle, milk tea and cream fitted knit dress, soft intellectual and gentle mood
```

---

## 最推荐的实际执行

下一步你就这么做：

1. 先用上面的 `Stage 2 母版提示词` 跑 4 到 8 张
2. 从里面挑一张你最喜欢的给我
3. 我帮你判断这张适不适合做母版
4. 适合的话，你继续用同一个 seed 跑 `Stage 1 / 3 / 4`
5. 跑出来后把 4 张都发我，我帮你选最终可进游戏的版本
