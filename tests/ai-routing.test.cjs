const {test}=require('node:test');const assert=require('node:assert/strict');const {aiRoute}=require('../lib/ai-routing.cjs');
const route=(path,host='markandrew.ai')=>aiRoute(new URL('https://'+host+path));
test('study guide resolves its page and assets without opening other AI host paths',()=>{
 for(const path of ['/ancient-greece', '/ancient-greece/'])assert.equal(route(path).path,'/ancient-greece/index.html');
 for(const path of ['/ancient-greece/index.html','/ancient-greece/illustrations.png','/ancient-greece/picture-guide.pdf'])assert.equal(route(path).type,'next');
 for(const path of ['/ancient-greece/private.json','/ancient-greece-other','/api/car-funnel'])assert.equal(route(path).type,'not-found');
 assert.equal(route('/ancient-greece/','www.markandrew.ai').url,'https://markandrew.ai/ancient-greece/');
 assert.equal(route('/','www.markandrewboudoir.com').type,'next');
});
test('AI homepage and critique routes are separate from the photography site',()=>{
 assert.equal(route('/').path,'/ai-site/coming-soon.html');
 assert.equal(route('/image-critique').path,'/image-critique/index.html');
 assert.equal(route('/image-critique/review/').path,'/image-critique/review/index.html');
 assert.equal(route('/image-critique/assets/mark.jpg').type,'next');
 assert.equal(route('/api/photo-critiques?action=list').type,'next');
 for(const path of ['/','/api/car-funnel','/groceries','/blog'])assert.equal(route(path,'www.markandrewboudoir.com').type,'next');
 for(const path of ['/api/car-funnel','/groceries','/uploads/test.jpg','/blog','/ai-site/coming-soon.html'])assert.equal(route(path).type,'not-found');
 assert.equal(route('/image-critique?ref=test','www.markandrew.ai').url,'https://markandrew.ai/image-critique?ref=test');
});

test('webinar routes preserve host isolation and expose only intended public assets',()=>{
 for(const suffix of ['', '/']){
  assert.equal(route('/webinar'+suffix).path,'/ai-site/webinar/index.html');
  assert.equal(route('/webinar/setup'+suffix).path,'/ai-site/webinar/setup.html');
  assert.equal(route('/webinar/privacy'+suffix).path,'/ai-site/webinar/privacy.html');
 }
 for(const path of ['/ai-site/webinar/styles.css','/ai-site/webinar/assets/mark-neutral.jpg','/ai-site/webinar/assets/mark-pointing.jpg','/ai-site/webinar/assets/event-cover-v3.png'])assert.equal(route(path).type,'next');
 for(const path of ['/webinar/admin','/ai-site/webinar/private.json','/ai-site/webinar/index.html','/api/car-funnel'])assert.equal(route(path).type,'not-found');
 assert.equal(route('/webinar','www.markandrewboudoir.com').type,'next');
 assert.equal(route('/webinar?source=test','www.markandrew.ai').url,'https://markandrew.ai/webinar?source=test');
});
