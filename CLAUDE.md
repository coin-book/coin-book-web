# coin-book-web

SvelteKit 2 / Svelte 5 SPA of coin-book. Spec: `../technicka-specifikace.md` (chapter 9 is the visual language).

## Layout

- `apps/web` – routes (Czech URLs: `/prehled`, `/transakce`, `/k-vyreseni`, `/rozpocet/[mesic]`, `/importy`, …), e2e in `apps/web/e2e`.
- `packages/core` – API client, auth, i18n (`cs`, `sk`), money and dates, stores. Shared logic lives here, never copied into the app.
- `packages/ui` – `theme.css` tokens and components (`MoneyAmount`, `BudgetTube`, `MonthRibbon`, `CategoryPicker`, …).

## Commands

`make check`, `make lint`, `make test`, `make test-e2e` (needs the demo stack), `make api-types` after the API's `openapi.yaml` changes.

## Rules

- Colours only through tokens in `packages/ui/src/theme.css`; categories carry a `color_key`, never a hex.
- Coral (`--over`) means overspent or error, yellow (`--warn`) near the limit, mint (`--income`) income. No category uses them.
- Every UI string goes through `t()`; add the key to both `cs.ts` and `sk.ts` (the type enforces it).
- Amounts render through `MoneyAmount`/`formatMoney`; `format-vectors.json` is byte-identical with `coin-book-api/testdata/`.
- Map API errors by `code` in `packages/core/src/i18n/errors.ts`, never by `detail`.
- Motion only in response to an action; `prefers-reduced-motion` is honoured globally.
