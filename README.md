# 🔥 Flame in Freefall

### NASA Combustion Research Intelligence Platform

**Flame in Freefall** is a research intelligence platform designed to explore, organize, analyze, and make NASA combustion-related research more accessible.

The project uses investigations from NASA's Physical Sciences Informatics (PSI) database to help researchers explore research related to flame behavior, combustion science, flammability, fire safety, flame spread, and related physical science topics.

Our goal is to transform a collected research dataset into an accessible platform where users can discover investigations, examine research findings and publications, explore research trends, and interact with the dataset through an AI-powered research assistant.

---

## 🎯 Project Vision

To make NASA's combustion and fire-related research easier to discover, understand, analyze, and use as a foundation for further scientific investigation.

## 🚀 Planned Features

- **Research Dashboard:** An overview of the collected NASA investigations and key dataset statistics.
- **Investigation Explorer:** Search, browse, filter, and examine individual investigations.
- **Research Relevance Classification:** Organize investigations into Direct, Supporting, and Peripheral categories.
- **Investigation Details:** View research objectives, approaches, publications, DOIs, and available documents.
- **Research Analytics:** Explore research areas, project types, trends, and potential research gaps.
- **AI Research Assistant:** Ask natural-language questions about the dataset and receive evidence-grounded answers.
- **Research Library:** Explore related NASA publications and available research documents.
- **Export Center:** Export investigation records and research data in JSON and CSV formats.

*Dashboard, investigation explorer, record pages, and the research library are
live against the read-only API. Analytics, the AI assistant, and exports remain
planned and are tracked in the project roadmap.*

## 📊 Research Dataset

The project currently has a cleaned dataset containing **133 NASA PSI investigations**.

| Research area | Investigations |
|---|---:|
| Materials Science | 35 |
| Complex Fluids - Soft Matter | 34 |
| Fluid Physics | 27 |
| Combustion Science | 24 |
| Biophysics | 7 |
| Fundamental Physics | 6 |
| **Total** | **133** |

Extraction status:

- 129 successfully extracted.
- 4 incompletely extracted (`PSI-34`, `PSI-165`, `PSI-168`, `PSI-184`).

Relevance labels (a transparent, rule-based prioritisation aid):

| Relevance | Investigations |
|---|---:|
| Direct | 10 |
| Supporting | 14 |
| Peripheral | 109 |
| **Total** | **133** |

All 10 direct investigations are Spacecraft Fire Safety (SAFFIRE), BASS, FLEX, flame-spread modelling, or smoke/aerosol measurement experiments. The other 14 Combustion Science investigations are supporting; every record outside Combustion Science is peripheral.

The dataset is stored in `nasa-fire-data/`.

**Dataset source of truth:** `nasa-fire-data/psi_output/merged_master_dataset.json`

A CSV copy is generated from the JSON at `nasa-fire-data/psi_output/merged_master_dataset.csv`. The two are kept in sync by the scripts below and checked by `validate_dataset.py`.

Current data quality:

- 131 of 133 records have a verified NASA PSI investigation DOI.
- 22 records are enriched from ISA-Tab metadata archives (full objectives, approach, publications, contacts, funding).
- 1,786 publication entries, de-duplicated, with 273 carrying their own DOI.
- 10 direct, 14 supporting, and 109 peripheral relevance labels, each with a recorded score and an auditable reason.


## 🛠️ Planned Technology Stack

| Component | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide |
| Backend | Node.js + Express.js |
| Database | SQLite + Prisma (initially) |
| Validation | Zod |
| Local AI | Ollama |
| Initial AI Model | `gemma4:e2b` |

The architecture will be designed to support additional OpenAI-compatible AI providers in the future.

## 🤖 AI Integration



The platform provides a flexible AI provider abstraction with **Google Gemini** as the default cloud provider and **Ollama** as an automatic local fallback.



### Why Gemini is the Default Provider

- **High-Capacity Cloud Reasoning:** Access to large-context models (such as `gemini-2.5-flash`) for complex multi-investigation synthesis.

- **Accessibility:** Enables researchers on any machine to use AI features via a standard API key, without requiring local GPU acceleration.

- **Automatic Fallback:** When `GEMINI_API_KEY` is not configured, or if Gemini is unavailable at runtime, the system automatically falls back to Ollama -- no manual reconfiguration needed.



### Why Ollama is the Fallback Provider

- **Local & Private:** Runs entirely on the local machine without transmitting scientific queries to external servers.

- **Zero Cost & Offline:** Does not require paid API subscriptions, credits, or constant internet access.

- **Consistent Local Runtime:** Gemma 4 E2B (`gemma4:e2b`) provides predictable responses suitable for structured scientific exploration.

- **Standalone Mode:** Set `AI_PROVIDER=ollama` to use Ollama exclusively without any cloud fallback.



### Provider Configuration & Status

Configure the provider in environment variables:

```env

AI_PROVIDER=gemini # default; falls back to ollama automatically

GEMINI_API_KEY=your-gemini-api-key

GEMINI_MODEL=gemini-2.5-flash

OLLAMA_BASE_URL=http://localhost:11434

OLLAMA_MODEL=gemma4:e2b

```



Check current provider configuration and availability safely via:

```http

GET /api/ai/status

```



Responses distinguish configured status and service availability without making unnecessary paid calls or leaking API keys.

The AI research assistant will retrieve relevant investigation records from the project dataset before generating answers.

Responses should be grounded in retrieved records and reference investigation IDs and NASA source URLs.

The AI must not invent scientific findings, publications, DOIs, or research statistics.

## 📁 Project Structure

The current project structure is:

```text
FLAME-IN-FREEFALL/
│
├── nasa-fire-data/
│   ├── psi_output/
│   │   ├── merged_master_dataset.json   # source of truth
│   │   ├── merged_master_dataset.csv    # generated copy
│   │   └── PSI-*.txt                    # raw scraped pages
│   ├── scrape_psi.py                    # Playwright scraper
│   ├── merge_isa.py                     # ISA-Tab archive enrichment
│   ├── normalize_dataset.py             # scraped-field repair
│   ├── classify_relevance.py            # transparent relevance labels
│   └── validate_dataset.py              # integrity checks
│
├── frontend/                            # React + Vite interface (Phase 3)
│   ├── src/
│   │   ├── lib/api.ts                   # typed API client
│   │   └── types/api.ts
│   ├── public/
│   └── package.json
│
├── backend/                             # Express + Prisma API (Phase 2)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── ingest/                      # validation + repeatable ingestion
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   ├── tests/
│   └── package.json
│
├── docs/
│   └── PROJECT_CONTEXT_AND_ROADMAP.md
│
├── .env.example
├── .gitignore
└── README.md
```

The final structure may be refined after the initial architecture review.

## 📖 Project Documentation

For the complete project background, dataset description, architecture direction, development phases, scientific constraints, and contributor guidance, see:

**[PROJECT CONTEXT AND DEVELOPMENT ROADMAP](docs/PROJECT_CONTEXT_AND_ROADMAP.md)**

This document is the main reference for understanding and continuing the project.

## 💻 Development Setup

The application is still under development. The data tooling can be run today:

```powershell
# Once, from the repository root
python -m venv nasa-fire-data/venv
.\nasa-fire-data\venv\Scripts\pip install -r nasa-fire-data/requirements.txt
.\nasa-fire-data\venv\Scripts\playwright install chromium

# Enrich records from ISA-Tab archives (preview, then apply)
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\merge_isa.py --zip "<archive.zip>"
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\merge_isa.py --zip "<archive.zip>" --write

# Repair scraped fields, label relevance, then verify the dataset
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\normalize_dataset.py --write
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\classify_relevance.py --review
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\classify_relevance.py --write
.\nasa-fire-data\venv\Scripts\python nasa-fire-data\validate_dataset.py
```

`validate_dataset.py` exits non-zero on any integrity failure, so it can gate a build or a commit.

The full application will additionally require:

- Node.js and npm.
- Git.
- An appropriate code editor.
- Ollama.
- The `gemma4:e2b` model.

### Frontend (Phase 3 live interface)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5174
npm run build    # type-check + production build
npm run lint     # oxlint
npm test         # Vitest
```

Start the backend first: the overview, explorer, record pages, library, and
settings panel read the live API. Missing values are labelled unavailable rather
than filled with placeholder statistics, and every list view keeps its search,
filter, sort, and page state in the URL. See `frontend/README.md` for the route
map, data layer, and integrity rules.

### Backend (Phase 2 read-only API)

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run db:migrate    # create prisma/dev.db + generated Prisma client
npm run db:ingest     # validate the JSON, then rebuild the database
npm run dev           # http://localhost:3001
npm test              # migrate + ingest if needed + Vitest
```

The API is read-only and exposes:

```text
GET /api/health
GET /api/investigations
GET /api/investigations/:id
GET /api/statistics
GET /api/filters
GET /api/publications
GET /api/documents
```

Search is `GET /api/investigations?q=...`; there is no separate search route.
The backend records the dataset SHA-256 at ingestion time, keeps each original
record in `raw_json`, and never writes to the source JSON. See
`backend/README.md` for query parameters, integrity rules, and the PostgreSQL
migration path.

## 👥 Collaboration

Flame in Freefall is being developed collaboratively.

Contributors should:

1. Read the project context and development roadmap before making changes.
2. Understand the existing architecture before modifying files.
3. Preserve the original NASA research dataset.
4. Avoid duplicating existing functionality.
5. Test changes before considering a development phase complete.
6. Document significant architectural or technical decisions.

Google Antigravity and OpenCode may both be used during development. To avoid conflicting changes, only one agent should implement changes to a particular set of files at a time. The other can independently review the implementation.

## 🔬 Scientific Integrity

Scientific accuracy is a core requirement.

- Use the NASA investigation records as the source of truth.
- Distinguish verified data from interpretations.
- Do not treat missing information as evidence that something does not exist.
- Do not confuse investigation DOIs with publication DOIs.
- Clearly identify potential research gaps as areas for further investigation, not established scientific conclusions.
- Cite the investigation IDs and source URLs supporting research answers.

## 📌 Development Status

**Phase 0 — data integrity and repository hygiene: complete.** The dataset is
cleaned, enriched, relevance-labelled, and gated by `validate_dataset.py`.

**Phase 1 — frontend foundation: complete.** The seven-page interface shell is
routed, responsive, and reusable, with shared layout, state, and UI components.

**Phase 2 — backend API: complete.** The validated dataset is ingested into
SQLite through Prisma, exposed by a read-only Express API with search, filters,
pagination, sorting, verified aggregates, and typed responses.

**Phase 3 — dashboard and investigation explorer: complete.** The overview,
explorer, record pages, and library read the live API. URL-backed search,
filters, sorting, pagination, publication grouping, document listings, dataset
provenance, and offline/error states are implemented and tested.

**Phase 4 — research analytics: complete.** Interactive distribution visualizations, data availability metrics, recurring combustion research themes, and empirical research gaps are live on `/analytics` with comprehensive test coverage.

**Phase 5 — AI research assistant: complete.** Dual-provider (Gemini cloud + Ollama local fallback) RAG assistant with grounded citations and strict anti-hallucination guardrails.

**Phase 6 — research library and export center: complete.** Full dataset, filtered query, single investigation, and statistics exports in JSON and CSV across /export-center, /investigations, and record detail pages.

**Phase 7 — quality assurance and hardening: complete.** 118 automated tests passing, zero-warning linter, live settings inspection, dataset verification, security review, and comprehensive deployment documentation (docs/DEPLOYMENT_AND_CONFIGURATION.md).

**Next: Phase 8 — deployment and release**, production environment configuration, containerization, and public availability.


## 📄 License

A project license will be selected and added before public release. The licensing and redistribution conditions of NASA source material and any third-party materials must also be reviewed separately.

---

**Flame in Freefall**  
*Making NASA combustion research more accessible through data, analytics, and AI.*