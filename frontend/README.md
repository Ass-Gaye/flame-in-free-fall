# Flame in Freefall — frontend

Research intelligence workspace for NASA's Physical Sciences Informatics (PSI)
microgravity combustion and fire-safety investigations.

Phase 3 is complete: the dashboard, investigation explorer, record pages, and
research library read the Phase 2 API in `../backend/`. Every displayed value
comes from the validated dataset at
`../nasa-fire-data/psi_output/merged_master_dataset.json`. The browser never
loads that file directly and no page estimates a statistic.

## Stack

- React 19 + TypeScript 7
- Vite 8
- Tailwind CSS 4 (CSS-first design tokens)
- shadcn/ui-style components on Radix Slot
- Lucide icons
- React Router
- Vitest + React Testing Library

## Routes

| Route | Page | Data |
| --- | --- | --- |
| `/` | Overview | `/api/statistics`, `/api/health` |
| `/investigations` | Investigation explorer | `/api/investigations`, `/api/filters` |
| `/investigations/:investigationId` | Investigation detail | `/api/investigations/:id` |
| `/analytics` | Research analytics | Phase 4 placeholder |
| `/library` | Research library | `/api/publications`, `/api/documents` |
| `/assistant` | AI research assistant | Phase 5 placeholder |
| `/export` | Export center | Phase 6 placeholder |
| `/settings` | Appearance and configuration | `/api/health` |
| `*` | Not found | — |

## Commands

```bash
npm install
npm run dev      # local dev server on http://localhost:5173
npm run build    # type-check and production build
npm run lint     # oxlint
npm test         # Vitest run
npm run preview  # preview the production build
```

Start the backend first so the pages have data:

```powershell
cd ../backend
npm run dev      # http://localhost:3001
```

## API client and data layer

- `src/lib/api.ts` is the typed client. It serializes queries, paginates, and
  throws `ApiError` with the backend's status and error code.
- `src/lib/api-hooks.ts` provides `useApiQuery`, a small fetch hook with
  in-flight tracking, abort handling, and an in-memory response cache. Requests
  are cancelled on unmount and never blank the screen while refetching.
- `src/lib/query-state.ts` keeps list state in the URL. Search writes with
  `replace`; filters, sort, and page changes push history.
- `src/lib/dataset-status.tsx` makes one `/api/health` request and shares it
  with the sidebar, top bar, footer, overview provenance, and settings panel.
- `src/lib/format.ts` holds display helpers. A missing number or date returns
  `null`, which callers render as "Not recorded" or "Unavailable".

Set `VITE_API_BASE_URL` to override the default `http://localhost:3001/api`
(see `.env.example`).

## URL state

| Param | Used by | Values |
| --- | --- | --- |
| `q` | Explorer, library | Free text |
| `relevance` | Explorer | `direct`, `supporting`, `peripheral` |
| `area` | Explorer | Research area |
| `project_type` | Explorer | Project type |
| `status` | Explorer | `success`, `incomplete`, `failed` |
| `sort` | Explorer | `relevance`, `title`, `area`, `project_type`, `extraction`, `publications` |
| `tab` | Library | `publications`, `documents` |
| `view` | Library | `grouped`, `entries` |
| `has_doi` | Library | `true`, `false` |
| `investigation` | Library | `PSI-123` |
| `page` | Explorer, library | Positive integer |

Unknown enum values fall back to the default before they reach the API, and the
page size is fixed at 25.

## Data integrity rules visible in the UI

- The browser never reads the dataset directly; the backend owns querying.
- Investigation DOIs (`10.60555/…`) and publication DOIs are separate fields.
  The library includes a short explainer so the two are not conflated.
- Unverified scraper DOIs stay in their own field and are labelled as such.
- Missing or truncated fields are labelled unavailable or incomplete, never
  reconstructed.
- Relevance labels expose their score and the rule evidence behind them.
- Percentages are shown with one decimal so a 10/14/109 split reads as
  7.5% + 10.5% + 82.0%, not 8% + 11% + 82%.
- ISA-Tab dates render exactly as recorded because the source mixes
  `MM-DD-YYYY` and `DD-Mon-YYYY`.
- All 22 ISA archives have `filename_matches_content: false`; the record page
  explains this as expected multi-study ZIP bundling.
- Only the theme preference (`fif-theme`) is persisted, and only in the browser.

## Tests

```bash
npm test
```

The suite covers:

- `formatCount`, date formatting, DOI stripping, resolver URLs, PubMed URLs,
  publication link preference, author truncation, and share percentages.
- URL param readers, including invalid enum and page fallbacks.
- The investigation record page: loaded data, not-found versus API failure,
  and client-side rejection of malformed IDs.

`src/test/setup.ts` clears the API cache between tests.

## Layout

```
src/
  components/
    brand/       logo
    dashboard/   stat cards
    layout/      app shell, sidebar, topbar, mobile nav, page header
    states/      reusable empty / loading / error states
    ui/          button, card, badge, input, select, alert, skeleton, separator
    data-field.tsx, doi-link.tsx, external-link.tsx, pagination-bar.tsx,
    show-more-list.tsx
  lib/           API client, fetch hooks, URL state, formatters, dataset status
  pages/         one component per route
  types/         dataset and API response types
```
