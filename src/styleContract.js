'use strict';

const STYLE_CONTRACT = {
  palette: {
    bgTop: '#fff6f8',
    bgMid: '#fdf8fb',
    bgBottom: '#f4f1fb',
    bgDot: 'rgba(244, 114, 182, 0.07)',
    orbRose: 'rgba(251, 191, 210, 0.50)',
    orbPink: 'rgba(252, 231, 243, 0.42)',
    orbViolet: 'rgba(221, 214, 254, 0.34)',
    orbAmber: 'rgba(253, 230, 138, 0.28)',
    card: 'rgba(255, 255, 255, 0.8)',
    cardStrong: 'rgba(255, 255, 255, 0.92)',
    cardStroke: 'rgba(255, 255, 255, 0.86)',
    textPrimary: '#1f304c',
    textSecondary: '#7a879d',
    textMuted: '#94a3b8',
    textAccent: '#fb7185',
    accent: '#f472b6',
    accentStrong: '#ec4899',
    accentSoft: 'rgba(252, 231, 243, 0.95)',
    danger: '#f43f5e',
    success: '#22a07a',
    mask: 'rgba(15, 23, 42, 0.36)',
    shadow: 'rgba(244, 114, 182, 0.18)',
    buttonPrimary: '#1f2d46',
    buttonSecondary: 'rgba(255, 255, 255, 0.92)',
    buttonSecondaryStroke: 'rgba(226, 232, 240, 1)',
    gold: '#f6bf49',
  },
  radius: {
    xl: 30,
    lg: 22,
    md: 16,
    sm: 12,
    pill: 999,
  },
  motion: {
    pageMs: 280,
    toastMs: 1900,
    flashMs: 2200,
    reboundMs: 2600,
    levelUpMs: 1700,
    specialMs: 1400,
  },
  font: {
    title: 'bold 32px sans-serif',
    h1: 'bold 26px sans-serif',
    h2: 'bold 22px sans-serif',
    body: '500 18px sans-serif',
    bodySmall: '500 14px sans-serif',
    button: 'bold 18px sans-serif',
    caption: 'bold 12px sans-serif',
  },
};

function toneColor(tone, palette) {
  if (tone === 'gold') return palette.gold;
  return palette.accentStrong;
}

module.exports = {
  STYLE_CONTRACT,
  toneColor,
};
