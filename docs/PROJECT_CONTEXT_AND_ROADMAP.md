# Flame in Freefall — Project Context and Development Roadmap

**Document purpose:** Main technical and research reference for the Flame in Freefall project.

**Project status:** Initialization and architecture planning.

**Initial AI model:** `gemma4:e2b` through Ollama.

---

# 1. Project Background

Flame in Freefall is a NASA combustion research intelligence platform built around investigations collected from NASA's Physical Sciences Informatics (PSI) database.

The project began with the collection, extraction, cleaning, and classification of NASA investigation records.

The collected data includes research objectives, experimental approaches, research areas, publications, DOIs, available documents, and source URLs.

The long-term goal is to turn this dataset into a structured research platform that allows researchers to discover relevant investigations, analyze research trends, explore publications, and ask questions using an AI research assistant.

The platform should not simply display a collection of records. It should help users understand the research landscape and identify areas that may deserve further scientific investigation.

# 2. Problem Statement

Scientific research information can be difficult to discover and navigate, especially when information is distributed across large research databases, individual investigation pages, publications, and supporting documents.

Researchers interested in combustion and fire-related science may need to manually examine many investigation records to identify relevant research.

Flame in Freefall aims to address this challenge by providing:

- A centralized research exploration interface.
- Structured investigation records.
- Relevance-based research discovery.
- Research analytics and visualization.
- Publication and document exploration.
- An AI assistant for natural-language research queries.
- Exportable research data.

# 3. Project Objectives

The platform should:

1. Make NASA combustion-related investigations easier to discover.
2. Help researchers identify investigations relevant to flame behavior and fire safety.
3. Organize research information into a consistent structure.
4. Provide meaningful visualizations of the collected dataset.
5. Help identify potential research gaps using available evidence.
6. Allow natural-language questions about the research dataset.
7. Provide traceable answers with investigation references.
8. Make research information exportable and reusable.

# 4. Research Dataset

## 4.1 Dataset location

The research dataset is stored in:

`nasa-fire-data/psi_output/merged_master_dataset.json`

A CSV copy, generated from the JSON, is stored at
`nasa-fire-data/psi_output/merged_master_dataset.csv`. The JSON is the source of
truth; the CSV must never be edited by hand.

The raw NASA source files (scraped pages, archives) must be treated as
read-only. The application may read, validate, import, index, and analyze the
dataset, but must never modify the original files. Dataset changes are made
only by the reproducible scripts described in this document.

## 4.2 Dataset overview

The cleaned dataset currently contains 133 unique NASA PSI investigations.

| Relevance category | Count |
|---|---:|
| Direct | 10 |
| Supporting | 14 |
| Peripheral | 109 |
| **Total** | **133** |

All 24 Combustion Science investigations receive a non-peripheral label: 10 are
direct and 14 are supporting. Every investigation outside Combustion Science is
peripheral.

Extraction status:

| Status | Count |
|---|---:|
| Successful | 129 |
| Incomplete | 4 |
| **Total** | **133** |

These figures describe the current cleaned dataset and should be verified against the actual JSON file during ingestion.

## 4.3 Dataset fields

Each investigation record contains the following fields:

| Field | Description |
|---|---|
| `investigation_id` | NASA PSI investigation identifier |
| `title` | Investigation title |
| `url` | NASA source URL |
| `research_area` | Research area |
| `project_type` | Type of project |
| `objectives` | Research objectives |
| `approach` | Research approach or methodology |
| `investigation_doi` | Investigation DOI when identified |
| `scraper_doi_unverified` | DOI value retained from the original scraper, not necessarily an investigation DOI |
| `publications` | Associated publication records (`label`, `url`, `doi`, `authors`, `status`, optional `pubmed_id`) |
| `files_and_documents` | Extracted documents and file references |
| `isa_metadata` | Archive-derived metadata when an ISA-Tab archive was merged (acronym, proposal title, hardware, flight platform, managing center, funding, dates, design terms, contacts) |
| `source_archive` | Provenance of the merged ISA archive: filename, format, internal study identifier, SHA-256, and whether the filename matches the content |
| `relevance_category` | Direct, Supporting, or Peripheral |
| `relevance_score` | Heuristic prioritization score |
| `relevance_reason` | Explanation for the relevance classification |
| `extraction_status` | Successful or incomplete extraction status |
| `extraction_error` | Extraction error details, if any |

## 4.4 Understanding relevance categories

**Direct**

Investigations whose extracted information explicitly addresses fire behavior, flammability, flame spread, extinction, suppression, ignition, smoke, or closely related fire-safety topics.

**Supporting**

Investigations where combustion or flame science is relevant, but the direct fire-safety application is less explicit.

**Peripheral**

Investigations for which the available extracted information does not establish a clear fire-safety connection.

These classifications are intended to prioritize research exploration. They must not be presented as definitive scientific judgments.

### How the labels are produced

The labels are generated by `nasa-fire-data/classify_relevance.py`, not by hand. The classifier is deliberately simple and auditable:

- It reads only curated fields: `title`, `research_area`, `objectives`, `approach`, `hypothesis`, `impacts`, and `keywords`.
- It never reads `detail_text`, because that field contains navigation, citations, and publication lists that would produce false matches.
- It uses two weighted phrase lists: explicit fire-safety terms (fire safety, spacecraft fire, fire growth, flame spread, flammability, suppression, extinguishment, ignition, smoke detection, ...) and general combustion terms (combustion, flame, soot, smoke, pyrolysis, cool flame, extinction, ...).
- `direct` requires title-level explicit fire-safety evidence (fire safety, spacecraft fire, flame spread, burning and suppression, extinguishment, ...) or a title naming a smoke/aerosol measurement experiment. A generic `flame` mention is not enough.
- `supporting` means the investigation is in Combustion Science but its title does not name fire-safety work explicitly.
- `peripheral` means no clear combustion or fire-safety vocabulary in the curated fields.

Each record stores `relevance_category`, a 0-1 `relevance_score`, and a `relevance_reason` naming the rule that fired and the phrases that were found, including the field in which they appeared. The score is a prioritisation heuristic only.

The script is idempotent and reports every decision in a dry run:

```powershell
python nasa-fire-data/classify_relevance.py --review
python nasa-fire-data/classify_relevance.py --write
```

The 24 combustion records were reviewed manually against their titles before the labels were written. PSI-62 (flame-spread modelling), PSI-68/69 (FLEX), PSI-25/26 (BASS), PSI-98/99/100 (SAFFIRE), PSI-101/102 (SAME smoke/aerosol measurement) are direct. The remaining 14 combustion investigations, including ACME and SPICE analyses, are supporting.

## 4.5 ISA archive enrichment

Some investigations have a matching ISA-Tab metadata archive from NASA PSI. These are merged with `nasa-fire-data/merge_isa.py`, which must be preferred over manual edits because it is deterministic, verifiable, and idempotent.

Rules enforced by the merge script:

- Archives are matched to records by the internal `Study Identifier`, never by the archive filename. Downloaded filenames in this project do not reliably match their contents.
- The investigation DOI is taken from `Comment[DOI]`. A DOI scraped from a page link is kept only in `scraper_doi_unverified`, because it is usually a publication DOI.
- `objectives` and `approach` are replaced with the full archive text. The scraper only stores a truncated search-listing snippet.
- `publications` are rebuilt from the archive's study publications, de-duplicated, and enriched with DOI, authors, and status.
- Archive metadata that the scraper does not capture is stored in `isa_metadata`; archive provenance is stored in `source_archive`.

Run with `--write` to apply; without it the script reports the planned changes. Merging the same archive twice produces an identical dataset.

## 4.6 Important data limitations

- An empty `files_and_documents` array does not prove that NASA has no downloadable files.
- An empty investigation DOI field does not prove that no DOI exists.
- The scraper DOI may refer to a publication rather than an investigation.
- An incomplete extraction does not mean an investigation is scientifically irrelevant.
- The relevance score is not a measure of scientific quality.
- The dataset is a collected subset of NASA PSI investigations, not proof of every existing NASA combustion study.

# 5. Core Application Modules

The following modules define the intended product.

## Module 1 — Research Dashboard

The dashboard should provide an overview of the research collection.

Planned components:

- Total investigations.
- Direct, Supporting, and Peripheral counts.
- Extraction completeness.
- Research area distribution.
- Project type distribution.
- Recently explored investigations, if activity tracking is implemented.
- Research discovery shortcuts.

All statistics must be calculated from the actual dataset or database.

## Module 2 — Investigation Explorer

This module allows users to browse and discover investigations.

Planned capabilities:

- Search by investigation title and ID.
- Filter by relevance category.
- Filter by research area.
- Filter by project type.
- Filter by extraction status.
- Sort investigation records.
- Paginate large result sets.
- Open individual investigation details.

Search and filtering should be performed through the backend API rather than loading the entire dataset into every frontend component.

## Module 3 — Investigation Details

Each investigation should have a dedicated details page.

It should display:

- Investigation ID.
- Investigation title.
- NASA source link.
- Research area.
- Project type.
- Objectives.
- Research approach.
- Relevance classification.
- Relevance explanation.
- Investigation DOI, where available.
- Associated publications.
- Available documents.
- Extraction status.

Missing fields should be clearly represented as unavailable rather than replaced with invented values.

## Module 4 — Research Analytics

This module explores the research collection through visualizations.

Planned analytics:

- Relevance distribution.
- Research area distribution.
- Project type distribution.
- Extraction completeness.
- Publication availability.
- Document availability.
- Research themes.
- Potential research gaps.

Potential research gaps must be presented as evidence-based observations, not confirmed scientific discoveries.

Every analytical conclusion should explain:

1. What the dataset shows.
2. Which investigations support the observation.
3. What limitations affect the interpretation.
4. What further investigation may be needed.

## Module 5 — Research Library

A centralized place to explore:

- Associated publications.
- Publication titles and metadata.
- Publication DOIs.
- Available NASA documents.
- Investigation source links.
- Related investigations.

Publication DOI and investigation DOI must remain separate fields.

## Module 6 — AI Research Assistant

The AI assistant will allow researchers to ask natural-language questions about the collected NASA research.

Example questions:

- Which investigations are directly related to flame spread?
- What investigations discuss flame extinction?
- Which investigations are relevant to fire safety?
- What research areas appear most frequently in the dataset?
- Which investigations have available publications?
- What potential research gaps can be identified from this collection?
- Compare two investigations based on their objectives and approaches.

### Initial AI model

The initial model is:

`gemma4:e2b`

It will run locally through Ollama.

The integration should be configurable through environment variables.

Suggested configuration:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
```

Never hardcode secrets or environment-specific configuration into source files.

### AI architecture

The AI assistant should follow a retrieval-grounded workflow:

1. Receive the user's question.
2. Identify the information needed.
3. Retrieve relevant investigation records from the dataset or database.
4. Rank and select relevant records.
5. Construct a context containing actual investigation information.
6. Send the context and question to the local model.
7. Generate a grounded response.
8. Include supporting investigation IDs and NASA source URLs.
9. Clearly state when the available dataset does not contain enough information.

The model must not be treated as the source of scientific truth. The retrieved NASA records are the source of truth.

The architecture should allow another OpenAI-compatible model provider to be added later without rebuilding the entire assistant.

## Module 7 — Export Center

Users should be able to export:

- All investigations.
- Filtered investigation results.
- Individual investigation records.
- Research statistics.
- JSON datasets.
- CSV datasets.

Exports must preserve the original field meanings and missing values.

# 6. Technology Architecture

The implemented and planned stack is:

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Component system | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide |
| Backend | Node.js + Express 5 |
| Database | SQLite (PostgreSQL-ready schema) |
| ORM | Prisma 7 |
| Validation | Zod 4 |
| AI runtime | Ollama |
| Initial model | Gemma 4 E2B |
| Data source | Cleaned NASA PSI JSON dataset |

The backend, validation, and ingestion architecture are implemented. Later
phases extend the frontend, analytics, exports, and AI layers without changing
the dataset contract.

## 6.1 High-level request flow

```text
                 USER
                   |
                   v
            REACT FRONTEND
                   |
                   v
             EXPRESS API
                   |
          +--------+--------+
          |                 |
          v                 v
      PRISMA ORM       AI SERVICE
          |                 |
          v                 v
       SQLITE             OLLAMA
          |             gemma4:e2b
          |
          v
    RESEARCH RECORDS
          |
          v
     JSON DATASET
    (Original source)
```

The ingestion path validates the JSON dataset and performs a full rebuild inside
a single database transaction. Requests only read from SQLite; the source JSON
is never written to.

# 7. Proposed Development Roadmap

Development should proceed in controlled phases.

Each phase must be implemented, tested, and reviewed before moving to the next.

## Phase 0 — Project Initialization and Architecture

**Status:** Complete.

**Objective:** Establish the project structure and agree on the technical architecture.

Tasks:

- Inspect the project directory.
- Inspect the `nasa-fire-data/` data folder.
- Validate the JSON dataset.
- Confirm record counts and unique IDs.
- Review the dataset schema.
- Define frontend and backend architecture.
- Define database strategy.
- Define AI integration architecture.
- Establish development conventions.

Deliverables:

- Architecture report.
- Approved project structure.
- Technical implementation plan.
- Initial development documentation.

Acceptance criteria:

- Original dataset remains unchanged.
- Dataset integrity is verified.
- Architecture decisions are documented.
- Implementation plan is approved.

## Phase 1 — Frontend Foundation and User Interface

**Status:** Complete. The interface shell is implemented at `frontend/` with all seven pages routed and responsive. It is intentionally not yet connected to the dataset.

**Objective:** Build the main application structure and user experience.

Tasks:

- Initialize the React and Vite frontend.
- Configure Tailwind CSS.
- Integrate shadcn/ui.
- Establish typography, colors, spacing, and design tokens.
- Create the application layout.
- Build navigation and sidebar.
- Create responsive page layouts.
- Build initial dashboard components.
- Establish reusable UI components.

Planned pages:

- Overview.
- Investigations.
- Research Analytics.
- Research Library.
- AI Research Assistant.
- Export Center.
- Settings.

Acceptance criteria:

- Application runs locally.
- Navigation works.
- Layout is responsive.
- Components are reusable.
- No fabricated research statistics are displayed.

## Phase 2 — Dataset Integration and Backend

**Status:** Complete. Implemented at `backend/`.

**Objective:** Make the NASA dataset available through a structured backend.

Tasks:

- Initialize the Express backend. ✅
- Configure Prisma and SQLite. ✅
- Design the investigation database model. ✅
- Implement dataset validation. ✅
- Implement repeatable dataset ingestion. ✅
- Preserve original records and source fields. ✅
- Implement backend APIs. ✅
- Add pagination, search, filtering, and sorting. ✅
- Add a typed frontend API client (page wiring belongs to Phase 3). ✅

Implementation notes:

- Prisma 7 uses the `@prisma/adapter-better-sqlite3` driver adapter. The schema
  avoids raw SQL and SQLite-only features so PostgreSQL remains a low-cost
  migration.
- Ingestion validates the JSON with Zod, compares its SHA-256 against the last
  run, and performs a full rebuild in one transaction. The source file is only
  ever read.
- Every investigation keeps its complete original record in `raw_json`.
- Investigation DOIs are stored as `https://doi.org/...` URLs in the dataset;
  publication DOIs are bare identifiers. They remain separate and are only
  normalized for duplicate detection.
- The typed client lives at `frontend/src/lib/api.ts` with response types in
  `frontend/src/types/api.ts`.

API endpoints (all read-only `GET`):

```text
GET /api/health
GET /api/investigations          # ?q= is the single search path
GET /api/investigations/:id
GET /api/statistics
GET /api/filters
GET /api/publications            # grouped by default; ?view=entries
GET /api/documents
```

Verified against the canonical dataset:

- 133 investigations, 1,786 publication entries, 30 documents across 28
  records, 22 source archives, and 6 research areas.
- 1,491 grouped publication records: 228 DOI groups plus 1,263 label-only
  groups. All 1,786 entries sum across those groups.
- 273 entries carry a DOI; 228 distinct DOIs; 1,484 distinct normalized labels.
- 131 records have an investigation DOI, 122 have publications, and 28 have
  documents. Extraction is complete for 129 records and incomplete for 4.
- Relevance: 10 direct, 14 supporting, 109 peripheral.
- 42 automated tests cover validation, provenance, source-file immutability,
  endpoint contracts, ranking, filters, pagination, errors, grouping, grouped
  link fields, and documents. Type-check, build, and lint pass.

Acceptance criteria:

- All 133 records are accounted for. ✅
- Unique investigation IDs are preserved. ✅
- No duplicate records are introduced. ✅
- Search and filters work correctly. ✅
- The original JSON file is not modified. ✅
- API responses are validated and tested. ✅

## Phase 3 — Research Dashboard and Investigation Explorer

**Status:** Complete. Implemented in `frontend/` against the Phase 2 API.

**Objective:** Make the research data accessible and useful through the frontend.

Tasks:

- Connect dashboard statistics to real API responses. ✅
- Build the investigation listing. ✅
- Implement search and filters. ✅
- Implement pagination and sorting. ✅
- Build investigation details pages. ✅
- Display publications and documents. ✅
- Handle missing data and incomplete extraction clearly. ✅

Implementation notes:

- Dashboard, explorer, record pages, library, settings, sidebar, top bar, and
  footer all read the live API through `frontend/src/lib/api-hooks.ts`.
- The URL query string is the source of truth for search, filters, sorting,
  pagination, and library view, so any view can be shared or restored.
- Search is debounced and writes to the URL with `replace`; filter, sort, and
  page changes push history entries.
- Filter dropdowns are single-select native controls that show live counts from
  `/api/filters`. Multi-select is deferred.
- Relevance bars and research-area bars use the returned counts. Shares are
  labelled with one decimal (7.5%, 10.5%, 82.0%) so rows do not round to 101%.
- Publication links prefer the DOI resolver, then the recorded entry URL.
  Grouped records now expose a representative `url` and `pubmed_id`: 1,434 of
  1,491 groups link somewhere, including 1,206 label-only groups.
- ISA-Tab dates are rendered exactly as recorded because the source mixes
  `MM-DD-YYYY` and `DD-Mon-YYYY`. They are never reformatted speculatively.
- All 22 ISA archives report `filename_matches_content: false`; the record page
  explains this as expected multi-study ZIP bundling rather than an error.
- Unverified scraper DOIs, investigation DOIs, and publication DOIs remain
  separate fields with separate labels.
- Analytics charts, exports, and the AI assistant still describe later phases
  rather than showing placeholder data.
- Vitest + React Testing Library cover formatters, URL state, and the record
  page: 19 tests. Frontend type-check and production build pass; lint reports
  only the four accepted `react/only-export-components` structure warnings.
- Browser smoke tests cover 29 live checks, 6 offline/error checks, and a
  375 px mobile pass with zero horizontal overflow.

Acceptance criteria:

- Users can discover investigations. ✅
- Search and filtering work correctly. ✅
- Individual investigation details are accessible. ✅
- All displayed values originate from the dataset or verified API responses. ✅

## Phase 4 — Research Analytics and Intelligence

**Status:** Complete. Implemented on `/analytics` with interactive SVG & Tailwind distribution charts, provenance coverage breakdowns, recurring combustion themes, empirical gap analysis, and 28 automated tests.

**Objective:** Help users understand patterns across the collected research.

Tasks:

- Implement relevance distribution. ✅
- Implement research area analysis. ✅
- Implement project type analysis. ✅
- Analyze extraction completeness. ✅
- Explore publication and document availability. ✅
- Identify recurring research themes. ✅
- Build potential research gap analysis. ✅
- Visualize findings using accessible data charts. ✅

Acceptance criteria:

- Charts use actual dataset values.
- Statistics can be traced to their source records.
- Research gap observations include supporting evidence.
- Limitations are visible.
- No unsupported scientific conclusions are presented.

## Phase 5 — AI Research Assistant

**Status:** Complete. Grounded RAG retrieval, prompt engine, provider layer, query endpoint, citations, and interactive Assistant UI implemented.

**Objective:** Enable natural-language exploration of the dataset.

Tasks:

- AI provider abstraction & factory (`Ollama` default, `Gemini` optional cloud). ✅
- Safe status endpoint `GET /api/ai/status`. ✅
- Provider configuration & validation via environment variables (`AI_PROVIDER`). ✅
- Automated tests verifying provider adapters, factory, and secret protection. ✅
- Grounded dataset retrieval engine over 133 PSI investigations (`backend/src/ai/retrieval.ts`). ✅
- Grounded system prompt with strict anti-hallucination rules (`backend/src/ai/prompts.ts`). ✅
- Model synthesis integration for Ollama (`gemma4:e2b`) and Gemini (`@google/genai`). ✅
- Research query endpoint `POST /api/ai/query` with investigation citations. ✅
- Unsupported questions refusal when evidence is absent in dataset. ✅
- Interactive AI Research Assistant frontend page with real-time status and citation cards. ✅
- Comprehensive automated test suite (69 backend tests, 21 frontend tests). ✅

Example test questions:

1. Which investigations are directly related to fire safety?
2. Which records discuss flame spread?
3. What investigations address flame extinction?
4. Which investigations have available publications?
5. What research areas appear most frequently?
6. Compare two investigations.
7. What potential research gaps are suggested by the dataset?
8. Which investigations have incomplete extraction?
9. Are there investigations with no extracted documents?
10. What does the dataset reveal about combustion research?

Acceptance criteria:

- AI answers use retrieved records.
- Investigation IDs and NASA source URLs are included.
- The model does not invent publications or DOIs.
- Unsupported answers acknowledge insufficient evidence.
- AI responses distinguish dataset facts from interpretation.
- The assistant remains configurable for future model providers.

## Phase 6 — Research Library and Export Center

**Objective:** Improve access to research materials and data portability.

**Status:** Complete. Research library active on /library and verified export engine active on /export-center and /investigations.

Tasks:

- Build publication browsing. ✅ (Phase 3)
- Display publication metadata. ✅ (Phase 3)
- Separate publication and investigation DOIs. ✅ (Phase 3)
- Display available document links. ✅ (Phase 3)
- Implement JSON export (full dataset, single record, statistics, and filtered subsets). ✅
- Implement CSV export with UTF-8 BOM, CRLF row endings, and preserved quotes. ✅
- Support filtered exports via query params and Explorer integration. ✅
- Test exported data integrity with automated test suite. ✅

Implementation notes:

- Full dataset exports (GET /api/export?format=json|csv) stream the pre-validated canonical dataset files directly from disk for 100% byte fidelity.
- Filtered exports (GET /api/export?format=json|csv&relevance=...&q=...) dynamically filter records via Prisma and serialize the original 
aw_json records, preserving all fields and missing values.
- Individual records can be exported directly (GET /api/export?format=json|csv&id=PSI-117).
- Aggregated research statistics can be exported as structured JSON (GET /api/export?type=statistics).
- Investigation Explorer includes one-click JSON/CSV export buttons that reflect active search and filter states.
- Export Center provides full dataset downloads, curated research subsets (Direct Fire Safety, Supporting Combustion, All Combustion Science), statistics exporter, and single record lookup.

Acceptance criteria:

- Exported records preserve their source fields. ✅
- Missing values are handled correctly. ✅
- Exported JSON is valid. ✅
- CSV files open correctly. ✅
- Document and publication links point to the correct sources. ✅ (Phase 3)

## Phase 7 — Quality Assurance and Hardening

**Objective:** Prepare the application for reliable use.

**Status:** Complete. End-to-end testing across 118 automated tests, zero-warning linter, live settings inspection, dataset verification, security review, and full deployment guide completed.

Tasks:

- Review frontend functionality across all pages. ✅
- Review backend APIs and contracts. ✅
- Test database operations and Prisma query performance. ✅
- Test dataset ingestion and SHA-256 idempotency. ✅
- Audit scientific data integrity with alidate_dataset.py. ✅
- Test AI grounding, citation URLs, and provider fallback. ✅
- Review security (API keys isolation, CORS, read-only guarantees). ✅
- Review performance and responsive UI. ✅
- Improve error handling with structured codes and retry mechanisms. ✅
- Improve accessibility and keyboard navigation. ✅
- Add installation and configuration documentation. ✅
- Prepare deployment documentation (docs/DEPLOYMENT_AND_CONFIGURATION.md). ✅

Acceptance criteria:

- Major application workflows work correctly. ✅
- No known critical data-integrity issues remain. ✅
- API and frontend errors are handled appropriately. ✅
- AI responses meet the grounding requirements. ✅
- Installation instructions are tested. ✅
- Outstanding limitations are documented. ✅

## Phase 8 — Deployment and Release

**Objective:** Prepare the platform for public or research-community access.

Tasks:

- Select deployment architecture.
- Configure production environment variables.
- Configure production database.
- Review AI hosting requirements.
- Configure frontend and backend hosting.
- Test production builds.
- Review data licensing and redistribution requirements.
- Prepare release documentation.

Deployment must only proceed after the hosting architecture, costs, security, and data-sharing requirements have been reviewed.

# 8. Development and Collaboration Guidelines

## 8.1 Working with Google Antigravity and OpenCode

Both tools may be used throughout development.

Recommended workflow:

- Use one agent as the primary implementer.
- Use the other agent for independent code review.
- Do not allow both agents to modify the same files simultaneously.
- Review generated changes before accepting them.
- Run the application and tests after each significant change.
- Keep the roadmap updated as phases are completed.

## 8.2 Development principles

Every contributor or coding agent must:

1. Inspect existing code before making changes.
2. Understand the existing architecture.
3. Avoid unnecessary dependencies.
4. Avoid duplicate components, routes, APIs, and database models.
5. Preserve working functionality.
6. Make changes incrementally.
7. Test before declaring a task complete.
8. Document significant decisions.
9. Avoid destructive database operations.
10. Never modify the original NASA dataset.

## 8.3 AI coding agent instructions

Coding agents should treat this document as the primary project-context reference.

Before implementing a new feature, they should:

- Identify the relevant development phase.
- Inspect existing implementation.
- Explain the planned changes.
- Identify files that will be created or modified.
- Preserve existing functionality.
- Implement only the approved scope.
- Report changes and tests performed.

Do not attempt to implement the entire platform in one operation.

# 9. Scientific Integrity and Responsible AI

This project is intended to support scientific research. Accuracy and traceability are essential.

The following rules apply to every application module:

- Never fabricate scientific findings.
- Never invent investigation records.
- Never invent publication metadata.
- Never invent DOIs.
- Never treat a heuristic relevance score as scientific quality.
- Never claim the collected dataset represents all NASA combustion research.
- Never interpret missing data as proof of nonexistence.
- Clearly distinguish extracted facts, interpretations, and hypotheses.
- Cite supporting investigations when presenting research observations.
- Explain limitations whenever the available evidence is incomplete.

AI-generated research gap suggestions must always be described as potential areas for further investigation.

# 10. Project Directory Reference

Expected starting structure:

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
│   ├── validate_dataset.py              # integrity checks
│   └── requirements.txt
│
├── frontend/                            # React + Vite interface
│   ├── src/
│   │   ├── lib/api.ts                   # typed API client
│   │   └── types/api.ts                 # API response types
│   └── package.json
│
├── backend/                             # Express + Prisma API
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

This structure reflects the current repository.

# 11. Important Repository and Data Management Rules

- Keep the dataset separate from application source code.
- Treat the raw NASA source data in `nasa-fire-data/` as read-only.
- Change dataset fields only through the deterministic scripts, then run `validate_dataset.py`.
- Do not commit secrets, API keys, passwords, or private configuration.
- Review the dataset's redistribution and licensing conditions before publishing it.
- If the dataset is not committed to GitHub, document how authorized collaborators can obtain it and where to place it.
- Use environment variables for local configuration.
- Keep application-generated files separate from original research data.
- Do not reset or delete databases without explicit approval.
- Do not overwrite existing working implementations.

# 12. Definition of Project Completion

Flame in Freefall will be considered ready for its initial release when:

- Users can explore the collected NASA investigations.
- Investigation records can be searched and filtered.
- Research details and available publications can be viewed.
- Research statistics and visualizations are available.
- Potential research gaps are presented with supporting evidence and limitations.
- The AI research assistant can answer dataset-related questions with traceable citations.
- Users can export research data.
- The application has passed functional and data-integrity testing.
- Documentation is sufficient for another developer to install, understand, and continue the project.

---

# Final Project Principle

**Flame in Freefall is not just a data visualization application. It is a research intelligence platform built to make NASA combustion research easier to explore, understand, and investigate.**

Every feature should contribute to that objective while maintaining scientific accuracy, transparent evidence, and reliable data handling.