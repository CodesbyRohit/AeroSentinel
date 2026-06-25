# AeroSentinel — Demo Video Script
**Target:** ET AI Hackathon 2026 · Phase 2 Submission
**Length:** 3 minutes (180 s)
**Recording setup:** Screen + voiceover. 1920×1080. Browser at `https://aqi-enforce.preview.emergentagent.com`. Keep cursor visible.

---

## [00:00 – 00:12] — HOOK (12 s)
**Visual:** Black screen → fade to `/pitch` slide 1 (full screen).
**VO:** "1.67 million deaths. Twenty-four of the fifty most polluted cities in India. Nine hundred monitoring stations. And only thirty-one percent of cities can actually act on the data they collect."

## [00:12 – 00:25] — PROBLEM (13 s)
**Visual:** `/pitch` slide 2 ("31% of cities can act on the data") — pause 6 s — slide 3 ("Two cores. One demo layer.").
**VO:** "AeroSentinel is the intelligence layer that turns those readings into action. Two agents, one demo layer — scope locked, in scope and out of scope stated up front."

## [00:25 – 00:50] — DASHBOARD HERO (25 s)
**Visual:** Navigate to `/`. Scroll: hero → KPI strip (linger 4 s on RMSE 10.21 KPI) → ward map.
**VO:** "Here is Delhi. Fourteen wards. City average AQI 262 — *unhealthy*. Five active hotspots. Our forecast RMSE is 10.21 versus the persistence baseline 14.01 — 27% better, on the held-out window. And signal-to-intervention has dropped from 48 hours to 5.4 hours."

## [00:50 – 01:20] — FORECASTING AGENT (30 s)
**Visual:** Click Anand Vihar node on the map. Forecast chart updates. Switch tabs 24h → 48h → 72h. Linger on the RMSE badge.
**VO:** "Click any ward and the Hyperlocal Forecasting Agent loads. White is history. Yellow is our forecast. Grey dashed is the persistence baseline. Green is the held-out actual — fully disclosed, so judges can verify the claim. The orange dashed line is the 300-AQI hotspot threshold; everything that crosses it triggers Core Two."

## [01:20 – 01:50] — ENFORCEMENT AGENT (30 s)
**Visual:** Scroll to enforcement table. Click row REC-1001 (Anand Vihar construction). Show evidence panel (Correlation Trace + Sample Source Records). Click Dispatch button — toast appears.
**VO:** "Core Two — the Enforcement Intelligence Agent. Thirteen P1, P2, P3 recommendations, ranked by priority score. Every row is traceable. Click and you see the hotspot AQI, the registry entries we correlated against, the source IDs. One click — dispatched. Acknowledgement state persists to MongoDB, so the field officer's queue survives a restart."

## [01:50 – 02:15] — CITIZEN ADVISORY (25 s)
**Visual:** Scroll to advisory panel (already on Anand Vihar). Toggle to Hindi — Devanagari text appears. Toggle back to English.
**VO:** "Demo layer — Citizen Health Advisory. Gemini 3 Flash, ward-level, English and Hindi. Calm public-health tone, not alarmist. Cached per ward. If Gemini is unreachable, a deterministic fallback ensures the citizen never sees an empty card."

## [02:15 – 02:40] — METHODOLOGY DISCLOSURE (25 s)
**Visual:** Scroll back to hero. Linger on the yellow "Methodology · Disclosed" card.
**VO:** "Every claim we make, we disclose. The AQI trace and the four-category source registry are seeded synthetic data. The pipeline accepts a real OpenAQ or CPCB feed by setting one environment variable. Disclosed assumptions are a credibility asset. Hidden ones are a liability."

## [02:40 – 03:00] — CLOSE (20 s)
**Visual:** Cut back to `/pitch` slide 8 (judging criteria mapped) → slide 1 (title).
**VO:** "Innovation, business impact, technical excellence, scalability, user experience — every published weight, mapped. AeroSentinel. Two agents. Three million lungs. One Delhi."

---

## Recording checklist
- [ ] Browser zoom 100%, no extensions visible, full-screen the pitch deck (F11)
- [ ] Disable notifications
- [ ] OBS @ 60fps, voice on a separate track
- [ ] Capture cursor movements (use a cursor highlighter)
- [ ] Pre-warm the Gemini advisory cache by visiting `/` and clicking Anand Vihar once before recording
- [ ] Export H.264 MP4, ≤ 100 MB
- [ ] Upload to the hackathon submission portal alongside the deck PDF (export `/pitch` to PDF via browser print-to-PDF, landscape)
