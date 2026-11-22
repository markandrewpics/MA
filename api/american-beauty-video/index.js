const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const videoUrl = 'https://wsp2phfhdlyvwmn3.private.blob.vercel-storage.com/boudoir-squeeze-video-1080p60-20261122.mp4';
const videoSize = 234611592;
const siteHosts = new Set(['www.markandrewboudoir.com', 'markandrewboudoir.com']);

async function readPrivateVideo(path, options) {
  const { get } = await import('@vercel/blob');
  return get(path, options);
}

function parseRange(range) {
  const m = /^bytes=(\d{0,12})-(\d{0,12})$/.exec(range);
  if (!m || (!m[1] && !m[2])) return null;
  if (!m[1]) return Number(m[2]) ? [Math.max(0, videoSize - Number(m[2])), videoSize - 1] : null;
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), videoSize - 1) : videoSize - 1;
  return start <= end && start < videoSize ? [start, end] : null;
}

async function* sliceStream(source, start, end) {
  let offset = 0;
  for await (const chunk of source) {
    const next = offset + chunk.length;
    if (next > start) yield chunk.subarray(Math.max(0, start - offset), Math.min(chunk.length, end + 1 - offset));
    offset = next;
    if (offset > end) return;
  }
}

function createHandler(readVideo = readPrivateVideo) {
  return async (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'private, no-cache');
    const finish = status => { res.statusCode = status; res.end(); };
    if (!siteHosts.has(req.headers.host) || req.url !== '/api/american-beauty-video') return finish(404);
    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return finish(405);
    }
    const range = req.headers.range;
    const requested = range !== undefined ? parseRange(range) : null;
    if (range !== undefined && !requested) {
      res.setHeader('Content-Range', `bytes */${videoSize}`);
      return finish(416);
    }
    let stream;
    try {
      const interval = method === 'GET' ? requested : null;
      const bounds = interval ? `bytes=${interval[0]}-${interval[1]}` : null;
      const result = await readVideo(videoUrl, { access: 'private', ...(bounds ? { headers: { Range: bounds } } : {}) });
      if (!result) return finish(404);
      stream = result.stream;
      if (result.statusCode !== 200 || !stream || result.blob?.contentType !== 'video/mp4') {
        if (stream) await stream.cancel().catch(() => {});
        return finish(503);
      }
      const fromStorage = result.headers.get('content-range');
      const desired = interval ? `bytes ${interval[0]}-${interval[1]}/${videoSize}` : null;
      if ((fromStorage && fromStorage !== desired) || (!fromStorage && result.blob.size !== videoSize)) {
        await stream.cancel().catch(() => {});
        return finish(503);
      }
      res.statusCode = interval ? 206 : 200;
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', interval ? interval[1] - interval[0] + 1 : videoSize);
      if (desired) res.setHeader('Content-Range', desired);
      if (method === 'HEAD') {
        await stream.cancel().catch(() => {});
        return res.end();
      }
      const source = Readable.fromWeb(stream);
      await pipeline(interval && !fromStorage ? Readable.from(sliceStream(source, ...interval)) : source, res);
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
