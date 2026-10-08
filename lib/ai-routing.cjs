// Keep the AI domain separate while preserving the existing private critique store.
function aiRoute(url) {
  if (!['markandrew.ai', 'www.markandrew.ai'].includes(url.hostname)) return {type:'next'};
  if (url.hostname === 'www.markandrew.ai') {
    url.hostname = 'markandrew.ai';
    return {type:'redirect',url:url.href};
  }
  const path = url.pathname;
  if (path === '/' || path === '/index.html') return {type:'rewrite',path:'/ai-site/coming-soon.html'};
  if (path === '/ancient-greece' || path === '/ancient-greece/') return {type:'rewrite',path:'/ancient-greece/index.html'};
  if (['/ancient-greece/index.html', '/ancient-greece/illustrations.png', '/ancient-greece/picture-guide.pdf'].includes(path)) return {type:'next'};
  if (path === '/webinar' || path === '/webinar/') return {type:'rewrite',path:'/ai-site/webinar/index.html'};
  if (path === '/webinar/setup' || path === '/webinar/setup/') return {type:'rewrite',path:'/ai-site/webinar/setup.html'};
  if (path === '/webinar/privacy' || path === '/webinar/privacy/') return {type:'rewrite',path:'/ai-site/webinar/privacy.html'};
  if (path === '/ai-site/webinar/styles.css' || /^\/ai-site\/webinar\/assets\/(mark-neutral\.jpg|mark-pointing\.jpg|event-cover-v3\.png)$/.test(path)) return {type:'next'};
  if (path === '/image-critique' || path === '/image-critique/') return {type:'rewrite',path:'/image-critique/index.html'};
  if (path === '/image-critique/review' || path === '/image-critique/review/') return {type:'rewrite',path:'/image-critique/review/index.html'};
  if (path.startsWith('/image-critique/') || path === '/ai-site/coming-soon.css' || path === '/api/photo-critiques') return {type:'next'};
  return {type:'not-found'};
}
module.exports = {aiRoute};
