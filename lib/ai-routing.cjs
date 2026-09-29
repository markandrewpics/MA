// Keep the AI domain separate while preserving the existing private critique store.
function aiRoute(url) {
  if (!['markandrew.ai', 'www.markandrew.ai'].includes(url.hostname)) return {type:'next'};
  if (url.hostname === 'www.markandrew.ai') {
    url.hostname = 'markandrew.ai';
    return {type:'redirect',url:url.href};
  }
  const path = url.pathname;
  if (path === '/' || path === '/index.html') return {type:'rewrite',path:'/ai-site/coming-soon.html'};
  if (path === '/image-critique' || path === '/image-critique/') return {type:'rewrite',path:'/image-critique/index.html'};
  if (path === '/image-critique/review' || path === '/image-critique/review/') return {type:'rewrite',path:'/image-critique/review/index.html'};
  if (path.startsWith('/image-critique/') || path === '/ai-site/coming-soon.css' || path === '/api/photo-critiques') return {type:'next'};
  return {type:'not-found'};
}
module.exports = {aiRoute};
