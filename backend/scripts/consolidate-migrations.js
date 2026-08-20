#!/usr/bin/env node
/**
 * One-time consolidation of TrustCart's scattered .sql files.
 *
 *   backend/migrations/*.sql  ->  db/migrations/     (still the live history)
 *   backend/*.sql             ->  db/legacy/backend/ (pre-convention one-offs)
 *   <repo root>/*.sql         ->  db/legacy/root/
 *   db/*.sql                  ->  db/legacy/db/
 *   trustcart_erp*.sql        ->  db/legacy/dumps/   (full database dumps)
 *   run-*.bat|ps1|js          ->  db/legacy/runners/ (the old ad-hoc runners)
 *
 * Nothing is deleted. Files are moved with `git mv` so history is preserved.
 * No application code reads any of these paths at runtime.
 *
 *   node scripts/consolidate-migrations.js            dry run, prints the plan
 *   node scripts/consolidate-migrations.js --apply    actually move them
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const APPLY = process.argv.includes('--apply');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Files directly inside `dir` (never recursive) matching `test`. */
function filesIn(dir, test) {
  const abs = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile() && test(e.name))
    .map((e) => `${dir}/${e.name}`.replace(/^\.\//, ''))
    .sort();
}

const isSql = (n) => n.toLowerCase().endsWith('.sql');
const isDump = (n) => /^trustcart_erp.*\.sql$/i.test(n);
const isRunner = (n) => /^run-.*\.(bat|ps1|js)$/i.test(n);

const plan = [];
const add = (from, to) => plan.push({ from, to });

// 1. The real migration history that is not yet in db/migrations.
for (const f of filesIn('backend/migrations', isSql)) {
  add(f, `db/migrations/${path.basename(f)}`);
}

// 2. Full dumps, wherever they sit.
for (const dir of ['.', 'db', 'backend']) {
  for (const f of filesIn(dir, (n) => isSql(n) && isDump(n))) {
    add(f, `db/legacy/dumps/${path.basename(f)}`);
  }
}

// 3. Pre-convention one-off SQL.
for (const [dir, bucket] of [
  ['backend', 'backend'],
  ['.', 'root'],
  ['db', 'db'],
]) {
  for (const f of filesIn(dir, (n) => isSql(n) && !isDump(n))) {
    add(f, `db/legacy/${bucket}/${path.basename(f)}`);
  }
}

// 4. The ad-hoc runners these files were invoked through.
for (const dir of ['.', 'backend']) {
  for (const f of filesIn(dir, isRunner)) {
    add(f, `db/legacy/runners/${path.basename(f)}`);
  }
}

/* --------------------------------------------- resolve basename collisions */

// The same basename exists in more than one source directory (e.g. both
// ./run-delivery-charges-migration.js and backend/run-delivery-charges-migration.js).
// Keep both, disambiguated by where they came from, rather than losing one.
const targetGroups = plan.reduce((acc, m) => {
  (acc[m.to] ||= []).push(m);
  return acc;
}, {});

for (const moves of Object.values(targetGroups)) {
  if (moves.length < 2) continue;
  for (const m of moves) {
    const srcDir = path.dirname(m.from);
    const prefix = srcDir === '.' ? 'root' : srcDir.replace(/[\\/]/g, '-');
    m.to = `${path.dirname(m.to)}/${prefix}--${path.basename(m.to)}`;
  }
}

/* ----------------------------------------------------------- safety checks */

const problems = [];
const seenTargets = new Map();
for (const { from, to } of plan) {
  if (seenTargets.has(to)) {
    problems.push(`two sources collide on ${to}: ${seenTargets.get(to)} and ${from}`);
  }
  seenTargets.set(to, from);
  if (fs.existsSync(path.join(REPO_ROOT, to))) {
    problems.push(`target already exists: ${to}`);
  }
}

/* ------------------------------------------------------------------ report */

const byBucket = plan.reduce((acc, m) => {
  const bucket = path.dirname(m.to);
  (acc[bucket] ||= []).push(m);
  return acc;
}, {});

console.log(`\n${c.bold('Consolidation plan')} ${c.dim(APPLY ? '(applying)' : '(dry run)')}\n`);
for (const [bucket, moves] of Object.entries(byBucket).sort()) {
  console.log(`${c.bold(bucket)}  ${c.dim(`${moves.length} file(s)`)}`);
  for (const m of moves.slice(0, 4)) console.log(`   ${c.dim(m.from)}`);
  if (moves.length > 4) console.log(c.dim(`   ... and ${moves.length - 4} more`));
  console.log();
}
console.log(`${c.bold(String(plan.length))} file(s) total.`);

if (problems.length) {
  console.error(`\n${c.red('Refusing to proceed:')}`);
  problems.forEach((p) => console.error(`  - ${p}`));
  console.error();
  process.exit(1);
}

if (!APPLY) {
  console.log(c.dim('\nRe-run with --apply to move them.\n'));
  process.exit(0);
}

/* ------------------------------------------------------------------- apply */

let tracked = new Set();
try {
  tracked = new Set(
    execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean),
  );
} catch {
  console.error(c.yellow('warning: not a git repo, falling back to plain renames'));
}

let moved = 0;
for (const { from, to } of plan) {
  const absTo = path.join(REPO_ROOT, to);
  fs.mkdirSync(path.dirname(absTo), { recursive: true });
  try {
    if (tracked.has(from)) {
      execFileSync('git', ['mv', from, to], { cwd: REPO_ROOT, stdio: 'pipe' });
    } else {
      fs.renameSync(path.join(REPO_ROOT, from), absTo);
    }
    moved++;
  } catch (err) {
    console.error(`${c.red('failed')} ${from} -> ${to}\n  ${err.message}`);
    process.exit(1);
  }
}

const readme = path.join(REPO_ROOT, 'db', 'legacy', 'README.md');
fs.mkdirSync(path.dirname(readme), { recursive: true });
fs.writeFileSync(
  readme,
  `# Legacy SQL

One-off scripts from before migrations were consolidated into \`db/migrations\`.

**Do not run anything in here.** These are kept only so the reasoning behind old
schema changes stays searchable. Their effects are already baked into the
production database and into \`db/baseline/\`.

New schema changes go through \`npm run db:new\` — see [docs/MIGRATIONS.md](../../docs/MIGRATIONS.md).
`,
  'utf8',
);

console.log(`\n${c.green(`Moved ${moved} file(s).`)}`);
console.log(`Wrote db/legacy/README.md`);
console.log(c.dim('Review with `git status`, then commit on its own branch.\n'));
