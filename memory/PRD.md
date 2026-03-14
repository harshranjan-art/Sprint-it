# Sprint It - PRD

## Original Problem Statement
Redesign the Sprint It app UI from an "old school" look to a modern deep tech platform aesthetic that looks futuristic and doesn't look like AI slop.

## Architecture
- **Stack**: Vite + React + Tailwind CSS v4 (frontend-only, all data is client-side mock)
- **Pages**: Dashboard, Ingest Data, Analysis, Documents, Assignments
- **Components**: Sidebar, TopBar, ActivityFeed, PipelineOverlay, ToastContext

## User Personas
- Product managers using AI-powered sprint planning
- Engineering leads reviewing feature assignments

## Core Requirements (Static)
- AI product management agent workflow: Ingest → Analyze → Documents → Assign
- Customer intelligence file upload with AI extraction
- Competitive intelligence with domain enrichment
- Theme discovery and gap analysis
- Priority-weighted feature recommendations
- Auto-generated PRD, OKRs, One-Pager, Experiment Spec documents
- AI-powered team assignment with ticket generation

## What's Been Implemented

### 2026-03-14: Full Dark Theme UI Overhaul
- Migrated from light to full dark theme (Linear-inspired, mission-control vibes)
- Color palette: #09090B main bg, #111116 cards, #8B7CF6 purple accent
- Font change: "Outfit" (main) + "Space Mono" (monospace) replacing Inter
- Subtle glow effects on buttons, cards, and active states
- Custom dark scrollbar, range slider styling
- All components and pages updated with dark-mode-appropriate colors
- Added data-testid attributes to all interactive elements (24+)
- 100% test pass rate, no broken functionality

## Prioritized Backlog
- P0: None (all core functionality working)
- P1: Linear integration for ticket creation
- P2: Real API integration for Unsiloed/Crustdata services

## Next Tasks
- User feedback on dark theme refinements
- Potential micro-animation enhancements (page transitions, card entrance effects)
