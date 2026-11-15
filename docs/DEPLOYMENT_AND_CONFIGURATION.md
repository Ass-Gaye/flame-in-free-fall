# Flame in Freefall — Deployment and Configuration Guide

This guide describes installation, environment configuration, database ingestion, AI provider setup, production building, and deployment operations for **Flame in Freefall**.

---

## 1. System Requirements & Architecture

| Component | Minimum Version | Purpose |
|---|---|---|
| **Node.js** | 20.x or 22.x LTS | Backend runtime & frontend tooling |
| **npm** | 10.x+ | Package manager |
| **Python** | 3.10+ | Dataset curation, ISA-Tab merge, and validation |
| **SQLite** / **better-sqlite3** | Built-in | Fast local database (PostgreSQL migration ready) |
| **Ollama** *(Optional)* | 0.1.x+ | Local offline LLM runtime (`gemma4:e2b`) |
| **Gemini API** *(Optional)* | v1beta | Cloud LLM runtime (`gemini-2.5-flash`) |

---

## 2. Environment Configuration

### Root Environment Reference (`.env.example`)
The repository includes `.env.example` at the root documenting the full configuration parameters.

### Backend (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:

```bash
# Server & Network
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:5174,http://localhost:5173

# Database & Dataset
DATABASE_URL="file:./prisma/dev.db"
# DATA_SOURCE_PATH="../nasa-fire-data/psi_output/merged_master_dataset.json"

# AI Provider Configuration
# Supported: gemini, ollama (defaults to gemini with automatic ollama fallback)
AI_PROVIDER=gemini

# Primary Provider (Gemini Cloud)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Fallback & Local Provider (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
```

### Frontend (`frontend/.env.local`)
Create `frontend/.env.local` to point to your backend API:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## 3. Installation & Database Ingestion

### Step 1: Install Dependencies
```powershell
# Root / Workspace install
cd backend
npm install

cd ../frontend
npm install
```

### Step 2: Validate the NASA Source Dataset
Before running any migration, verify that the dataset is intact:
```powershell
python nasa-fire-data/validate_dataset.py
```
Expected output:
```text
records            : 133
unique ids         : 133
investigation DOIs : 131
merged archives    : 22
publications       : 1786 entries
all checks passed
```

### Step 3: Run Database Migrations and Ingestion
In `backend/`:
```powershell
# Deploy SQLite schema migrations
npm run db:deploy

# Run idempotent dataset ingestion (validates SHA-256 and rebuilds)
npm run db:ingest
```

---

## 4. AI Provider Configuration & Verification

Flame in Freefall includes an intelligent fallback architecture:

```text
               User Research Question
                         │
                         ▼
        Context Retrieval (NASA PSI Database)
                         │
                         ▼
             AI Provider Factory
            ┌────────────┴────────────┐
            ▼                         ▼
   Gemini Provider             Ollama Provider
 (gemini-2.5-flash)           (Local gemma4:e2b)
            │                         │
            ▼                         ▼
     [Success]                  [Success]
            │                         │
            ├────────────┬────────────┘
            │            │
   [Rate Limit / Error]  │
            │            │
            ▼            │
  Fallback to Ollama ────┘
            │
            ▼
Grounded Research Answer + Citations
```

### Health & Status Verification
Verify that the AI service is operational by querying the read-only endpoint:
```powershell
curl http://localhost:3001/api/ai/status
```
Response:
```json
{
  "provider": "gemini",
  "available": true,
  "model": "gemini-2.5-flash",
  "configured": true
}
```

---

## 5. Production Build & Deployment

### Backend Build
```powershell
cd backend
npm run build
```
The compiled output is located in `backend/dist/`.

To start the production API:
```powershell
NODE_ENV=production npm start
```

### Frontend Build
```powershell
cd frontend
npm run build
```
The static single-page application is compiled to `frontend/dist/`.

### Deployment Options

#### 1. Static Web Hosting for Frontend
The `frontend/dist/` bundle can be served from any static file host:
- Nginx, Caddy, or Apache
- Vercel, Netlify, or AWS S3 + CloudFront
- Cloudflare Pages

Ensure all routes fallback to `index.html` (SPA routing).

#### 2. Process Management for Backend (PM2 / Systemd)
Using PM2:
```bash
cd backend
pm2 start dist/server.js --name "flame-backend" -i max
pm2 save
```

#### 3. Containerized Deployment (Docker)
Both backend and frontend can be containerized. When mounting volumes, preserve `nasa-fire-data/psi_output/` as read-only (`:ro`) to ensure dataset immutability.

---

## 6. Scientific Integrity & Data Safety Checklist

1. **Source Immutability:** `nasa-fire-data/psi_output/merged_master_dataset.json` must remain read-only for application runtime processes.
2. **Relevance Classifications:** Relevance labels are auditable rule-based classifications generated by `classify_relevance.py`, never manual heuristics.
3. **Traceable Citations:** All research answers from `/api/ai/query` include verified NASA PSI investigation IDs and NASA source links.
4. **Secret Protection:** Verify that `.env` files containing `GEMINI_API_KEY` are never committed to version control.
