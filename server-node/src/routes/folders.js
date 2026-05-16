const crypto = require('node:crypto');
const express = require('express');
const { validateName } = require('../validation');

function buildFoldersRouter({ pool, auth }) {
  const router = express.Router();
  router.use(auth);

  router.get('/', async (req, res) => {
    const parent = req.query.parent_id || null;
    try {
      const result = parent === null
        ? await pool.query(
            `SELECT id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at
             FROM folders WHERE owner_id = $1 AND parent_id IS NULL AND deleted_at IS NULL
             ORDER BY name ASC`,
            [req.userId],
          )
        : await pool.query(
            `SELECT id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at
             FROM folders WHERE owner_id = $1 AND parent_id = $2 AND deleted_at IS NULL
             ORDER BY name ASC`,
            [req.userId, parent],
          );
      res.json(result.rows);
    } catch (e) {
      console.error('[folders list]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const parentId = req.body?.parent_id || null;
    const err = validateName(name);
    if (err) return res.status(400).json({ error: err });
    try {
      const { rows } = await pool.query(
        `INSERT INTO folders(owner_id, parent_id, name) VALUES($1, $2, $3)
         RETURNING id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at`,
        [req.userId, parentId, name],
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'folder exists' });
      console.error('[folder create]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id/path', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `WITH RECURSIVE trail AS (
            SELECT id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at, 0 AS depth
            FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
            UNION ALL
            SELECT f.id, f.owner_id, f.parent_id, f.name, f.public_token, f.created_at, f.updated_at, f.deleted_at, t.depth + 1
            FROM folders f JOIN trail t ON f.id = t.parent_id WHERE f.deleted_at IS NULL
         )
         SELECT id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at
         FROM trail ORDER BY depth DESC`,
        [req.params.id, req.userId],
      );
      res.json(rows);
    } catch (e) {
      console.error('[folder path]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id/files-recursive', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `WITH RECURSIVE tree AS (
            SELECT id, name, name::text AS path FROM folders
            WHERE id = $2 AND owner_id = $1 AND deleted_at IS NULL
            UNION ALL
            SELECT f.id, f.name, t.path || '/' || f.name FROM folders f
            JOIN tree t ON f.parent_id = t.id WHERE f.deleted_at IS NULL
         )
         SELECT t.path || '/' || fi.name AS path,
            fi.id, fi.owner_id, fi.folder_id, fi.name, fi.storage_path, fi.mime_type,
            fi.size_bytes, fi.is_public, fi.created_at, fi.updated_at, fi.deleted_at
         FROM tree t JOIN files fi ON fi.folder_id = t.id
         WHERE fi.owner_id = $1 AND fi.deleted_at IS NULL
         ORDER BY path ASC`,
        [req.userId, req.params.id],
      );
      res.json(rows.map((r) => ({
        path: r.path,
        row: {
          id: r.id, owner_id: r.owner_id, folder_id: r.folder_id, name: r.name,
          storage_path: r.storage_path, mime_type: r.mime_type,
          is_public: r.is_public, created_at: r.created_at,
          updated_at: r.updated_at, deleted_at: r.deleted_at,
          size_bytes: Number(r.size_bytes),
        },
      })));
    } catch (e) {
      console.error('[folder recursive]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/:id', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const err = validateName(name);
    if (err) return res.status(400).json({ error: err });
    try {
      const { rows } = await pool.query(
        `UPDATE folders SET name = $3, updated_at = now()
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
         RETURNING id, owner_id, parent_id, name, public_token, created_at, updated_at, deleted_at`,
        [req.params.id, req.userId, name],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'folder not found' });
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'folder with this name exists' });
      console.error('[folder rename]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE folders SET deleted_at = now()
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.userId],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'folder not found' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[folder delete]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:id/share', async (req, res) => {
    try {
      const { rows: existing } = await pool.query(
        `SELECT public_token FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.userId],
      );
      if (existing.length === 0) return res.status(404).json({ error: 'not found' });

      let token = existing[0].public_token;
      if (!token) {
        token = crypto.randomBytes(16).toString('base64url');
        await pool.query(
          `UPDATE folders SET public_token = $3 WHERE id = $1 AND owner_id = $2`,
          [req.params.id, req.userId, token],
        );
      }
      res.json({ token });
    } catch (e) {
      console.error('[folder share]', e);
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id/share', async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE folders SET public_token = NULL
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [req.params.id, req.userId],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[folder unshare]', e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { buildFoldersRouter };
