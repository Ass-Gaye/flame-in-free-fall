# Flame in Freefall — Backend API

Read-only TypeScript/Express API over the cleaned NASA PSI dataset.

The JSON dataset remains the single source of truth:

```text
nasa-fire-data/psi_output/merged_master_dataset.json
```

SQLite is a generated, disposable projection of that file. Ingestion never
writes to the dataset, and `backend/prisma/dev.db` can be deleted and rebuilt at
any time.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 22+ (developed on 24) |
| HTTP | Express 5 |
| Language | TypeScript 7 |
| Validation | Zod 4 |
| ORM | Prisma 7 |
| Database | SQLite via `@prisma/adapter-better-sqlite3` |
| Tests | Vitest 5 + Supertest |

## Quick start

From the repository root:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run db:migrate    # create prisma/dev.db and the generated client
npm run db:ingest     # validate the JSON, then rebuild the database
npm run dev           # http://localhost:3001
```

`npm install` runs `prisma generate`. The generated client is written to
`src/generated/prisma/` and is gitignored.

If npm, a security policy, or a restricted network skips dependency install
scripts, the native `better-sqlite3` binding may be missing. The symptom is a
"Could not locate the bindings file" error at startup or test time. Fix it with:

```powershell
npm rebuild better-sqlite3
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch-mode API server |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check source and tests |
| `npm run lint` | oxlint |
| `npm test` | Migrate, ingest if needed, then run Vitest |
| `npm run db:migrate` | Apply migrations and regenerate the client |
| `npm run db:deploy` | Apply existing migrations only |
| `npm run db:ingest` | Validate and ingest the dataset |
| `npm run db:reset` | Drop, migrate, regenerate, and re-ingest |

Useful ingestion flags (through `tsx src/ingest/run.ts`):

- `--dry-run` validates and reports counts without touching the database.
- `--force` rebuilds even when the dataset SHA-256 is unchanged.

## Endpoints

All endpoints are `GET`. There are no mutation routes.

| Endpoint | Description |
|---|---|
| `/api` | Endpoint index and read-only notice |
| `/api/health` | Database status plus dataset SHA-256 and ingestion time |
| `/api/investigations` | Paginated list with search, filters, and sorting |
| `/api/investigations/:id` | Full record, publications, documents, ISA metadata |
| `/api/statistics` | Verified totals, breakdowns, and coverage counts |
| `/api/filters` | Filter values with counts |
| `/api/publications` | Grouped publications, or raw entries via `view=entries` |
| `/api/documents` | Flattened document index with investigation context |

### `GET /api/investigations`

| Query | Values |
|---|---|
| `q` | ID, title, keywords, objectives, or approach |
| `relevance` | `direct,supporting,peripheral` (comma-separated) |
| `area` | Research area names (comma-separated) |
| `project_type` | Project types (comma-separated) |
| `status` | `success,incomplete,failed` |
| `sort` | `relevance` (default), `title`, `area`, `project_type`, `extraction`, `publications` |
| `page` | 1-based page number |
| `page_size` | 1–100, default 25 |

Search ranking favors an exact ID, then an ID prefix, title, keywords, and
finally objectives/approach. There is no separate `/search` endpoint; `?q=` is
the single search path.

### `GET /api/publications`

- Default `view=grouped`: one record per DOI, or per normalized label when no
  DOI exists. Each group carries a representative `url` and `pubmed_id` taken
  from the first entry in the group that has one, so the library can link
  DOI-less groups to their recorded source.
- `view=entries`: the original 1,786 publication entries.
- `has_doi=true|false` filters entries.
- `investigation=PSI-123` scopes either view to one record.

The current dataset produces 1,491 grouped records: 228 DOI groups and 1,263
label-only groups. The 1,786 entries sum exactly across those groups. 1,434
groups expose a URL (including 1,206 label-only groups) and 6 carry a PubMed ID.

## Data integrity

- The dataset SHA-256 is recorded in `IngestionRun` and exposed by `/api/health`
  and `/api/statistics`.
- Ingestion is a full rebuild inside one transaction, so stale records are
  impossible after a refresh.
- Every investigation keeps its complete original JSON in `raw_json`.
- Empty strings from the source are returned as `null` by the API where a value
  is genuinely unavailable; missing data is never converted to zero or "none".
- Investigation DOIs are stored as resolved `https://doi.org/...` URLs in the
  dataset. Publication DOIs are bare identifiers. They stay separate and are
  only normalized for duplicate detection.
- Four records have incomplete extraction (`PSI-34`, `PSI-165`, `PSI-168`,
  `PSI-184`) and are surfaced as such rather than silently repaired.

## Tests

```powershell
npm test
```

The suite covers dataset validation, ingestion provenance, source-file
immutability, endpoint contracts, search ranking, filters, pagination, error
handling, publication grouping totals, grouped link fields, and document
filtering.

## Moving to PostgreSQL later

The schema avoids raw SQL, SQLite-only types, and database-specific features.
To migrate:

1. Change `datasource.provider` in `prisma/schema.prisma` to `postgresql`.
2. Point `DATABASE_URL` at the PostgreSQL instance.
3. Replace the better-sqlite3 adapter with the PostgreSQL driver adapter.
4. Regenerate migrations and run the ingestion script.

No service or route code should need to change.
