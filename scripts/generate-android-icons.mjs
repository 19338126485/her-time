/**
 * Android 启动图标生成：node scripts/generate-android-icons.mjs
 *
 * 输出到 android/app/src/main/res/：
 * - mipmap-各密度/ic_launcher_foreground.png  自适应图标前景（透明弯月，108/162/216/324/432）
 * - mipmap-各密度/ic_launcher.png             旧版图标（水蓝底，48/72/96/144/192）
 * - mipmap-各密度/ic_launcher_round.png       旧版圆形图标（水蓝圆底）
 * 背景色由 res/values/ic_launcher_background.xml 提供（#E0F7FA，随本脚本一并写死）。
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resDir = join(root, 'android', 'app', 'src', 'main', 'res');

const BG = '#E0F7FA'; // 水蓝
const PINK = '#EC407A'; // 玫粉
const PINK_DEEP = '#D6336C'; // 玫红

/** 真·透明镂空弯月（mask 减法）+ 小圆点；100x100 坐标系 */
function glyphTransparent(scale, offset) {
  return `<g transform="translate(${offset} ${offset}) scale(${scale / 100})">
    <mask id="crescent"><rect width="100" height="100" fill="white"/><circle cx="66" cy="36" r="26" fill="black"/></mask>
    <circle cx="50" cy="50" r="34" fill="${PINK}" mask="url(#crescent)"/>
    <circle cx="30" cy="78" r="6.5" fill="${PINK_DEEP}"/>
  </g>`;
}

/** 前景：全透明底 + 居中弯月（占 66%，自适应图标安全区要求 66dp 内） */
function foregroundSvg(size) {
  const g = Math.round(size * 0.66);
  const off = Math.round((size - g) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${glyphTransparent(g, off)}
</svg>`;
}

/** 旧版方形：水蓝全底 + 弯月；旧版圆形：水蓝圆底 + 弯月 */
function legacySvg(size, round) {
  const g = Math.round(size * 0.66);
  const off = Math.round((size - g) / 2);
  const bg = round
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${BG}"/>`
    : `<rect width="${size}" height="${size}" fill="${BG}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  ${glyphTransparent(g, off)}
</svg>`;
}

function renderPng(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

// 密度 → [自适应前景边长, 旧版图标边长]
const DENSITIES = {
  'mipmap-mdpi': [108, 48],
  'mipmap-hdpi': [162, 72],
  'mipmap-xhdpi': [216, 96],
  'mipmap-xxhdpi': [324, 144],
  'mipmap-xxxhdpi': [432, 192],
};

for (const [dir, [fgSize, legacySize]] of Object.entries(DENSITIES)) {
  const out = join(resDir, dir);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'ic_launcher_foreground.png'), renderPng(foregroundSvg(fgSize), fgSize));
  writeFileSync(join(out, 'ic_launcher.png'), renderPng(legacySvg(legacySize, false), legacySize));
  writeFileSync(join(out, 'ic_launcher_round.png'), renderPng(legacySvg(legacySize, true), legacySize));
  console.log(`generated ${dir}/ (fg ${fgSize}, legacy ${legacySize})`);
}
