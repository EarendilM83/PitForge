import fs from 'node:fs';
import path from 'node:path';
import { importStaticZip } from '../server/importer';

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : ''; };
const zip = arg('zip');
const name = arg('name');
if (!zip) {
  console.error('Usage: npm run import -- --zip <site.zip> [--name "Site name"]');
  process.exit(1);
}
const file = path.resolve(zip);
if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`ZIP not found: ${file}`);
const result = importStaticZip(fs.readFileSync(file), name || undefined);
console.log(JSON.stringify(result, null, 2));
console.log(`\nImported to projects/${result.id}/. Restart the Studio, then run:`);
console.log(`  node scripts/qa-setup.mjs --project ${result.id} --init`);
console.log(`  npm run test:ui -- --project ${result.id}`);
