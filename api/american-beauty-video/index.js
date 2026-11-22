const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const videoUrl = 'https://wsp2phfhdlyvwmn3.private.blob.vercel-storage.com/american-beauty-squeeze-video-20261122.mp4';
const siteHosts = new Set(['www.markandrewboudoir.com', 'markandrewboudoir.com']);

function createHandler(readVideo = fetch, getToken = () => process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN) {
  return async (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'private, no-cache');
    const finish = status => {
      res.statusCode = status;
      res.end();
    };
    if (!siteHosts.has(req.headers.host) || req.url.includes('?')) return finish(404);
    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return finish(405);
    }
    const range = req.headers.range;
    if (range !== undefined && !/^bytes=(?:\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range)) return finish(416);
    const token = getToken();
    if (!token) return finish(503);
    const headers = { Authorization: `Bearer ${token}` };
    if (method === 'GET' && range) headers.Range = range;
    try {
      const upstream = await readVideo(videoUrl, { method, headers, redirect: 'error' });
      if (upstream.status === 416) {
        const contentRange = upstream.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);
        return finish(416);
      }
      if (upstream.status !== 200 && upstream.status !== 206) {
        if (upstream.body) await upstream.body.cancel().catch(() => {});
        return finish(upstream.status === 404 ? 404 : 503);
      }
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'video/mp4');
      for (const h of ['content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(h);
        if (value) res.setHeader(h, value);
      }
      if (method === 'HEAD') return res.end();
      if (!upstream.body) return finish(503);
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch {
      if (!res.headersSent && !res.destroyed) {
        for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) res.removeHeader(h);
        return finish(503);
      }
      if (!res.destroyed) res.destroy();
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
