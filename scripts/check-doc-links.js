#!/usr/bin/env node
/**
 * Verify every relative link in the documentation points at something real.
 *
 *   node scripts/check-doc-links.js
 *
 * Exits non-zero if any link is broken, so it can gate a commit or CI run.
 * docs/archive is skipped: those files are historical records kept verbatim,
 * and their links describe the repository as it was.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'uploads']);

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = walk(REPO).filter(
  (f) => !f.split(path.sep).includes('archive'),
);

const broken = [];
let linkCount = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    for (const match of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      let target = match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      target = target.split('#')[0];
      if (!target) continue;

      linkCount++;
      const resolved = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) {
        broken.push({
          file: path.relative(REPO, file).replace(/\\/g, '/'),
          line: i + 1,
          target,
        });
      }
    }
  });
}

console.log(`\nChecked ${linkCount} link(s) across ${files.length} file(s).`);

if (broken.length) {
  console.error(`\n\x1b[31m${broken.length} broken link(s):\x1b[0m\n`);
  for (const b of broken) {
    console.error(`  ${b.file}:${b.line}  ->  ${b.target}`);
  }
  console.error('');
  process.exit(1);
}

console.log('\x1b[32mAll links resolve.\x1b[0m\n');
