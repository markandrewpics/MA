import { next, rewrite } from '@vercel/functions';
import { aiRoute } from './lib/ai-routing.cjs';

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const route = aiRoute(url);
  if (route.type === 'next') return next();
  if (route.type === 'redirect') return Response.redirect(route.url, 308);
  if (route.type === 'rewrite') return rewrite(new URL(route.path, url));
  return new Response('Page not found. Visit https://markandrew.ai/', {
    status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
