#!/usr/bin/env node
/* PitForge QA-setup loop engine.
   Makes "is this project's test environment self-sufficient?" an OBJECTIVE, resumable question.

   It reads only files (no server needed) and computes a coverage checklist + the single next action.
   An agent (Claude/Codex/…) drives the loop: call `--status`, do `nextAction`, repeat until complete.
   State persists in projects/<id>/qa/, so the loop survives across iterations and context resets.

   Commands:
     node scripts/qa-setup.mjs --project <id> [--status]   → JSON: sections, coverage, nextAction, complete
     node scripts/qa-setup.mjs --project <id> --init       → scaffold qa/cases.json + qa/setup-state.json
     node scripts/qa-setup.mjs --project <id> --mark <flag> → set a ledger flag (interactive|critic|noDesign:<Block>)
*/
import fs from 'node:fs';
import path from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const project = arg('project', 'demo');
const ROOT = path.join(process.cwd(), 'projects', project);
const QA = path.join(ROOT, 'qa');
const DESIGN = path.join(ROOT, 'design');
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const humanize = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

if (!fs.existsSync(ROOT)) { console.error(JSON.stringify({ error: `no project "${project}"` })); process.exit(1); }

const config = readJson(path.join(ROOT, 'pitforge.json'), {});
const blocks = config.blocks || [];
const sections = blocks.map((b, i) => ({ idx: i, block: b, name: humanize(b) }));

const ledgerPath = path.join(QA, 'setup-state.json');
const casesPath = path.join(QA, 'cases.json');
const runPath = path.join(QA, 'last-run.json');
const ledger = readJson(ledgerPath, { iteration: 0, interactive: false, critic: false, noDesign: [], notes: [] });

// ---- scaffold ---------------------------------------------------------------
if (has('init')) {
  fs.mkdirSync(QA, { recursive: true });
  if (!fs.existsSync(casesPath)) {
    const cases = sections.map((s) => ({
      id: `sec-${s.block.toLowerCase()}`,
      section: s.name, block: s.block,
      title: `${s.name} — visual & responsive`,
      description: `Fill from the design source. What must this section look like and do at every breakpoint?`,
      scenarios: [
        { id: 'layout', text: `Layout matches the design at 320 / 768 / 1440; no unintended horizontal overflow`, covers: ['layout', 'overflow'], status: 'todo' },
        { id: 'type', text: `Type scales fluidly (no clipping, no jumps); body ≈16px, headings per design`, covers: ['fonts', 'fluidity'], status: 'todo' },
        { id: 'space', text: `Margins & padding match the design proportionally across widths`, covers: ['spacing'], status: 'todo' },
        { id: 'assets', text: `Images crisp, correctly sized, not distorted; no broken/placeholder assets`, covers: ['assets', 'images'], status: 'todo' },
        { id: 'content', text: `Copy & content faithful to the design source`, covers: ['content', 'fidelity'], status: 'todo' },
      ],
      interactive: [],
    }));
    fs.writeFileSync(casesPath, JSON.stringify({ project, source: 'design + UX best-practice', cases }, null, 2));
  }
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(JSON.stringify({ ok: true, scaffolded: [casesPath, ledgerPath] }, null, 2));
  process.exit(0);
}

// ---- mark a ledger flag -----------------------------------------------------
if (has('mark')) {
  const flag = arg('mark', '');
  if (flag === 'interactive') ledger.interactive = true;
  else if (flag === 'critic') ledger.critic = true;
  else if (flag.startsWith('noDesign:')) { const b = flag.split(':')[1]; if (!ledger.noDesign.includes(b)) ledger.noDesign.push(b); }
  else { console.error(JSON.stringify({ error: `unknown flag "${flag}"` })); process.exit(1); }
  ledger.iteration++;
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(JSON.stringify({ ok: true, ledger }, null, 2));
  process.exit(0);
}

// ---- assess coverage --------------------------------------------------------
const cases = readJson(casesPath, null);
const lastRun = readJson(runPath, null);
const designPngs = fs.existsSync(DESIGN) ? fs.readdirSync(DESIGN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => f.replace(/\.[^.]+$/, '').toLowerCase()) : [];
const hasDesign = (b) => designPngs.some((d) => d === b.toLowerCase() || d.startsWith(b.toLowerCase() + '-'));
const caseFor = (b) => cases?.cases?.find((c) => c.block === b);

const missingCases = sections.filter((s) => !caseFor(s.block));
const missingDesign = sections.filter((s) => !hasDesign(s.block) && !ledger.noDesign.includes(s.block));
const openScenarios = (cases?.cases || []).flatMap((c) => (c.scenarios || []).filter((sc) => sc.status === 'todo').map((sc) => `${c.section}: ${sc.text}`));
const runDefects = lastRun?.defects || [];

// the coverage checklist — the loop is done only when every criterion holds
const checklist = [
  { key: 'sections', label: 'Sections discovered from the build', ok: sections.length > 0, detail: `${sections.length} sections` },
  { key: 'scaffold', label: 'Per-project QA config exists (qa/cases.json)', ok: !!cases },
  { key: 'perSectionCases', label: 'Every section has test cases', ok: missingCases.length === 0, detail: missingCases.map((s) => s.name) },
  { key: 'designRefs', label: 'Every section has a design reference (or is marked no-design)', ok: missingDesign.length === 0, detail: missingDesign.map((s) => s.name) },
  { key: 'scenariosResolved', label: 'Every scenario checked against the design (none left "todo")', ok: openScenarios.length === 0, detail: openScenarios.slice(0, 8) },
  { key: 'ranBaseline', label: 'A QA run has produced a baseline (qa/last-run.json)', ok: !!lastRun },
  { key: 'defectsClear', label: 'Baseline run has zero open defects', ok: !!lastRun && runDefects.length === 0, detail: runDefects.slice(0, 8) },
  { key: 'interactive', label: 'Interactive elements have keyboard + click scenarios', ok: ledger.interactive === true },
  { key: 'critic', label: 'Completeness critic pass found no gaps', ok: ledger.critic === true },
];

// next action = the first unmet criterion, as a concrete instruction
const NEXT = {
  sections: `This project has no blocks in pitforge.json — build it first.`,
  scaffold: `Run: node scripts/qa-setup.mjs --project ${project} --init  (scaffolds qa/cases.json + ledger).`,
  perSectionCases: `Add a case per missing section to qa/cases.json: ${missingCases.map((s) => s.name).join(', ')}.`,
  designRefs: `Capture the Figma design for each missing section as projects/${project}/design/<Block>.png (and -mobile.png). Missing: ${missingDesign.map((s) => s.block).join(', ')}. If a section has no design source, run --mark noDesign:<Block>.`,
  scenariosResolved: `Open each design ref + the built section, compare, and for each scenario set status "pass" (matches) or add a defect note + set "fail". ${openScenarios.length} scenarios still "todo".`,
  ranBaseline: `Start the dev server, then run: node scripts/qa-run.mjs --project ${project} --full  (writes qa/last-run.json).`,
  defectsClear: `Fix the ${runDefects.length} defect(s) from the last run (see qa/last-run.json), then re-run qa-run. ${runDefects.slice(0, 3).map((d) => `[${d.section}@${d.bp}] ${d.label || d.notes || ''}`).join(' · ')}`,
  interactive: `Identify every interactive element (accordion/carousel/form/link/menu), add click + keyboard scenarios to its case's "interactive" array, verify them, then run --mark interactive.`,
  critic: `Do a completeness-critic pass: what modality/breakpoint/state is NOT yet covered? Add any gap as a scenario. When nothing new is found, run --mark critic.`,
};
const firstOpen = checklist.find((c) => !c.ok);
const complete = !firstOpen;
const done = checklist.filter((c) => c.ok).length;

console.log(JSON.stringify({
  project, iteration: ledger.iteration,
  sections: sections.map((s) => ({ name: s.name, block: s.block, hasCase: !!caseFor(s.block), hasDesign: hasDesign(s.block) || ledger.noDesign.includes(s.block) })),
  coverage: `${done}/${checklist.length}`,
  checklist: checklist.map((c) => ({ ...c, detail: c.detail && c.detail.length ? c.detail : undefined })),
  complete,
  nextAction: complete ? '✅ Testing environment is self-sufficient — every criterion met.' : NEXT[firstOpen.key],
}, null, 2));
