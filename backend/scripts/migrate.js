#!/usr/bin/env node
/**
 * TrustCart schema migration runner.
 *
 * One directory of ordered .sql files (db/migrations), one ledger table
 * (schema_migrations) recording what has been applied to a given database.
 *
 * Commands:
 *   status              show applied / pending / drifted migrations
 *   up [--dry-run]      apply every pending migration, oldest first
 *   new <slug>          scaffold a new migration file with today's date
 *   adopt [--dry-run]   one-time cutover: create the ledger and mark every
 *                       migration currently on disk as already applied
 *   baseline            pg_dump the current schema into db/baseline/
 *   repair <file>       re-record the checksum of an applied migration you
 *                       intentionally edited
 *
 * Connection comes from backend/.env (DATABASE_URL, or DB_HOST/DB_PORT/
 * DB_USER/DB_PASSWORD/DB_NAME). Override the directory with MIGRATIONS_DIR.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');

require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { Client } = require('pg');

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.join(REPO_ROOT, 'db', 'migrations');
const BASELINE_DIR = path.join(REPO_ROOT, 'db', 'baseline');

// Postgres advisory lock id, so two runners can never overlap.
const LOCK_ID = 4827591;

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename    text        PRIMARY KEY,
  checksum    text        NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  applied_by  text        NOT NULL DEFAULT current_user,
  duration_ms integer,
  adopted     boolean     NOT NULL DEFAULT false
);
COMMENT ON TABLE schema_migrations IS
  'Ledger of applied schema migrations. adopted=true means the migration was assumed applied at cutover rather than executed by the runner.';
`;

/* ---------------------------------------------------------------- helpers */

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function fail(msg) {
  console.error(`\n${c.red('error')}  ${msg}\n`);
  process.exit(1);
}

function checksum(text) {
  // Normalise line endings so a Windows checkout and a Linux server agree.
  return crypto
    .createHash('sha256')
    .update(text.replace(/\r\n/g, '\n'), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fail(`migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      return { filename, sql, checksum: checksum(sql) };
    });
}

/**
 * Strip comments, single-quoted strings and dollar-quoted bodies, so that
 * keyword detection looks only at real SQL. Without this, a comment that
 * merely mentions CONCURRENTLY — or a BEGIN inside a PL/pgSQL function body —
 * would change how we run the file.
 */
function normalizeForDetection(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      // Postgres block comments nest.
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--;
          i += 2;
        } else i++;
      }
      out += ' ';
      continue;
    }
    if (ch === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += " '' ";
      continue;
    }
    if (ch === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
        out += ' $$ ';
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Some migrations manage their own transaction, and CREATE INDEX CONCURRENTLY
 * cannot run inside one at all. Detect those and let them run unwrapped.
 */
function isSelfManaged(sql) {
  // The opt-out directive is itself a comment, so it is checked on the raw text.
  if (/--[ \t]*migrate:[ \t]*no-transaction/i.test(sql)) return true;
  const code = normalizeForDetection(sql);
  return /^[ \t]*BEGIN[ \t]*;/im.test(code) || /\bCONCURRENTLY\b/i.test(code);
}

function connectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'trustcart_erp',
  };
}

function describeTarget(cfg) {
  if (cfg.connectionString) {
    // Never print the password.
    try {
      const u = new URL(cfg.connectionString);
      return `${u.hostname}:${u.port || 5432}/${u.pathname.replace(/^\//, '')}`;
    } catch {
      return 'DATABASE_URL';
    }
  }
  return `${cfg.host}:${cfg.port}/${cfg.database}`;
}

function isRemote(cfg) {
  const host = cfg.connectionString
    ? describeTarget(cfg).split(':')[0]
    : String(cfg.host);
  return !['localhost', '127.0.0.1', '::1'].includes(host);
}

async function connect() {
  const cfg = connectionConfig();
  const client = new Client(cfg);
  try {
    await client.connect();
  } catch (err) {
    fail(`could not connect to ${describeTarget(cfg)}\n       ${err.message}`);
  }
  client._target = describeTarget(cfg);
  client._remote = isRemote(cfg);
  return client;
}

async function loadLedger(client) {
  const { rows } = await client.query(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present`,
  );
  if (!rows[0].present) return null;
  const res = await client.query(
    `SELECT filename, checksum, applied_at, adopted FROM schema_migrations`,
  );
  return new Map(res.rows.map((r) => [r.filename, r]));
}

/** applied / pending / drifted, given disk state and ledger state. */
function classify(files, ledger) {
  const applied = [];
  const pending = [];
  const drifted = [];
  for (const f of files) {
    const row = ledger.get(f.filename);
    if (!row) pending.push(f);
    else if (row.checksum !== f.checksum) drifted.push({ ...f, row });
    else applied.push({ ...f, row });
  }
  const missing = [...ledger.keys()].filter(
    (name) => !files.some((f) => f.filename === name),
  );
  return { applied, pending, drifted, missing };
}

/* --------------------------------------------------------------- commands */

async function cmdStatus() {
  const files = readMigrations();
  const client = await connect();
  try {
    const ledger = await loadLedger(client);
    console.log(`\n${c.bold('target')}      ${client._target}`);
    console.log(`${c.bold('migrations')}  ${MIGRATIONS_DIR}`);

    if (ledger === null) {
      console.log(
        `\n${c.yellow('The schema_migrations ledger does not exist yet.')}`,
      );
      console.log(`${files.length} migration file(s) on disk.`);
      console.log(`\nRun ${c.bold('npm run db:adopt')} to perform the cutover.\n`);
      return;
    }

    const { applied, pending, drifted, missing } = classify(files, ledger);
    console.log(
      `\n${c.green(String(applied.length))} applied   ` +
        `${pending.length ? c.yellow(String(pending.length)) : '0'} pending   ` +
        `${drifted.length ? c.red(String(drifted.length)) : '0'} drifted   ` +
        `${missing.length ? c.red(String(missing.length)) : '0'} missing`,
    );

    if (pending.length) {
      console.log(`\n${c.bold('Pending')} — will run on ${c.bold('db:up')}:`);
      pending.forEach((f) => console.log(`  ${c.yellow('+')} ${f.filename}`));
    }
    if (drifted.length) {
      console.log(
        `\n${c.bold('Drifted')} — applied, but the file has changed since:`,
      );
      drifted.forEach((f) =>
        console.log(
          `  ${c.red('~')} ${f.filename} ${c.dim(
            `(ledger ${f.row.checksum}, disk ${f.checksum})`,
          )}`,
        ),
      );
      console.log(
        c.dim(
          '\n  Editing an applied migration means environments have diverged.\n' +
            '  Write a new migration instead. If the edit was cosmetic, run:\n' +
            '    npm run db:repair -- <filename>',
        ),
      );
    }
    if (missing.length) {
      console.log(
        `\n${c.bold('Missing')} — recorded as applied, but no longer on disk:`,
      );
      missing.forEach((n) => console.log(`  ${c.red('?')} ${n}`));
    }
    if (!pending.length && !drifted.length && !missing.length) {
      console.log(`\n${c.green('Database is up to date.')}`);
    }
    console.log();
  } finally {
    await client.end();
  }
}

async function cmdUp(argv) {
  const dryRun = argv.includes('--dry-run');
  const yes = argv.includes('--yes');
  const allowDrift = argv.includes('--allow-drift');

  const files = readMigrations();
  const client = await connect();
  try {
    const ledger = await loadLedger(client);
    if (ledger === null) {
      fail(
        'the schema_migrations ledger does not exist.\n' +
          '       Run `npm run db:adopt` first (see docs/MIGRATIONS.md).',
      );
    }

    const { pending, drifted } = classify(files, ledger);

    if (drifted.length && !allowDrift) {
      console.error(`\n${c.red('Refusing to run — drifted migrations:')}`);
      drifted.forEach((f) => console.error(`  ~ ${f.filename}`));
      fail(
        'an already-applied migration was edited.\n' +
          '       Fix it with a new migration, or `npm run db:repair -- <file>`,\n' +
          '       or override with --allow-drift if you know what you are doing.',
      );
    }

    if (!pending.length) {
      console.log(
        `\n${c.green('Nothing to do')} — ${client._target} is up to date.\n`,
      );
      return;
    }

    console.log(`\n${c.bold('target')}  ${client._target}`);
    console.log(`${c.bold('pending')} ${pending.length} migration(s):`);
    pending.forEach((f) => console.log(`  + ${f.filename}`));

    if (dryRun) {
      console.log(`\n${c.dim('--dry-run: nothing was applied.')}\n`);
      return;
    }
    if (client._remote && !yes) {
      fail(
        `${client._target} is not localhost.\n` +
          '       Re-run with --yes once you have a fresh backup.',
      );
    }

    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    console.log();
    try {
      for (const f of pending) {
        const selfManaged = isSelfManaged(f.sql);
        const started = Date.now();
        process.stdout.write(`  ${f.filename} ... `);
        try {
          if (selfManaged) {
            await client.query(f.sql);
            await recordApplied(client, f, Date.now() - started, false);
          } else {
            await client.query('BEGIN');
            await client.query(f.sql);
            await recordApplied(client, f, Date.now() - started, false);
            await client.query('COMMIT');
          }
          const ms = Date.now() - started;
          console.log(
            `${c.green('ok')} ${c.dim(
              `${ms}ms${selfManaged ? ' (self-managed txn)' : ''}`,
            )}`,
          );
        } catch (err) {
          if (!selfManaged) {
            try {
              await client.query('ROLLBACK');
            } catch {
              /* connection may already be unusable */
            }
          }
          console.log(c.red('FAILED'));
          console.error(`\n${c.red(err.message)}`);
          if (err.position) console.error(c.dim(`  at character ${err.position}`));
          if (selfManaged) {
            console.error(
              c.yellow(
                '\n  This migration managed its own transaction — it may be\n' +
                  '  partially applied. Inspect the database before retrying.',
              ),
            );
          }
          fail(`stopped at ${f.filename}. Later migrations were not run.`);
        }
      }
    } finally {
      await client
        .query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
        .catch(() => {});
    }
    console.log(`\n${c.green(`Applied ${pending.length} migration(s).`)}\n`);
  } finally {
    await client.end();
  }
}

async function recordApplied(client, file, durationMs, adopted) {
  await client.query(
    `INSERT INTO schema_migrations (filename, checksum, duration_ms, adopted)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (filename) DO UPDATE
       SET checksum = EXCLUDED.checksum,
           duration_ms = EXCLUDED.duration_ms`,
    [file.filename, file.checksum, durationMs, adopted],
  );
}

async function cmdAdopt(argv) {
  const dryRun = argv.includes('--dry-run');
  const yes = argv.includes('--yes');
  const files = readMigrations();
  const client = await connect();
  try {
    const existing = await loadLedger(client);
    console.log(`\n${c.bold('target')}  ${client._target}`);

    if (existing !== null) {
      const { pending } = classify(files, existing);
      if (!pending.length) {
        console.log(
          `\n${c.green('Already adopted')} — every migration on disk is recorded.\n`,
        );
        return;
      }
      console.log(
        `\n${c.yellow('Ledger already exists.')} ${pending.length} file(s) would be ` +
          `marked applied ${c.bold('without running them')}:`,
      );
      pending.forEach((f) => console.log(`  = ${f.filename}`));
    } else {
      console.log(
        `\nWill create ${c.bold('schema_migrations')} and mark all ` +
          `${c.bold(String(files.length))} migration(s) as already applied, ` +
          `${c.bold('without running them')}.`,
      );
    }

    console.log(
      c.dim(
        '\n  This treats the current database as the source of truth. Any\n' +
          '  migration whose effect never actually reached this database will\n' +
          '  now never run. Take a baseline and a backup first.',
      ),
    );

    if (dryRun) {
      console.log(`\n${c.dim('--dry-run: nothing was changed.')}\n`);
      return;
    }
    if (client._remote && !yes) {
      fail(
        `${client._target} is not localhost.\n` +
          '       Re-run with --yes once you have a fresh backup.',
      );
    }

    await client.query('BEGIN');
    try {
      await client.query(LEDGER_DDL);
      for (const f of files) {
        await client.query(
          `INSERT INTO schema_migrations (filename, checksum, duration_ms, adopted)
           VALUES ($1, $2, NULL, true)
           ON CONFLICT (filename) DO NOTHING`,
          [f.filename, f.checksum],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      fail(`adopt failed: ${err.message}`);
    }
    console.log(`\n${c.green(`Adopted ${files.length} migration(s).`)}`);
    console.log(`Run ${c.bold('npm run db:status')} to confirm.\n`);
  } finally {
    await client.end();
  }
}

async function cmdRepair(argv) {
  const target = argv.find((a) => !a.startsWith('-'));
  if (!target) fail('usage: npm run db:repair -- <filename>');
  const files = readMigrations();
  const file = files.find((f) => f.filename === target);
  if (!file) fail(`no such migration on disk: ${target}`);

  const client = await connect();
  try {
    const res = await client.query(
      `UPDATE schema_migrations SET checksum = $2 WHERE filename = $1`,
      [file.filename, file.checksum],
    );
    if (!res.rowCount) {
      fail(`${target} is not recorded as applied on ${client._target}`);
    }
    console.log(
      `\n${c.green('Repaired')} ${target} → checksum ${file.checksum} on ${client._target}\n`,
    );
  } finally {
    await client.end();
  }
}

function cmdNew(argv) {
  const slug = argv.filter((a) => !a.startsWith('-')).join('-');
  if (!slug) fail('usage: npm run db:new -- <slug>   e.g. add-brand-id-to-orders');

  const clean = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // Date in Asia/Dhaka, matching the app's timezone.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

  // Always emit a sequence number, so several migrations written on the same
  // day sort in the order they were created. (Without it, "-02-" would sort
  // ahead of an unnumbered name, and they would run out of order.)
  const sameDay = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.startsWith(today) && f.endsWith('.sql'));
  const seq = String(sameDay.length + 1).padStart(2, '0');
  const filename = `${today}-${seq}-${clean}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  if (fs.existsSync(filepath)) fail(`${filename} already exists`);

  fs.writeFileSync(
    filepath,
    `-- ${filename}
-- What this changes and why:
--
-- Guidelines:
--   * Make it idempotent (IF NOT EXISTS / IF EXISTS / ON CONFLICT DO NOTHING)
--     so a partial failure can be retried safely.
--   * The runner wraps this file in a transaction. Do not add BEGIN/COMMIT
--     unless you need to control it yourself.
--   * For CREATE INDEX CONCURRENTLY, the runner detects it and skips the
--     wrapping transaction automatically.

`,
    'utf8',
  );
  console.log(`\n${c.green('Created')} db/migrations/${filename}\n`);
}

function cmdBaseline() {
  const cfg = connectionConfig();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const out = path.join(BASELINE_DIR, `${today}-schema.sql`);

  const args = ['--schema-only', '--no-owner', '--no-privileges', '--file', out];
  const env = { ...process.env };
  if (cfg.connectionString) {
    args.push(cfg.connectionString);
  } else {
    args.push(
      '--host', String(cfg.host),
      '--port', String(cfg.port),
      '--username', String(cfg.user),
      cfg.database,
    );
    if (cfg.password) env.PGPASSWORD = cfg.password;
  }

  console.log(`\nDumping schema of ${describeTarget(cfg)} ...`);
  try {
    execFileSync('pg_dump', args, { env, stdio: ['ignore', 'inherit', 'inherit'] });
  } catch (err) {
    fail(
      `pg_dump failed: ${err.message}\n` +
        '       Make sure pg_dump is on PATH and its version matches the server.',
    );
  }
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(
    `${c.green('Wrote')} db/baseline/${path.basename(out)} ${c.dim(`(${kb} KB)`)}\n`,
  );
}

/**
 * Guardrail: no .sql may live outside the sanctioned directories. Needs no
 * database, so it is safe to run in CI or from a pre-commit hook.
 */
function cmdCheck() {
  const ALLOWED = ['db/migrations/', 'db/baseline/', 'db/legacy/'];
  let tracked;
  try {
    tracked = execFileSync('git', ['ls-files', '*.sql'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch (err) {
    fail(`could not list tracked files: ${err.message}`);
  }

  const stray = tracked.filter((f) => !ALLOWED.some((d) => f.startsWith(d)));
  if (stray.length) {
    console.error(
      `\n${c.red(`${stray.length} .sql file(s) outside the sanctioned directories:`)}\n`,
    );
    stray.slice(0, 20).forEach((f) => console.error(`  ${f}`));
    if (stray.length > 20) console.error(c.dim(`  ... and ${stray.length - 20} more`));
    fail(
      'schema changes belong in db/migrations (npm run db:new).\n' +
        '       Historical scripts belong in db/legacy. See docs/MIGRATIONS.md.',
    );
  }

  // Naming is only advisory: plenty of pre-cutover files predate the convention.
  const odd = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !/^\d{4}-\d{2}-\d{2}[-_]/.test(f));
  console.log(`\n${c.green('OK')} — every tracked .sql is in a sanctioned directory.`);
  if (odd.length) {
    console.log(
      c.dim(
        `${odd.length} migration(s) predate the YYYY-MM-DD-NN- convention. ` +
          'Leave them; new ones from db:new will conform.',
      ),
    );
  }
  console.log();
}

/* ------------------------------------------------------------------- main */

const [, , cmd, ...argv] = process.argv;

const commands = {
  status: cmdStatus,
  up: cmdUp,
  adopt: cmdAdopt,
  repair: cmdRepair,
  new: cmdNew,
  baseline: cmdBaseline,
  check: cmdCheck,
};

if (!cmd || !commands[cmd]) {
  console.log(`
${c.bold('TrustCart migration runner')}

  npm run db:status                 what is applied, pending, or drifted
  npm run db:up                     apply pending migrations
  npm run db:up -- --dry-run        show what would run
  npm run db:new -- <slug>          scaffold a new migration
  npm run db:adopt                  one-time cutover (see docs/MIGRATIONS.md)
  npm run db:baseline               dump the current schema to db/baseline/
  npm run db:repair -- <file>       re-record a checksum after an intended edit
  npm run db:check                  verify no .sql has escaped db/migrations (no DB needed)

Migrations directory: ${MIGRATIONS_DIR}
`);
  process.exit(cmd ? 1 : 0);
}

Promise.resolve(commands[cmd](argv)).catch((err) => {
  console.error(`\n${c.red('unexpected error')}  ${err.stack || err.message}\n`);
  process.exit(1);
});
