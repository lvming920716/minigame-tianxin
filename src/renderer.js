'use strict';

const { FOODS, isBlocked } = require('../shared/tileMatchLogic');
const { getCharacterById, CHARACTER_OPTIONS } = require('../shared/characters');
const { getJourneyProfile, getRelativeStageMeta } = require('../shared/bodyStage');
const { SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE } = require('../shared/gameBalance');
const { toneColor } = require('./styleContract');

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getFlightProgress(flight, now) {
  if (now < flight.start) return 0;
  return clamp((now - flight.start) / flight.durationMs, 0, 1);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function addHit(hits, kind, id, rect, extra) {
  hits.push({ kind, id, x: rect.x, y: rect.y, w: rect.w, h: rect.h, extra: extra || null });
}

function drawCard(ctx, rect, style, strong) {
  ctx.save();
  ctx.shadowColor = style.palette.shadow;
  ctx.shadowBlur = strong ? 26 : 16;
  ctx.shadowOffsetY = strong ? 10 : 6;
  ctx.fillStyle = strong ? style.palette.cardStrong : style.palette.card;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, style.radius.lg);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = style.palette.cardStroke;
  ctx.stroke();
  ctx.restore();
}

function drawButton(ctx, rect, text, style, variant) {
  const isDisabled = variant === 'disabled';
  const isPrimary = variant === 'primary';
  const fill = isDisabled
    ? 'rgba(226,232,240,0.92)'
    : (isPrimary ? style.palette.buttonPrimary : style.palette.buttonSecondary);
  const textColor = isDisabled
    ? 'rgba(100,116,139,0.95)'
    : (isPrimary ? '#ffffff' : style.palette.textPrimary);
  const stroke = isDisabled
    ? 'rgba(203,213,225,0.98)'
    : (isPrimary ? 'rgba(255,255,255,0.12)' : style.palette.buttonSecondaryStroke);

  ctx.save();
  ctx.shadowColor = isDisabled
    ? 'rgba(148,163,184,0.08)'
    : (isPrimary ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.14)');
  ctx.shadowBlur = isDisabled ? 8 : 14;
  ctx.shadowOffsetY = isDisabled ? 3 : 5;
  ctx.fillStyle = fill;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, style.radius.pill);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = style.font.button;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

function drawButtonBadge(ctx, rect, text, fill, textColor) {
  const badge = {
    x: rect.x - 4,
    y: rect.y - 8,
    w: 24,
    h: 20,
  };
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.12)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, badge.x, badge.y, badge.w, badge.h, 999);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), badge.x + badge.w / 2, badge.y + badge.h / 2 + 0.5);
  ctx.restore();
}

function drawSlashScoreCard(ctx, runtime, layout, style, now) {
  const pulse = (runtime.slash.scorePulseUntil || 0) > now ? 1.08 : 1;
  const rect = {
    x: layout.sidePad,
    y: layout.topPad + 6,
    w: 156,
    h: 86,
  };
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  const panel = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  panel.addColorStop(0, 'rgba(255,245,247,0.98)');
  panel.addColorStop(1, 'rgba(255,228,236,0.94)');
  ctx.shadowColor = 'rgba(244,63,94,0.18)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 24);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();
  drawFittedText(ctx, '燃脂值', rect.x + 16, rect.y + 18, 60, 12, 'bold', '#fb7185', 'left');
  drawFittedText(
    ctx,
    `${Math.round(runtime.slash.displayScore || 0)}`,
    rect.x + 16,
    rect.y + 48,
    rect.w - 32,
    34,
    'bold',
    '#ef4444',
    'left'
  );
  drawFittedText(ctx, `剩余 ${(runtime.slash.timeLeftMs / 1000).toFixed(1)}s`, rect.x + 16, rect.y + 70, rect.w - 28, 12, 'bold', style.palette.textSecondary, 'left');
  ctx.restore();
}

function drawChip(ctx, rect, text, style, tint) {
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, style.radius.pill);
  ctx.fillStyle = tint || 'rgba(255, 122, 183, 0.16)';
  ctx.fill();
  ctx.fillStyle = style.palette.textAccent;
  ctx.font = style.font.bodySmall;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function drawFittedText(ctx, text, x, y, maxWidth, startSize, weight, color, align) {
  const fontWeight = normalizeFontWeight(weight || 'bold');
  let size = startSize;
  while (size >= 10) {
    ctx.font = `${fontWeight} ${size}px sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function normalizeFontWeight(weight) {
  if (weight === '700' || weight === '600' || weight === 'bold') return 'bold';
  if (weight === '300' || weight === '400' || weight === '500' || weight === 'normal') return 'normal';
  return String(weight || 'normal');
}

function getSlimProgress(state) {
  if (state.initialWeight <= state.targetWeight) return 100;
  const total = Math.max(0.1, state.initialWeight - state.targetWeight);
  const lost = state.initialWeight - state.currentWeight;
  return clamp((lost / total) * 100, 0, 100);
}

function getJourneyContext(state) {
  const progress = getSlimProgress(state);
  return {
    progress,
    stageMeta: getRelativeStageMeta(state.slimmingStage),
    journeyProfile: getJourneyProfile(state.initialWeight, state.targetWeight),
  };
}

function getImageSize(image) {
  return {
    w: Math.max(1, image && (image.width || image.naturalWidth || 0) || 1),
    h: Math.max(1, image && (image.height || image.naturalHeight || 0) || 1),
  };
}

function getFittedImagePlacement(image, rect, options) {
  const opts = options || {};
  const padding = Math.max(0, opts.padding || 0);
  const alignX = typeof opts.alignX === 'number' ? opts.alignX : 0.5;
  const alignY = typeof opts.alignY === 'number' ? opts.alignY : 0.5;
  const mode = opts.mode === 'cover' ? 'cover' : 'contain';
  const slimScaleX = Math.max(0.01, opts.scaleX || 1);
  const availableW = Math.max(1, rect.w - padding * 2);
  const availableH = Math.max(1, rect.h - padding * 2);
  const size = getImageSize(image);
  const scale = mode === 'cover'
    ? Math.max(availableW / (size.w * slimScaleX), availableH / size.h)
    : Math.min(availableW / (size.w * slimScaleX), availableH / size.h);
  const drawW = size.w * scale;
  const drawH = size.h * scale;
  const visibleW = drawW * slimScaleX;
  const visibleH = drawH;
  return {
    centerX: rect.x + padding + (availableW - visibleW) * alignX + visibleW / 2,
    centerY: rect.y + padding + (availableH - visibleH) * alignY + visibleH / 2,
    drawW,
    drawH,
    scaleX: slimScaleX,
  };
}

function drawFittedImage(ctx, image, rect, options) {
  if (!image) return;
  const placement = getFittedImagePlacement(image, rect, options);
  ctx.save();
  ctx.translate(placement.centerX, placement.centerY);
  ctx.scale(placement.scaleX, 1);
  ctx.drawImage(image, -placement.drawW / 2, -placement.drawH / 2, placement.drawW, placement.drawH);
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return `rgba(255,255,255,${alpha})`;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawAvatarBackdrop(ctx, rect, palette) {
  const base = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  base.addColorStop(0, 'rgba(255,251,253,0.98)');
  base.addColorStop(0.45, 'rgba(255,245,250,0.96)');
  base.addColorStop(1, 'rgba(247,240,255,0.95)');
  ctx.fillStyle = base;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  drawOrb(ctx, rect.x + rect.w * 0.24, rect.y + rect.h * 0.18, rect.w * 0.48, hexToRgba(palette.top, 0.53));
  drawOrb(ctx, rect.x + rect.w * 0.78, rect.y + rect.h * 0.7, rect.w * 0.58, hexToRgba(palette.bottom, 0.45));

  ctx.save();
  ctx.globalAlpha = 0.7;
  const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.84)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(rect.x + rect.w * 0.36, rect.y + rect.h * 0.18, rect.w * 0.34, rect.h * 0.12, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = palette.edge;
  ctx.beginPath();
  ctx.ellipse(rect.x + rect.w * 0.52, rect.y + rect.h * 0.86, rect.w * 0.34, rect.h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAvatar(ctx, runtime, state, rect, options) {
  const character = getCharacterById(state.selectedCharacterId);
  const path = character.stageAssetPaths[state.slimmingStage] || character.stageAssetPaths[1];
  const image = runtime.images[path];
  const palette = getCharacterPosterPalette(character.id);
  const journey = getJourneyContext(state);
  const startScaleX = 1 + journey.journeyProfile.avatarScaleBoost;
  const endScaleX = 0.76;
  const scaleX = clamp(startScaleX + (endScaleX - startScaleX) * (journey.progress / 100), 0.76, 1.1);
  const opts = options || {};
  const radius = typeof opts.radius === 'number' ? opts.radius : 26;
  const frame = opts.frame !== false;
  const background = opts.background !== false;
  const fillMode = opts.mode || 'contain';
  const padding = typeof opts.padding === 'number' ? opts.padding : 0;

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  if (background) {
    drawAvatarBackdrop(ctx, rect, palette);
  }
  if (image) {
    drawFittedImage(ctx, image, rect, {
      mode: fillMode,
      padding,
      alignX: typeof opts.alignX === 'number' ? opts.alignX : 0.5,
      alignY: typeof opts.alignY === 'number' ? opts.alignY : 0.5,
      scaleX,
    });
  } else {
    ctx.fillStyle = '#fdd7e8';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#9f2f61';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(character.name, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();

  if (frame) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlashChargeMeter(ctx, state, rect, style, now) {
  const streak = clamp(state.slashSameTypeStreak || 0, 0, SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE);
  const ratio = streak / SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE;
  const almostReady = streak === SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE - 1;
  const pulse = almostReady ? (0.5 + 0.5 * Math.sin(now / 150)) : (0.5 + 0.5 * Math.sin(now / 320));
  const glowAlpha = almostReady ? 0.2 + pulse * 0.12 : 0.08 + ratio * 0.1;

  ctx.save();
  ctx.shadowColor = `rgba(244,114,182,${glowAlpha.toFixed(3)})`;
  ctx.shadowBlur = almostReady ? 22 : 14;
  ctx.shadowOffsetY = 8;
  const shellFill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  shellFill.addColorStop(0, 'rgba(255,255,255,0.96)');
  shellFill.addColorStop(1, 'rgba(255,246,251,0.88)');
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20);
  ctx.fillStyle = shellFill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = almostReady ? 'rgba(244,114,182,0.58)' : 'rgba(255,255,255,0.92)';
  ctx.stroke();

  drawFittedText(ctx, '狂切', rect.x + rect.w / 2, rect.y + 16, rect.w - 6, 11, 'bold', style.palette.accentStrong, 'center');
  if (almostReady) {
    drawFittedText(
      ctx,
      '再来一次同类三消',
      rect.x + rect.w / 2,
      rect.y + 28,
      rect.w - 6,
      9,
      'bold',
      style.palette.danger,
      'center'
    );
  }

  const track = {
    x: rect.x + rect.w * 0.28,
    y: rect.y + 42,
    w: rect.w * 0.44,
    h: rect.h - 66,
  };
  roundRect(ctx, track.x, track.y, track.w, track.h, 999);
  ctx.fillStyle = 'rgba(252,231,243,0.72)';
  ctx.fill();

  if (ratio > 0) {
    const fillH = track.h * ratio;
    const fillY = track.y + track.h - fillH;
    ctx.save();
    roundRect(ctx, track.x, track.y, track.w, track.h, 999);
    ctx.clip();
    const fill = ctx.createLinearGradient(track.x, fillY, track.x, track.y + track.h);
    fill.addColorStop(0, almostReady ? '#fb7185' : '#f472b6');
    fill.addColorStop(0.55, '#fb7185');
    fill.addColorStop(1, '#fbbf24');
    ctx.fillStyle = fill;
    ctx.fillRect(track.x, fillY, track.w, fillH);

    const sheenHeight = Math.min(24, Math.max(10, fillH * 0.34));
    const travel = Math.max(0, fillH - sheenHeight);
    const sheenY = fillY + travel * ((Math.sin(now / 460) + 1) / 2);
    const sheen = ctx.createLinearGradient(track.x, sheenY, track.x, sheenY + sheenHeight);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.52)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(track.x, sheenY, track.w, sheenHeight);
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1;
  roundRect(ctx, track.x, track.y, track.w, track.h, 999);
  ctx.stroke();

  if (almostReady) {
    ctx.save();
    ctx.globalAlpha = 0.68 + pulse * 0.22;
    drawOrb(ctx, rect.x + rect.w / 2, track.y + 6, rect.w * 0.9, 'rgba(251,113,133,0.42)');
    ctx.restore();
  }

  drawFittedText(
    ctx,
    `${streak}/${SWEET_SLASH_MIN_CONSECUTIVE_SAME_TYPE}`,
    rect.x + rect.w / 2,
    rect.y + rect.h - 14,
    rect.w - 8,
    10,
    'bold',
    almostReady ? style.palette.danger : style.palette.textSecondary,
    'center'
  );
  ctx.restore();
}

function buildLayout(runtime) {
  const width = runtime.width;
  const height = runtime.height;
  const safe = runtime.safeInsets || { top: 0, left: 0, right: 0, bottom: 0 };

  return {
    width,
    height,
    safeTop: safe.top,
    safeBottom: safe.bottom,
    sidePad: clamp(width * 0.05, 14, 24),
    topPad: clamp(safe.top + 18, 24, 48),
    bottomPad: clamp(safe.bottom + 34, 34, 58),
  };
}

function drawBackground(ctx, layout, style, now) {
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, style.palette.bgTop);
  gradient.addColorStop(0.5, style.palette.bgMid);
  gradient.addColorStop(1, style.palette.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);

  const pulse = (Math.sin(now / 1700) + 1) * 0.5;
  drawDotField(ctx, layout, style);

  ctx.save();
  ctx.globalAlpha = 0.65;
  drawOrb(ctx, layout.width * 0.1, layout.height * 0.08, 180, style.palette.orbRose);
  drawOrb(ctx, layout.width * 0.92, layout.height * 0.3, 150, style.palette.orbViolet);
  drawOrb(ctx, layout.width * 0.28, layout.height * 0.82, 140, style.palette.orbAmber);
  drawOrb(ctx, layout.width * 0.7, layout.height * 0.16, 120 + pulse * 18, style.palette.orbPink);
  ctx.restore();
}

function getHeaderMetrics(layout) {
  const compact = layout.width <= 360;
  return {
    compact,
    badgeY: layout.topPad + 4,
    titleY: layout.topPad + (compact ? 34 : 38),
    contentTop: layout.topPad + (compact ? 72 : 78),
  };
}

function getBottomActionRect(layout, height, lift) {
  return {
    x: layout.sidePad,
    y: layout.height - layout.bottomPad - height - (lift || 0),
    w: layout.width - layout.sidePad * 2,
    h: height,
  };
}

function drawTitle(ctx, layout, style, label) {
  const centerX = layout.width / 2;
  const header = getHeaderMetrics(layout);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';
  if (label) {
    drawChip(
      ctx,
      { x: centerX - 56, y: header.badgeY, w: 112, h: 22 },
      label,
      style,
      'rgba(255,255,255,0.78)'
    );
  }
  drawFittedText(
    ctx,
    '轻盈甜心消除',
    centerX,
    header.titleY,
    layout.width - layout.sidePad * 2,
    header.compact ? 24 : 25,
    'bold',
    style.palette.textPrimary,
    'center'
  );
  ctx.restore();
}

const CHARACTER_POSTER_SWATCHES = {
  'peach-soda': { top: '#f8afcf', bottom: '#f59ac1', edge: '#ff8fb7' },
  'cream-latte': { top: '#ecd2bf', bottom: '#ddb296', edge: '#d9b59d' },
  'mint-breeze': { top: '#c4efe7', bottom: '#8bd8ca', edge: '#91d6ca' },
  'berry-night': { top: '#ccb8f1', bottom: '#9a82d7', edge: '#b596ea' },
  'apricot-sun': { top: '#ffdca6', bottom: '#ffc47a', edge: '#ffcf95' },
  'ocean-star': { top: '#b8dcff', bottom: '#7db8f5', edge: '#9cccf9' },
  'rose-cocoa': { top: '#f2c4d7', bottom: '#d78aa8', edge: '#eab2ca' },
  'lemon-fizz': { top: '#e7f8b9', bottom: '#d4ea7a', edge: '#dff098' },
  'moon-iris': { top: '#e5d9ff', bottom: '#c8b3ff', edge: '#d8c6ff' },
};

function getCharacterPosterPalette(characterId) {
  return CHARACTER_POSTER_SWATCHES[characterId] || CHARACTER_POSTER_SWATCHES['peach-soda'];
}

function drawOnboardingSheet(ctx, rect, style) {
  ctx.save();
  ctx.shadowColor = 'rgba(244,114,182,0.08)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 10;
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  fill.addColorStop(0, 'rgba(255,250,252,0.86)');
  fill.addColorStop(0.55, 'rgba(255,255,255,0.88)');
  fill.addColorStop(1, 'rgba(248,244,255,0.9)');
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 26);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.stroke();
  ctx.restore();
}

function drawSparkle(ctx, x, y, size, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha || 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.42, -size * 0.42);
  ctx.lineTo(size, 0);
  ctx.lineTo(size * 0.42, size * 0.42);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.42, size * 0.42);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.42, -size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCapsHeader(ctx, text, x, y, color) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawGradientHeadline(ctx, text, x, y, maxWidth, startSize, leftColor, rightColor) {
  ctx.save();
  let size = startSize;
  while (size >= 18) {
    ctx.font = `bold ${size}px sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  const half = Math.min(maxWidth / 2, ctx.measureText(text).width / 2 + 8);
  const gradient = ctx.createLinearGradient(x - half, y, x + half, y);
  gradient.addColorStop(0, leftColor);
  gradient.addColorStop(1, rightColor);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = gradient;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function getCharacterCaption(character) {
  const captionMap = {
    'peach-soda': '适合喜欢元气感和舞台光泽的甜心形象。',
    'cream-latte': '温柔奶霜气质，适合轻熟系甜心风格。',
    'mint-breeze': '清爽薄荷感，像校园午后的轻盈微风。',
    'berry-night': '冷艳莓果氛围，适合偏个性气场的你。',
    'apricot-sun': '暖橘晴光调，治愈又有软糯少女感。',
    'ocean-star': '海盐与天光的清冷感，更显轻透轮廓。',
    'rose-cocoa': '玫瑰复古气质，带一点甜感和故事感。',
    'lemon-fizz': '清新明亮的活力气场，像冒泡的汽水。',
    'moon-iris': '偏梦幻仙气的氛围，更柔和也更轻灵。',
  };
  return captionMap[character.id] || `${character.tagline} 的甜心形象。`;
}

function drawCharacterPosterCard(ctx, runtime, character, rect, style, selected) {
  const palette = getCharacterPosterPalette(character.id);
  const image = runtime.images[character.stageAssetPaths[2]];
  const artRect = {
    x: rect.x + 2,
    y: rect.y + 2,
    w: rect.w - 4,
    h: rect.h - 4,
  };

  ctx.save();
  ctx.shadowColor = selected ? 'rgba(251,113,133,0.2)' : 'rgba(15,23,42,0.08)';
  ctx.shadowBlur = selected ? 16 : 10;
  ctx.shadowOffsetY = selected ? 7 : 4;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = selected ? 'rgba(255,141,185,0.95)' : 'rgba(226,232,240,0.96)';
  ctx.stroke();

  const artFill = ctx.createLinearGradient(artRect.x, artRect.y, artRect.x, artRect.y + artRect.h);
  artFill.addColorStop(0, palette.top);
  artFill.addColorStop(1, palette.bottom);
  roundRect(ctx, artRect.x, artRect.y, artRect.w, artRect.h, 16);
  ctx.fillStyle = artFill;
  ctx.fill();

  ctx.save();
  roundRect(ctx, artRect.x, artRect.y, artRect.w, artRect.h, 16);
  ctx.clip();
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(artRect.x + artRect.w * 0.2, artRect.y + artRect.h * 0.18, artRect.w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(artRect.x + artRect.w * 0.82, artRect.y + artRect.h * 0.24, artRect.w * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (image) {
    drawFittedImage(ctx, image, { x: artRect.x + 6, y: artRect.y + 6, w: artRect.w - 12, h: artRect.h - 12 }, {
      mode: 'cover',
      alignX: 0.5,
      alignY: 0.18,
    });
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(artRect.x + 6, artRect.y + 6, artRect.w - 12, artRect.h - 12);
  }
  ctx.restore();

  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(rect.x + rect.w - 18, rect.y + 18, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5aa5';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', rect.x + rect.w - 18, rect.y + 19);
    ctx.restore();
  }
  ctx.restore();
}

function drawWeightAdjustButton(ctx, rect, text, style) {
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 999);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(226,232,240,0.95)';
  ctx.stroke();
  ctx.fillStyle = style.palette.textSecondary;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

function drawWeightGoalPage(ctx, state, runtime, layout, style, hits, interactive, buttonText, buttonKind) {
  const centerX = layout.width / 2;
  const contentW = Math.min(layout.width - 24, 336);
  const sheet = {
    x: centerX - contentW / 2,
    y: layout.topPad - 10,
    w: contentW,
    h: layout.height - layout.topPad - Math.max(12, layout.bottomPad - 8),
  };
  const character = getCharacterById(state.selectedCharacterId);
  const image = runtime && runtime.images ? runtime.images[character.stageAssetPaths[2]] : null;
  const journeyProfile = getJourneyProfile(state.initialWeight, state.targetWeight);

  drawOnboardingSheet(ctx, sheet, style);
  drawSparkle(ctx, sheet.x + 22, sheet.y + 118, 10, 'rgba(255,189,204,0.74)', 0.95);
  drawCapsHeader(ctx, 'S L I M   S W E E T   C R U S H', centerX, sheet.y + 44, '#ff7b98');
  drawGradientHeadline(ctx, '轻盈甜心', centerX, sheet.y + 88, contentW - 60, 30, '#ff4f93', '#f8ae3f');
  drawFittedText(ctx, '✿ 设定你的小目标 ✿', centerX, sheet.y + 118, contentW - 60, 12, 'bold', style.palette.textSecondary, 'center');
  drawFittedText(
    ctx,
    `已选形象：${character.name} · ${character.tagline}`,
    centerX,
    sheet.y + 144,
    contentW - 40,
    13,
    'bold',
    style.palette.accentStrong,
    'center'
  );
  drawFittedText(ctx, `本次目标：${journeyProfile.label} · 立绘按相对蜕变进度变化`, centerX, sheet.y + 162, contentW - 36, 11, 'bold', style.palette.textSecondary, 'center');

  const card = {
    x: centerX - (contentW - 44) / 2,
    y: sheet.y + 186,
    w: contentW - 44,
    h: Math.min(418, sheet.h - 220),
  };
  drawCard(ctx, card, style, true);

  const avatarRect = { x: card.x + 18, y: card.y + 12, w: 60, h: 102 };
  const avatarFill = ctx.createLinearGradient(avatarRect.x, avatarRect.y, avatarRect.x, avatarRect.y + avatarRect.h);
  avatarFill.addColorStop(0, '#f7b6d1');
  avatarFill.addColorStop(1, '#f59dbd');
  ctx.save();
  roundRect(ctx, avatarRect.x, avatarRect.y, avatarRect.w, avatarRect.h, 16);
  ctx.fillStyle = avatarFill;
  ctx.fill();
  if (image) {
    drawFittedImage(ctx, image, { x: avatarRect.x + 4, y: avatarRect.y + 4, w: avatarRect.w - 8, h: avatarRect.h - 8 }, {
      mode: 'contain',
      alignX: 0.5,
      alignY: 0.56,
    });
  }
  ctx.restore();

  drawFittedText(ctx, character.name, avatarRect.x + avatarRect.w + 14, card.y + 30, card.w - avatarRect.w - 60, 18, 'bold', style.palette.textPrimary, 'left');
  drawFittedText(ctx, character.tagline, avatarRect.x + avatarRect.w + 14, card.y + 54, card.w - avatarRect.w - 60, 14, 'bold', style.palette.accentStrong, 'left');
  drawFittedText(ctx, interactive ? '调整你想达到的体重目标' : '重新检查角色与目标体重', avatarRect.x + avatarRect.w + 14, card.y + 82, card.w - avatarRect.w - 60, 12, 'bold', style.palette.textSecondary, 'left');

  ctx.save();
  ctx.strokeStyle = 'rgba(244,229,236,0.92)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
    ctx.moveTo(card.x, card.y + 126);
    ctx.lineTo(card.x + card.w, card.y + 126);
  ctx.stroke();
  ctx.restore();

  function drawWeightSection(label, value, centerY, accent, decKind, incKind) {
    drawFittedText(ctx, label, centerX, centerY - 28, card.w - 60, 13, 'bold', style.palette.textSecondary, 'center');
    drawFittedText(ctx, `${Math.round(value)}`, centerX, centerY + 6, card.w - 140, 48, 'normal', accent, 'center');
    ctx.save();
    ctx.strokeStyle = accent === style.palette.accentStrong ? 'rgba(255,176,214,0.95)' : 'rgba(226,232,240,0.98)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(card.x + 28, centerY + 48);
    ctx.lineTo(card.x + card.w - 28, centerY + 48);
    ctx.stroke();
    ctx.restore();

    if (interactive) {
      const btnY = centerY - 14;
      const decRect = { x: card.x + 18, y: btnY, w: 34, h: 34 };
      const incRect = { x: card.x + card.w - 52, y: btnY, w: 34, h: 34 };
      drawWeightAdjustButton(ctx, decRect, '−', style);
      drawWeightAdjustButton(ctx, incRect, '+', style);
      addHit(hits, decKind, decKind, decRect);
      addHit(hits, incKind, incKind, incRect);
    }
  }

  drawWeightSection('当前体重 (斤)', state.initialWeight, card.y + 186, style.palette.textPrimary, 'dec_initial', 'inc_initial');
  drawWeightSection('目标体重 (斤)', state.targetWeight, card.y + 290, style.palette.accentStrong, 'dec_target', 'inc_target');

  const actionRect = {
    x: card.x + 18,
    y: card.y + card.h - 56,
    w: card.w - 36,
    h: 46,
  };
  drawButton(ctx, actionRect, buttonText, style, 'primary');
  addHit(hits, buttonKind, buttonKind, actionRect);
}

function drawDotField(ctx, layout, style) {
  const spacing = 20;
  ctx.save();
  ctx.fillStyle = style.palette.bgDot;
  ctx.globalAlpha = 0.42;
  for (let y = 0; y <= layout.height; y += spacing) {
    const offset = Math.floor(y / spacing) % 2 === 0 ? 0 : 8;
    for (let x = 0; x <= layout.width; x += spacing) {
      ctx.beginPath();
      ctx.arc(x + offset + 1.5, y + 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOrb(ctx, x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

const FOOD_SWATCHES = [
  { accent: '#f59db4', accentSoft: '#fde7ee', accentStrong: '#e884a0', surfaceTop: '#fffdfc', surfaceBottom: '#fff7f8', border: '#f6d6df', ink: '#6a5560', chip: '#ffe5ec' },
  { accent: '#f0b272', accentSoft: '#fdf0df', accentStrong: '#d99145', surfaceTop: '#fffdf9', surfaceBottom: '#fff7ef', border: '#f3dfc8', ink: '#675646', chip: '#ffe9cf' },
  { accent: '#f3c95c', accentSoft: '#fbf2d8', accentStrong: '#d7ad3b', surfaceTop: '#fffef9', surfaceBottom: '#fff9ef', border: '#f2e6c4', ink: '#6d5b40', chip: '#fff0ba' },
  { accent: '#93c9a1', accentSoft: '#e8f4eb', accentStrong: '#6ead7f', surfaceTop: '#fcfefc', surfaceBottom: '#f3fbf4', border: '#d8eadb', ink: '#526658', chip: '#def1e2' },
  { accent: '#88cdc7', accentSoft: '#e5f7f5', accentStrong: '#5fb8ae', surfaceTop: '#fbfefe', surfaceBottom: '#f1fbfa', border: '#d3ece8', ink: '#4f6666', chip: '#dff5f2' },
  { accent: '#8db8ea', accentSoft: '#e7f1fc', accentStrong: '#6c9ddd', surfaceTop: '#fbfdff', surfaceBottom: '#f2f7fd', border: '#d8e5f6', ink: '#536379', chip: '#e2ecfb' },
  { accent: '#b29be5', accentSoft: '#efe9fb', accentStrong: '#957ed5', surfaceTop: '#fdfcff', surfaceBottom: '#f7f2fd', border: '#e2daf6', ink: '#5c5672', chip: '#ece4fa' },
  { accent: '#e7a2bf', accentSoft: '#fce8f0', accentStrong: '#d783a8', surfaceTop: '#fffdfd', surfaceBottom: '#fff5f8', border: '#f2d7e3', ink: '#6b5360', chip: '#ffe4ee' },
  { accent: '#b9a38f', accentSoft: '#f4ede7', accentStrong: '#9e866f', surfaceTop: '#fffdfb', surfaceBottom: '#faf5f0', border: '#e8ddd2', ink: '#66584e', chip: '#eee2d7' },
  { accent: '#9fc4c8', accentSoft: '#ebf5f6', accentStrong: '#7da9ad', surfaceTop: '#fcfefe', surfaceBottom: '#f4fbfb', border: '#dbecef', ink: '#526466', chip: '#e5f2f4' },
];

const FOOD_ICON_SPECS = [
  { kind: 'bubbleTea' },
  { kind: 'fries' },
  { kind: 'candy' },
  { kind: 'noodle' },
  { kind: 'cone' },
  { kind: 'sushi' },
  { kind: 'onigiri' },
  { kind: 'donut' },
  { kind: 'cake' },
  { kind: 'burger' },
  { kind: 'pizza' },
  { kind: 'taco' },
  { kind: 'cupcake' },
  { kind: 'popcorn' },
  { kind: 'hotdog' },
  { kind: 'soda' },
  { kind: 'dango' },
  { kind: 'pancake' },
  { kind: 'chocolate' },
  { kind: 'waffle' },
  { kind: 'cookie' },
  { kind: 'pretzel' },
  { kind: 'lollipop' },
  { kind: 'pudding' },
  { kind: 'honey' },
  { kind: 'peanuts' },
  { kind: 'cracker' },
  { kind: 'naruto' },
  { kind: 'mooncake' },
  { kind: 'gelato' },
  { kind: 'shavedIce' },
  { kind: 'potato' },
  { kind: 'chestnut' },
  { kind: 'bacon' },
  { kind: 'drumstick' },
  { kind: 'steak' },
  { kind: 'shrimp' },
  { kind: 'cheese' },
  { kind: 'bread' },
  { kind: 'sandwich' },
];

function getFoodSwatch(type) {
  const index = Math.abs(Number(type) || 0) % FOOD_SWATCHES.length;
  return FOOD_SWATCHES[index];
}

function getFoodIconSpec(type) {
  const index = Math.abs(Number(type) || 0) % FOOD_ICON_SPECS.length;
  return FOOD_ICON_SPECS[index];
}

function drawCenteredRoundRect(ctx, cx, cy, w, h, r) {
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
}

function fillDot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function strokeSegment(ctx, x1, y1, x2, y2, width, color) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawFoodTileSignature(ctx, rect, type, swatch, blocked) {
  const pillW = Math.min(rect.w * 0.3, 18);
  const pillH = Math.min(rect.h * 0.11, 7);
  const pillX = rect.x + rect.w / 2 - pillW / 2;
  const pillY = rect.y + Math.max(5, rect.h * 0.11);
  const dotCount = 2 + (Math.abs(type) % 2);
  ctx.save();
  roundRect(ctx, pillX, pillY, pillW, pillH, 999);
  ctx.fillStyle = blocked ? 'rgba(226,232,240,0.95)' : swatch.chip;
  ctx.fill();
  for (let i = 0; i < dotCount; i += 1) {
    const x = pillX + pillW * ((i + 1) / (dotCount + 1));
    fillDot(ctx, x, pillY + pillH / 2, 0.8 + dotCount * 0.12, blocked ? '#cbd5e1' : swatch.accentStrong);
  }
  ctx.restore();
}

function drawBlockedTileCover(ctx, rect) {
  const shadowY = rect.y + rect.h * 0.28;
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, Math.max(10, Math.min(rect.w, rect.h) * 0.24));
  ctx.clip();

  const veil = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  veil.addColorStop(0, 'rgba(226,232,240,0.08)');
  veil.addColorStop(0.45, 'rgba(148,163,184,0.14)');
  veil.addColorStop(1, 'rgba(100,116,139,0.18)');
  ctx.fillStyle = veil;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const softShadow = ctx.createLinearGradient(rect.x, rect.y, rect.x, shadowY + 10);
  softShadow.addColorStop(0, 'rgba(100,116,139,0.16)');
  softShadow.addColorStop(0.6, 'rgba(148,163,184,0.08)');
  softShadow.addColorStop(1, 'rgba(148,163,184,0)');
  ctx.fillStyle = softShadow;
  ctx.fillRect(rect.x, rect.y, rect.w, shadowY - rect.y + 10);

  ctx.restore();

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w * 0.16, shadowY);
  ctx.lineTo(rect.x + rect.w * 0.84, shadowY);
  ctx.stroke();
  ctx.restore();
}

function drawFoodGlyph(ctx, type, cx, cy, size, colors) {
  const spec = getFoodIconSpec(type);
  const kind = spec.kind;
  const accent = colors.accent;
  const accentSoft = colors.accentSoft;
  const accentStrong = colors.accentStrong;
  const cream = colors.cream;
  const ink = colors.ink;
  const line = Math.max(1.4, size * 0.075);
  const half = size / 2;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (kind) {
    case 'bubbleTea':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.08, size * 0.42, size * 0.58, size * 0.1);
      ctx.fillStyle = accentSoft;
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.06, cy - size * 0.38, cx + size * 0.1, cy - size * 0.02, line, ink);
      fillDot(ctx, cx - size * 0.12, cy + size * 0.2, size * 0.05, accentStrong);
      fillDot(ctx, cx, cy + size * 0.2, size * 0.05, accentStrong);
      fillDot(ctx, cx + size * 0.12, cy + size * 0.2, size * 0.05, accentStrong);
      break;
    case 'fries':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.24, cy + size * 0.24);
      ctx.lineTo(cx - size * 0.16, cy - size * 0.06);
      ctx.lineTo(cx + size * 0.16, cy - size * 0.06);
      ctx.lineTo(cx + size * 0.24, cy + size * 0.24);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
      for (let i = -1; i <= 1; i += 1) {
        drawCenteredRoundRect(ctx, cx + i * size * 0.12, cy - size * 0.18, size * 0.08, size * 0.26, size * 0.04);
        ctx.fillStyle = '#ffe3a6';
        ctx.fill();
      }
      break;
    case 'candy':
      drawCenteredRoundRect(ctx, cx, cy, size * 0.36, size * 0.26, size * 0.12);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.18, cy);
      ctx.lineTo(cx - size * 0.3, cy - size * 0.1);
      ctx.lineTo(cx - size * 0.3, cy + size * 0.1);
      ctx.closePath();
      ctx.fillStyle = accentSoft;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.18, cy);
      ctx.lineTo(cx + size * 0.3, cy - size * 0.1);
      ctx.lineTo(cx + size * 0.3, cy + size * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'noodle':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.18, size * 0.46, size * 0.2, size * 0.09);
      ctx.fillStyle = accent;
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.16, cy - size * 0.24, cx + size * 0.22, cy - size * 0.34, line * 0.9, ink);
      strokeSegment(ctx, cx - size * 0.1, cy - size * 0.16, cx + size * 0.16, cy - size * 0.16, line * 0.9, accentStrong);
      strokeSegment(ctx, cx - size * 0.12, cy - size * 0.08, cx + size * 0.12, cy - size * 0.08, line * 0.9, accentStrong);
      break;
    case 'cone':
      fillDot(ctx, cx, cy - size * 0.08, size * 0.19, accent);
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.3);
      ctx.lineTo(cx - size * 0.16, cy + size * 0.02);
      ctx.lineTo(cx + size * 0.16, cy + size * 0.02);
      ctx.closePath();
      ctx.fillStyle = '#efc28f';
      ctx.fill();
      break;
    case 'sushi':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.04, size * 0.42, size * 0.26, size * 0.09);
      ctx.fillStyle = cream;
      ctx.fill();
      drawCenteredRoundRect(ctx, cx, cy - size * 0.06, size * 0.38, size * 0.12, size * 0.06);
      ctx.fillStyle = accent;
      ctx.fill();
      strokeSegment(ctx, cx, cy - size * 0.1, cx, cy + size * 0.16, line * 0.9, ink);
      break;
    case 'onigiri':
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.24);
      ctx.lineTo(cx - size * 0.22, cy + size * 0.18);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.18);
      ctx.closePath();
      ctx.fillStyle = cream;
      ctx.fill();
      drawCenteredRoundRect(ctx, cx, cy + size * 0.08, size * 0.16, size * 0.14, size * 0.04);
      ctx.fillStyle = ink;
      ctx.fill();
      break;
    case 'donut':
      fillDot(ctx, cx, cy, size * 0.24, accent);
      fillDot(ctx, cx, cy, size * 0.1, '#fffdfb');
      fillDot(ctx, cx - size * 0.12, cy - size * 0.12, size * 0.018, '#ffffff');
      fillDot(ctx, cx, cy - size * 0.16, size * 0.018, '#ffffff');
      fillDot(ctx, cx + size * 0.12, cy - size * 0.04, size * 0.018, '#ffffff');
      break;
    case 'cake':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.2, cy + size * 0.16);
      ctx.lineTo(cx - size * 0.04, cy - size * 0.18);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.16);
      ctx.closePath();
      ctx.fillStyle = cream;
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.04, cy - size * 0.18, cx + size * 0.1, cy - size * 0.12, line, accent);
      fillDot(ctx, cx + size * 0.03, cy - size * 0.23, size * 0.04, accentStrong);
      break;
    case 'burger':
      fillDot(ctx, cx, cy - size * 0.12, size * 0.19, '#f2d1a6');
      drawCenteredRoundRect(ctx, cx, cy + size * 0.02, size * 0.42, size * 0.08, size * 0.03);
      ctx.fillStyle = accentStrong;
      ctx.fill();
      drawCenteredRoundRect(ctx, cx, cy + size * 0.16, size * 0.44, size * 0.12, size * 0.05);
      ctx.fillStyle = '#f2d1a6';
      ctx.fill();
      break;
    case 'pizza':
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.24);
      ctx.lineTo(cx - size * 0.22, cy - size * 0.2);
      ctx.lineTo(cx + size * 0.22, cy - size * 0.2);
      ctx.closePath();
      ctx.fillStyle = '#fff1d8';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.22, cy - size * 0.2, cx + size * 0.22, cy - size * 0.2, line, '#efbe73');
      fillDot(ctx, cx - size * 0.05, cy - size * 0.02, size * 0.04, accentStrong);
      fillDot(ctx, cx + size * 0.08, cy + size * 0.06, size * 0.04, accentStrong);
      break;
    case 'taco':
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.05, size * 0.2, Math.PI, 0);
      ctx.lineTo(cx + size * 0.2, cy + size * 0.16);
      ctx.lineTo(cx - size * 0.2, cy + size * 0.16);
      ctx.closePath();
      ctx.fillStyle = '#f2d39b';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.14, cy - size * 0.04, cx + size * 0.14, cy - size * 0.04, line * 0.8, accent);
      break;
    case 'cupcake':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.16, size * 0.28, size * 0.18, size * 0.05);
      ctx.fillStyle = '#e8d6cf';
      ctx.fill();
      fillDot(ctx, cx, cy - size * 0.04, size * 0.18, accent);
      fillDot(ctx, cx - size * 0.1, cy + size * 0.02, size * 0.11, accentSoft);
      fillDot(ctx, cx + size * 0.1, cy + size * 0.02, size * 0.11, accentSoft);
      break;
    case 'popcorn':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.14, size * 0.3, size * 0.24, size * 0.05);
      ctx.fillStyle = accent;
      ctx.fill();
      fillDot(ctx, cx - size * 0.12, cy - size * 0.06, size * 0.09, '#fff4dc');
      fillDot(ctx, cx, cy - size * 0.12, size * 0.1, '#fff4dc');
      fillDot(ctx, cx + size * 0.12, cy - size * 0.04, size * 0.09, '#fff4dc');
      break;
    case 'hotdog':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.03, size * 0.48, size * 0.18, size * 0.09);
      ctx.fillStyle = '#f2cfaa';
      ctx.fill();
      drawCenteredRoundRect(ctx, cx, cy + size * 0.02, size * 0.32, size * 0.09, size * 0.045);
      ctx.fillStyle = accentStrong;
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.12, cy - size * 0.02, cx + size * 0.12, cy + size * 0.04, line * 0.6, '#f4cf62');
      break;
    case 'soda':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.06, size * 0.3, size * 0.5, size * 0.08);
      ctx.fillStyle = accentSoft;
      ctx.fill();
      strokeSegment(ctx, cx + size * 0.04, cy - size * 0.34, cx + size * 0.14, cy - size * 0.06, line, ink);
      fillDot(ctx, cx - size * 0.04, cy - size * 0.02, size * 0.025, accentStrong);
      fillDot(ctx, cx + size * 0.04, cy + size * 0.08, size * 0.03, accentStrong);
      break;
    case 'dango':
      strokeSegment(ctx, cx - size * 0.24, cy + size * 0.22, cx + size * 0.22, cy - size * 0.16, line * 0.7, '#c8a37f');
      fillDot(ctx, cx - size * 0.1, cy + size * 0.08, size * 0.08, accentSoft);
      fillDot(ctx, cx, cy, size * 0.08, accent);
      fillDot(ctx, cx + size * 0.1, cy - size * 0.08, size * 0.08, accentStrong);
      break;
    case 'pancake':
      for (let i = 0; i < 3; i += 1) {
        drawCenteredRoundRect(ctx, cx, cy + size * (0.1 - i * 0.1), size * 0.42, size * 0.1, size * 0.05);
        ctx.fillStyle = '#f0cf9c';
        ctx.fill();
      }
      strokeSegment(ctx, cx - size * 0.1, cy - size * 0.12, cx + size * 0.12, cy - size * 0.08, line * 0.8, accentStrong);
      break;
    case 'chocolate':
      drawCenteredRoundRect(ctx, cx, cy, size * 0.38, size * 0.5, size * 0.05);
      ctx.fillStyle = '#73564e';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.12, cy - size * 0.04, cx + size * 0.12, cy - size * 0.04, line * 0.5, '#9f8075');
      strokeSegment(ctx, cx - size * 0.12, cy + size * 0.1, cx + size * 0.12, cy + size * 0.1, line * 0.5, '#9f8075');
      strokeSegment(ctx, cx, cy - size * 0.2, cx, cy + size * 0.2, line * 0.5, '#9f8075');
      break;
    case 'waffle':
      drawCenteredRoundRect(ctx, cx, cy, size * 0.4, size * 0.4, size * 0.05);
      ctx.fillStyle = '#edd19b';
      ctx.fill();
      for (let i = -1; i <= 1; i += 1) {
        strokeSegment(ctx, cx - size * 0.18, cy + i * size * 0.08, cx + size * 0.18, cy + i * size * 0.08, line * 0.5, '#d7b572');
        strokeSegment(ctx, cx + i * size * 0.08, cy - size * 0.18, cx + i * size * 0.08, cy + size * 0.18, line * 0.5, '#d7b572');
      }
      break;
    case 'cookie':
      fillDot(ctx, cx, cy, size * 0.22, '#f1d1a5');
      fillDot(ctx, cx - size * 0.08, cy - size * 0.02, size * 0.03, '#b8845f');
      fillDot(ctx, cx + size * 0.06, cy - size * 0.08, size * 0.025, '#b8845f');
      fillDot(ctx, cx + size * 0.1, cy + size * 0.08, size * 0.03, '#b8845f');
      break;
    case 'pretzel':
      ctx.strokeStyle = accentStrong;
      ctx.lineWidth = line;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.14, cy - size * 0.02);
      ctx.bezierCurveTo(cx - size * 0.28, cy - size * 0.2, cx - size * 0.18, cy + size * 0.16, cx, cy + size * 0.04);
      ctx.bezierCurveTo(cx + size * 0.18, cy + size * 0.16, cx + size * 0.28, cy - size * 0.2, cx + size * 0.14, cy - size * 0.02);
      ctx.stroke();
      strokeSegment(ctx, cx - size * 0.2, cy + size * 0.12, cx + size * 0.2, cy + size * 0.12, line, accentStrong);
      break;
    case 'lollipop':
      strokeSegment(ctx, cx, cy + size * 0.02, cx + size * 0.14, cy + size * 0.26, line * 0.8, '#c8a9a0');
      fillDot(ctx, cx - size * 0.02, cy - size * 0.04, size * 0.18, accent);
      break;
    case 'pudding':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.06, size * 0.38, size * 0.3, size * 0.12);
      ctx.fillStyle = '#f5d5a3';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.18, cy - size * 0.08, cx + size * 0.18, cy - size * 0.08, line * 0.8, accentStrong);
      break;
    case 'honey':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.02, size * 0.32, size * 0.38, size * 0.06);
      ctx.fillStyle = '#fff4da';
      ctx.fill();
      drawCenteredRoundRect(ctx, cx, cy + size * 0.08, size * 0.26, size * 0.22, size * 0.05);
      ctx.fillStyle = '#efc563';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.12, cy - size * 0.16, cx + size * 0.12, cy - size * 0.16, line * 0.8, ink);
      break;
    case 'peanuts':
      fillDot(ctx, cx - size * 0.08, cy, size * 0.12, '#e0bc8f');
      fillDot(ctx, cx + size * 0.08, cy, size * 0.12, '#d8b284');
      break;
    case 'cracker':
      drawCenteredRoundRect(ctx, cx, cy, size * 0.34, size * 0.26, size * 0.08);
      ctx.fillStyle = '#f0d9b0';
      ctx.fill();
      fillDot(ctx, cx - size * 0.08, cy - size * 0.04, size * 0.018, '#d1b285');
      fillDot(ctx, cx + size * 0.08, cy - size * 0.02, size * 0.018, '#d1b285');
      fillDot(ctx, cx, cy + size * 0.05, size * 0.018, '#d1b285');
      break;
    case 'naruto':
      fillDot(ctx, cx, cy, size * 0.18, '#fff8fb');
      ctx.strokeStyle = accentStrong;
      ctx.lineWidth = line * 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 1.6);
      ctx.stroke();
      break;
    case 'mooncake':
      fillDot(ctx, cx, cy, size * 0.2, '#ebc999');
      strokeSegment(ctx, cx - size * 0.1, cy, cx + size * 0.1, cy, line * 0.7, '#c49761');
      strokeSegment(ctx, cx, cy - size * 0.1, cx, cy + size * 0.1, line * 0.7, '#c49761');
      break;
    case 'gelato':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.18, size * 0.24, size * 0.18, size * 0.04);
      ctx.fillStyle = '#ecdad0';
      ctx.fill();
      fillDot(ctx, cx - size * 0.08, cy + size * 0.02, size * 0.1, accentSoft);
      fillDot(ctx, cx + size * 0.08, cy, size * 0.1, accent);
      break;
    case 'shavedIce':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.16, size * 0.36, size * 0.16, size * 0.05);
      ctx.fillStyle = '#e6d8ce';
      ctx.fill();
      fillDot(ctx, cx, cy - size * 0.02, size * 0.18, accentSoft);
      break;
    case 'potato':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.28);
      drawCenteredRoundRect(ctx, 0, 0, size * 0.34, size * 0.22, size * 0.1);
      ctx.fillStyle = '#d3976d';
      ctx.fill();
      ctx.restore();
      strokeSegment(ctx, cx - size * 0.08, cy + size * 0.02, cx + size * 0.06, cy - size * 0.02, line * 0.6, '#f1c088');
      break;
    case 'chestnut':
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.22);
      ctx.bezierCurveTo(cx - size * 0.2, cy - size * 0.06, cx - size * 0.22, cy + size * 0.18, cx, cy + size * 0.22);
      ctx.bezierCurveTo(cx + size * 0.22, cy + size * 0.18, cx + size * 0.2, cy - size * 0.06, cx, cy - size * 0.22);
      ctx.fillStyle = '#a56b4d';
      ctx.fill();
      break;
    case 'bacon':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.12);
      ctx.strokeStyle = accentStrong;
      ctx.lineWidth = size * 0.16;
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.16);
      ctx.bezierCurveTo(-size * 0.1, -size * 0.28, size * 0.04, -size * 0.04, size * 0.14, -size * 0.16);
      ctx.bezierCurveTo(size * 0.22, -size * 0.28, size * 0.26, 0, size * 0.18, size * 0.18);
      ctx.stroke();
      ctx.strokeStyle = '#f8d2d2';
      ctx.lineWidth = size * 0.06;
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, -size * 0.14);
      ctx.bezierCurveTo(-size * 0.08, -size * 0.22, size * 0.02, 0, size * 0.12, -size * 0.12);
      ctx.bezierCurveTo(size * 0.2, -size * 0.2, size * 0.22, 0.02, size * 0.14, size * 0.16);
      ctx.stroke();
      ctx.restore();
      break;
    case 'drumstick':
      fillDot(ctx, cx - size * 0.04, cy - size * 0.02, size * 0.16, accentStrong);
      strokeSegment(ctx, cx + size * 0.04, cy + size * 0.08, cx + size * 0.2, cy + size * 0.2, line, '#d3b9a6');
      fillDot(ctx, cx + size * 0.22, cy + size * 0.22, size * 0.04, '#efe3d9');
      fillDot(ctx, cx + size * 0.16, cy + size * 0.16, size * 0.04, '#efe3d9');
      break;
    case 'steak':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.18, cy);
      ctx.bezierCurveTo(cx - size * 0.22, cy - size * 0.18, cx + size * 0.12, cy - size * 0.2, cx + size * 0.22, cy - size * 0.04);
      ctx.bezierCurveTo(cx + size * 0.24, cy + size * 0.14, cx, cy + size * 0.22, cx - size * 0.14, cy + size * 0.16);
      ctx.closePath();
      ctx.fillStyle = accentStrong;
      ctx.fill();
      fillDot(ctx, cx + size * 0.02, cy + size * 0.02, size * 0.07, '#f8d6d3');
      break;
    case 'shrimp':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.32);
      ctx.strokeStyle = accentStrong;
      ctx.lineWidth = size * 0.16;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.16, Math.PI * 0.1, Math.PI * 1.2);
      ctx.stroke();
      strokeSegment(ctx, size * 0.1, -size * 0.16, size * 0.22, -size * 0.24, line * 0.6, accentStrong);
      ctx.restore();
      break;
    case 'cheese':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.18, cy + size * 0.16);
      ctx.lineTo(cx - size * 0.12, cy - size * 0.12);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.08);
      ctx.closePath();
      ctx.fillStyle = '#f1cf70';
      ctx.fill();
      fillDot(ctx, cx - size * 0.02, cy + size * 0.02, size * 0.03, '#f8ebac');
      fillDot(ctx, cx + size * 0.08, cy + size * 0.08, size * 0.025, '#f8ebac');
      break;
    case 'bread':
      drawCenteredRoundRect(ctx, cx, cy + size * 0.02, size * 0.4, size * 0.34, size * 0.12);
      ctx.fillStyle = '#efd1a6';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.08, cy - size * 0.06, cx - size * 0.02, cy + size * 0.08, line * 0.5, '#ddb27c');
      strokeSegment(ctx, cx + size * 0.04, cy - size * 0.08, cx + size * 0.1, cy + size * 0.06, line * 0.5, '#ddb27c');
      break;
    case 'sandwich':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.22, cy + size * 0.16);
      ctx.lineTo(cx, cy - size * 0.18);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.16);
      ctx.closePath();
      ctx.fillStyle = '#f2dfba';
      ctx.fill();
      strokeSegment(ctx, cx - size * 0.12, cy + size * 0.02, cx + size * 0.12, cy + size * 0.02, line * 0.8, accent);
      break;
    default:
      fillDot(ctx, cx, cy, half * 0.4, accent);
      break;
  }

  ctx.restore();
}

function createSpriteSurface(width, height) {
  if (typeof wx === 'undefined' || !wx.createOffscreenCanvas) return null;
  return wx.createOffscreenCanvas({ type: '2d', width, height });
}

function getRenderCache(runtime) {
  if (!runtime) return null;
  if (!runtime.renderCache) {
    runtime.renderCache = {
      foodTileSprites: Object.create(null),
    };
  }
  return runtime.renderCache;
}

function getFoodTileSprite(runtime, rect, type, emoji, blocked) {
  const cache = getRenderCache(runtime);
  if (!cache) return null;

  const width = Math.max(1, Math.round(rect.w));
  const height = Math.max(1, Math.round(rect.h));
  const key = `${width}x${height}:${type}:${blocked ? 1 : 0}`;
  if (cache.foodTileSprites[key]) {
    return cache.foodTileSprites[key];
  }

  const surface = createSpriteSurface(width, height);
  if (!surface) return null;
  const surfaceCtx = surface.getContext('2d');
  if (!surfaceCtx) return null;

  drawFoodTileBlock(surfaceCtx, { x: 0, y: 0, w: width, h: height }, type, emoji, blocked);
  cache.foodTileSprites[key] = surface;
  return surface;
}

function drawCachedFoodTileBlock(ctx, rect, type, emoji, blocked, runtime) {
  const sprite = getFoodTileSprite(runtime, rect, type, emoji, blocked);
  if (!sprite) {
    drawFoodTileBlock(ctx, rect, type, emoji, blocked);
    return;
  }
  ctx.drawImage(sprite, rect.x, rect.y, rect.w, rect.h);
}

function drawFoodEmoji(ctx, emoji, x, y, size, blocked) {
  ctx.save();
  ctx.globalAlpha = blocked ? 0.5 : 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(size)}px sans-serif`;
  if (!blocked) {
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.strokeText(emoji, x, y + 1);
  }
  ctx.shadowColor = blocked ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.14)';
  ctx.shadowBlur = blocked ? 2 : Math.max(4, size * 0.12);
  ctx.shadowOffsetY = blocked ? 0 : Math.max(1, size * 0.03);
  ctx.fillText(emoji, x, y + 1);
  ctx.restore();
}

function drawFoodTileBlock(ctx, rect, type, emoji, blocked) {
  const swatch = getFoodSwatch(type);
  const minSide = Math.min(rect.w, rect.h);
  const radius = Math.max(10, minSide * 0.24);
  const accent = blocked ? '#cbd5e1' : swatch.accent;
  const accentSoft = blocked ? '#f1f5f9' : swatch.accentSoft;
  const border = blocked ? '#dbe4ee' : swatch.border;
  const surface = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  surface.addColorStop(0, blocked ? '#ffffff' : swatch.surfaceTop);
  surface.addColorStop(1, blocked ? '#f8fafc' : swatch.surfaceBottom);

  ctx.save();
  ctx.shadowColor = blocked ? 'rgba(148,163,184,0.12)' : 'rgba(205,177,187,0.16)';
  ctx.shadowBlur = Math.max(8, minSide * 0.18);
  ctx.shadowOffsetY = Math.max(2, minSide * 0.06);
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = Math.max(1, minSide * 0.025);
  ctx.strokeStyle = border;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h * 0.34, Math.max(8, radius - 2));
  const gloss = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h * 0.34);
  gloss.addColorStop(0, 'rgba(255,255,255,0.82)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();

  const badgeR = minSide * 0.24;
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = accentSoft;
  ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2 + minSide * 0.03, badgeR * 1.26, badgeR * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();
  fillDot(ctx, rect.x + rect.w * 0.76, rect.y + rect.h * 0.26, minSide * 0.055, accent);
  ctx.restore();

  drawFoodTileSignature(ctx, rect, type, swatch, blocked);
  drawFoodEmoji(
    ctx,
    emoji,
    rect.x + rect.w / 2,
    rect.y + rect.h / 2 + (blocked ? minSide * 0.08 : minSide * 0.05),
    minSide * (blocked ? 0.66 : 0.74),
    blocked
  );
  if (blocked) {
    drawBlockedTileCover(ctx, rect);
  }
}

function drawFoodDisc(ctx, x, y, r, emoji, type, style, alpha) {
  const opacity = typeof alpha === 'number' ? alpha : 1;
  const swatch = getFoodSwatch(type);
  ctx.save();
  ctx.globalAlpha = opacity;
  const fill = ctx.createRadialGradient(x - r * 0.18, y - r * 0.22, r * 0.12, x, y, r * 1.08);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, swatch.surfaceBottom);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = swatch.border;
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = swatch.accentSoft;
  ctx.ellipse(x, y + r * 0.05, r * 0.68, r * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  drawFoodEmoji(ctx, emoji, x, y + r * 0.06, r * 1.42, false);
  ctx.restore();
}

function drawDockCornerAccent(ctx, x, y, scale, mirrored) {
  const direction = mirrored ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);

  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  for (let i = 0; i < 4; i += 1) {
    const angle = i * (Math.PI / 2) + Math.PI / 4;
    const px = Math.cos(angle) * scale * 0.7;
    const py = Math.sin(angle) * scale * 0.7;
    ctx.beginPath();
    ctx.ellipse(px, py, scale * 0.42, scale * 0.24, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.fillStyle = 'rgba(251,113,133,0.72)';
  ctx.arc(0, 0, scale * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(244,114,182,0.26)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(scale * 0.3, scale * 0.2);
  ctx.quadraticCurveTo(scale * 1.1, scale * 0.5, scale * 1.55, scale * 1.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(251,191,210,0.88)';
  ctx.arc(scale * 1.05, scale * 0.42, scale * 0.12, 0, Math.PI * 2);
  ctx.arc(scale * 1.32, scale * 0.78, scale * 0.09, 0, Math.PI * 2);
  ctx.arc(scale * 1.55, scale * 1.1, scale * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.68)';
  ctx.lineWidth = 1;
  ctx.moveTo(-scale * 0.2, -scale * 0.95);
  ctx.lineTo(scale * 0.16, -scale * 1.3);
  ctx.moveTo(scale * 0.36, -scale * 1.02);
  ctx.lineTo(scale * 0.62, -scale * 1.28);
  ctx.stroke();

  ctx.restore();
}

function drawDockDecorations(ctx, dockRect) {
  ctx.save();
  ctx.globalAlpha = 0.95;
  drawDockCornerAccent(ctx, dockRect.x + 16, dockRect.y + 13, 10, false);
  drawDockCornerAccent(ctx, dockRect.x + dockRect.w - 16, dockRect.y + dockRect.h - 13, 10, true);
  ctx.restore();
}

function getPowerUpBadge(powerUp) {
  if (powerUp === 'addSlot') {
    return { label: '+1', fill: '#f6579b' };
  }
  if (powerUp === 'remove3') {
    return { label: '清', fill: '#ff8f6b' };
  }
  if (powerUp === 'revealTop') {
    return { label: '揭', fill: '#7c98ff' };
  }
  if (powerUp === 'attractSame') {
    return { label: '吸', fill: '#f6bf49' };
  }
  if (powerUp === 'shuffle') {
    return { label: '排', fill: '#ffb66a' };
  }
  return null;
}

function drawSlashEntity(ctx, entity, style) {
  if (!entity.active) return;
  if (!entity.hit) {
    drawFoodDisc(ctx, entity.x, entity.y, entity.r, entity.emoji, entity.type, style, 1);
    return;
  }

  const t = clamp(entity.hitMs / 240, 0, 1);
  const progress = easeOutCubic(t);
  const spread = 6 + progress * (entity.r * 0.8);
  const fade = 1 - t;
  const angle = entity.cutAngle || 0;
  const rotation = entity.rotation || 0;

  [-1, 1].forEach((side) => {
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(angle + rotation * 0.6);
    ctx.translate(side * spread, side * 2.5);
    ctx.beginPath();
    if (side < 0) {
      ctx.rect(-entity.r - 4, -entity.r - 4, entity.r + 4, entity.r * 2 + 8);
    } else {
      ctx.rect(0, -entity.r - 4, entity.r + 4, entity.r * 2 + 8);
    }
    ctx.clip();
    drawFoodDisc(ctx, 0, 0, entity.r, entity.emoji, entity.type, style, fade);
    ctx.restore();
  });

  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.rotate(angle);
  ctx.globalAlpha = fade * 0.95;
  ctx.strokeStyle = 'rgba(255,255,255,0.98)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-entity.r * 1.12, -entity.r * 0.66);
  ctx.lineTo(entity.r * 1.12, entity.r * 0.66);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(251,113,133,0.86)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-entity.r * 0.96, -entity.r * 0.52);
  ctx.lineTo(entity.r * 0.96, entity.r * 0.52);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade;
  for (let i = 0; i < 6; i += 1) {
    const theta = angle + i * (Math.PI / 3);
    const dist = entity.r * (0.38 + progress * 0.72) + (i % 2) * 4;
    ctx.beginPath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(251,113,133,0.78)';
    ctx.arc(
      entity.x + Math.cos(theta) * dist,
      entity.y + Math.sin(theta) * dist,
      2.8 + (1 - t) * 1.8,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawSlashTrail(ctx, runtime, now) {
  const points = runtime.slash && runtime.slash.trail ? runtime.slash.trail : [];
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const point = points[i];
    const age = clamp((now - point.t) / 220, 0, 1);
    const alpha = (1 - age) * (0.45 + i / points.length * 0.4);
    if (alpha <= 0.01) continue;
    ctx.strokeStyle = `rgba(251,113,133,${alpha})`;
    ctx.lineWidth = Math.max(4, point.w * (1 - age * 0.6));
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, alpha + 0.18)})`;
    ctx.lineWidth = Math.max(1.6, point.w * 0.32 * (1 - age * 0.35));
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  const tip = points[points.length - 1];
  const tipAge = clamp((now - tip.t) / 220, 0, 1);
  const tipAlpha = 1 - tipAge;
  if (tipAlpha > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${tipAlpha})`;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 6 + tip.w * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSlashCuts(ctx, runtime, now) {
  const cuts = runtime.slashCuts || [];
  cuts.forEach((cut) => {
    const t = clamp((now - cut.start) / cut.durationMs, 0, 1);
    if (t >= 1) return;
    const alpha = 1 - t;
    const length = 34 + easeOutCubic(t) * 34;
    ctx.save();
    ctx.translate(cut.x, cut.y);
    ctx.rotate(cut.angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-length * 0.5, -length * 0.08);
    ctx.lineTo(length * 0.5, length * 0.08);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(251,113,133,0.84)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-length * 0.36, -length * 0.02);
    ctx.lineTo(length * 0.36, length * 0.02);
    ctx.stroke();
    ctx.restore();
  });
}

function drawMatchBursts(ctx, runtime, layout, now) {
  const bursts = runtime.matchBursts || [];
  if (bursts.length === 0) return;
  const g = computeGameLayout(layout);

  bursts.forEach((burst) => {
    if (now < burst.start) return;
    const t = clamp((now - burst.start) / burst.durationMs, 0, 1);
    if (t >= 1) return;
    const expand = easeOutCubic(t);
    const fade = 1 - t;
    burst.tiles.forEach((tile, index) => {
      const slotRect = getDockSlotRect(g.dockRect, runtime.state.maxDockSize, tile.dockIndex);
      const cx = slotRect.x + slotRect.w / 2;
      const cy = slotRect.y + slotRect.h / 2;
      const seed = (index + 1) * 0.45;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(cx, cy, slotRect.h * (0.24 + expand * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(251,113,133,0.46)';
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 8; i += 1) {
        const theta = seed + i * (Math.PI / 4);
        const dist = slotRect.h * (0.16 + expand * 0.48) + (i % 2) * 3;
        const px = cx + Math.cos(theta) * dist;
        const py = cy + Math.sin(theta) * dist;
        ctx.save();
        ctx.globalAlpha = fade * (0.8 - i * 0.04);
        ctx.beginPath();
        ctx.fillStyle = i % 3 === 0 ? 'rgba(251,113,133,0.84)' : 'rgba(255,255,255,0.96)';
        ctx.arc(px, py, 2.6 + (1 - t) * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = fade * 0.88;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.floor(slotRect.h * (0.6 + (1 - t) * 0.08))}px sans-serif`;
      ctx.fillStyle = '#2d2a3a';
      ctx.fillText(FOODS[tile.type] || '🍩', cx, cy);
      ctx.restore();
    });
  });
}

function getDockSlotRect(dockRect, maxDockSize, index) {
  const slotGap = 5;
  const slotW = (dockRect.w - 20 - (maxDockSize - 1) * slotGap) / maxDockSize;
  return {
    x: dockRect.x + 10 + index * (slotW + slotGap),
    y: dockRect.y + 10,
    w: slotW,
    h: dockRect.h - 20,
  };
}

function drawTileFlights(ctx, runtime, layout, now) {
  const flights = runtime.tileFlights || [];
  if (flights.length === 0) return;
  const g = computeGameLayout(layout);

  flights.forEach((flight) => {
    if (now < flight.start) return;
    const t = clamp((now - flight.start) / flight.durationMs, 0, 1);
    if (t >= 1) return;

    const source = tileToCanvas(flight.tile, g.boardRect, g.tileSize, g.tileInset);
    const fromX = source.x + g.tileSize / 2;
    const fromY = source.y + g.tileSize / 2;
    const slotRect = getDockSlotRect(g.dockRect, runtime.state.maxDockSize, flight.dockIndex);
    const toX = slotRect.x + slotRect.w / 2;
    const toY = slotRect.y + slotRect.h / 2;
    const p = easeOutBack(t);
    const arc = Math.sin(t * Math.PI) * Math.max(18, layout.height * 0.06);
    const x = fromX + (toX - fromX) * p;
    const y = fromY + (toY - fromY) * p - arc;
    const scale = 1 - t * 0.22;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawCachedFoodTileBlock(
      ctx,
      { x: -g.tileSize / 2, y: -g.tileSize / 2, w: g.tileSize, h: g.tileSize },
      flight.tile.type,
      FOODS[flight.tile.type] || '🍩',
      false,
      runtime
    );
    ctx.restore();
  });
}

function drawMetricPill(ctx, rect, label, value, style, emphasis) {
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, style.radius.pill);
  ctx.fillStyle = emphasis ? 'rgba(252, 231, 243, 0.94)' : 'rgba(255,255,255,0.88)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = emphasis ? 'rgba(244,114,182,0.22)' : 'rgba(226,232,240,0.92)';
  ctx.stroke();
  drawFittedText(ctx, label, rect.x + rect.w / 2, rect.y + 11, rect.w - 10, 9, 'bold', style.palette.textMuted, 'center');
  drawFittedText(
    ctx,
    String(value),
    rect.x + rect.w / 2,
    rect.y + rect.h - 12,
    rect.w - 10,
    emphasis ? 18 : 16,
    'bold',
    emphasis ? style.palette.accentStrong : style.palette.textPrimary,
    'center'
  );
  ctx.restore();
}

function drawStageTracker(ctx, x, y, w, stage, style) {
  const dots = 4;
  const step = dots > 1 ? w / (dots - 1) : 0;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(226,232,240,0.95)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  ctx.strokeStyle = style.palette.accentStrong;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + step * Math.max(0, stage - 1), y);
  ctx.stroke();

  for (let i = 0; i < dots; i += 1) {
    const active = i < stage;
    const cx = x + step * i;
    ctx.beginPath();
    ctx.arc(cx, y, i + 1 === stage ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = active ? style.palette.accentStrong : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = active ? 'rgba(244,114,182,0.24)' : 'rgba(203,213,225,0.92)';
    ctx.stroke();
  }
  ctx.restore();
}

function drawCharacterSelect(ctx, state, runtime, layout, style, hits) {
  const centerX = layout.width / 2;
  const contentW = Math.min(layout.width - 24, 344);
  const sheet = {
    x: centerX - contentW / 2,
    y: layout.topPad - 10,
    w: contentW,
    h: layout.height - layout.topPad - Math.max(12, layout.bottomPad - 8),
  };
  const selectedCharacter = getCharacterById(state.selectedCharacterId);

  drawOnboardingSheet(ctx, sheet, style);
  drawSparkle(ctx, sheet.x + 26, sheet.y + 108, 10, 'rgba(255,192,204,0.76)', 1);
  drawCapsHeader(ctx, 'S L I M   S W E E T   C A S T', centerX, sheet.y + 42, '#ff7b98');
  drawFittedText(ctx, '选择你的甜心形象', centerX, sheet.y + 84, contentW - 40, 28, 'bold', '#1f304c', 'center');
  drawFittedText(ctx, selectedCharacter.name, centerX, sheet.y + 118, contentW - 30, 14, 'bold', style.palette.textSecondary, 'center');

  const buttonH = 50;
  const gridTop = sheet.y + 140;
  const gridBottom = sheet.y + sheet.h - 74;
  const cols = 3;
  const rows = Math.ceil(CHARACTER_OPTIONS.length / cols);
  const gapX = 10;
  const gapY = 10;
  const cardW = (contentW - 10 - gapX * (cols - 1)) / cols;
  const cardH = Math.min(138, (gridBottom - gridTop - gapY * (rows - 1)) / rows);

  CHARACTER_OPTIONS.forEach((character, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rect = {
      x: centerX - contentW / 2 + 5 + col * (cardW + gapX),
      y: gridTop + row * (cardH + gapY),
      w: cardW,
      h: cardH,
    };
    drawCharacterPosterCard(ctx, runtime, character, rect, style, character.id === state.selectedCharacterId);
    addHit(hits, 'character', character.id, rect);
  });

  const nextBtn = {
    x: centerX - (contentW - 14) / 2,
    y: sheet.y + sheet.h - 56,
    w: contentW - 14,
    h: buttonH,
  };
  drawButton(ctx, nextBtn, '选她开始蜕变', style, 'primary');
  addHit(hits, 'go_input', 'go_input', nextBtn);
}

function drawInputPage(ctx, state, runtime, layout, style, hits) {
  drawWeightGoalPage(ctx, state, runtime, layout, style, hits, true, '确认目标体重  →', 'go_confirm');
}

function drawConfirmPage(ctx, state, runtime, layout, style, hits) {
  drawWeightGoalPage(ctx, state, runtime, layout, style, hits, false, '确认并开始蜕变  →', 'go_home');
}

function drawHomePage(ctx, state, runtime, layout, style, hits) {
  const header = getHeaderMetrics(layout);
  const journey = getJourneyContext(state);
  const compact = layout.width <= 360 || layout.height <= 700;
  drawTitle(ctx, layout, style, '准备开局');

  const startBtn = getBottomActionRect(layout, compact ? 50 : 54, compact ? 8 : 12);
  startBtn.x += compact ? 8 : 6;
  startBtn.w -= (compact ? 16 : 12);

  const modeStartGap = compact ? 34 : 38;
  const modeCardH = compact ? 114 : 120;
  const modeCard = {
    x: layout.sidePad + (compact ? 6 : 4),
    y: startBtn.y - modeStartGap - modeCardH,
    w: layout.width - (layout.sidePad + (compact ? 6 : 4)) * 2,
    h: modeCardH,
  };

  const infoToModeGap = compact ? 14 : 16;
  const infoCard = {
    x: layout.sidePad + 6,
    y: modeCard.y - infoToModeGap - (compact ? 88 : 94),
    w: layout.width - (layout.sidePad + 6) * 2,
    h: compact ? 88 : 94,
  };

  const heroTop = header.contentTop + (compact ? 2 : 8);
  const heroBottom = infoCard.y - (compact ? 18 : 22);
  const heroTextReserve = compact ? 62 : 70;
  const avatarH = Math.max(
    150,
    Math.min(
      compact ? 194 : 220,
      heroBottom - heroTop - heroTextReserve
    )
  );
  const avatarW = Math.min(avatarH * 0.78, compact ? 162 : 182);
  const avatarRect = {
    x: layout.width / 2 - avatarW / 2,
    y: heroTop,
    w: avatarW,
    h: avatarH,
  };
  drawAvatar(ctx, runtime, state, avatarRect, { mode: 'contain', padding: 0, alignY: 0.52 });
  const character = getCharacterById(state.selectedCharacterId);
  drawFittedText(
    ctx,
    character.name,
    layout.width / 2,
    avatarRect.y + avatarRect.h + (compact ? 12 : 14),
    layout.width - layout.sidePad * 2,
    compact ? 17 : 18,
    'bold',
    style.palette.textPrimary,
    'center'
  );
  drawFittedText(
    ctx,
    character.tagline,
    layout.width / 2,
    avatarRect.y + avatarRect.h + (compact ? 30 : 34),
    layout.width - layout.sidePad * 2,
    compact ? 12 : 13,
    'normal',
    style.palette.accentStrong,
    'center'
  );
  const heroChipW = Math.min(layout.width - layout.sidePad * 2 - 30, compact ? 178 : 194);
  drawChip(
    ctx,
    {
      x: layout.width / 2 - heroChipW / 2,
      y: avatarRect.y + avatarRect.h + (compact ? 40 : 46),
      w: heroChipW,
      h: 22,
    },
    `${journey.journeyProfile.label} · ${journey.stageMeta.label}`,
    style,
    'rgba(255,247,250,0.98)'
  );

  const progress = journey.progress;
  drawCard(ctx, infoCard, style, false);
  const metricTop = infoCard.y + 18;
  const leftX = infoCard.x + infoCard.w * 0.26;
  const rightX = infoCard.x + infoCard.w * 0.74;
  const metricW = infoCard.w * 0.34;
  drawFittedText(ctx, '当前体重', leftX, metricTop, metricW, 11, 'bold', style.palette.textSecondary, 'center');
  drawFittedText(
    ctx,
    `${state.currentWeight.toFixed(1)} 斤`,
    leftX,
    infoCard.y + 40,
    metricW,
    compact ? 18 : 20,
    '600',
    style.palette.textPrimary,
    'center'
  );
  drawFittedText(ctx, '目标体重', rightX, metricTop, metricW, 11, 'bold', style.palette.accentStrong, 'center');
  drawFittedText(
    ctx,
    `${state.targetWeight.toFixed(1)} 斤`,
    rightX,
    infoCard.y + 40,
    metricW,
    compact ? 18 : 20,
    '600',
    style.palette.accentStrong,
    'center'
  );
  ctx.save();
  ctx.strokeStyle = 'rgba(244,229,236,0.92)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(infoCard.x + infoCard.w / 2, infoCard.y + 16);
  ctx.lineTo(infoCard.x + infoCard.w / 2, infoCard.y + 52);
  ctx.stroke();
  ctx.restore();
  drawFittedText(
    ctx,
    `向目标推进 ${Math.round(progress)}%`,
    infoCard.x + infoCard.w / 2,
    infoCard.y + 60,
    infoCard.w - 40,
    11,
    'bold',
    style.palette.textSecondary,
    'center'
  );

  const barRect = { x: infoCard.x + 18, y: infoCard.y + infoCard.h - 18, w: infoCard.w - 36, h: 9 };
  ctx.save();
  roundRect(ctx, barRect.x, barRect.y, barRect.w, barRect.h, style.radius.pill);
  ctx.fillStyle = 'rgba(241,245,249,0.95)';
  ctx.fill();
  roundRect(ctx, barRect.x, barRect.y, barRect.w * (progress / 100), barRect.h, style.radius.pill);
  ctx.fillStyle = style.palette.accentStrong;
  ctx.fill();
  ctx.restore();

  drawCard(ctx, modeCard, style, false);
  drawSparkle(ctx, modeCard.x + 18, modeCard.y + 20, 6, 'rgba(255,190,210,0.78)', 0.9);
  drawSparkle(ctx, modeCard.x + modeCard.w - 18, modeCard.y + 20, 6, 'rgba(255,220,140,0.72)', 0.88);

  const modeInset = compact ? 14 : 16;
  const modeW = modeCard.w - modeInset * 2;
  const modeH = compact ? 42 : 44;
  const modeGap = compact ? 12 : 14;
  const modeY = modeCard.y + (compact ? 16 : 18);
  const infiniteRect = { x: modeCard.x + modeInset, y: modeY, w: modeW, h: modeH };
  const classicRect = { x: modeCard.x + modeInset, y: modeY + modeH + modeGap, w: modeW, h: modeH };

  drawButton(ctx, infiniteRect, '∞ 无限模式', style, state.gameMode === 'INFINITE' ? 'primary' : 'secondary');
  drawButton(ctx, classicRect, '◷ 经典模式', style, state.gameMode === 'CLASSIC' ? 'primary' : 'secondary');
  addHit(hits, 'set_mode', 'INFINITE', infiniteRect);
  addHit(hits, 'set_mode', 'CLASSIC', classicRect);

  drawButton(ctx, startBtn, '开始游戏', style, 'primary');
  addHit(hits, 'start_game', 'start_game', startBtn);
}

function computeGameLayout(layout) {
  const controlsY = layout.topPad + 4;
  const controlsH = 32;
  const heroH = clamp(layout.height * 0.238, 182, 222);
  const heroW = clamp(heroH * 0.565, 108, 134);
  const heroRect = {
    x: layout.width / 2 - heroW / 2,
    y: controlsY + controlsH + 10,
    w: heroW,
    h: heroH,
  };
  const slashMeterW = clamp(layout.width * 0.082, 28, 34);
  const slashMeterGap = 10;
  let slashMeterX = heroRect.x + heroRect.w + slashMeterGap;
  if (slashMeterX + slashMeterW > layout.width - layout.sidePad) {
    slashMeterX = heroRect.x - slashMeterGap - slashMeterW;
  }
  const slashMeterRect = {
    x: slashMeterX,
    y: heroRect.y + 6,
    w: slashMeterW,
    h: heroRect.h - 12,
  };
  const progressY = heroRect.y + heroRect.h + 14;
  const progressH = 8;
  const boardTop = progressY + progressH + 16;
  const footerH = 38;
  const dockH = 60;
  const boardBottom = layout.height - layout.bottomPad - dockH - footerH + 2;
  const boardSize = clamp(Math.min(layout.width * 0.89, boardBottom - boardTop), 224, 276);
  const boardShell = {
    x: (layout.width - (boardSize + 18)) / 2,
    y: boardTop,
    w: boardSize + 18,
    h: boardSize + 18,
  };
  const boardRect = {
    x: boardShell.x + 9,
    y: boardShell.y + 9,
    w: boardSize,
    h: boardSize,
  };
  const tileSize = clamp(boardRect.w * 0.245, 42, 58);
  const tileInset = Math.max(4, boardRect.w * 0.024);
  const dockRect = {
    x: layout.sidePad,
    y: boardShell.y + boardShell.h + 16,
    w: layout.width - layout.sidePad * 2,
    h: dockH,
  };
  const footerRect = {
    x: layout.sidePad,
    y: dockRect.y + dockRect.h + 14,
    w: layout.width - layout.sidePad * 2,
    h: footerH,
  };
  return {
    controlsY,
    controlsH,
    heroRect,
    slashMeterRect,
    progressY,
    progressH,
    boardShell,
    boardRect,
    tileSize,
    tileInset,
    dockRect,
    footerRect,
  };
}

function tileToCanvas(tile, boardRect, tileSize, inset) {
  const pad = inset || 0;
  const usableW = Math.max(1, boardRect.w - pad * 2);
  const usableH = Math.max(1, boardRect.h - pad * 2);
  const left = boardRect.x + pad + (clamp(tile.x, 0, 9) / 10) * usableW;
  const top = boardRect.y + pad + (clamp(tile.y, 0, 9) / 10) * usableH;
  return { x: left, y: top, size: tileSize };
}

function drawGamePage(ctx, state, runtime, layout, style, hits) {
  const now = Date.now();
  const g = computeGameLayout(layout);
  const journey = getJourneyContext(state);
  const progress = journey.progress;
  const heroCenterX = g.heroRect.x + g.heroRect.w / 2;
  const centerX = layout.width / 2;
  const scoreX = layout.sidePad + 14;
  const rightX = layout.width - layout.sidePad - 14;

  drawFittedText(ctx, '分数', scoreX, g.controlsY + 7, 48, 10, 'bold', style.palette.textMuted, 'left');
  drawFittedText(ctx, `${state.score}`, scoreX, g.controlsY + 24, 74, 22, 'bold', style.palette.textPrimary, 'left');
  if (state.gameMode === 'CLASSIC') {
    const timeColor = state.timeLeft <= 10 ? style.palette.danger : style.palette.textAccent;
    drawFittedText(ctx, '倒计时', centerX, g.controlsY + 7, 60, 10, 'bold', style.palette.textMuted, 'center');
    drawFittedText(ctx, `${state.timeLeft}s`, centerX, g.controlsY + 24, 78, 20, 'bold', timeColor, 'center');
  }
  drawFittedText(ctx, '关卡', rightX, g.controlsY + 7, 48, 10, 'bold', style.palette.textAccent, 'right');
  drawFittedText(ctx, `${state.level}`, rightX, g.controlsY + 24, 60, 24, 'bold', style.palette.accentStrong, 'right');

  drawCard(ctx, g.heroRect, style, true);
  ctx.save();
  ctx.globalAlpha = 0.66;
  drawOrb(
    ctx,
    heroCenterX,
    g.heroRect.y + g.heroRect.h * 0.42,
    Math.max(82, g.heroRect.w * 0.88),
    style.palette.orbRose
  );
  ctx.restore();
  drawAvatar(ctx, runtime, state, g.heroRect, {
    frame: false,
    background: true,
    mode: 'cover',
    padding: 0,
    alignX: 0.5,
    alignY: 0.52,
  });
  drawSlashChargeMeter(ctx, state, g.slashMeterRect, style, now);

  const weightLeftX = layout.sidePad + 6;
  const weightRightX = layout.width - layout.sidePad - 6;
  const heroBar = {
    x: layout.sidePad + 92,
    y: g.progressY,
    w: Math.max(110, layout.width - (layout.sidePad + 92) * 2),
    h: g.progressH,
  };
  drawFittedText(ctx, '当前体重', weightLeftX, g.progressY - 10, 74, 10, 'bold', style.palette.textMuted, 'left');
  drawFittedText(ctx, `${state.currentWeight.toFixed(1)}斤`, weightLeftX, g.progressY + 12, 84, 18, 'bold', style.palette.textPrimary, 'left');
  drawFittedText(ctx, '目标体重', weightRightX, g.progressY - 10, 74, 10, 'bold', style.palette.textMuted, 'right');
  drawFittedText(ctx, `${state.targetWeight.toFixed(1)}斤`, weightRightX, g.progressY + 12, 84, 18, 'bold', style.palette.accentStrong, 'right');
  ctx.save();
  roundRect(ctx, heroBar.x, heroBar.y, heroBar.w, heroBar.h, 999);
  ctx.fillStyle = 'rgba(241,245,249,0.98)';
  ctx.fill();
  roundRect(ctx, heroBar.x, heroBar.y, heroBar.w * (progress / 100), heroBar.h, 999);
  ctx.fillStyle = style.palette.accentStrong;
  ctx.fill();
  ctx.restore();
  drawFittedText(ctx, `${journey.stageMeta.shortLabel} ${Math.round(progress)}%`, centerX, g.progressY + 12, heroBar.w - 20, 10, 'bold', style.palette.textMuted, 'center');

  ctx.save();
  ctx.shadowColor = 'rgba(244,114,182,0.12)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, g.boardShell.x, g.boardShell.y, g.boardShell.w, g.boardShell.h, style.radius.xl);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, g.boardShell.x, g.boardShell.y, g.boardShell.w, g.boardShell.h, style.radius.xl);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(252,231,243,0.92)';
  ctx.setLineDash([3, 5]);
  roundRect(ctx, g.boardRect.x + 6, g.boardRect.y + 6, g.boardRect.w - 12, g.boardRect.h - 12, style.radius.md);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const boardTiles = state.tiles.filter((tile) => tile.status === 'board').sort((a, b) => a.z - b.z);
  const tileHits = [];
  boardTiles.forEach((tile) => {
    const pos = tileToCanvas(tile, g.boardRect, g.tileSize, g.tileInset);
    const blocked = isBlocked(tile, state.tiles);
    const tileRect = { x: pos.x, y: pos.y, w: g.tileSize, h: g.tileSize };

    ctx.save();
    drawCachedFoodTileBlock(ctx, tileRect, tile.type, FOODS[tile.type] || '🍩', blocked, runtime);

    if (tile.powerUp) {
      const badgeMeta = getPowerUpBadge(tile.powerUp);
      const badge = { x: tileRect.x + tileRect.w - 14, y: tileRect.y - 6, w: 16, h: 16 };
      roundRect(ctx, badge.x, badge.y, badge.w, badge.h, 8);
      ctx.fillStyle = badgeMeta ? badgeMeta.fill : '#ff7e90';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(badgeMeta ? badgeMeta.label : '技', badge.x + badge.w / 2, badge.y + badge.h / 2 + 0.5);
    }
    ctx.restore();

    tileHits.push({
      kind: 'tile',
      id: tile.id,
      x: tileRect.x,
      y: tileRect.y,
      w: tileRect.w,
      h: tileRect.h,
      extra: { z: tile.z },
    });
  });
  tileHits.sort((a, b) => (b.extra.z || 0) - (a.extra.z || 0));
  tileHits.forEach((item) => hits.push(item));

  drawCard(ctx, g.dockRect, style, true);
  drawDockDecorations(ctx, g.dockRect);
  const activeFlightDockIndices = new Set();
  (runtime.tileFlights || []).forEach((flight) => {
    if (getFlightProgress(flight, now) < 1) {
      activeFlightDockIndices.add(flight.dockIndex);
    }
  });
  for (let i = 0; i < state.maxDockSize; i += 1) {
    const slotRect = getDockSlotRect(g.dockRect, state.maxDockSize, i);
    const tile = state.dock[i];
    roundRect(ctx, slotRect.x, slotRect.y, slotRect.w, slotRect.h, 11);
    ctx.fillStyle = tile
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(255,255,255,0.78)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = tile ? 'rgba(255,255,255,0.36)' : 'rgba(252,231,243,0.96)';
    ctx.stroke();
    const isFlyingIntoSlot = activeFlightDockIndices.has(i);
    if (tile && !isFlyingIntoSlot) {
      drawCachedFoodTileBlock(ctx, slotRect, tile.type, FOODS[tile.type] || '🍩', false, runtime);
    }
  }

  const reshuffleRect = { x: g.footerRect.x, y: g.footerRect.y, w: (g.footerRect.w - 12) / 2, h: g.footerRect.h };
  const finishRect = { x: reshuffleRect.x + reshuffleRect.w + 12, y: g.footerRect.y, w: reshuffleRect.w, h: g.footerRect.h };
  const reshuffleDisabled = state.reshufflesRemaining <= 0;
  drawButton(ctx, reshuffleRect, '重新排列', style, reshuffleDisabled ? 'disabled' : 'secondary');
  drawButtonBadge(
    ctx,
    reshuffleRect,
    state.reshufflesRemaining,
    reshuffleDisabled ? 'rgba(148,163,184,0.98)' : 'rgba(251,113,133,0.96)',
    '#ffffff'
  );
  drawButton(ctx, finishRect, '结束游戏', style, 'primary');
  addHit(hits, 'reshuffle', 'reshuffle', reshuffleRect);
  addHit(hits, 'finish_game', 'finish_game', finishRect);

  if (state.slash.active) {
    ctx.save();
    ctx.fillStyle = 'rgba(27, 20, 40, 0.4)';
    ctx.fillRect(0, 0, layout.width, layout.height);
    drawSlashScoreCard(ctx, runtime, layout, style, now);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('甜心狂切！快速滑动', layout.width / 2, layout.topPad + 44);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`已切中 ${state.slash.slashedCount} · 连斩 x${Math.max(1, state.slash.combo || 0)}`, layout.width / 2, layout.topPad + 68);

    drawSlashTrail(ctx, runtime, now);
    drawSlashCuts(ctx, runtime, now);
    runtime.slash.entities.forEach((entity) => {
      drawSlashEntity(ctx, entity, style);
    });

    const endBtn = { x: layout.width - layout.sidePad - 128, y: layout.topPad + 8, w: 128, h: 40 };
    drawButton(ctx, endBtn, '结束狂切', style, 'primary');
    addHit(hits, 'end_slash', 'end_slash', endBtn);
    ctx.restore();
  }
}

function drawResultPage(ctx, state, runtime, layout, style, hits) {
  const header = getHeaderMetrics(layout);
  drawTitle(ctx, layout, style, '结算页');
  const card = {
    x: layout.sidePad,
    y: header.contentTop + 6,
    w: layout.width - layout.sidePad * 2,
    h: layout.height - header.contentTop - layout.bottomPad - 122,
  };
  drawCard(ctx, card, style, true);

  const avatarRect = {
    x: card.x + card.w / 2 - 68,
    y: card.y + 16,
    w: 136,
    h: 214,
  };
  drawAvatar(ctx, runtime, state, avatarRect, { mode: 'contain', padding: 0, alignY: 0.52 });
  const titleColor = state.success ? style.palette.success : style.palette.danger;
  drawFittedText(ctx, state.success ? '恭喜达标' : '本局结束', card.x + card.w / 2, avatarRect.y + avatarRect.h + 30, card.w - 24, 30, 'bold', titleColor, 'center');

  drawFittedText(ctx, `原因：${state.resultReason || (state.success ? '目标完成' : '挑战失败')}`, card.x + card.w / 2, avatarRect.y + avatarRect.h + 64, card.w - 24, 16, 'bold', style.palette.textSecondary, 'center');
  drawFittedText(ctx, `最终体重 ${state.currentWeight.toFixed(1)} 斤`, card.x + card.w / 2, avatarRect.y + avatarRect.h + 92, card.w - 24, 18, 'bold', style.palette.textPrimary, 'center');
  drawFittedText(ctx, `总分 ${state.score} · 三消 ${state.matchCount} 次`, card.x + card.w / 2, avatarRect.y + avatarRect.h + 118, card.w - 24, 16, '600', style.palette.textSecondary, 'center');

  const replayRect = getBottomActionRect(layout, 48, 66);
  const homeRect = getBottomActionRect(layout, 48, 10);
  drawButton(ctx, replayRect, '再来一局', style, 'primary');
  drawButton(ctx, homeRect, '回到首页', style, 'secondary');
  addHit(hits, 'restart', 'restart', replayRect);
  addHit(hits, 'go_home', 'go_home', homeRect);
}

function drawToast(ctx, runtime, layout, style, now) {
  if (!runtime.toast) return;
  if (runtime.toast.until <= now) return;
  const rect = {
    x: layout.sidePad + 6,
    y: layout.height - layout.bottomPad - 50,
    w: layout.width - (layout.sidePad + 6) * 2,
    h: 36,
  };
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, style.radius.pill);
  ctx.fillStyle = 'rgba(45,42,58,0.9)';
  ctx.fill();
  drawFittedText(ctx, runtime.toast.text, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w - 16, 15, 'bold', '#ffffff', 'center');
  ctx.restore();
}

function drawScreenFlash(ctx, runtime, layout, style, now) {
  if (!runtime.screenFlash) return;
  const elapsed = now - runtime.screenFlash.start;
  const duration = runtime.screenFlash.durationMs;
  if (elapsed > duration) return;

  const t = clamp(elapsed / duration, 0, 1);
  const enterT = clamp(t / 0.24, 0, 1);
  const exitT = clamp((t - 0.72) / 0.28, 0, 1);
  let x = layout.width * 0.5;
  if (t < 0.24) {
    x = -layout.width * 0.32 + layout.width * 0.82 * easeOutCubic(enterT);
  } else if (t > 0.72) {
    x = layout.width * 0.5 + layout.width * 0.78 * easeOutCubic(exitT);
  }
  const alpha = t < 0.12
    ? t / 0.12
    : (t > 0.84 ? (1 - t) / 0.16 : 1);
  const color = toneColor(runtime.screenFlash.tone, style.palette);

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  const bandW = Math.min(layout.width * 0.8, 280);
  const bandH = 62;
  const bandX = x - bandW / 2;
  const bandY = layout.height * 0.52 - bandH / 2;
  const band = ctx.createLinearGradient(bandX, bandY, bandX + bandW, bandY + bandH);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.18, 'rgba(255,255,255,0.2)');
  band.addColorStop(0.5, 'rgba(255,255,255,0.42)');
  band.addColorStop(0.82, 'rgba(255,255,255,0.2)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  roundRect(ctx, bandX, bandY, bandW, bandH, 999);
  ctx.fillStyle = band;
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px sans-serif';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.86)';
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeText(runtime.screenFlash.text, x, layout.height * 0.52);
  ctx.fillText(runtime.screenFlash.text, x, layout.height * 0.52);
  ctx.restore();
}

function drawReboundModal(ctx, runtime, layout, style, now) {
  if (!runtime.reboundModal) return;
  const modal = runtime.reboundModal;
  const elapsed = now - modal.start;
  const duration = modal.durationMs;
  if (elapsed > duration) return;

  const t = clamp(elapsed / duration, 0, 1);
  const enter = easeOutCubic(clamp(t / 0.24, 0, 1));
  const weightProgress = easeOutCubic(clamp(t / 0.7, 0, 1));
  const weight = modal.oldWeight + (modal.newWeight - modal.oldWeight) * weightProgress;

  ctx.save();
  ctx.fillStyle = 'rgba(45, 36, 57, 0.45)';
  ctx.fillRect(0, 0, layout.width, layout.height);

  const rect = {
    x: layout.sidePad + 8,
    y: layout.height * 0.18 + (1 - enter) * 80,
    w: layout.width - (layout.sidePad + 8) * 2,
    h: layout.height * 0.64,
  };
  drawCard(ctx, rect, style, true);

  drawFittedText(ctx, '突发反弹', rect.x + rect.w / 2, rect.y + 46, rect.w - 22, 34, 'bold', style.palette.danger, 'center');
  drawFittedText(ctx, '哎呀，突然好想吃夜宵', rect.x + rect.w / 2, rect.y + 76, rect.w - 22, 16, '600', style.palette.textSecondary, 'center');

  const weightBox = { x: rect.x + 16, y: rect.y + 102, w: rect.w - 32, h: 66 };
  roundRect(ctx, weightBox.x, weightBox.y, weightBox.w, weightBox.h, style.radius.md);
  ctx.fillStyle = 'rgba(255, 122, 183, 0.12)';
  ctx.fill();
  drawFittedText(ctx, `体重 ${weight.toFixed(1)} 斤`, weightBox.x + weightBox.w / 2, weightBox.y + weightBox.h / 2, weightBox.w - 16, 34, 'bold', style.palette.danger, 'center');

  drawFittedText(ctx, '新增食物', rect.x + 16, rect.y + 200, rect.w - 32, 14, 'bold', style.palette.textSecondary, 'left');
  const foods = modal.incomingFoods.slice(0, 12);
  const cols = 6;
  const gap = 6;
  const itemW = (rect.w - 32 - gap * (cols - 1)) / cols;
  foods.forEach((food, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = rect.x + 16 + col * (itemW + gap);
    const y = rect.y + 214 + row * (itemW + gap);
    roundRect(ctx, x, y, itemW, itemW, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(itemW * 0.64)}px sans-serif`;
    ctx.fillStyle = style.palette.textPrimary;
    ctx.fillText(food, x + itemW / 2, y + itemW / 2 + 1);
  });
  if (modal.incomingFoods.length > 12) {
    drawFittedText(
      ctx,
      `+${modal.incomingFoods.length - 12}`,
      rect.x + rect.w - 38,
      rect.y + 244 + itemW + gap,
      60,
      16,
      'bold',
      style.palette.textAccent,
      'center'
    );
  }

  drawFittedText(ctx, '继续稳住节奏，马上追回来', rect.x + rect.w / 2, rect.y + rect.h - 22, rect.w - 20, 15, '600', style.palette.textSecondary, 'center');
  ctx.restore();
}

function drawLevelUpOverlay(ctx, runtime, layout, style, now) {
  if (!runtime.levelUpOverlay) return;
  const overlay = runtime.levelUpOverlay;
  const t = clamp((now - overlay.start) / overlay.durationMs, 0, 1);
  if (t >= 1) return;

  ctx.save();
  ctx.globalAlpha = t < 0.2 ? t / 0.2 : (t > 0.82 ? (1 - t) / 0.18 : 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
  ctx.fillRect(0, 0, layout.width, layout.height);
  const rect = {
    x: layout.width / 2 - 138,
    y: layout.height / 2 - 92,
    w: 276,
    h: 184,
  };
  drawCard(ctx, rect, style, true);
  drawFittedText(ctx, 'LEVEL CLEARED', rect.x + rect.w / 2, rect.y + 60, rect.w - 20, 32, 'bold', style.palette.textAccent, 'center');
  drawFittedText(ctx, `进入第 ${overlay.level} 关`, rect.x + rect.w / 2, rect.y + 110, rect.w - 20, 20, 'bold', style.palette.textPrimary, 'center');
  ctx.restore();
}

function drawSpecialOverlay(ctx, runtime, layout, style, now) {
  if (!runtime.specialOverlay) return;
  const overlay = runtime.specialOverlay;
  const t = clamp((now - overlay.start) / overlay.durationMs, 0, 1);
  if (t >= 1) return;

  const alpha = t < 0.16 ? t / 0.16 : (t > 0.84 ? (1 - t) / 0.16 : 1);
  const weight = overlay.oldWeight + (overlay.newWeight - overlay.oldWeight) * easeOutCubic(t);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.fillRect(0, 0, layout.width, layout.height);
  const rect = {
    x: layout.width / 2 - 146,
    y: layout.height / 2 - 110,
    w: 292,
    h: 220,
  };
  drawCard(ctx, rect, style, true);
  drawFittedText(ctx, '完美消除', rect.x + rect.w / 2, rect.y + 62, rect.w - 20, 36, 'bold', style.palette.accentStrong, 'center');
  drawFittedText(ctx, `体重 ${weight.toFixed(1)} 斤`, rect.x + rect.w / 2, rect.y + 118, rect.w - 20, 28, 'bold', style.palette.textPrimary, 'center');
  drawFittedText(ctx, '加速变瘦已触发', rect.x + rect.w / 2, rect.y + 162, rect.w - 20, 18, '600', style.palette.textSecondary, 'center');
  ctx.restore();
}

function renderPage(ctx, state, runtime, layout, style, hits) {
  if (state.page === 'CHARACTER_SELECT') {
    drawCharacterSelect(ctx, state, runtime, layout, style, hits);
  } else if (state.page === 'INPUT') {
    drawInputPage(ctx, state, runtime, layout, style, hits);
  } else if (state.page === 'CONFIRM') {
    drawConfirmPage(ctx, state, runtime, layout, style, hits);
  } else if (state.page === 'HOME') {
    drawHomePage(ctx, state, runtime, layout, style, hits);
  } else if (state.page === 'GAME') {
    drawGamePage(ctx, state, runtime, layout, style, hits);
  } else if (state.page === 'RESULT') {
    drawResultPage(ctx, state, runtime, layout, style, hits);
  }
}

function render(ctx, state, runtime) {
  const now = Date.now();
  const style = runtime.style;
  const layout = buildLayout(runtime);
  const hits = [];

  drawBackground(ctx, layout, style, now);

  ctx.save();
  if (runtime.transition) {
    const t = clamp((now - runtime.transition.start) / runtime.transition.durationMs, 0, 1);
    const enter = easeOutCubic(t);
    ctx.globalAlpha = 0.68 + enter * 0.32;
    ctx.translate((1 - enter) * 20, 0);
  }
  renderPage(ctx, state, runtime, layout, style, hits);
  ctx.restore();

  drawTileFlights(ctx, runtime, layout, now);
  drawMatchBursts(ctx, runtime, layout, now);
  drawScreenFlash(ctx, runtime, layout, style, now);
  drawSpecialOverlay(ctx, runtime, layout, style, now);
  drawLevelUpOverlay(ctx, runtime, layout, style, now);
  drawReboundModal(ctx, runtime, layout, style, now);
  drawToast(ctx, runtime, layout, style, now);

  runtime.hits = hits;
}

function findHit(runtime, x, y) {
  const hits = runtime.hits || [];
  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    if (contains(hit, x, y)) return hit;
  }
  return null;
}

module.exports = {
  render,
  findHit,
};
