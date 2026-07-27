// Generates the drops-wins project's placeholder images locally with sharp.
// Run: node scripts/gen-drops-wins-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'projects/drops-wins/assets');
const WIDTHS = [400, 800, 1200, 1600];

function heroSvg(width, height) {
  // Dark navy gradient stage with scattered gold coins and a soft glow.
  const coins = [];
  const rand = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);
  for (let i = 0; i < 90; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 4 + rand() * 22;
    const o = 0.25 + rand() * 0.65;
    coins.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="#f0b429" opacity="${o.toFixed(2)}"/>` +
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 0.72).toFixed(0)}" fill="#c8871a" opacity="${(o * 0.8).toFixed(2)}"/>`
    );
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2340"/>
          <stop offset="0.55" stop-color="#0a0e1a"/>
          <stop offset="1" stop-color="#070a13"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stop-color="#f0b429" stop-opacity="0.35"/>
          <stop offset="1" stop-color="#f0b429" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      ${coins.join('')}
    </svg>`
  );
}

function thumbSvg(size, color1, color2, label) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${color1}"/>
          <stop offset="1" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="${size / 2}" cy="${size * 0.4}" r="${size * 0.16}" fill="rgba(255,255,255,0.22)"/>
      <text x="50%" y="72%" font-family="sans-serif" font-size="${size / 16}" font-weight="bold" fill="#ffffff"
        text-anchor="middle">${label}</text>
    </svg>`
  );
}

async function makeSet(slug, width, height, svgBuffer) {
  const master = await sharp(svgBuffer).jpeg({ quality: 90 }).toBuffer();
  for (const w of WIDTHS) {
    if (w > width) continue;
    const h = Math.round((height * w) / width);
    const resized = sharp(master).resize(w, h);
    await resized.clone().avif({ quality: 40 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
    await resized.clone().webp({ quality: 60 }).toFile(path.join(OUT, `${slug}-${w}.webp`));
    await resized.clone().jpeg({ quality: 60 }).toFile(path.join(OUT, `${slug}-${w}.jpg`));
  }
}

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

await makeSet('drops-hero', 1600, 700, heroSvg(1600, 700));

const games = [
  ['game-gates-of-olympus', '#3b2f8f', '#8f6be8', 'Gates of Olympus'],
  ['game-sweet-bonanza', '#b03060', '#ff7aa8', 'Sweet Bonanza'],
  ['game-wolf-gold', '#8a5a16', '#e0a53a', 'Wolf Gold'],
  ['game-big-bass-splash', '#0e5a6d', '#2fb3c9', 'Big Bass Splash'],
  ['game-sugar-rush', '#a8328f', '#ff7de0', 'Sugar Rush'],
  ['game-the-dog-house', '#4a6b1d', '#8fbf3f', 'The Dog House'],
];
for (const [slug, c1, c2, label] of games) {
  await makeSet(slug, 800, 800, thumbSvg(800, c1, c2, label));
}

const icon = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>\n`;

fs.writeFileSync(path.join(OUT, 'icons', 'step-spin.svg'),
  icon('<circle cx="24" cy="24" r="16"/><path d="M24 8v6M24 34v6M8 24h6M34 24h6"/><circle cx="24" cy="24" r="4" fill="currentColor" stroke="none"/>'));
fs.writeFileSync(path.join(OUT, 'icons', 'step-score.svg'),
  icon('<path d="M10 38l8-20 6 12 6-16 8 24"/><path d="M6 42h36"/>'));
fs.writeFileSync(path.join(OUT, 'icons', 'step-win.svg'),
  icon('<path d="M14 8h20v10a10 10 0 0 1-20 0z"/><path d="M14 10H7v3a7 7 0 0 0 7 7M34 10h7v3a7 7 0 0 1-7 7"/><path d="M24 28v6M16 40h16M18 34h12v6H18z"/>'));
fs.writeFileSync(path.join(OUT, 'icons', 'dw-18plus.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" stroke-width="3"/>
  <text x="22" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="currentColor" text-anchor="middle">18+</text>
</svg>\n`);

console.log('drops-wins assets written to', OUT);
