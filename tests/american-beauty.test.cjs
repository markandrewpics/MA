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
    const partial = opts.headers?.Range === 'bytes=0-3';
    return {
      statusCode: 200,
      stream: new Response(partial ? '0123' : '0123456789').body,
      headers: new Headers(partial ? {'Content-Range':'bytes 0-3/234611592'} : {}),
      blob: {contentType:'video/mp4',size:partial ? 4 : 234611592},
    };
  });
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
  assert.equal(response.headers['content-range'], 'bytes 0-3/234611592');
  assert.equal(response.headers['content-type'], 'video/mp4');
  const head = await run('/api/american-beauty-video', {method:'HEAD', headers});
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  const fallback = await run('/api/american-beauty-video', {headers:{...headers, Range:'bytes=2-5'}});
  assert.equal(fallback.status, 206);
  assert.equal(fallback.body, '2345');
  assert.equal(fallback.headers['content-range'], 'bytes 2-5/234611592');
  assert.equal(reads[0].opts.access, 'private');
  assert.equal(reads[0].opts.headers.Range, 'bytes=0-3');
  assert.equal(head.headers['content-length'], '234611592');
});

test('two unlisted companion campaigns share only video and booking assets', () => {
  const sitemap = readFileSync('sitemap.xml', 'utf8');
  for (const [path, label] of [['birthday-boudoir', 'A portrait experience for your birthday'], ['50-off-boudoir', 'A guided boudoir portrait experience']]) {
    const html = readFileSync(`${path}/index.html`, 'utf8');
    assert.match(html, /noindex, nofollow/);
    assert.doesNotMatch(html, /<body class="american-beauty"|rose-petal-texture/i);
    assert.ok(html.includes(label));
    assert.match(html, /<video[\s\S]+<source src="\/api\/american-beauty-video"[\s\S]+<iframe[^>]+api.leadconnectorhq.com/);
    assert.match(html, /poster="\/american-beauty\/assets\/mark-video-poster.webp"/);
    assert.ok(!sitemap.includes(`/${path}/`));
    if (path === 'birthday-boudoir') assert.doesNotMatch(html, /\$\d|\d+% off/);
    else assert.match(html, /50% off the session fee/);
  }
});
