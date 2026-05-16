const path = require('node:path');
const express = require('express');
const cors = require('cors');

const { loadConfig } = require('./src/config');
const { connect, migrate } = require('./src/db');
const { Signer, LocalStorage } = require('./src/storage');
const { requireAuth } = require('./src/middleware');
const { buildAuthRouter } = require('./src/routes/auth');
const { buildFoldersRouter } = require('./src/routes/folders');
const { buildFilesRouter } = require('./src/routes/files');
const { buildTrashRouter } = require('./src/routes/trash');
const { buildStorageHandler } = require('./src/routes/storage');
const { buildShareRouter } = require('./src/routes/share');

async function main() {
  const config = loadConfig();

  const pool = await connect(config.databaseUrl);
  console.log('[db] connected');

  await migrate(pool, path.join(__dirname, 'migrations'));
  console.log('[db] migrations applied');

  const storage = new LocalStorage(config.storageDir);
  await storage.init();

  const signer = new Signer(config.storageUrlSecret);
  const auth = requireAuth(config.jwtSecret);

  const app = express();
  app.set('trust proxy', 1);

  const origins = config.allowedOrigin.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({
    origin: origins.includes('*') ? true : origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Length', 'Content-Disposition'],
    credentials: false,
    maxAge: 300,
  }));

  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth',    buildAuthRouter({ pool, config, auth }));
  app.use('/api/folders', buildFoldersRouter({ pool, auth }));
  app.use('/api/files',   buildFilesRouter({ pool, config, signer, auth }));
  app.use('/api/trash',   buildTrashRouter({ pool, storage, auth }));

  app.get('/storage/*', buildStorageHandler({ storage, signer }));
  app.use('/share', buildShareRouter({ pool, storage }));

  app.use((err, _req, res, _next) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file too large' });
    }
    console.error('[error]', err);
    res.status(500).json({ error: err.message || 'internal error' });
  });

  const server = app.listen(config.port, () => {
    console.log(`[server] listening on :${config.port}, origin=${config.allowedOrigin}`);
  });

  const shutdown = async () => {
    console.log('[server] shutting down');
    server.close();
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
