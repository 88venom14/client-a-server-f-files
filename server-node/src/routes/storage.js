const fs = require('node:fs');
const path = require('node:path');

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

function contentDispositionHeader(name) {
  const clean = sanitizeName(name);
  const ascii = clean.replace(/[^\x20-\x7E]/g, '_');
  const utf8 = encodeURIComponent(clean);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

function buildStorageHandler({ storage, signer }) {
  return (req, res) => {
    const storagePath = req.params[0] || '';
    const { token = '', exp = '', dl = '' } = req.query;

    try {
      signer.verify(storagePath, String(token), String(exp), String(dl));
    } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    let info;
    try {
      info = storage.open(storagePath);
    } catch {
      return res.status(404).json({ error: 'file not found' });
    }

    res.setHeader('Content-Type', mimeFor(storagePath));
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    if (dl) {
      res.setHeader('Content-Disposition', contentDispositionHeader(String(dl)));
    }

    const stream = fs.createReadStream(info.path);
    stream.on('error', () => { if (!res.headersSent) res.status(500); res.end(); });
    stream.pipe(res);
  };
}

module.exports = { buildStorageHandler };
