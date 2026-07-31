/**
 * PWA 图标生成脚本：node scripts/generate-icons.mjs（或 npm run icons）
 *
 * 用 @resvg/resvg-js（预编译二进制，Windows 可用）把内联 SVG 渲染成 PNG。
 * 图标设计：玫粉弯月 + 小圆点（月相/周期意象），水蓝底。
 * 图形源同时写回 public/favicon.svg，保持 favicon 与 PWA 图标一致。
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

const BG = '#E0F7FA'; // 水蓝（与 manifest background_color/theme_color 一致）
const PINK = '#EC407A'; // 玫粉
const PINK_DEEP = '#D6336C'; // 实际经期玫红（日历三态同色）

/** 弯月图形（100x100 坐标系内，直径约 68） */
function glyph(scale, offset) {
  return `<g transform="translate(${offset} ${offset}) scale(${scale / 100})">
    <circle cx="50" cy="50" r="34" fill="${PINK}"/>
    <circle cx="66" cy="36" r="26" fill="${BG}"/>
    <circle cx="30" cy="78" r="6.5" fill="${PINK_DEEP}"/>
  </g>`;
}

/** 生成方形图标 SVG：水蓝全底 + 居中弯月；glyphRatio 为图形占画布比例 */
function iconSvg(size, glyphRatio) {
  const g = Math.round(size * glyphRatio);
  const off = Math.round((size - g) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  ${glyph(g, off)}
</svg>`;
}

function renderPng(svg, size) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
}

mkdirSync(outDir, { recursive: true });

// 普通图标：图形约占 66%
for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), renderPng(iconSvg(size, 0.66), size));
  console.log(`generated icons/icon-${size}.png`);
}

// maskable：图形约束在 80% 安全区内
writeFileSync(
  join(outDir, 'icon-maskable-512.png'),
  renderPng(iconSvg(512, 0.8), 512),
);
console.log('generated icons/icon-maskable-512.png');

// favicon.svg：同一图形，圆角方底
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${BG}"/>
  ${glyph(42, 11)}
</svg>
`;
writeFileSync(join(root, 'public', 'favicon.svg'), favicon);
console.log('updated favicon.svg');
