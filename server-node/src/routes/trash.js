const express = require('express');

function buildTrashRouter({ pool, storage, auth }) {
  const router = express.Router();
  router.use(auth);

  const normalize = (r) => (r ? { ...r, size_bytes: Number(r.size_bytes) } : r);

  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, owner_id, folder_id, name, storage_path, mime_type, size_bytes,
            is_public, created_at, updated_at, deleted_at
         FROM files WHERE owner_id = $1 AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`,
        [req.userId],
      );
      res.json(rows.map(normalize));
    } catch (e) {
      console.error('[trash list]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:id/restore', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE files SET deleted_at = NULL
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL
         RETURNING id, owner_id, folder_id, name, storage_path, mime_type, size_bytes,
            is_public, created_at, updated_at, deleted_at`,
        [req.params.id, req.userId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      res.json(normalize(rows[0]));
    } catch (e) {
      console.error('[trash restore]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `DELETE FROM files WHERE id = $1 AND owner_id = $2
         RETURNING storage_path`,
        [req.params.id, req.userId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      await storage.remove(rows[0].storage_path);
      res.json({ ok: true });
    } catch (e) {
      console.error('[trash purge]', e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { buildTrashRouter };
