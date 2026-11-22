const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { createServer, request } = require('node:http');
const { createHandler } = require('../api/american-beauty-video');

test('American Beauty is unlisted and the titled video comes before booking', () => {
  const html = readFileSync('american-beauty/index.html', 'utf8');
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /What to Expect at Your Photo Shoot/);
  assert.match(html, /poster="\/american-beauty\/assets\/mark-video-poster.webp"/);
  assert.ok(existsSync('american-beauty/assets/mark-video-poster.webp'));
  assert.match(html, /<video[\s\S]+<source src="\/api\/american-beauty-video"[\s\S]+<iframe[^>]+api.leadconnectorhq.com/);
  assert.doesNotMatch(readFileSync('sitemap.xml','utf8'), /\/american-beauty\//);
});

test('video proxy streams only the fixed file and preserves byte ranges', async (t) => {
  const reads = [];
  const handler = createHandler(async (url, opts) => {
    reads.push({url, opts});
    return new Response(opts.method === 'HEAD' ? null : '0123', {
      status: opts.headers.Range ? 206 : 200,
      headers: {'Content-Length':'4', 'Accept-Ranges':'bytes', ...(opts.headers.Range ? {'Content-Range':'bytes 0-3/23388284'} : {})}
    });
  }, () => 'TEST');
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const run = (path, options) => new Promise((resolve, reject) => {
    const req = request({host:'127.0.0.1', port:server.address().port, path, ...options}, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({status:res.statusCode, headers:res.headers, body}));
    });
    req.on('error', reject);
    req.end();
  });
  const headers = {Host:'www.markandrewboudoir.com'};
  for (const [path, opts, status] of [
    ['/api/american-beauty-video', {headers:{Host:'markandrew.ai'}}, 404],
    ['/api/american-beauty-video?path=other', {headers}, 404],
    ['/api/american-beauty-video', {method:'POST', headers}, 405],
    ['/api/american-beauty-video', {headers:{...headers, Range:'bytes=0-3,5-6'}}, 416],
  ]) assert.equal((await run(path, opts)).status, status);
  assert.equal(reads.length, 0);
  const response = await run('/api/american-beauty-video', {headers:{...headers, Range:'bytes=0-3'}});
  assert.equal(response.status, 206);
  assert.equal(response.body, '0123');
  assert.equal(response.headers['content-range'], 'bytes 0-3/23388284');
  assert.equal(response.headers['content-type'], 'video/mp4');
  const head = await run('/api/american-beauty-video', {method:'HEAD', headers});
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(reads[0].opts.headers.Authorization, 'Bearer TEST');
  assert.equal(reads[0].opts.redirect, 'error');
});
