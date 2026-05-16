const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

class Signer {
  constructor(secret) {
    this.secret = Buffer.from(secret);
  }

  sign(storagePath, expDate, attachment = '') {
    const expStr = String(Math.floor(expDate.getTime() / 1000));
    const token = this._mac(storagePath, expStr, attachment);
    const params = new URLSearchParams();
    params.set('token', token);
    params.set('exp', expStr);
    if (attachment) params.set('dl', attachment);
    return `/storage/${storagePath}?${params.toString()}`;
  }

  verify(storagePath, token, expStr, attachment = '') {
    const exp = parseInt(expStr, 10);
    if (Number.isNaN(exp)) throw new Error('bad exp');
    if (Math.floor(Date.now() / 1000) > exp) throw new Error('expired');
    const want = this._mac(storagePath, expStr, attachment);
    const a = Buffer.from(want);
    const b = Buffer.from(token);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('bad signature');
    }
  }

  _mac(storagePath, expStr, attachment) {
    return crypto.createHmac('sha256', this.secret)
      .update(`${storagePath}|${expStr}|${attachment}`)
      .digest('base64url');
  }
}

class LocalStorage {
  constructor(root) {
    this.root = path.resolve(root);
  }

  async init() {
    await fsp.mkdir(this.root, { recursive: true });
  }

  _resolve(storagePath) {
    if (storagePath.includes('..')) throw new Error('invalid path');
    const full = path.join(this.root, storagePath);
    const rel = path.relative(this.root, full);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('path escapes root');
    }
    return full;
  }

  resolve(storagePath) {
    return this._resolve(storagePath);
  }

  open(storagePath) {
    const full = this._resolve(storagePath);
    const stat = fs.statSync(full);
    return { path: full, size: stat.size };
  }

  async remove(storagePath) {
    try {
      await fsp.unlink(this._resolve(storagePath));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
}

module.exports = { Signer, LocalStorage };
