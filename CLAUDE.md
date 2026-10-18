# coin-book-web

SvelteKit 2 / Svelte 5 SPA of coin-book. Spec: `../technicka-specifikace.md` (chapter 9 is the visual language).

## Layout

- `apps/web` – routes and query parameters in English (`/overview`, `/transactions?account=…`, `/triage`, `/budget/[month]`, `/investments`, …); the Czech URLs of before redirect (`core/legacy-url`). E2E in `apps/web/e2e`.
- `packages/core` – API client, auth, i18n (`cs`, `sk`), money and dates, stores. Shared logic lives here, never copied into the app.
- `packages/ui` – `theme.css` tokens and components (`MoneyAmount`, `CategoryPicker`, …); charts (`CategoryBars`, `BudgetBullets`, `ColumnChart`, `Sankey`) are built on LayerChart; `CandleChart` is plain SVG, LayerChart has no candlesticks.

## Commands

`make check`, `make lint`, `make test`, `make test-e2e` (needs the demo stack), `make api-types` after the API's `openapi.yaml` changes.

## Rules

- Colours only through tokens in `packages/ui/src/theme.css`; categories carry a `color_key`, never a hex.
- `--brand` is the active colour: green in light mode (shared with `--income`), ultramarine in dark mode (income is mint there). Red (`--over`) means overspent or error, yellow (`--warn`) near the limit; `--loss` (`MoneyAmount gain`) marks money lost on investments. No category uses these hues.
- Type is bundled Figtree (variable weight 300–900). Amounts use `.num` (tabular figures) so columns line up.
- Every UI string goes through `t()`; add the key to both `cs.ts` and `sk.ts` (the type enforces it).
- Amounts render through `MoneyAmount`/`formatMoney`; `format-vectors.json` is byte-identical with `coin-book-api/testdata/`.
- Map API errors by `code` in `packages/core/src/i18n/errors.ts`, never by `detail`.
- Motion only in response to an action; `prefers-reduced-motion` is honoured globally.
- The landing pages (`/`, `/sk`, `/en`) are prerendered HTML, everything else is the SPA (`app.html` fallback). Search engines are let in only when the build gets `COINBOOK_SITE_URL` (Docker `SITE_URL`, repo variable in release); otherwise `noindex` and `robots.txt` shuts everything.
- The landing page shows the app in pictures: after any visible change, retake them with `make landing-shots` against a fresh demo stack (`make reset` in coin-book-local) and keep the landing copy true to the features.
- E2E locators: buttons and fields by role and label; containers and repeated items by `data-testid` (with `data-code` or `data-tx` to pick one), never by CSS class.
