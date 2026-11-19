const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const files = new Set(require('../../lib/campus-gallery-files.json'));

async function getBlob(path, options) {
  const { get } = await import('@vercel/blob');
  return get(path, options);
}

function handlerWith(get) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noimageindex');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const finish = status => {
      res.statusCode = status;
      res.end();
    };
    if (req.headers.host !== 'markandrew.ai') return finish(404);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return finish(405);
    }
    const params = new URL(req.url, 'https://markandrew.ai').searchParams;
    if (params.size !== 2) return finish(404);
    const kind = params.get('kind');
    const file = params.get('file');
    if ((kind !== 'photos' && kind !== 'thumbs') || !files.has(file)) return finish(404);
    try {
      const path = `game-day/20261114/${kind}/${file}`;
      const result = await get(path, { access: 'private', useCache: false });
      if (result?.statusCode !== 200 || !result.stream) return finish(404);
      res.setHeader('Content-Type', 'image/jpeg');
      if (req.method === 'HEAD') {
        await result.stream.cancel().catch(() => {});
        return finish(200);
      }
      // Intentionally do not buffer or set Content-Length: Vercel streams the body.
      await pipeline(Readable.fromWeb(result.stream), res);
    } catch {
      // Do not expose storage URLs, credentials, or SDK errors.
      if (!res.headersSent && !res.destroyed) return finish(503);
      if (!res.destroyed) res.destroy();
    }
  };
}
module.exports = handlerWith(getBlob);
module.exports.handlerWith = handlerWith;
