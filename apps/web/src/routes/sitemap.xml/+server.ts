import { locales } from '@coin-book/core/i18n';
import { absolute, indexable, landingPaths } from '$lib/landing';

export const prerender = true;

export function GET() {
  const alternates = locales
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${absolute(landingPaths[l])}"/>`)
    .join('\n');
  const urls = indexable
    ? locales.map((l) => `  <url>\n    <loc>${absolute(landingPaths[l])}</loc>\n${alternates}\n  </url>`)
    : [];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
  ].join('\n');
  return new Response(xml + '\n', { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
