const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool, types } = require('pg');
const { neon } = require('@neondatabase/serverless');

types.setTypeParser(20, (val) => parseInt(val, 10));

function isNeonUrl(url) {
  return /neon\.tech\b/i.test(url);
}

async function retry(fn, attempts, label) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`[db] ${label} attempt ${i + 1}/${attempts} failed: ${e.message}`);
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

async function connectNeon(url) {
  const sql = neon(url, { fullResults: true });
  const pool = {
    query: async (text, params = []) => {
      const r = await sql.query(text, params);
      return { rows: r.rows ?? [], rowCount: r.rowCount ?? 0 };
    },
    end: async () => {},
  };
  await pool.query('SELECT 1');
  return pool;
}

async function connectPg(url) {
  const ssl = url.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;
  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    allowExitOnIdle: true,
    ssl,
  });
  pool.on('error', (err) => console.error('[pool idle error]', err.message));
  await retry(() => pool.query('SELECT 1'), 3, 'ping');
  return pool;
}

async function connect(url) {
  if (isNeonUrl(url)) {
    console.log('[db] using Neon HTTP driver');
    return connectNeon(url);
  }
  console.log('[db] using PostgreSQL TCP driver');
  return connectPg(url);
}

async function migrate(pool, dir) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    if (applied.has(f)) continue;
    console.log(`[migrate] applying ${f}`);
    const sql = await fs.readFile(path.join(dir, f), 'utf-8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    await pool.query(
      'INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT (version) DO NOTHING',
      [f],
    );
  }
}

module.exports = { connect, migrate };
