import { error, redirect } from '@sveltejs/kit';
import { legacyUrl } from '@coin-book/core/legacy-url';

/** Bookmarks from the Czech URLs keep working; anything else is not found. */
export function load({ url }) {
  const target = legacyUrl(url);
  if (target) redirect(308, target);
  error(404);
}
