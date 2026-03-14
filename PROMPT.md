# Sprint It — Project Prompt

## Vision

Build an AI product management agent called "Sprint It" — a React + Vite + Tailwind CSS app that autonomously handles the entire PM workflow:

1. **Ingest** messy customer feedback from any source (PDFs, CSVs, surveys, support tickets)
2. **Discover** themes and pain points using AI analysis
3. **Decide** what to build next with evidence-based prioritization
4. **Write** the specs (PRDs, OKRs, one-pagers, experiment specs)
5. **Assign** work to the right engineers

Sprint It is not a dashboard — it's an agent that does the actual work of a PM. It replaces the entire PM coordination layer.

## Core Integrations

- **S2.dev** — Durable event stream backbone. Every pipeline action is logged to an S2 stream for persistence, audit trail, and real-time activity tracking.
- **Unsiloed** — Document parsing API that converts uploaded files (PDF, XLSX, DOCX, etc.) into structured data for AI extraction.
- **Crustdata** — B2B company enrichment API for competitive intelligence (headcount, funding, growth signals).
- **Groq** — Fast LLM inference (llama-3.3-70b-versatile) for all AI analysis, document generation, and task assignment.

## Design

Inspired by Konto brand aesthetic — clean, modern, premium SaaS:
- Purple primary (#7C6BF0), amber accent (#F5B731)
- White cards with subtle borders and shadows
- Inter font, generous whitespace, rounded corners
- Think Linear meets Notion

## Pipeline Flow

```
Dashboard → Ingest Data → Analysis → Documents → Assignments → Dashboard
    │                                                              │
    └──────────── "Run Full Pipeline" (one-click) ─────────────────┘
```

Each stage logs events to S2.dev. The Activity Feed shows the full event timeline in real-time.
