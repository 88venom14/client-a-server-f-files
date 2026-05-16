const express = require('express');
const { hashPassword, checkPassword, issueToken } = require('../auth');
const { validateEmail, validatePassword } = require('../validation');

function buildAuthRouter({ pool, config, auth }) {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    try {
      const hash = await hashPassword(password);
      const { rows } = await pool.query(
        `INSERT INTO users(email, password_hash) VALUES($1, $2)
         RETURNING id, email, created_at, updated_at`,
        [email, hash],
      );
      const user = rows[0];
      const { token } = issueToken(config.jwtSecret, user.id, config.jwtTtlSec);
      res.status(201).json({ user, token });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'email already registered' });
      console.error('[signup]', e);
      res.status(500).json({ error: 'signup failed' });
    }
  });

  router.post('/signin', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (email.length > 254 || password.length > 128) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    try {
      const { rows } = await pool.query(
        `SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1`,
        [email],
      );
      if (rows.length === 0) return res.status(401).json({ error: 'invalid credentials' });
      const u = rows[0];
      if (!(await checkPassword(u.password_hash, password))) {
        return res.status(401).json({ error: 'invalid credentials' });
      }
      const { token } = issueToken(config.jwtSecret, u.id, config.jwtTtlSec);
      res.json({
        user: { id: u.id, email: u.email, created_at: u.created_at, updated_at: u.updated_at },
        token,
      });
    } catch (e) {
      console.error('[signin]', e);
      res.status(500).json({ error: 'signin failed' });
    }
  });

  router.post('/signout', auth, (_req, res) => res.json({ ok: true }));

  router.get('/me', auth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, created_at, updated_at FROM users WHERE id = $1`,
        [req.userId],
      );
      if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
      res.json(rows[0]);
    } catch (e) {
      console.error('[me]', e);
      res.status(500).json({ error: 'me failed' });
    }
  });

  return router;
}

module.exports = { buildAuthRouter };
