const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function checkPassword(hash, plain) {
  return bcrypt.compare(plain, hash);
}

function issueToken(secret, userId, ttlSec) {
  const token = jwt.sign({ uid: userId }, secret, {
    algorithm: 'HS256',
    expiresIn: ttlSec,
  });
  return { token, expiresAt: new Date(Date.now() + ttlSec * 1000) };
}

function parseToken(secret, token) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

module.exports = { hashPassword, checkPassword, issueToken, parseToken };
