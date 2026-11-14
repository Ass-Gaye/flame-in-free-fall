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

*These are planned capabilities. Their implementation status will be tracked in the project roadmap.*

## 📊 Research Dataset

The project currently has a cleaned dataset containing **133 NASA PSI investigations**.

| Classification | Investigations |
|---|---:|
| Direct relevance | 14 |
| Supporting relevance | 11 |
| Peripheral relevance | 108 |
| **Total** | **133** |

Extraction status:

- 129 successfully extracted.
- 4 incompletely extracted.

The dataset is maintained separately in the `NASA Fire Data/` directory.

**Dataset source of truth:** `NASA Fire Data/merged_master_dataset.json`

Relevance classifications are research-prioritization labels, not scientific conclusions. Dataset statistics should be verified against the source JSON before being used in public-facing analysis.

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

The initial AI integration will use **Gemma 4 E2B (`gemma4:e2b`) through Ollama**.

The AI research assistant will retrieve relevant investigation records from the project dataset before generating answers.

Responses should be grounded in retrieved records and reference investigation IDs and NASA source URLs.

The AI must not invent scientific findings, publications, DOIs, or research statistics.

## 📁 Project Structure

The planned project structure is:

```text
FLAME-IN-FREEFALL/
│
├── NASA Fire Data/
│   └── merged_master_dataset.json
│
├── frontend/
│
├── backend/
│
├── docs/
│   └── PROJECT_CONTEXT_AND_ROADMAP.md
│
├── .gitignore
├── README.md
└── package.json
```

The final structure may be refined after the initial architecture review.

## 📖 Project Documentation

For the complete project background, dataset description, architecture direction, development phases, scientific constraints, and contributor guidance, see:

**[PROJECT CONTEXT AND DEVELOPMENT ROADMAP](docs/PROJECT_CONTEXT_AND_ROADMAP.md)**

This document is the main reference for understanding and continuing the project.

## 💻 Development Setup

The application is under development. Detailed installation and configuration instructions will be added as the architecture and implementation are established.

The initial development environment requires:

- Node.js and npm.
- Git.
- An appropriate code editor.
- Ollama.
- The `gemma4:e2b` model.
- The project research dataset.

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

<escape>🚧</escape> **Currently in project initialization and architecture planning.**

Implementation will proceed in clearly defined phases, with testing and review at each milestone.

## 📄 License

A project license will be selected and added before public release. The licensing and redistribution conditions of NASA source material and any third-party materials must also be reviewed separately.

---

**Flame in Freefall**  
*Making NASA combustion research more accessible through data, analytics, and AI.*