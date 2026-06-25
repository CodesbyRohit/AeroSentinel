"""
Iteration 4 polish tests: forecast_accuracy KPIs, hybrid disclosure fields,
recommended-actions endpoint + regression sanity on v1/v2 endpoints.
"""
import os
import pytest
import requests

def _load_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        from pathlib import Path
        for line in Path("/app/frontend/.env").read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE = _load_base()


# --- new credibility KPIs --------------------------------------------------
def test_kpis_has_forecast_accuracy_and_disclosure():
    r = requests.get(f"{BASE}/api/kpis", timeout=15)
    assert r.status_code == 200
    d = r.json()
    # accuracy
    assert "forecast_accuracy_pct" in d
    assert "baseline_accuracy_pct" in d
    assert isinstance(d["forecast_accuracy_pct"], (int, float))
    assert 80 <= d["forecast_accuracy_pct"] <= 100, d["forecast_accuracy_pct"]
    # rmse still present
    assert "rmse_model" in d
    # disclosure
    assert d["disclosure_mode"] == "Hybrid Demonstration Mode" or "Hybrid" in d["disclosure_mode"]
    assert isinstance(d["disclosure_live"], list) and len(d["disclosure_live"]) >= 1
    joined_live = " ".join(d["disclosure_live"]).lower()
    assert "cpcb" in joined_live or "openaq" in joined_live
    assert isinstance(d["disclosure_simulated"], list) and len(d["disclosure_simulated"]) == 4
    sim_join = " ".join(d["disclosure_simulated"]).lower()
    assert "enforcement" in sim_join
    assert "registry" in sim_join
    assert "inspector" in sim_join
    assert "scorecard" in sim_join
    assert isinstance(d["disclosure_reason"], str)
    assert "government" in d["disclosure_reason"].lower()


# --- recommended-actions ---------------------------------------------------
def test_recommended_actions_av():
    r = requests.get(f"{BASE}/api/recommended-actions/AV", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["ward_name"] == "Anand Vihar"
    assert "current_aqi" in d
    assert "forecast_peak_24h" in d
    assert isinstance(d["actions"], list)
    assert len(d["actions"]) == 4
    for a in d["actions"]:
        for k in ("rank", "driver", "driver_pct", "action", "expected_reduction", "lead_time_hours", "executable"):
            assert k in a, f"missing {k} in {a}"
    assert isinstance(d["expected_total_reduction"], int)
    assert d["expected_total_reduction"] > 0
    assert d["projected_aqi_post_intervention"] < d["forecast_peak_24h"]


def test_recommended_actions_unknown_ward():
    r = requests.get(f"{BASE}/api/recommended-actions/ZZ", timeout=10)
    assert r.status_code == 404


# --- regression sanity -----------------------------------------------------
@pytest.mark.parametrize("path", [
    "/api/wards",
    "/api/forecast/AV",
    "/api/enforcement",
    "/api/advisory/AV",
    "/api/complaints",
    "/api/hotspots",
    "/api/impact",
    "/api/risks",
    "/api/polluters",
])
def test_regression_get_endpoints(path):
    r = requests.get(f"{BASE}{path}", timeout=20)
    assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_copilot_chat():
    r = requests.post(
        f"{BASE}/api/copilot/chat",
        json={"question": "Why is Anand Vihar severe?", "ward_id": "AV"},
        timeout=30,
    )
    assert r.status_code == 200
    d = r.json()
    assert "answer" in d and isinstance(d["answer"], str) and len(d["answer"]) > 10
    assert isinstance(d["context_used"], list) and len(d["context_used"]) >= 1


def test_notice_endpoint():
    enf = requests.get(f"{BASE}/api/enforcement", timeout=10).json()
    assert len(enf) > 0
    rec_id = enf[0]["id"]
    r = requests.get(f"{BASE}/api/notice/{rec_id}", timeout=30)
    assert r.status_code == 200
    assert "notice_text" in r.json()
