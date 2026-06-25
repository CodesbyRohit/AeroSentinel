# AeroSentinel — Product Requirements Document

**Project:** AI-Powered Urban Air Quality Intelligence for Smart City Intervention (Delhi)
**Target event:** Economic Times AI Hackathon 2026
**Phase:** Phase 2 — Build Sprint Prototype
**Status:** v2.0 — Major scope expansion shipped 2026-02-12

## Architecture
- **Backend** — FastAPI (`/app/backend/server.py`)
  - 14 Delhi wards · seeded synthetic AQI time-series · OpenAQ live-blend env-gated
  - Forecast model (diurnal + weekly profile blend) → 24/48/72h horizons
  - RMSE vs persistence baseline (~10.4 vs ~14.2, **−27%**) — judge-verifiable
  - Synthetic registry: construction permits, industrial stacks, waste-burning zones, diesel fleet routes
  - Enforcement engine: hotspots × registry → P1/P2/P3 recommendations with full evidence
  - **v2** — Polluter compliance scorecards (industries, green/amber/red badges, penalty history, trend)
  - **v2** — Impact engine (asthma cases prevented, school risk, elderly exposure, population affected)
  - **v2** — Predictive risk narrative + source attribution per ward
  - **v2** — Trust layer (sensor metadata: source, station code, freshness, confidence, missing data %)
  - **v2** — AeroCopilot chat (Gemini 3 Flash) with state-aware context
  - **v2** — Citizen complaint flow with Gemini 3 Flash **Vision** image analysis → MongoDB
  - **v2** — Auto-drafted enforcement notices (Gemini text per recommendation)
  - MongoDB persistence for enforcement acknowledgements

- **Frontend** — React + Tailwind + shadcn/ui + Recharts
  - Multi-portal routing:
    - `/` Landing ("Why This Matters", impact + immediate risk + portal cards)
    - `/command` Command Center (pollution war room — full operator dashboard)
    - `/citizen` Citizen Portal (ward selector, advisory, complaint upload, trust layer)
    - `/inspector` Inspector Portal (dispatch list, notice generation, mark-done)
    - `/pitch` Slide deck for judging
  - Global AeroCopilot drawer (Gemini chat) on every stakeholder route
  - Mission-control dark aesthetic: Cabinet Grotesk / IBM Plex Sans / JetBrains Mono / Noto Devanagari

- **LLM** — Gemini 3 Flash (text + vision) via Emergent Universal Key

## Implemented (2026-02-12)
v2 API additions: `/api/impact`, `/api/risks`, `/api/risk-narrative/{ward_id}`, `/api/polluters`, `/api/notice/{rec_id}`, `/api/copilot/chat`, `/api/complaints` (POST + GET), `/api/sensors/{ward_id}`, `/api/enforcement/reset`.

v2 UI: Landing, Command Center (with risk narrative + trust badges + polluter leaderboard + notice dialogs), Citizen portal (with complaint form), Inspector portal (mobile-style cards), Copilot drawer (suggested questions + context display).

## Backlog (P1/P2)
- **P1**: Drop-in real OpenAQ feed for historical trace (set `OPENAQ_API_KEY`)
- **P1**: PDF generation for enforcement notices (currently text + browser print)
- **P2**: Inspector live GPS / map view
- **P2**: Marathi + Tamil advisory languages
- **P2**: WhatsApp Business push for citizen advisories
- **P2**: Refactor server.py into modules (gemini_clients, registry, routes_v2)
- **P2**: Multi-worker safe state (current globals only safe on single worker)

## Next Tasks
- Record demo video per `/app/memory/DEMO_VIDEO_SCRIPT.md`
- Export `/pitch` to PDF for submission portal
