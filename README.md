# coin-book-web

[![ci](https://github.com/coin-book/coin-book-web/actions/workflows/ci.yml/badge.svg)](https://github.com/coin-book/coin-book-web/actions/workflows/ci.yml)
[![release](https://github.com/coin-book/coin-book-web/actions/workflows/release.yml/badge.svg)](https://github.com/coin-book/coin-book-web/actions/workflows/release.yml)
![SvelteKit](https://img.shields.io/badge/sveltekit-2-FF3E00?logo=svelte&logoColor=white)
![Svelte](https://img.shields.io/badge/svelte-5-FF3E00?logo=svelte&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)
[![image](https://img.shields.io/badge/image-ghcr.io%2Fcoin--book%2Fcoin--book--web-2496ED?logo=docker&logoColor=white)](https://github.com/coin-book/coin-book-web/pkgs/container/coin-book-web)

Web client of coin-book: overview, transactions, triage, budgets, investments and imports, in Czech
and Slovak. A static SvelteKit SPA served by Caddy in front of [coin-book-api](https://github.com/coin-book/coin-book-api).

| Path            | What                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `apps/web`      | routes (`/prehled`, `/transakce`, `/investice`, …) and Playwright e2e |
| `packages/core` | API client, auth, i18n, money and dates                               |
| `packages/ui`   | theme tokens and components; charts on LayerChart                     |

## Develop

```sh
make install
make -C ../coin-book-local up   # API + this client with hot reload on http://127.0.0.1:5373
make check lint test            # svelte-check, Prettier, unit tests
make api-types                  # after the API's openapi.yaml changes
pnpm --filter @coin-book/web test:e2e   # against the demo stack (COINBOOK_SEED_DEMO=true)
```
