import { landingLocale } from '#lib/landing.js';

/** Prerendered landing pages declare their own language; the app shell starts in Czech. */
export async function handle({ event, resolve }) {
  const lang = landingLocale(event.url.pathname) ?? 'cs';
  return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', lang) });
}
