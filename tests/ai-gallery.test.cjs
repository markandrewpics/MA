const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, request } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handlerWith } = require('../api/campus-gallery');
const files = require('../lib/campus-gallery-files.json');
const root = path.join(__dirname, '..');

test('AI gallery contains exactly the 63 approved photos and same-origin assets', () => {
  const html = fs.readFileSync(path.join(root, 'ai-site/campus-gallery/index.html'), 'utf8');
  const selected = [...html.matchAll(/class="photo" href="([^"]+)" data-file="([^"]+)"/g)];
  assert.equal(selected.length, 63);
  assert.equal(new Set(files).size, 63);
  assert.deepEqual(selected.map(([, , filename]) => filename), files);
  for (const [, href, name] of selected) {
    assert.match(name, /^20261114-6X0A\d+\.jpg$/);
    assert.equal(href, `/api/campus-gallery?kind=photos&amp;file=${name}`);
    assert.ok(html.includes(`src="/api/campus-gallery?kind=thumbs&amp;file=${name}"`));
  }
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/ai-site\/[^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, asset)), asset);
  }
  assert.match(html, /BOSTON COLLEGE · NOVEMBER 14, 2026/);
  assert.match(html, /noindex,nofollow,noimageindex/);
  assert.match(html, /download\.download=links\[index\]\.dataset\.file/);
  assert.ok(!html.includes('NOVEMBER 7,'));
});

test('private gallery API streams >4.5 MB, rejects other hosts and arbitrary keys', async t => {
  const name = files[0], calls = [];
  const sixMiB = 6 * 1024 * 1024;
  const server = createServer(handlerWith(async (pathname, options) => {
    calls.push([pathname, options]);
    if (pathname.endsWith(files[1])) return null;
    if (pathname.endsWith(files[2])) throw new Error('never disclose internal storage diagnostics');
    let left = 6;
    return { statusCode: 200, stream: new ReadableStream({
      pull(controller) {
        if (!left--) return controller.close();
        controller.enqueue(new Uint8Array(1024 * 1024).fill(37));
      }
    }) };
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const endpoint = (kind, file) => `/api/campus-gallery?kind=${kind}&file=${file}`;
  const call = (path, host = 'markandrew.ai', method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path, headers: { host }, method }, res => {
      let bytes = 0, firstByte;
      res.on('data', chunk => { if (!bytes) firstByte = chunk[0]; bytes += chunk.length; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bytes, firstByte }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal((await call(endpoint('photos', name), 'www.markandrewboudoir.com')).status, 404);
  assert.equal((await call(endpoint('photos', name), 'markandrew.ai', 'POST')).status, 405);
  assert.equal((await call(endpoint('photos', 'unknown.jpg'))).status, 404);
  assert.equal((await call(endpoint('photos', '%2e%2e%2fphoto-critiques%2fauth%2freview.json'))).status, 404);
  assert.equal((await call(endpoint('raw', name))).status, 404);
  assert.equal((await call(endpoint('photos', name) + '&file=' + files[1])).status, 404);
  assert.deepEqual(calls, []);
  const result = await call(endpoint('photos', name));
  assert.equal(result.status, 200);
  assert.equal(result.bytes, sixMiB);
  assert.equal(result.firstByte, 37);
  assert.equal(result.headers['transfer-encoding'], 'chunked');
  assert.equal(result.headers['content-type'], 'image/jpeg');
  assert.equal(result.headers['cache-control'], 'private, no-store');
  assert.equal(result.headers['cross-origin-resource-policy'], 'same-origin');
  assert.deepEqual(calls[0], [`game-day/20261114/photos/${name}`, { access: 'private', useCache: false }]);
  const head = await call(endpoint('thumbs', name), 'markandrew.ai', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.bytes, 0);
  assert.deepEqual(calls[1], [`game-day/20261114/thumbs/${name}`, { access: 'private', useCache: false }]);
  assert.equal((await call(endpoint('photos', files[1]))).status, 404);
  const fail = await call(endpoint('photos', files[2]));
  assert.equal(fail.status, 503);
  assert.equal(fail.bytes, 0);
});
