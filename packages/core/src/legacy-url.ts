const paths: Record<string, string> = {
  prehled: 'overview',
  transakce: 'transactions',
  'k-vyreseni': 'triage',
  rozpocet: 'budget',
  importy: 'imports',
  ucty: 'accounts',
  kategorie: 'categories',
  nastaveni: 'settings',
  investice: 'investments',
};

const params: Record<string, string> = {
  mesic: 'month',
  ucet: 'account',
  kategorie: 'category',
  od: 'from',
  do: 'to',
  nezarazene: 'uncategorized',
  seskupit: 'group',
  zalozka: 'tab',
  graf: 'chart',
};

const values: Record<string, Record<string, string>> = {
  group: { ne: 'none' },
  tab: { zisky: 'realized', dividendy: 'dividends', test: 'time-test' },
  chart: { kategorie: 'categories' },
};

/**
 * Where a link from before the English URLs now points: "/prehled?mesic=2026-10" is
 * "/overview?month=2026-10". Null when the URL is not an old one.
 */
export function legacyUrl(url: URL): string | null {
  const [, first = '', ...rest] = url.pathname.split('/');
  const path = paths[first];
  if (!path) return null;
  const query = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    const name = params[key] ?? key;
    query.append(name, values[name]?.[value] ?? value);
  }
  const search = query.size > 0 ? `?${query}` : '';
  // A load function may not read url.hash; no old link carried one.
  return `/${[path, ...rest].join('/')}${search}`;
}
