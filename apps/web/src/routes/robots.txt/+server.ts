import { absolute, indexable, landingPaths } from '$lib/landing';

export const prerender = true;

// Only the landing pages and what renders them are open to crawlers; the app never is.
export function GET() {
  const lines = indexable
    ? [
        'User-agent: *',
        ...Object.values(landingPaths).map((path) => `Allow: ${path}$`),
        'Allow: /landing/',
        'Allow: /_app/',
        'Allow: /favicon.svg',
        'Allow: /llms.txt',
        'Disallow: /',
        '',
        `Sitemap: ${absolute('/sitemap.xml')}`,
      ]
    : ['User-agent: *', 'Disallow: /'];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
