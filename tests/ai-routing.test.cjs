const {test}=require('node:test');const assert=require('node:assert/strict');const {aiRoute}=require('../lib/ai-routing.cjs');
const route=(path,host='markandrew.ai')=>aiRoute(new URL('https://'+host+path));
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
