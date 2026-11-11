const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const config=require('../vercel.json');
const url='https://link.disruptormarketing.io/widget/form/joalDMHHfI8ZKt7eWip3';
test('campus signup uses native GHL form on neutral domain',()=>{for(const source of ['/campus','/campus/','/campus/index.html']){const r=config.redirects.find(r=>r.source===source);assert.equal(r.destination,url);assert.equal(r.permanent,false);}});
test('campus redirect does not include gallery or review',()=>{assert.ok(!config.redirects.some(r=>r.source.startsWith('/campus')&&r.source.includes('*')));assert.ok(fs.existsSync('campus/gallery/index.html'));assert.ok(fs.existsSync('campus/review/index.html'));});
test('fallback signup has no old submission handler or boudoir appearance',()=>{const html=fs.readFileSync('campus/index.html','utf8');assert.ok(html.includes('GAME DAY FASHION'));assert.ok(html.includes(url));assert.ok(!/boudoir|api\/campus|<form/i.test(html));});
