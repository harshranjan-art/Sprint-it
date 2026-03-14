# Sprint It

**Sprint It** is an AI product management agent — not just a dashboard, but an autonomous system that does the actual work of a PM: ingests messy data, discovers what users need, decides what to build, writes the specs, and assigns work to engineers.

It replaces the entire PM coordination layer.

## What It Does

1. **Ingest Data** — Upload customer feedback (PDFs, CSVs, any format) via Unsiloed, or load sample data. Pull competitor intelligence via Crustdata.
2. **AI Analysis** — Three sequential LLM calls discover themes, analyze competitive gaps, and generate prioritized recommendations with weighted scoring.
3. **Document Generation** — Auto-generates PRDs, OKRs, executive one-pagers, and experiment specs for top recommendations.
4. **Team Assignment** — AI matches features to engineers based on skills, bandwidth, and context. Produces ready-to-paste Linear/Jira tickets.
5. **Full Pipeline** — One-click "Run Full Pipeline" executes all stages end-to-end with a real-time progress overlay.

Every action is logged to an S2.dev durable event stream for persistence and audit trail.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **LLM**: Groq API (llama-3.3-70b-versatile)
- **Document Parsing**: Unsiloed API
- **Competitor Data**: Crustdata API
- **Event Streaming**: S2.dev
- **Icons**: lucide-react
- **Markdown Rendering**: react-markdown + remark-gfm

## Getting Started

```bash
# Install dependencies
npm install

# Add your API keys to .env
cp .env.example .env
# Edit .env with your keys:
#   VITE_GROQ_KEY=gsk_...
#   VITE_S2_TOKEN=...
#   VITE_UNSILOED_KEY=... (optional)
#   VITE_CRUSTDATA_KEY=... (optional)

# Start dev server
npm run dev
```

The app works with just a Groq API key — Unsiloed and Crustdata are optional (falls back to mock data).

## Project Structure

```
src/
├── components/       # Sidebar, TopBar, ActivityFeed, PipelineOverlay
├── context/          # AppContext (global state), ToastContext
├── data/             # Mock team data
├── hooks/            # useCountUp animation hook
├── pages/            # Dashboard, IngestData, Analysis, Documents, Assignments
└── services/         # Groq LLM, S2, Unsiloed, Crustdata, pipeline runner
```

## Design System

- Primary: #7C6BF0 (purple)
- Accent: #F5B731 (amber/gold)
- Clean, modern SaaS aesthetic — Inter font, rounded cards, subtle shadows

## Built For
Compiler X Razorpay X Magicball Hackathon 