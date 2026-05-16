require('dotenv').config();

function envOr(k, def) {
  const v = process.env[k];
  return v === undefined || v === '' ? def : v;
}

function num(k, def) {
  const v = process.env[k];
  if (v === undefined || v === '') return def;
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n <= 0) throw new Error(`Invalid ${k}`);
  return n;
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || '5432';
  const ssl = process.env.DB_SSL === 'true';

  if (!host || !user || !password || !database) return '';

  const query = ssl ? '?sslmode=require' : '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}${query}`;
}

function loadConfig() {
  const cfg = {
    databaseUrl:      buildDatabaseUrl(),
    jwtSecret:        process.env.JWT_SECRET || '',
    storageUrlSecret: process.env.STORAGE_URL_SECRET || '',
    storageDir:       envOr('STORAGE_DIR', './storage'),
    port:             num('PORT', 8080),
    allowedOrigin:    envOr('ORIGIN', 'http://localhost:5173'),
    maxUploadBytes:   num('MAX_UPLOAD_MB', 100) * 1024 * 1024,
    signedUrlTtlMs:   num('SIGNED_URL_TTL', 600) * 1000,
    jwtTtlSec:        7 * 24 * 60 * 60,
  };

  const missing = [];
  if (!cfg.databaseUrl) missing.push('DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME');
  if (cfg.jwtSecret.length < 16) missing.push('JWT_SECRET (>=16 chars)');
  if (cfg.storageUrlSecret.length < 16) missing.push('STORAGE_URL_SECRET (>=16 chars)');
  if (missing.length) throw new Error('missing env: ' + missing.join(', '));

  return cfg;
}

module.exports = { loadConfig };
