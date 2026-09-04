import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { importStaticDirectory, importStaticZip, type ImportMode } from '../server/importer';

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : ''; };
const zip = arg('zip');
const github = arg('github');
const name = arg('name');
const mode = (arg('mode') || 'preserve') as ImportMode;
const branch = arg('branch') || 'main';
const subdir = arg('subdir');
if (!['preserve', 'sections'].includes(mode)) throw new Error('--mode must be preserve or sections.');
if (!!zip === !!github) {
  console.error('Usage: npm run import -- (--zip <site.zip> | --github <github-url>) [--name "Site"] [--mode preserve|sections]');
  process.exit(1);
}
let result;
if (zip) {
  const file = path.resolve(zip);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`ZIP not found: ${file}`);
  result = importStaticZip(fs.readFileSync(file), name || undefined, { mode, source: `zip:${path.basename(file)}` });
} else {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(github);
  if (!match) throw new Error('--github must be an HTTPS GitHub repository URL.');
  if (!/^[A-Za-z0-9._\/-]+$/.test(branch) || branch.includes('..')) throw new Error('Unsafe branch name.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pitforge-github-'));
  try {
    const cloned = spawnSync('git', ['clone', '--depth', '1', '--branch', branch, '--single-branch', github, tmp], { stdio: 'inherit', shell: false });
    if (cloned.status !== 0) throw new Error(`git clone failed with exit code ${cloned.status}. Check the URL, branch and Git credentials.`);
    const root = subdir ? path.resolve(tmp, subdir) : tmp;
    if (!(root === tmp || root.startsWith(tmp + path.sep)) || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('Unsafe or missing --subdir.');
    result = importStaticDirectory(root, name || match[2], { mode, source: `github:${match[1]}/${match[2]}@${branch}`, preferBuiltOutput: true });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
console.log(JSON.stringify(result, null, 2));
console.log(`\nImported to projects/${result.id}/ with a QA scaffold. Restart the Studio, then run:`);
console.log(`  node scripts/qa-setup.mjs --project ${result.id} --status`);
console.log(`  npm run test:ui -- --project ${result.id}`);
