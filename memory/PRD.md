# AeroSentinel — Product Requirements Document

**Project:** AI-Powered Urban Air Quality Intelligence for Smart City Intervention (Delhi)
**Target event:** Economic Times AI Hackathon 2026
**Phase:** Phase 2 — Build Sprint Prototype
**Status:** v1.0 — MVP shipped 2026-02-12

## Original Problem Statement
See the full PRD attached to the original task. Two-person team, ~4-week timeline.
Scope locked to **two technical cores + one demo layer**:

1. **Hyperlocal Predictive AQI Forecasting Agent** (Core #1)
2. **Enforcement Intelligence & Prioritisation Agent** (Core #2)
3. **Citizen Health Risk Advisory** (demo layer over Core #1)

Explicitly **out of scope**: Geospatial Source Attribution Engine, Multi-City Comparative Dashboard.

## Architecture
- **Backend** — FastAPI (`/app/backend/server.py`)
  - 14 illustrative Delhi wards with seeded synthetic AQI time-series
  - Hyperlocal forecasting model (diurnal + weekly profile blend) → 24/48/72h horizons
  - Persistence baseline + RMSE comparison (city avg model 10.4 vs persistence 14.2, **−26.8%**)
  - Synthetic registry: construction permits, industrial stacks, waste-burning zones, diesel fleet routes
  - Enforcement engine: hotspots × registry correlation → P1/P2/P3 prioritised recommendations with full evidence trace
  - Citizen advisory via Gemini 3 Flash (EN + Hindi), cached, with deterministic fallback
- **Frontend** — React (CRA) + Tailwind + shadcn/ui + Recharts
  - Dashboard at `/` ("Mission Control" dark aesthetic, Cabinet Grotesk / IBM Plex Sans / JetBrains Mono)
  - Ward surveillance map (SVG, click-to-drill), KPI strip, forecast chart, enforcement table, advisory panel, alert feed
- **LLM** — Gemini 3 Flash via Emergent Universal Key (`EMERGENT_LLM_KEY`).

## Personas
- **City Air Quality Officer** — needs ranked enforcement actions with evidence trace
- **Field Inspector** — receives dispatch with ETA + sample source records
- **Citizen** — bilingual advisory for their ward

## Core Requirements (static)
- Ward-level resolution, 24–72hr forecast horizon
- RMSE vs persistence baseline (PRD §5.1)
- Every enforcement recommendation traceable to source data
- ≥2 advisory languages (English + Hindi delivered)
- Disclosed synthetic data badge on UI

## Implemented (2026-02-12)
- `/api/kpis`, `/api/wards`, `/api/forecast/{id}`, `/api/hotspots`, `/api/registry`, `/api/enforcement`, `/api/enforcement/{id}/acknowledge`, `/api/advisory/{id}`, `/api/alerts`
- All 5 KPI cards, ward map, forecast chart (history + forecast + persistence + held-out actual + 300 hotspot threshold), enforcement table with expandable evidence, advisory panel (EN/Hindi toggle), alert feed
- `data-testid` on every interactive element

## Backlog (P1/P2)
- **P1**: Drop-in real OpenAQ / CPCB feed in `generate_series()` (currently synthetic)
- **P1**: Persist `ENFORCEMENT` acknowledge state to MongoDB so it survives backend restart
- **P2**: Add second city port (Mumbai) — wire to the existing `DELHI_WARDS` shape
- **P2**: PDF/CSV export of recommendations for field dispatch
- **P2**: Marathi + Tamil advisory languages

## Next Tasks
1. Run testing agent (backend API + frontend smoke).
2. Address any blocking failures.
3. Ship demo video + pitch deck (out of scope for this build session).
