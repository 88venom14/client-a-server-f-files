const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');

const MIME_BY_EXT = {
  '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg', '.png':  'image/png',
  '.gif':  'image/gif',  '.webp': 'image/webp', '.svg':  'image/svg+xml',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.mp4':  'video/mp4',  '.webm': 'video/webm',
  '.mp3':  'audio/mpeg', '.wav':  'audio/wav',
};

function mimeFor(p) {
  return MIME_BY_EXT[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

function sanitizeName(name) {
  return name.replace(/[\\/\0"\n\r]/g, '_') || 'file';
}

function contentDispositionHeader(name, isAttachment) {
  const clean = sanitizeName(name);
  const ascii = clean.replace(/[^\x20-\x7E]/g, '_');
  const utf8 = encodeURIComponent(clean);
  const prefix = isAttachment ? 'attachment' : 'inline';
  return `${prefix}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

async function findShare(pool, token) {
  const folderResult = await pool.query(
    `SELECT id, name FROM folders WHERE public_token = $1 AND deleted_at IS NULL`,
    [token],
  );
  if (folderResult.rows.length > 0) {
    return { type: 'folder', row: folderResult.rows[0] };
  }
  const fileResult = await pool.query(
    `SELECT id, name, storage_path, mime_type, size_bytes
     FROM files WHERE public_token = $1 AND deleted_at IS NULL`,
    [token],
  );
  if (fileResult.rows.length > 0) {
    return { type: 'file', row: fileResult.rows[0] };
  }
  return null;
}

async function listFolderTree(pool, folderId) {
  const { rows } = await pool.query(
    `WITH RECURSIVE tree AS (
        SELECT id, name, name::text AS path FROM folders
        WHERE id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT f.id, f.name, t.path || '/' || f.name FROM folders f
        JOIN tree t ON f.parent_id = t.id WHERE f.deleted_at IS NULL
     )
     SELECT t.path || '/' || fi.name AS path,
        fi.id, fi.name, fi.mime_type, fi.size_bytes, fi.storage_path
     FROM tree t JOIN files fi ON fi.folder_id = t.id
     WHERE fi.deleted_at IS NULL
     ORDER BY path ASC`,
    [folderId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    path: r.path,
    mime_type: r.mime_type,
    size_bytes: Number(r.size_bytes),
    storage_path: r.storage_path,
  }));
}

function buildShareRouter({ pool, storage }) {
  const router = express.Router();

  router.get('/:token/info', async (req, res) => {
    try {
      const share = await findShare(pool, req.params.token);
      if (!share) return res.status(404).json({ error: 'link not found or revoked' });

      if (share.type === 'file') {
        const f = share.row;
        return res.json({
          type: 'file',
          name: f.name,
          mime_type: f.mime_type,
          size_bytes: Number(f.size_bytes),
        });
      }

      const items = await listFolderTree(pool, share.row.id);
      res.json({
        type: 'folder',
        name: share.row.name,
        items: items.map(({ storage_path: _sp, ...rest }) => rest),
      });
    } catch (e) {
      console.error('[share info]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:token/file/:fileId', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `WITH RECURSIVE tree AS (
            SELECT id FROM folders
            WHERE public_token = $1 AND deleted_at IS NULL
            UNION ALL
            SELECT f.id FROM folders f
            JOIN tree t ON f.parent_id = t.id WHERE f.deleted_at IS NULL
         )
         SELECT fi.name, fi.storage_path, fi.mime_type
         FROM tree t JOIN files fi ON fi.folder_id = t.id
         WHERE fi.id = $2 AND fi.deleted_at IS NULL`,
        [req.params.token, req.params.fileId],
      );
      if (rows.length === 0) return res.status(404).send('Not in shared folder');
      await serveFile(res, rows[0], req.query.download === '1');
    } catch (e) {
      console.error('[share folder file]', e);
      if (!res.headersSent) res.status(500).send('Server error');
    }
  });

  router.get('/:token/zip', async (req, res) => {
    try {
      const { rows: folderRows } = await pool.query(
        `SELECT id, name FROM folders WHERE public_token = $1 AND deleted_at IS NULL`,
        [req.params.token],
      );
      if (folderRows.length === 0) return res.status(404).send('Link not found');

      const folder = folderRows[0];
      const items = await listFolderTree(pool, folder.id);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', contentDispositionHeader(`${folder.name}.zip`, true));

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', (err) => {
        console.error('[share zip]', err);
        if (!res.headersSent) res.status(500);
        res.end();
      });
      archive.pipe(res);

      for (const item of items) {
        try {
          const info = storage.open(item.storage_path);
          archive.file(info.path, { name: item.path });
        } catch (e) {
          console.warn(`[share zip] skip ${item.path}: ${e.message}`);
        }
      }

      await archive.finalize();
    } catch (e) {
      console.error('[share zip]', e);
      if (!res.headersSent) res.status(500).send('Server error');
    }
  });

  router.get('/:token/content', async (req, res) => {
    try {
      const share = await findShare(pool, req.params.token);
      if (!share || share.type !== 'file') return res.status(404).send('Link not found or revoked');
      await serveFile(res, share.row, req.query.download === '1');
    } catch (e) {
      console.error('[share serve]', e);
      if (!res.headersSent) res.status(500).send('Server error');
    }
  });

  async function serveFile(res, fileRow, isAttachment) {
    let info;
    try { info = storage.open(fileRow.storage_path); }
    catch { return res.status(404).send('File missing'); }

    res.setHeader('Content-Type', fileRow.mime_type || mimeFor(fileRow.storage_path));
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.setHeader('Content-Disposition', contentDispositionHeader(fileRow.name, isAttachment));

    const stream = fs.createReadStream(info.path);
    stream.on('error', () => { if (!res.headersSent) res.status(500); res.end(); });
    stream.pipe(res);
  }

  return router;
}

module.exports = { buildShareRouter };
