const crypto = require('node:crypto');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const { validateName, clamp, LIMITS } = require('../validation');

function sanitizeName(name) {
  return name.replace(/[\\/\0]/g, '_') || 'file';
}

function buildFilesRouter({ pool, config, signer, auth }) {
  const router = express.Router();
  router.use(auth);

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const dir = path.join(config.storageDir, req.userId);
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
      },
      filename: (_req, file, cb) => {
        cb(null, `${uuid()}-${sanitizeName(file.originalname)}`);
      },
    }),
    limits: { fileSize: config.maxUploadBytes },
  });

  const normalize = (r) => (r ? { ...r, size_bytes: Number(r.size_bytes) } : r);

  router.get('/', async (req, res) => {
    const { folder_id, search: rawSearch, mime, sort, dir } = req.query;
    const search = clamp(typeof rawSearch === 'string' ? rawSearch : '', LIMITS.searchMax);
    const args = [req.userId];
    let query = `SELECT id, owner_id, folder_id, name, storage_path, mime_type,
        size_bytes, is_public, created_at, updated_at, deleted_at
      FROM files WHERE owner_id = $1 AND deleted_at IS NULL`;

    if (folder_id) {
      args.push(folder_id);
      query += ` AND folder_id = $${args.length}`;
    } else {
      query += ` AND folder_id IS NULL`;
    }
    if (search) {
      args.push(`%${search}%`);
      query += ` AND name ILIKE $${args.length}`;
    }
    if (mime) {
      args.push(`${mime}%`);
      query += ` AND mime_type LIKE $${args.length}`;
    }

    const allowedSort = ['name', 'size_bytes', 'updated_at', 'created_at'];
    const sortKey = allowedSort.includes(sort) ? sort : 'updated_at';
    const sortDir = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortKey} ${sortDir}`;

    try {
      const { rows } = await pool.query(query, args);
      res.json(rows.map(normalize));
    } catch (e) {
      console.error('[files list]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file field required' });

    const folderId = req.body.folder_id || null;
    const storagePath = `${req.userId}/${req.file.filename}`;
    const mime = req.file.mimetype || 'application/octet-stream';

    try {
      const { rows } = await pool.query(
        `INSERT INTO files(owner_id, folder_id, name, storage_path, mime_type, size_bytes)
         VALUES($1, $2, $3, $4, $5, $6)
         RETURNING id, owner_id, folder_id, name, storage_path, mime_type, size_bytes,
            is_public, created_at, updated_at, deleted_at`,
        [req.userId, folderId, req.file.originalname, storagePath, mime, req.file.size],
      );
      res.status(201).json(normalize(rows[0]));
    } catch (e) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      console.error('[file upload]', e);
      res.status(500).json({ error: 'db insert failed' });
    }
  });

  router.patch('/:id', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const err = validateName(name);
    if (err) return res.status(400).json({ error: err });
    try {
      const { rows } = await pool.query(
        `UPDATE files SET name = $3, updated_at = now()
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
         RETURNING id, owner_id, folder_id, name, storage_path, mime_type, size_bytes,
            is_public, created_at, updated_at, deleted_at`,
        [req.params.id, req.userId, name],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      res.json(normalize(rows[0]));
    } catch (e) {
      console.error('[file rename]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE files SET deleted_at = now()
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
         RETURNING id, owner_id, folder_id, name, storage_path, mime_type, size_bytes,
            is_public, created_at, updated_at, deleted_at`,
        [req.params.id, req.userId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      res.json(normalize(rows[0]));
    } catch (e) {
      console.error('[file delete]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id/url', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, storage_path, deleted_at FROM files
         WHERE id = $1 AND owner_id = $2`,
        [req.params.id, req.userId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      const f = rows[0];
      if (f.deleted_at !== null) return res.status(410).json({ error: 'file deleted' });

      const attach = req.query.attachment === '1' ? f.name : '';
      const exp = new Date(Date.now() + config.signedUrlTtlMs);
      const url = signer.sign(f.storage_path, exp, attach);
      res.json({ url, expires_at: exp.toISOString() });
    } catch (e) {
      console.error('[file url]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:id/share', async (req, res) => {
    try {
      const { rows: existing } = await pool.query(
        `SELECT public_token FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.userId],
      );
      if (existing.length === 0) return res.status(404).json({ error: 'not found' });

      let token = existing[0].public_token;
      if (!token) {
        token = crypto.randomBytes(16).toString('base64url');
        await pool.query(
          `UPDATE files SET public_token = $3 WHERE id = $1 AND owner_id = $2`,
          [req.params.id, req.userId, token],
        );
      }
      res.json({ token });
    } catch (e) {
      console.error('[file share]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id/share', async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE files SET public_token = NULL
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.userId],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[file unshare]', e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { buildFilesRouter };
