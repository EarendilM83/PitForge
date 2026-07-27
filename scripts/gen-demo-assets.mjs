// Generates the demo project's placeholder images locally with sharp (§13).
// Solid colour + label; nothing is fetched from the internet.
// Run: node scripts/gen-demo-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'projects/demo/assets');
const WIDTHS = [400, 800, 1200, 1600];

function labelledSvg(width, height, color, label) {
  const fontSize = Math.round(width / 14);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="${fontSize}" fill="#ffffff"
        text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>`
  );
}

async function makeSet(slug, width, height, color, label) {
  const master = await sharp(labelledSvg(width, height, color, label)).jpeg().toBuffer();
  for (const w of WIDTHS) {
    if (w > width) continue;
    const h = Math.round((height * w) / width);
    const resized = sharp(master).resize(w, h);
    await resized.clone().avif({ quality: 50 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
    await resized.clone().webp({ quality: 75 }).toFile(path.join(OUT, `${slug}-${w}.webp`));
    await resized.clone().jpeg({ quality: 82 }).toFile(path.join(OUT, `${slug}-${w}.jpg`));
  }
}

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

await makeSet('hero', 1600, 600, '#4c1d95', 'LuckyBet Hero');
await makeSet('game-book-of-ra', 1600, 1600, '#b45309', 'Book of Ra');
await makeSet('game-starburst', 1600, 1600, '#be185d', 'Starburst');
await makeSet('game-gonzos-quest', 1600, 1600, '#166534', "Gonzo's Quest");
await makeSet('game-mega-moolah', 1600, 1600, '#1e40af', 'Mega Moolah');

// 18+ icon
fs.writeFileSync(
  path.join(OUT, 'icons', '18plus.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="3"/>
  <text x="20" y="26" font-family="sans-serif" font-size="14" font-weight="bold" fill="currentColor" text-anchor="middle">18+</text>
</svg>\n`
);

console.log('demo assets written to', OUT);
