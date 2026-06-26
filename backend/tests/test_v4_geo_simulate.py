"""
Iteration 5 tests: source-attribution, satellite FIRMS, intervention catalog,
simulate-intervention, execute-plan, multi-agent metadata + regressions.
"""
import os
import pytest
import requests
from pathlib import Path


def _load_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE = _load_base()


# ---- source attribution ---------------------------------------------------
def test_source_attribution_av():
    r = requests.get(f"{BASE}/api/source-attribution/AV", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ward_id"] == "AV"
    assert d["ward_name"] == "Anand Vihar"
    assert isinstance(d["confidence"], (int, float))
    assert 0 <= d["confidence"] <= 1
    assert isinstance(d["causes"], list) and len(d["causes"]) >= 3
    for c in d["causes"]:
        assert "label" in c and "pct" in c
    assert isinstance(d["sources"], dict)
    # at least one cause label key in sources, value is a list
    for k, v in d["sources"].items():
        assert isinstance(v, list)


def test_source_attribution_unknown_ward():
    r = requests.get(f"{BASE}/api/source-attribution/ZZ", timeout=10)
    assert r.status_code == 404


# ---- satellite FIRMS ------------------------------------------------------
def test_satellite_fires():
    r = requests.get(f"{BASE}/api/satellite/fires", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["mode"] in ("synthetic_firms_format", "live_firms")
    assert d["count"] >= 8
    assert isinstance(d["detections"], list)
    assert len(d["detections"]) == d["count"]
    for det in d["detections"]:
        for k in ("latitude", "longitude", "brightness", "satellite",
                  "confidence", "frp", "cluster"):
            assert k in det, f"missing {k} in {det}"
        assert isinstance(det["cluster"], str) and len(det["cluster"]) > 0


# ---- intervention catalog -------------------------------------------------
def test_interventions_catalog():
    r = requests.get(f"{BASE}/api/interventions/catalog", timeout=10)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) == 7, f"expected 7 levers, got {len(items)}"
    for it in items:
        for k in ("id", "driver", "lever", "lead_time_h", "label", "queue"):
            assert k in it, f"missing {k} in {it}"


# ---- simulate-intervention ------------------------------------------------
def test_simulate_intervention_av_three():
    payload = {
        "ward_id": "AV",
        "interventions": ["suspend_construction", "restrict_diesel", "burning_cease_notice"],
    }
    r = requests.post(f"{BASE}/api/simulate-intervention", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ward_id"] == "AV"
    assert isinstance(d["expected_total_reduction"], int)
    assert d["expected_total_reduction"] > 0
    assert d["projected_aqi"] < d["forecast_peak_24h"]
    assert 0 <= d["confidence"] <= 1
    assert isinstance(d["breakdown"], list) and len(d["breakdown"]) == 3


def test_simulate_intervention_empty():
    r = requests.post(
        f"{BASE}/api/simulate-intervention",
        json={"ward_id": "AV", "interventions": []},
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json()["expected_total_reduction"] == 0


# ---- execute-plan ---------------------------------------------------------
def test_execute_plan_and_persists_to_enforcement():
    payload = {"ward_id": "AV", "interventions": ["suspend_construction", "restrict_diesel"]}
    r = requests.post(f"{BASE}/api/execute-plan", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["created_count"] == 2
    assert isinstance(d["created"], list) and len(d["created"]) == 2
    plan_ids = []
    for rec in d["created"]:
        assert rec["id"].startswith("PLAN-"), rec["id"]
        assert "priority" in rec
        assert isinstance(rec["expected_aqi_reduction"], int)
        assert rec["status"] == "dispatched"
        plan_ids.append(rec["id"])
    # confirm presence in /api/enforcement
    enf = requests.get(f"{BASE}/api/enforcement", timeout=15).json()
    enf_ids = {e["id"] for e in enf}
    for pid in plan_ids:
        assert pid in enf_ids, f"{pid} not in enforcement list"


# ---- multi-agent metadata -------------------------------------------------
def test_agents_metadata():
    r = requests.get(f"{BASE}/api/agents", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["agents"], list) and len(d["agents"]) == 6
    ids = {a["id"] for a in d["agents"]}
    assert ids == {"forecast", "attribution", "enforcement", "advisory", "vision", "copilot"}
    for a in d["agents"]:
        for k in ("name", "role", "model", "status"):
            assert k in a
    assert "Forecast" in d["orchestration"]
    assert "Attribution" in d["orchestration"]
    assert "Enforcement" in d["orchestration"]


# ---- regressions ----------------------------------------------------------
def test_alerts_no_args_returns_200():
    r = requests.get(f"{BASE}/api/alerts", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_sensors_av_returns_200():
    r = requests.get(f"{BASE}/api/sensors/AV", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["ward_id"] == "AV"


def test_registry_no_args_returns_200():
    r = requests.get(f"{BASE}/api/registry", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1
