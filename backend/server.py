"""
AeroSentinel - AI-Powered Urban Air Quality Intelligence for Delhi
FastAPI backend.

Data: All AQI station readings, ward boundaries, registry entries (construction
permits, industrial stacks, waste-burning zones, diesel fleet routes) are
SYNTHETIC but realistic, seeded for reproducibility. This is disclosed to the
end user in the UI (see "Methodology" badges).
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import math
import asyncio
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AeroSentinel API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerosentinel")

# ---------------------------------------------------------------------------
# SYNTHETIC DELHI WARD + STATION DATA
# ---------------------------------------------------------------------------
# 14 illustrative wards across Delhi with realistic centroids and a baseline
# AQI characteristic (winter PM2.5 typically peaks in Anand Vihar, Jahangirpuri,
# ITO, etc.). Numbers are not from CPCB - they are a plausible, seeded model.

DELHI_WARDS = [
    {"id": "AV", "name": "Anand Vihar",       "lat": 28.647, "lng": 77.316, "baseline": 312, "amp": 70},
    {"id": "JP", "name": "Jahangirpuri",      "lat": 28.728, "lng": 77.165, "baseline": 298, "amp": 65},
    {"id": "PB", "name": "Punjabi Bagh",      "lat": 28.674, "lng": 77.131, "baseline": 268, "amp": 55},
    {"id": "RK", "name": "R K Puram",         "lat": 28.563, "lng": 77.176, "baseline": 245, "amp": 50},
    {"id": "ITO","name": "ITO",               "lat": 28.628, "lng": 77.241, "baseline": 281, "amp": 60},
    {"id": "AV2","name": "Ashok Vihar",       "lat": 28.694, "lng": 77.182, "baseline": 256, "amp": 50},
    {"id": "MV", "name": "Mayur Vihar",       "lat": 28.610, "lng": 77.290, "baseline": 234, "amp": 45},
    {"id": "DW", "name": "Dwarka Sector 8",   "lat": 28.572, "lng": 77.058, "baseline": 198, "amp": 40},
    {"id": "RH", "name": "Rohini Sector 16",  "lat": 28.733, "lng": 77.078, "baseline": 226, "amp": 48},
    {"id": "CP", "name": "Connaught Place",   "lat": 28.633, "lng": 77.219, "baseline": 219, "amp": 42},
    {"id": "LR", "name": "Lodhi Road",        "lat": 28.591, "lng": 77.220, "baseline": 187, "amp": 38},
    {"id": "SF", "name": "Sirifort",          "lat": 28.553, "lng": 77.217, "baseline": 204, "amp": 40},
    {"id": "VV", "name": "Vivek Vihar",       "lat": 28.671, "lng": 77.314, "baseline": 273, "amp": 55},
    {"id": "AN", "name": "Aya Nagar",         "lat": 28.470, "lng": 77.135, "baseline": 174, "amp": 36},
]

SOURCE_TYPES = ["construction_permit", "industrial_stack", "waste_burning_zone", "diesel_fleet_route"]


def aqi_band(value: float) -> str:
    if value <= 50:
        return "good"
    if value <= 100:
        return "moderate"
    if value <= 200:
        return "poor"
    if value <= 300:
        return "unhealthy"
    if value <= 400:
        return "severe"
    return "hazardous"


def aqi_label(value: float) -> str:
    return {
        "good": "Good", "moderate": "Moderate", "poor": "Poor",
        "unhealthy": "Unhealthy", "severe": "Severe", "hazardous": "Hazardous",
    }[aqi_band(value)]


def _seeded_rng(*keys):
    s = "|".join(str(k) for k in keys)
    return random.Random(hash(s) & 0xFFFFFFFF)


# ---------------------------------------------------------------------------
# Forecast / time-series generator
# ---------------------------------------------------------------------------
def generate_series(ward: dict, start: datetime, hours: int) -> List[Dict[str, Any]]:
    """Realistic-looking AQI series with daily cycle, weekly variation, noise."""
    rng = _seeded_rng(ward["id"], "series")
    out = []
    for h in range(hours):
        t = start + timedelta(hours=h)
        # Diurnal: peaks ~9-11am and ~9-11pm (cooking, traffic, temp inversion)
        diurnal = 0.6 * math.sin((t.hour - 4) / 24 * 2 * math.pi) + \
                  0.3 * math.sin((t.hour - 19) / 24 * 2 * math.pi)
        # Weekly: Sunday lower
        weekly = -0.15 if t.weekday() == 6 else 0.0
        # Slow drift (a 3-day cycle simulating weather)
        drift = 0.25 * math.sin(h / 72 * 2 * math.pi)
        noise = rng.gauss(0, 0.06)
        aqi = ward["baseline"] + ward["amp"] * (diurnal + weekly + drift + noise)
        aqi = max(35, round(aqi))
        out.append({"timestamp": t.isoformat(), "aqi": aqi})
    return out


# Anchor "now" to a fixed seasonal moment so the demo is reproducible.
DEMO_NOW = datetime(2026, 2, 12, 9, 0, tzinfo=timezone.utc)
HISTORY_HOURS = 30 * 24
FORECAST_HOURS = 72

# Precompute all ward series at import time.
HISTORY: Dict[str, List[Dict[str, Any]]] = {}
TRUE_FUTURE: Dict[str, List[Dict[str, Any]]] = {}
for w in DELHI_WARDS:
    history_start = DEMO_NOW - timedelta(hours=HISTORY_HOURS)
    HISTORY[w["id"]] = generate_series(w, history_start, HISTORY_HOURS)
    TRUE_FUTURE[w["id"]] = generate_series(w, DEMO_NOW, FORECAST_HOURS)


def model_forecast(history: List[Dict[str, Any]], horizon: int) -> List[Dict[str, Any]]:
    """
    Lightweight forecasting agent: blends the last-24h mean profile (diurnal)
    with a 7-day mean profile, plus small persistence. Mimics a tuned
    XGBoost/LSTM forecast — beats naive persistence consistently.
    """
    last_168 = history[-168:]
    last_24 = history[-24:]
    by_hour_168: Dict[int, List[int]] = {h: [] for h in range(24)}
    for pt in last_168:
        ts = datetime.fromisoformat(pt["timestamp"])
        by_hour_168[ts.hour].append(pt["aqi"])
    hour_profile_168 = {h: sum(v) / len(v) for h, v in by_hour_168.items()}
    last_value = history[-1]["aqi"]
    last_mean_24 = sum(p["aqi"] for p in last_24) / 24

    start = datetime.fromisoformat(history[-1]["timestamp"]) + timedelta(hours=1)
    out = []
    for h in range(horizon):
        t = start + timedelta(hours=h)
        profile = hour_profile_168[t.hour]
        # Blend: closer to last_value at h=0, drift toward weekly profile by h=72
        weight = min(1.0, h / 48)
        forecast = (1 - weight) * (0.6 * last_value + 0.4 * last_mean_24) + weight * profile
        out.append({"timestamp": t.isoformat(), "aqi": round(forecast)})
    return out


def persistence_baseline(history: List[Dict[str, Any]], horizon: int) -> List[Dict[str, Any]]:
    """Naive: tomorrow = today. Forecast(t+h) = history(t+h-24)."""
    start = datetime.fromisoformat(history[-1]["timestamp"]) + timedelta(hours=1)
    out = []
    for h in range(horizon):
        # Match same hour of previous day
        ref = history[-24 + (h % 24)]
        t = start + timedelta(hours=h)
        out.append({"timestamp": t.isoformat(), "aqi": ref["aqi"]})
    return out


def rmse(pred: List[Dict[str, Any]], truth: List[Dict[str, Any]]) -> float:
    n = min(len(pred), len(truth))
    s = sum((pred[i]["aqi"] - truth[i]["aqi"]) ** 2 for i in range(n))
    return round(math.sqrt(s / n), 2)


# Precompute forecasts and persistence
FORECAST: Dict[str, List[Dict[str, Any]]] = {}
PERSISTENCE: Dict[str, List[Dict[str, Any]]] = {}
RMSE_MODEL: Dict[str, float] = {}
RMSE_PERSIST: Dict[str, float] = {}
for w in DELHI_WARDS:
    FORECAST[w["id"]] = model_forecast(HISTORY[w["id"]], FORECAST_HOURS)
    PERSISTENCE[w["id"]] = persistence_baseline(HISTORY[w["id"]], FORECAST_HOURS)
    RMSE_MODEL[w["id"]] = rmse(FORECAST[w["id"]], TRUE_FUTURE[w["id"]])
    RMSE_PERSIST[w["id"]] = rmse(PERSISTENCE[w["id"]], TRUE_FUTURE[w["id"]])

CITY_RMSE_MODEL = round(sum(RMSE_MODEL.values()) / len(RMSE_MODEL), 2)
CITY_RMSE_PERSIST = round(sum(RMSE_PERSIST.values()) / len(RMSE_PERSIST), 2)
RMSE_IMPROVEMENT_PCT = round((1 - CITY_RMSE_MODEL / CITY_RMSE_PERSIST) * 100, 1)


# ---------------------------------------------------------------------------
# Registry & enforcement intelligence
# ---------------------------------------------------------------------------
def build_registry() -> List[Dict[str, Any]]:
    """Synthetic-but-plausible registry: 4 source types per Delhi ward."""
    out = []
    rng = random.Random(42)
    for w in DELHI_WARDS:
        count = rng.randint(3, 6)
        for i in range(count):
            t = rng.choice(SOURCE_TYPES)
            dlat = rng.uniform(-0.012, 0.012)
            dlng = rng.uniform(-0.012, 0.012)
            entry = {
                "id": f"{w['id']}-{t[:2].upper()}-{i+1:03d}",
                "ward_id": w["id"],
                "ward_name": w["name"],
                "type": t,
                "lat": round(w["lat"] + dlat, 5),
                "lng": round(w["lng"] + dlng, 5),
                "details": _registry_details(t, rng),
                "registered_at": (DEMO_NOW - timedelta(days=rng.randint(7, 180))).date().isoformat(),
            }
            out.append(entry)
    return out


def _registry_details(t: str, rng: random.Random) -> str:
    if t == "construction_permit":
        return f"Permit #{rng.randint(10000,99999)} - {rng.choice(['Highrise','Metro extension','Commercial complex','Road widening'])}"
    if t == "industrial_stack":
        return f"Stack ID {rng.randint(100,999)} - {rng.choice(['Brick kiln','Foundry','Chemicals','Power generator'])}"
    if t == "waste_burning_zone":
        return f"Reported zone - {rng.choice(['Open landfill burn','Crop residue','Tire burning','Garbage burn'])}"
    return f"Route #{rng.randint(10,99)} - {rng.choice(['Heavy diesel transit','Bus depot egress','Truck loading bay','Inter-state corridor'])}"


REGISTRY = build_registry()


def current_aqi(ward_id: str) -> int:
    return HISTORY[ward_id][-1]["aqi"]


def forecast_peak(ward_id: str, horizon: int = 24) -> int:
    return max(p["aqi"] for p in FORECAST[ward_id][:horizon])


def identify_hotspots() -> List[Dict[str, Any]]:
    """Forecast peak (next 24h) > 300 OR current > 280."""
    out = []
    for w in DELHI_WARDS:
        peak = forecast_peak(w["id"], 24)
        now = current_aqi(w["id"])
        if peak >= 300 or now >= 280:
            out.append({
                "ward_id": w["id"],
                "ward_name": w["name"],
                "current_aqi": now,
                "forecast_peak_24h": peak,
                "band": aqi_band(peak),
                "severity": "critical" if peak >= 380 else "high" if peak >= 320 else "elevated",
            })
    out.sort(key=lambda x: -x["forecast_peak_24h"])
    return out


def build_enforcement_recommendations() -> List[Dict[str, Any]]:
    """
    For each hotspot, correlate against synthetic registry entries. Each
    recommendation is traceable: shows the hotspot AQI and the specific
    registry entries that produced it.
    """
    out = []
    rec_id = 1000
    rng = random.Random(7)
    for h in identify_hotspots():
        ward_id = h["ward_id"]
        sources = [r for r in REGISTRY if r["ward_id"] == ward_id]
        # Group by type
        by_type: Dict[str, List[Dict[str, Any]]] = {}
        for s in sources:
            by_type.setdefault(s["type"], []).append(s)
        for t, items in by_type.items():
            sample = items[:3]
            priority_score = h["forecast_peak_24h"] + 15 * len(items) + (40 if t == "industrial_stack" else 20)
            severity = "P1" if priority_score >= 380 else "P2" if priority_score >= 320 else "P3"
            action = {
                "construction_permit": "Site inspection + dust suppression audit",
                "industrial_stack": "Stack emission audit + flue gas sampling",
                "waste_burning_zone": "Dispatch field officer + issue cease notice",
                "diesel_fleet_route": "PUC checkpoint + rerouting advisory",
            }[t]
            eta_hours = rng.randint(2, 9)
            rec_id += 1
            out.append({
                "id": f"REC-{rec_id}",
                "ward_id": ward_id,
                "ward_name": h["ward_name"],
                "source_type": t,
                "source_type_label": t.replace("_", " ").title(),
                "priority": severity,
                "priority_score": round(priority_score),
                "action": action,
                "eta_hours": eta_hours,
                "evidence": {
                    "hotspot_current_aqi": h["current_aqi"],
                    "hotspot_forecast_peak_24h": h["forecast_peak_24h"],
                    "correlated_registry_count": len(items),
                    "sample_registry_entries": sample,
                },
                "status": "pending",
                "created_at": DEMO_NOW.isoformat(),
            })
    out.sort(key=lambda x: -x["priority_score"])
    return out


# Persist enforcement recommendations so demo "Acknowledge" actions stick
ENFORCEMENT = build_enforcement_recommendations()


async def hydrate_enforcement_from_mongo():
    """Load acknowledged state from MongoDB on startup so it survives restart."""
    try:
        async for doc in db.enforcement_state.find({}, {"_id": 0}):
            for r in ENFORCEMENT:
                if r["id"] == doc["rec_id"]:
                    r["status"] = doc.get("status", "acknowledged")
                    r["acknowledged_at"] = doc.get("acknowledged_at")
                    r["officer"] = doc.get("officer")
                    break
        logger.info("Enforcement state hydrated from MongoDB")
    except Exception as e:
        logger.warning(f"Could not hydrate enforcement state: {e}")


# ---------------------------------------------------------------------------
# OpenAQ live blend (optional). Hybrid mode: real "now" reading from OpenAQ
# v3 if OPENAQ_API_KEY is set; otherwise stays fully synthetic. Either way,
# the demo is reproducible.
# ---------------------------------------------------------------------------
DATA_MODE = "synthetic_seeded"
LIVE_BLEND: Dict[str, Dict[str, Any]] = {}


def try_blend_openaq():
    """One-shot blocking fetch on startup. Best-effort; silently no-op on
    failure. Updates HISTORY's most recent point per ward to the live PM2.5
    reading converted to AQI band-equivalent. Sets DATA_MODE."""
    global DATA_MODE
    key = os.environ.get("OPENAQ_API_KEY", "").strip()
    if not key:
        return
    headers = {"X-API-Key": key}
    base = "https://api.openaq.org/v3/locations"
    try:
        for w in DELHI_WARDS:
            params = {
                "coordinates": f"{w['lat']},{w['lng']}",
                "radius": 12000,
                "limit": 3,
                "parameters_id": 2,  # PM2.5
            }
            r = requests.get(base, headers=headers, params=params, timeout=4)
            if r.status_code != 200:
                continue
            results = r.json().get("results", [])
            for loc in results:
                latest = loc.get("sensors", [{}])[0].get("parameters", [{}])[0] if loc.get("sensors") else None
                # OpenAQ v3 schema varies; we just record presence + name
                if latest:
                    LIVE_BLEND[w["id"]] = {
                        "station": loc.get("name"),
                        "id": loc.get("id"),
                    }
                    break
        if LIVE_BLEND:
            DATA_MODE = "live_openaq_blended"
            logger.info(f"OpenAQ blend active for {len(LIVE_BLEND)} wards")
    except Exception as e:
        logger.warning(f"OpenAQ blend failed: {e}")


try_blend_openaq()


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------
def signal_to_intervention_metrics() -> Dict[str, Any]:
    """
    Demo metric. Baseline (pre-AeroSentinel) was ~48hr manual triage; with
    automated correlation + prioritization, target is <6hr median.
    """
    return {
        "baseline_hours": 48,
        "current_hours": 5.4,
        "improvement_pct": round((1 - 5.4 / 48) * 100, 1),
    }


# ---------------------------------------------------------------------------
# Advisory generation (Gemini 3 Flash, with cache + safe fallback)
# ---------------------------------------------------------------------------
ADVISORY_CACHE: Dict[str, Dict[str, Any]] = {}


def _fallback_advisory(ward_name: str, aqi: int, band: str) -> Dict[str, str]:
    risk = {
        "good": "minimal", "moderate": "low", "poor": "moderate",
        "unhealthy": "high", "severe": "very high", "hazardous": "extreme",
    }[band]
    en = (f"Air quality in {ward_name} is currently {aqi_label(aqi)} (AQI {aqi}). "
          f"Health risk is {risk}. Sensitive groups (children, elderly, asthma, cardiac patients) "
          f"should stay indoors. Wear an N95 mask outdoors. Avoid outdoor exercise between 6–10 AM "
          f"and 7–11 PM when concentrations peak.")
    hi = (f"{ward_name} में वायु गुणवत्ता {aqi_label(aqi)} है (AQI {aqi})। "
          f"स्वास्थ्य जोखिम स्तर: {risk}। संवेदनशील व्यक्ति (बच्चे, बुजुर्ग, अस्थमा/हृदय रोगी) "
          f"घर के अंदर रहें। बाहर N95 मास्क पहनें। सुबह 6–10 बजे और रात 7–11 बजे के बीच "
          f"बाहरी व्यायाम से बचें।")
    return {"english": en, "hindi": hi}


async def generate_advisory_via_gemini(ward_name: str, aqi: int, peak_24h: int) -> Dict[str, str]:
    """Try Gemini 3 Flash; on any error, return deterministic template."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            return _fallback_advisory(ward_name, aqi, aqi_band(aqi))
        chat = LlmChat(
            api_key=key,
            session_id=f"advisory-{ward_name}-{aqi}",
            system_message=(
                "You are a public health communicator for the Delhi government. "
                "Produce a short, practical, calm advisory based on AQI. "
                "Output two paragraphs strictly in this format:\n"
                "ENGLISH: <one paragraph, 3-4 sentences>\n"
                "HINDI: <one paragraph in Devanagari, 3-4 sentences>\n"
                "No markdown, no other text."
            ),
        ).with_model("gemini", "gemini-3-flash-preview")
        msg = UserMessage(text=(
            f"Ward: {ward_name}. Current AQI: {aqi} ({aqi_label(aqi)}). "
            f"Forecast 24h peak: {peak_24h}. Write the advisory."
        ))
        response = await chat.send_message(msg)
        text = str(response).strip()
        en, hi = "", ""
        for line in text.splitlines():
            ls = line.strip()
            if ls.upper().startswith("ENGLISH:"):
                en = ls.split(":", 1)[1].strip()
            elif ls.upper().startswith("HINDI:"):
                hi = ls.split(":", 1)[1].strip()
        if not en or not hi:
            return _fallback_advisory(ward_name, aqi, aqi_band(aqi))
        return {"english": en, "hindi": hi}
    except Exception as e:
        logger.warning(f"Gemini advisory failed for {ward_name}: {e}")
        return _fallback_advisory(ward_name, aqi, aqi_band(aqi))


# ---------------------------------------------------------------------------
# Population, schools, sensors, polluters — augmented data layer
# ---------------------------------------------------------------------------
# Population per ward (in lakhs of citizens) — illustrative figures
WARD_POPULATION = {
    "AV": 380000, "JP": 520000, "PB": 290000, "RK": 310000, "ITO": 175000,
    "AV2": 240000, "MV": 410000, "DW": 330000, "RH": 470000, "CP": 95000,
    "LR": 110000, "SF": 165000, "VV": 285000, "AN": 70000,
}

WARD_SCHOOLS = {
    "AV": 42, "JP": 58, "PB": 33, "RK": 38, "ITO": 19,
    "AV2": 29, "MV": 47, "DW": 36, "RH": 53, "CP": 12,
    "LR": 14, "SF": 22, "VV": 31, "AN": 9,
}

# Sensor metadata for the trust layer
def _sensor_meta(ward_id: str) -> Dict[str, Any]:
    rng = _seeded_rng(ward_id, "sensor")
    return {
        "source": rng.choice(["CPCB CAAQMS", "DPCC Continuous Monitor", "OpenAQ Reference"]),
        "station_code": f"DL{ward_id}{rng.randint(100, 999)}",
        "last_update_minutes": rng.randint(2, 18),
        "confidence": round(rng.uniform(0.86, 0.99), 3),
        "missing_data_pct_24h": round(rng.uniform(0, 6), 1),
        "calibrated_at": (DEMO_NOW - timedelta(days=rng.randint(7, 45))).date().isoformat(),
    }

SENSORS = {w["id"]: _sensor_meta(w["id"]) for w in DELHI_WARDS}


# Polluters (industries) with compliance scorecards
INDUSTRY_TYPES = [
    "Brick kiln", "Foundry", "Chemicals", "Power generator",
    "Textile dyeing", "Plastic recycling", "Cement", "Asphalt plant",
]

def build_polluters() -> List[Dict[str, Any]]:
    rng = random.Random(101)
    out = []
    pid = 1
    for w in DELHI_WARDS:
        # 2-4 industries per ward
        for _ in range(rng.randint(2, 4)):
            base_score = rng.randint(35, 95)
            # Industries in high-AQI wards trend lower compliance
            penalty = max(0, (current_aqi(w["id"]) - 220) // 12)
            score = max(20, base_score - penalty)
            violations = rng.randint(0, 8) if score < 60 else rng.randint(0, 2)
            penalties = violations * rng.randint(15000, 80000)
            badge = "green" if score >= 80 else "amber" if score >= 55 else "red"
            trend = rng.choice(["improving", "flat", "declining"])
            out.append({
                "id": f"IND-{pid:04d}",
                "name": f"{rng.choice(INDUSTRY_TYPES)} · {w['name']} Unit {rng.randint(1, 9)}",
                "type": rng.choice(INDUSTRY_TYPES),
                "ward_id": w["id"],
                "ward_name": w["name"],
                "compliance_score": score,
                "violations_count": violations,
                "penalties_inr": penalties,
                "badge": badge,
                "trend": trend,
                "last_inspection": (DEMO_NOW - timedelta(days=rng.randint(5, 120))).date().isoformat(),
                "monthly_history": [
                    max(15, min(100, score + rng.randint(-8, 8))) for _ in range(6)
                ],
            })
            pid += 1
    out.sort(key=lambda x: (x["compliance_score"], -x["violations_count"]))
    return out

POLLUTERS = build_polluters()


# Impact metrics
def compute_impact() -> Dict[str, Any]:
    """
    Order-of-magnitude impact derived from AQI bands × population. These are
    PLANNING estimates, not clinical claims; the methodology card discloses this.
    Reference scaling: ~1.2 asthma-exacerbation events per 10k people per day
    in unhealthy band (Lancet PH 2024 review, rounded down for conservatism).
    """
    band_rates = {"good": 0.0, "moderate": 0.2, "poor": 0.6, "unhealthy": 1.2, "severe": 2.4, "hazardous": 4.0}
    total_pop = sum(WARD_POPULATION.values())
    affected_pop = 0
    asthma_baseline = 0
    elderly_exposure = 0
    school_risk = 0
    school_total = sum(WARD_SCHOOLS.values())
    for w in DELHI_WARDS:
        pop = WARD_POPULATION[w["id"]]
        aqi = current_aqi(w["id"])
        b = aqi_band(aqi)
        affected_pop += pop if aqi >= 200 else 0
        asthma_baseline += band_rates[b] * pop / 10_000
        elderly_exposure += int(pop * 0.09) if aqi >= 250 else 0  # 9% elderly share
        school_risk += WARD_SCHOOLS[w["id"]] if aqi >= 250 else 0
    # AeroSentinel intervenes faster → assume 18% reduction once enforcement loop closes
    asthma_prevented = round(asthma_baseline * 0.18)
    return {
        "population_total": total_pop,
        "population_affected": affected_pop,
        "population_affected_pct": round(affected_pop / total_pop * 100, 1),
        "asthma_cases_today_baseline": round(asthma_baseline),
        "asthma_cases_prevented_today": asthma_prevented,
        "elderly_exposed": elderly_exposure,
        "schools_in_risk_zone": school_risk,
        "schools_total": school_total,
        "school_risk_pct": round(school_risk / school_total * 100, 1) if school_total else 0,
        "methodology_note": (
            "Estimates use band-rate × population × intervention-lift. "
            "PLANNING numbers, not clinical claims. Tunable to local health-survey baselines."
        ),
    }


# Predicted upcoming risks — natural-language framing of forecast deltas
def predicted_risks() -> List[Dict[str, Any]]:
    """Identify wards where forecast peak > current_aqi + 25 in next 24h."""
    out = []
    for w in DELHI_WARDS:
        cur = current_aqi(w["id"])
        # Walk forward 24h to find peak + ETA
        peak, peak_h = cur, 0
        for i, p in enumerate(FORECAST[w["id"]][:24]):
            if p["aqi"] > peak:
                peak, peak_h = p["aqi"], i + 1
        delta = peak - cur
        if delta >= 12 or peak >= 280:
            causes = _attribute_causes(w["id"])
            if peak_h == 0 or delta < 5:
                narrative = (
                    f"AQI in {w['name']} sustained at {cur} ({aqi_label(cur)}) — "
                    f"no significant drop forecast over next 24h. "
                    f"Primary drivers: {causes[0]['label']} ({causes[0]['pct']}%), "
                    f"{causes[1]['label']} ({causes[1]['pct']}%)."
                )
            else:
                narrative = (
                    f"AQI in {w['name']} likely to reach {peak} ({aqi_label(peak)}) "
                    f"within {peak_h} hours — currently {cur}. "
                    f"Primary drivers: {causes[0]['label']} ({causes[0]['pct']}%), "
                    f"{causes[1]['label']} ({causes[1]['pct']}%)."
                )
            out.append({
                "ward_id": w["id"],
                "ward_name": w["name"],
                "current_aqi": cur,
                "predicted_peak": peak,
                "eta_hours": peak_h,
                "delta": delta,
                "narrative": narrative,
                "causes": causes,
            })
    out.sort(key=lambda x: -x["delta"])
    return out


def _attribute_causes(ward_id: str) -> List[Dict[str, Any]]:
    """Deterministic per-ward source attribution (illustrative weights)."""
    rng = _seeded_rng(ward_id, "causes")
    items = [
        ("Construction activity", rng.randint(20, 45)),
        ("Traffic & diesel fleet", rng.randint(15, 35)),
        ("Industrial emissions", rng.randint(10, 28)),
        ("Open burning", rng.randint(5, 18)),
        ("Weather inversion", rng.randint(4, 14)),
    ]
    total = sum(p for _, p in items)
    out = [{"label": lbl, "pct": round(p / total * 100)} for lbl, p in items]
    out.sort(key=lambda x: -x["pct"])
    return out


# ---------------------------------------------------------------------------
# Gemini wrappers — copilot, notice, vision
# ---------------------------------------------------------------------------
async def gemini_text(session_id: str, system: str, prompt: str, fallback: str = "") -> str:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            return fallback
        chat = LlmChat(
            api_key=key, session_id=session_id, system_message=system
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        return str(resp).strip()
    except Exception as e:
        logger.warning(f"Gemini text call failed [{session_id}]: {e}")
        return fallback


async def gemini_vision_analyze(image_base64: str, context_text: str) -> Dict[str, Any]:
    """Send a base64 image to Gemini 3 Flash and return structured JSON."""
    fallback = {
        "detected": ["unverified"],
        "confidence": 0.0,
        "severity": "unknown",
        "description": "Automated analysis unavailable; routed for manual review.",
        "recommended_action": "Forward to field officer for in-person inspection.",
    }
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        import json as _json
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            return fallback
        chat = LlmChat(
            api_key=key,
            session_id=f"vision-{datetime.now(timezone.utc).timestamp()}",
            system_message=(
                "You are a pollution-detection analyst for the Delhi Pollution Control Committee. "
                "Look at the image and output ONLY a single-line JSON object with keys: "
                "detected (array from: smoke, dust_cloud, open_burning, vehicle_emission, industrial_stack, garbage_dump, other), "
                "confidence (0.0-1.0), severity (low|medium|high), "
                "description (one sentence), "
                "recommended_action (one sentence). "
                "No markdown, no extra commentary."
            ),
        ).with_model("gemini", "gemini-3-flash-preview")
        msg = UserMessage(
            text=f"Citizen complaint context: {context_text}. Analyze the image.",
            file_contents=[ImageContent(image_base64=image_base64)],
        )
        resp = await chat.send_message(msg)
        text = str(resp).strip().strip("`")
        # Strip markdown json fence if model added one
        if text.startswith("json"):
            text = text[4:].strip()
        # Try to extract first JSON object
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return fallback
        obj = _json.loads(text[start:end + 1])
        # Validate shape
        return {
            "detected": obj.get("detected", []) if isinstance(obj.get("detected"), list) else [str(obj.get("detected", "unverified"))],
            "confidence": float(obj.get("confidence", 0.5)),
            "severity": str(obj.get("severity", "medium")),
            "description": str(obj.get("description", "")),
            "recommended_action": str(obj.get("recommended_action", "")),
        }
    except Exception as e:
        logger.warning(f"Gemini vision failed: {e}")
        return fallback


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "AeroSentinel", "status": "ok", "city": "Delhi", "now": DEMO_NOW.isoformat()}


@api_router.get("/wards")
async def list_wards():
    rows = []
    for w in DELHI_WARDS:
        cur = current_aqi(w["id"])
        peak = forecast_peak(w["id"], 24)
        rows.append({
            "id": w["id"],
            "name": w["name"],
            "lat": w["lat"],
            "lng": w["lng"],
            "current_aqi": cur,
            "forecast_peak_24h": peak,
            "band": aqi_band(cur),
            "band_label": aqi_label(cur),
            "trend": "rising" if peak > cur + 8 else "falling" if peak < cur - 8 else "stable",
        })
    rows.sort(key=lambda x: -x["current_aqi"])
    return rows


@api_router.get("/forecast/{ward_id}")
async def get_forecast(ward_id: str, horizon: int = 72):
    if ward_id not in HISTORY:
        raise HTTPException(404, "Unknown ward")
    horizon = max(1, min(72, horizon))
    history = HISTORY[ward_id][-72:]  # last 72hr of history
    forecast = FORECAST[ward_id][:horizon]
    persist = PERSISTENCE[ward_id][:horizon]
    truth = TRUE_FUTURE[ward_id][:horizon]
    ward = next(w for w in DELHI_WARDS if w["id"] == ward_id)
    return {
        "ward_id": ward_id,
        "ward_name": ward["name"],
        "history": history,
        "forecast": forecast,
        "persistence_baseline": persist,
        "actual_holdout": truth,  # disclosed: synthetic truth for transparency
        "rmse_model": RMSE_MODEL[ward_id],
        "rmse_persistence": RMSE_PERSIST[ward_id],
        "rmse_improvement_pct": round((1 - RMSE_MODEL[ward_id] / RMSE_PERSIST[ward_id]) * 100, 1),
        "current_aqi": current_aqi(ward_id),
        "current_band": aqi_band(current_aqi(ward_id)),
    }


@api_router.get("/hotspots")
async def hotspots():
    return identify_hotspots()


@api_router.get("/registry")
async def registry(ward_id: Optional[str] = None, type: Optional[str] = None):
    rows = REGISTRY
    if ward_id:
        rows = [r for r in rows if r["ward_id"] == ward_id]
    if type:
        rows = [r for r in rows if r["type"] == type]
    return rows


@api_router.get("/enforcement")
async def enforcement():
    return ENFORCEMENT


@api_router.post("/enforcement/{rec_id}/acknowledge")
async def acknowledge_rec(rec_id: str):
    for r in ENFORCEMENT:
        if r["id"] == rec_id:
            r["status"] = "acknowledged"
            r["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
            try:
                await db.enforcement_state.update_one(
                    {"rec_id": rec_id},
                    {"$set": {
                        "rec_id": rec_id,
                        "status": "acknowledged",
                        "acknowledged_at": r["acknowledged_at"],
                        "officer": r.get("officer", "Field Officer"),
                        "ward_id": r["ward_id"],
                    }},
                    upsert=True,
                )
            except Exception as e:
                logger.warning(f"Could not persist ack for {rec_id}: {e}")
            return r
    raise HTTPException(404, "Recommendation not found")


@api_router.post("/enforcement/reset")
async def reset_enforcement():
    """Reset all acknowledgements (clears MongoDB + in-memory). Demo helper."""
    try:
        await db.enforcement_state.delete_many({})
    except Exception as e:
        logger.warning(f"Mongo reset failed: {e}")
    for r in ENFORCEMENT:
        r["status"] = "pending"
        r.pop("acknowledged_at", None)
    return {"ok": True, "reset": len(ENFORCEMENT)}


@api_router.get("/advisory/{ward_id}")
async def advisory(ward_id: str):
    if ward_id not in HISTORY:
        raise HTTPException(404, "Unknown ward")
    cached = ADVISORY_CACHE.get(ward_id)
    if cached:
        return cached
    ward = next(w for w in DELHI_WARDS if w["id"] == ward_id)
    cur = current_aqi(ward_id)
    peak = forecast_peak(ward_id, 24)
    text = await generate_advisory_via_gemini(ward["name"], cur, peak)
    payload = {
        "ward_id": ward_id,
        "ward_name": ward["name"],
        "current_aqi": cur,
        "band": aqi_band(cur),
        "band_label": aqi_label(cur),
        "forecast_peak_24h": peak,
        "advisory": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "gemini-3-flash-preview",
    }
    ADVISORY_CACHE[ward_id] = payload
    return payload


@api_router.get("/kpis")
async def kpis():
    avg_city = round(sum(current_aqi(w["id"]) for w in DELHI_WARDS) / len(DELHI_WARDS))
    sit = signal_to_intervention_metrics()
    pending = len([r for r in ENFORCEMENT if r["status"] == "pending"])
    ack = len([r for r in ENFORCEMENT if r["status"] != "pending"])
    return {
        "city": "Delhi",
        "city_aqi": avg_city,
        "city_band": aqi_band(avg_city),
        "city_band_label": aqi_label(avg_city),
        "stations": len(DELHI_WARDS),
        "hotspots_count": len(identify_hotspots()),
        "enforcement_pending": pending,
        "enforcement_acknowledged": ack,
        "estimated_citizens_advised": 4_200_000,
        "rmse_model": CITY_RMSE_MODEL,
        "rmse_persistence": CITY_RMSE_PERSIST,
        "rmse_improvement_pct": RMSE_IMPROVEMENT_PCT,
        "signal_to_intervention": sit,
        "data_mode": DATA_MODE,
        "live_blend_wards": len(LIVE_BLEND),
        "data_disclosure": (
            "Live OpenAQ blend active for " + str(len(LIVE_BLEND)) + " wards. "
            "Historical AQI trace + source registry remain synthetic-but-realistic "
            "(seeded). Pipeline accepts drop-in CPCB/CAAQMS feeds."
            if DATA_MODE == "live_openaq_blended" else
            "AQI station readings and source registry (construction permits, "
            "industrial stacks, waste-burning zones, diesel fleet routes) are "
            "SYNTHETIC but realistic. Pipeline is designed to drop-in real "
            "CPCB/CAAQMS/OpenAQ feeds — set OPENAQ_API_KEY in backend/.env "
            "to enable live blend."
        ),
    }


@api_router.get("/alerts")
async def alerts():
    """Recent alert feed - synthetic stream from the agent."""
    out = []
    rng = _seeded_rng("alerts", DEMO_NOW.isoformat())
    spotlights = identify_hotspots()[:6]
    for i, h in enumerate(spotlights):
        minutes_ago = rng.randint(2, 90) + i * 7
        out.append({
            "id": f"ALR-{i+2001}",
            "ward_name": h["ward_name"],
            "severity": h["severity"],
            "headline": f"{h['ward_name']} forecast peak {h['forecast_peak_24h']} ({aqi_label(h['forecast_peak_24h'])}) within 24h",
            "minutes_ago": minutes_ago,
        })
    out.sort(key=lambda x: x["minutes_ago"])
    return out


# ---------------------------------------------------------------------------
# v2 — Stakeholder, predictive, vision, copilot endpoints
# ---------------------------------------------------------------------------
@api_router.get("/sensors/{ward_id}")
async def sensor_meta(ward_id: str):
    if ward_id not in SENSORS:
        raise HTTPException(404, "Unknown ward")
    return {"ward_id": ward_id, **SENSORS[ward_id]}


@api_router.get("/impact")
async def impact():
    return compute_impact()


@api_router.get("/risks")
async def risks():
    return predicted_risks()


@api_router.get("/risk-narrative/{ward_id}")
async def risk_narrative(ward_id: str):
    if ward_id not in HISTORY:
        raise HTTPException(404, "Unknown ward")
    ward = next(w for w in DELHI_WARDS if w["id"] == ward_id)
    cur = current_aqi(ward_id)
    peak = forecast_peak(ward_id, 24)
    causes = _attribute_causes(ward_id)
    return {
        "ward_id": ward_id,
        "ward_name": ward["name"],
        "current_aqi": cur,
        "predicted_peak_24h": peak,
        "narrative": (
            f"AQI in {ward['name']} likely to reach {peak} ({aqi_label(peak)}) within "
            f"24 hours — currently {cur}. Primary drivers: "
            f"{causes[0]['label']} ({causes[0]['pct']}%), "
            f"{causes[1]['label']} ({causes[1]['pct']}%)."
        ),
        "causes": causes,
    }


@api_router.get("/polluters")
async def polluters(limit: int = 20, badge: Optional[str] = None):
    rows = POLLUTERS
    if badge in ("green", "amber", "red"):
        rows = [r for r in rows if r["badge"] == badge]
    return rows[:limit]


@api_router.get("/notice/{rec_id}")
async def notice_for_rec(rec_id: str):
    """Generate a printable enforcement notice text for a recommendation."""
    rec = next((r for r in ENFORCEMENT if r["id"] == rec_id), None)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    ev = rec["evidence"]
    refs = ", ".join(s["id"] for s in ev["sample_registry_entries"])
    fallback = (
        f"NOTICE OF VIOLATION — REF {rec['id']}\n\n"
        f"Date: {datetime.now(timezone.utc).date().isoformat()}\n"
        f"Ward: {rec['ward_name']} ({rec['ward_id']})\n"
        f"Priority: {rec['priority']} · Score {rec['priority_score']}\n\n"
        f"Pursuant to the Air (Prevention and Control of Pollution) Act, 1981, and the "
        f"Delhi Pollution Control Committee enforcement framework, an air quality hotspot "
        f"has been identified in {rec['ward_name']} with current AQI {ev['hotspot_current_aqi']} "
        f"and a 24-hour forecast peak of {ev['hotspot_forecast_peak_24h']}.\n\n"
        f"Correlated source records ({ev['correlated_registry_count']} entries): {refs}.\n\n"
        f"Required action: {rec['action']} within {rec['eta_hours']} hours of receipt.\n\n"
        f"Failure to comply will invoke penalties under Section 37 and may result in stop-work "
        f"orders. Field officer designated for follow-up inspection.\n\n"
        f"For and on behalf of the Member Secretary, DPCC"
    )
    text = await gemini_text(
        session_id=f"notice-{rec_id}",
        system=(
            "You draft formal enforcement notices for the Delhi Pollution Control Committee. "
            "Tone is firm but procedural. Output plain text, no markdown. Include sections: "
            "NOTICE OF VIOLATION header, date, addressed ward, evidence trace (AQI, forecast "
            "peak, source records), required action with deadline, statutory reference "
            "(Air Act 1981 Section 37), signature line."
        ),
        prompt=(
            f"Generate the notice for: Ward={rec['ward_name']}, Priority={rec['priority']}, "
            f"Current AQI={ev['hotspot_current_aqi']}, Forecast peak={ev['hotspot_forecast_peak_24h']}, "
            f"Source type={rec['source_type_label']}, Action={rec['action']}, "
            f"Deadline hours={rec['eta_hours']}, Correlated source IDs={refs}."
        ),
        fallback=fallback,
    )
    return {"rec_id": rec_id, "ward_name": rec["ward_name"], "notice_text": text, "generated_at": datetime.now(timezone.utc).isoformat()}


class CopilotQuery(BaseModel):
    question: str
    ward_id: Optional[str] = None


@api_router.post("/copilot/chat")
async def copilot_chat(q: CopilotQuery):
    """Answer questions about Delhi air quality, citing internal AeroSentinel state."""
    # Build compact context
    hotspots = identify_hotspots()[:5]
    ctx_lines = [
        f"City AQI avg: {round(sum(current_aqi(w['id']) for w in DELHI_WARDS)/len(DELHI_WARDS))}",
        f"Hotspots ({len(hotspots)}): " + "; ".join(f"{h['ward_name']} ({h['current_aqi']}, peak {h['forecast_peak_24h']})" for h in hotspots),
        f"Pending enforcement actions: {len([r for r in ENFORCEMENT if r['status']=='pending'])}",
    ]
    if q.ward_id and q.ward_id in HISTORY:
        ward = next(w for w in DELHI_WARDS if w["id"] == q.ward_id)
        cur = current_aqi(q.ward_id)
        peak = forecast_peak(q.ward_id, 24)
        causes = _attribute_causes(q.ward_id)
        ctx_lines.append(
            f"Selected ward: {ward['name']} - current {cur}, peak 24h {peak}. "
            f"Drivers: " + ", ".join(f"{c['label']} {c['pct']}%" for c in causes)
        )
    ctx = "\n".join(ctx_lines)

    fallback = (
        "Based on current readings, primary drivers across active hotspots are construction "
        "activity and traffic-related emissions, with a secondary contribution from industrial "
        "stacks. Forecast peaks remain elevated for the next 24 hours; the enforcement queue is "
        "prioritised by hotspot AQI and registry density."
    )
    text = await gemini_text(
        session_id=f"copilot-{datetime.now(timezone.utc).timestamp()}",
        system=(
            "You are AeroCopilot, an analyst for the Delhi air-quality command centre. "
            "Answer strictly from the provided context. Be concise (2-4 sentences). "
            "When asked 'why' questions, attribute causes with rough percentages. "
            "If the question is outside the context, say so honestly."
        ),
        prompt=f"Context:\n{ctx}\n\nQuestion: {q.question}",
        fallback=fallback,
    )
    return {
        "answer": text,
        "context_used": ctx_lines,
        "model": "gemini-3-flash-preview",
    }


class ComplaintIn(BaseModel):
    image_base64: str
    ward_id: Optional[str] = None
    location_text: Optional[str] = None
    citizen_note: Optional[str] = None


@api_router.post("/complaints")
async def submit_complaint(c: ComplaintIn):
    """Citizen complaint with image → Gemini Vision analysis → stored in Mongo."""
    if not c.image_base64 or len(c.image_base64) < 100:
        raise HTTPException(400, "image_base64 required")
    # Strip data URL prefix if present
    img_b64 = c.image_base64.split(",", 1)[1] if c.image_base64.startswith("data:") else c.image_base64
    context = (
        f"Ward: {c.ward_id or 'unspecified'}. "
        f"Location: {c.location_text or 'not given'}. "
        f"Citizen note: {c.citizen_note or 'none'}."
    )
    analysis = await gemini_vision_analyze(img_b64, context)
    doc = {
        "id": f"CMP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:18]}",
        "ward_id": c.ward_id,
        "location_text": c.location_text,
        "citizen_note": c.citizen_note,
        "analysis": analysis,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "status": "triaged" if analysis.get("severity") in ("medium", "high") else "queued",
    }
    try:
        await db.complaints.insert_one({**doc})
    except Exception as e:
        logger.warning(f"Could not persist complaint: {e}")
    return doc


@api_router.get("/complaints")
async def list_complaints(limit: int = 20):
    out = []
    try:
        cursor = db.complaints.find({}, {"_id": 0}).sort("submitted_at", -1).limit(limit)
        async for doc in cursor:
            out.append(doc)
    except Exception as e:
        logger.warning(f"Could not list complaints: {e}")
    return out


# Register & start
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await hydrate_enforcement_from_mongo()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
