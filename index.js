#!/usr/bin/env node
// db-migrate-cli — Zero-dependency SQL migration CLI
// Supports PostgreSQL (via psql CLI) and SQLite (via node:sqlite or sqlite3 CLI)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig() {
  const driver = process.env.DB_DRIVER?.toLowerCase();
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const protocol = url.protocol.replace(':', '');
      if (protocol === 'sqlite' || protocol === 'sqlite3') {
        return { driver: 'sqlite', file: resolve(url.pathname) };
      }
      return { driver: 'postgres', url: databaseUrl, displayHost: url.hostname };
    } catch {
      fatal('Invalid DATABASE_URL format.');
    }
  }

  if (driver === 'sqlite') {
    const file = process.env.DB_FILE || './dev.db';
    return { driver: 'sqlite', file: resolve(file) };
  }

  if (driver === 'postgres' || driver === 'postgresql') {
    if (!process.env.DATABASE_URL) fatal('DB_DRIVER=postgres requires DATABASE_URL.');
    const url = new URL(process.env.DATABASE_URL);
    return { driver: 'postgres', url: process.env.DATABASE_URL, displayHost: url.hostname };
  }

  fatal(
    'No database configured.\n' +
    'Set DATABASE_URL=postgres://... or DATABASE_URL=sqlite:/path/to/db\n' +
    'Or set DB_DRIVER=sqlite DB_FILE=./dev.db\n' +
    'Or set DB_DRIVER=postgres DATABASE_URL=postgres://...'
  );
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(...args) { process.stdout.write(args.join(' ') + '\n'); }
function err(...args) { process.stderr.write(args.join(' ') + '\n'); }
function fatal(...args) { err('ERROR:', ...args); process.exit(1); }

// ─── Migrations directory ─────────────────────────────────────────────────────

const MIGRATIONS_DIR = resolve('./migrations');

function ensureMigrationsDir() {
  if (!existsSync(MIGRATIONS_DIR)) mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

function getMigrationFiles() {
  ensureMigrationsDir();
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function parseMigrationFile(filename) {
  const filepath = join(MIGRATIONS_DIR, filename);
  const content = readFileSync(filepath, 'utf8');
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?:--\s*DOWN\s*\n|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
  return {
    name: filename.replace(/\.sql$/, ''),
    filename,
    filepath,
    upSql: upMatch ? upMatch[1].trim() : '',
    downSql: downMatch ? downMatch[1].trim() : '',
    checksum: sha256(content),
  };
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// ─── SQLite driver ────────────────────────────────────────────────────────────

let _sqliteDb = null;

async function getSqliteDb(file) {
  if (_sqliteDb) return _sqliteDb;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    _sqliteDb = { type: 'builtin', db: new DatabaseSync(file) };
  } catch {
    if (!commandExists('sqlite3')) {
      fatal('node:sqlite not available (Node < 22) and sqlite3 CLI not found.\nInstall sqlite3 or upgrade to Node 22+.');
    }
    _sqliteDb = { type: 'cli', file };
  }
  return _sqliteDb;
}

function sqliteExec(handle, sql) {
  if (handle.type === 'builtin') {
    try {
      handle.db.exec(sql);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  const result = spawnSync('sqlite3', [handle.file], {
    input: sql,
    encoding: 'utf8',
    timeout: 30000,
  });
  if (result.status !== 0) {
    return { ok: false, error: (result.stderr || '').trim() };
  }
  return { ok: true, stdout: (result.stdout || '').trim() };
}

function sqliteQuery(handle, sql) {
  if (handle.type === 'builtin') {
    try {
      const stmt = handle.db.prepare(sql);
      return { ok: true, rows: stmt.all() };
    } catch (e) {
      return { ok: false, error: e.message, rows: [] };
    }
  }
  const fullSql = '.mode json\n' + sql;
  const result = spawnSync('sqlite3', [handle.file], {
    input: fullSql,
    encoding: 'utf8',
    timeout: 30000,
  });
  if (result.status !== 0) {
    return { ok: false, error: (result.stderr || '').trim(), rows: [] };
  }
  const stdout = (result.stdout || '').trim();
  try {
    const rows = stdout ? JSON.parse(stdout) : [];
    return { ok: true, rows };
  } catch {
    return { ok: true, rows: [] };
  }
}

// ─── PostgreSQL driver (psql CLI) ─────────────────────────────────────────────

function commandExists(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
    timeout: 5000,
  });
  return r.status === 0;
}

function psqlExec(url, sql) {
  if (!commandExists('psql')) fatal('psql CLI not found. Install PostgreSQL client tools.');
  const result = spawnSync('psql', [url, '-c', sql, '--no-psqlrc', '-q'], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env },
  });
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  if (result.status !== 0) return { ok: false, error: stderr || stdout };
  if (/^ERROR:/m.test(stderr)) return { ok: false, error: stderr };
  return { ok: true, stdout };
}

function psqlQuery(url, sql) {
  if (!commandExists('psql')) fatal('psql CLI not found. Install PostgreSQL client tools.');
  const result = spawnSync(
    'psql',
    [url, '--csv', '--no-psqlrc', '-q', '-c', sql],
    { encoding: 'utf8', timeout: 30000, env: { ...process.env } }
  );
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  if (result.status !== 0) return { ok: false, error: stderr || stdout, rows: [] };
  if (/^ERROR:/m.test(stderr)) return { ok: false, error: stderr, rows: [] };
  const lines = stdout.split('\n').filter(Boolean);
  if (lines.length === 0) return { ok: true, rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? null; });
    return row;
  });
  return { ok: true, rows };
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++; }
    else if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

// ─── Unified DB interface ──────────────────────────────────────────────────────

async function dbExec(cfg, sql) {
  if (cfg.driver === 'sqlite') {
    const h = await getSqliteDb(cfg.file);
    return sqliteExec(h, sql);
  }
  return psqlExec(cfg.url, sql);
}

async function dbQuery(cfg, sql) {
  if (cfg.driver === 'sqlite') {
    const h = await getSqliteDb(cfg.file);
    return sqliteQuery(h, sql);
  }
  return psqlQuery(cfg.url, sql);
}

// ─── Migration table ───────────────────────────────────────────────────────────

async function ensureMigrationTable(cfg) {
  const idCol = cfg.driver === 'postgres'
    ? 'id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY'
    : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
  const createSql =
    'CREATE TABLE IF NOT EXISTS _migrations (' +
    idCol + ', ' +
    'name TEXT NOT NULL UNIQUE, ' +
    'applied_at TEXT NOT NULL, ' +
    'checksum TEXT NOT NULL' +
    ');';
  const result = await dbExec(cfg, createSql);
  if (!result.ok) fatal('Failed to create _migrations table:', result.error);
}

async function getAppliedMigrations(cfg) {
  await ensureMigrationTable(cfg);
  const result = await dbQuery(cfg, 'SELECT name, applied_at, checksum FROM _migrations ORDER BY name ASC;');
  if (!result.ok) fatal('Failed to query _migrations:', result.error);
  return result.rows;
}

function esc(str) { return str.replace(/'/g, "''"); }

async function recordMigration(cfg, name, checksum) {
  const appliedAt = new Date().toISOString();
  const sql = "INSERT INTO _migrations (name, applied_at, checksum) VALUES ('" +
    esc(name) + "', '" + appliedAt + "', '" + checksum + "');";
  const result = await dbExec(cfg, sql);
  if (!result.ok) fatal('Failed to record migration:', result.error);
}

async function removeMigrationRecord(cfg, name) {
  const result = await dbExec(cfg, "DELETE FROM _migrations WHERE name = '" + esc(name) + "';");
  if (!result.ok) fatal('Failed to remove migration record:', result.error);
}

// ─── Transaction helpers ───────────────────────────────────────────────────────

async function runInTransaction(cfg, sql) {
  await dbExec(cfg, 'BEGIN;');
  const result = await dbExec(cfg, sql);
  if (!result.ok) {
    await dbExec(cfg, 'ROLLBACK;');
    return result;
  }
  await dbExec(cfg, 'COMMIT;');
  return result;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdCreate(args) {
  const name = args[0];
  if (!name) fatal('Usage: db-migrate create <name>');
  ensureMigrationsDir();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const filename = ts + '_' + slug + '.sql';
  const filepath = join(MIGRATIONS_DIR, filename);
  const createdDate = now.toISOString();
  const template = '-- Migration: ' + name + '\n-- Created: ' + createdDate + '\n\n-- UP\n\n\n-- DOWN\n\n';
  writeFileSync(filepath, template, 'utf8');
  log('Created: ' + filepath);
}

async function cmdStatus() {
  const cfg = getConfig();
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(cfg);
  const appliedMap = new Map(applied.map(r => [r.name, r]));

  if (cfg.driver === 'postgres') {
    log('Connected to: ' + cfg.displayHost);
  } else {
    log('Database: ' + cfg.file);
  }
  log('');

  if (files.length === 0) {
    log('No migration files found. Run: db-migrate create <name>');
    return;
  }

  let pendingCount = 0;
  let appliedCount = 0;

  for (const f of files) {
    const migName = f.replace(/\.sql$/, '');
    const record = appliedMap.get(migName);
    if (record) {
      const date = record.applied_at ? record.applied_at.split('T')[0] : '?';
      log('  \u2705 ' + migName + '  (applied ' + date + ')');
      appliedCount++;
    } else {
      log('  \u23f3 ' + migName + '  (pending)');
      pendingCount++;
    }
  }

  log('');
  log(appliedCount + ' applied, ' + pendingCount + ' pending');
}

async function cmdUp(args) {
  const countArg = args.indexOf('--count');
  const count = countArg !== -1 ? parseInt(args[countArg + 1], 10) : Infinity;

  const cfg = getConfig();
  const files = getMigrationFiles();
  const applied = await getAppliedMigrations(cfg);
  const appliedNames = new Set(applied.map(r => r.name));

  const pending = files
    .map(parseMigrationFile)
    .filter(m => !appliedNames.has(m.name));

  const toRun = isFinite(count) ? pending.slice(0, count) : pending;

  if (toRun.length === 0) {
    log('No pending migrations.');
    return;
  }

  log('Running ' + toRun.length + ' migration(s)...');

  for (const m of toRun) {
    if (!m.upSql) {
      log('  SKIP ' + m.name + ' (empty UP section)');
      continue;
    }
    process.stdout.write('  UP   ' + m.name + ' ... ');
    const result = await runInTransaction(cfg, m.upSql);
    if (!result.ok) {
      log('FAILED');
      log('');
      err('Migration failed: ' + m.name);
      err('SQL Error: ' + result.error);
      process.exit(1);
    }
    await recordMigration(cfg, m.name, m.checksum);
    log('done');
  }

  log('');
  log('Applied ' + toRun.length + ' migration(s) successfully.');
}

async function cmdDown(args) {
  const countArg = args.indexOf('--count');
  const count = countArg !== -1 ? parseInt(args[countArg + 1], 10) : 1;

  const cfg = getConfig();
  const applied = await getAppliedMigrations(cfg);

  if (applied.length === 0) {
    log('No applied migrations to rollback.');
    return;
  }

  const toRollback = applied.slice(-count).reverse();
  log('Rolling back ' + toRollback.length + ' migration(s)...');

  for (const record of toRollback) {
    const filename = record.name + '.sql';
    const filepath = join(MIGRATIONS_DIR, filename);
    if (!existsSync(filepath)) {
      fatal('Migration file not found: ' + filepath);
    }
    const m = parseMigrationFile(filename);
    if (!m.downSql) {
      log('  SKIP ' + m.name + ' (empty DOWN section)');
      continue;
    }
    process.stdout.write('  DOWN ' + m.name + ' ... ');
    const result = await runInTransaction(cfg, m.downSql);
    if (!result.ok) {
      log('FAILED');
      log('');
      err('Rollback failed: ' + m.name);
      err('SQL Error: ' + result.error);
      process.exit(1);
    }
    await removeMigrationRecord(cfg, m.name);
    log('done');
  }

  log('');
  log('Rolled back ' + toRollback.length + ' migration(s) successfully.');
}

async function cmdRedo() {
  const cfg = getConfig();
  const applied = await getAppliedMigrations(cfg);
  if (applied.length === 0) {
    log('No applied migrations to redo.');
    return;
  }
  log('Redoing last migration (down then up)...');
  await cmdDown([]);
  const last = applied[applied.length - 1];
  const filename = last.name + '.sql';
  const filepath = join(MIGRATIONS_DIR, filename);
  if (!existsSync(filepath)) fatal('Migration file not found: ' + filepath);
  const m = parseMigrationFile(filename);
  if (!m.upSql) { log('Skipped UP (empty).'); return; }
  process.stdout.write('  UP   ' + m.name + ' ... ');
  const result = await runInTransaction(cfg, m.upSql);
  if (!result.ok) {
    log('FAILED');
    err('SQL Error: ' + result.error);
    process.exit(1);
  }
  await recordMigration(cfg, m.name, m.checksum);
  log('done');
  log('Redo complete.');
}

async function cmdValidate() {
  const files = getMigrationFiles();
  if (files.length === 0) {
    log('No migration files to validate.');
    return;
  }

  let hasErrors = false;

  for (const f of files) {
    const m = parseMigrationFile(f);
    const issues = [];

    if (!m.upSql) issues.push('Missing or empty UP section');
    if (!m.downSql) issues.push('Missing or empty DOWN section');

    const checkSql = (sql, section) => {
      const open = (sql.match(/\(/g) || []).length;
      const close = (sql.match(/\)/g) || []).length;
      if (open !== close) issues.push(section + ': unmatched parentheses');
      if (/\bAND\s*$/im.test(sql.trim())) issues.push(section + ': trailing AND keyword');
      if (/\bOR\s*$/im.test(sql.trim())) issues.push(section + ': trailing OR keyword');
    };

    if (m.upSql) checkSql(m.upSql, 'UP');
    if (m.downSql) checkSql(m.downSql, 'DOWN');

    if (issues.length > 0) {
      log('  \u274c ' + f);
      issues.forEach(i => log('     - ' + i));
      hasErrors = true;
    } else {
      log('  \u2705 ' + f);
    }
  }

  log('');
  if (hasErrors) {
    log('Validation failed.');
    process.exit(1);
  } else {
    log('All ' + files.length + ' migration(s) valid.');
  }
}

// ─── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
  log('');
  log('db-migrate-cli — Zero-dependency SQL migration CLI');
  log('');
  log('USAGE');
  log('  db-migrate <command> [options]');
  log('  dbm <command> [options]         (short alias)');
  log('');
  log('COMMANDS');
  log('  create <name>        Create a new migration file in ./migrations/');
  log('  status               Show applied and pending migrations');
  log('  up [--count N]       Run pending migrations (all or next N)');
  log('  down [--count N]     Rollback last N migrations (default: 1)');
  log('  redo                 Rollback then re-apply the last migration');
  log('  validate             Check all migration files for valid SQL structure');
  log('');
  log('OPTIONS');
  log('  --help, -h           Show this help message');
  log('  --version, -v        Show version');
  log('');
  log('CONFIGURATION (via environment variables)');
  log('  DATABASE_URL         Full connection string (postgres:// or sqlite://)');
  log('  DB_DRIVER            sqlite or postgres');
  log('  DB_FILE              SQLite database file path (default: ./dev.db)');
  log('');
  log('EXAMPLES');
  log('  # PostgreSQL via DATABASE_URL');
  log('  DATABASE_URL=postgres://user@localhost/mydb db-migrate status');
  log('');
  log('  # SQLite via DB_DRIVER');
  log('  DB_DRIVER=sqlite DB_FILE=./dev.db db-migrate up');
  log('');
  log('  # SQLite via DATABASE_URL');
  log('  DATABASE_URL=sqlite:./dev.db db-migrate create add_users_table');
  log('');
  log('  # Create a migration');
  log('  db-migrate create add_users_table');
  log('');
  log('  # Run all pending');
  log('  db-migrate up');
  log('');
  log('  # Rollback last 2');
  log('  db-migrate down --count 2');
  log('');
  log('MIGRATION FILE FORMAT');
  log('  -- UP');
  log('  CREATE TABLE users (...);');
  log('');
  log('  -- DOWN');
  log('  DROP TABLE users;');
  log('');
  log('NOTES');
  log('  - Migration tracking stored in _migrations table');
  log('  - Each migration wrapped in a transaction (auto-rollback on error)');
  log('  - Checksums (SHA-256) computed per file for integrity tracking');
  log('  - SQLite: uses node:sqlite (Node 22+) or sqlite3 CLI fallback');
  log('  - PostgreSQL: uses psql CLI');
  log('');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  if (cmd === '--version' || cmd === '-v') {
    log('db-migrate-cli 1.0.0');
    return;
  }

  const rest = args.slice(1);

  switch (cmd) {
    case 'create':   await cmdCreate(rest); break;
    case 'status':   await cmdStatus(); break;
    case 'up':       await cmdUp(rest); break;
    case 'down':     await cmdDown(rest); break;
    case 'redo':     await cmdRedo(); break;
    case 'validate': await cmdValidate(); break;
    default:
      err('Unknown command: ' + cmd);
      err('Run db-migrate --help for usage.');
      process.exit(1);
  }
}

main().catch(e => {
  err('Unhandled error:', e.message);
  process.exit(1);
});
