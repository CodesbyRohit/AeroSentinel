"""
AeroSentinel v2 - Backend Integration Tests
Tests the 8 new v2 endpoints + critical flows.
"""
import os
import io
import base64
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aqi-enforce.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _make_jpeg_b64():
    """Generate a real JPEG with visual features (smoke/burn-like)."""
    img = Image.new("RGB", (320, 240), (90, 110, 130))
    d = ImageDraw.Draw(img)
    # add gradient sky
    for y in range(240):
        d.line([(0, y), (320, y)], fill=(40 + y // 4, 50 + y // 5, 70 + y // 6))
    # smoke plume
    for i in range(60):
        x = 80 + i * 2
        y = 200 - i * 2
        d.ellipse((x, y, x + 50, y + 50), fill=(180, 180, 180))
        d.ellipse((x + 10, y - 10, x + 60, y + 40), fill=(220, 220, 220))
    # ground stack
    d.rectangle((90, 180, 130, 240), fill=(50, 50, 50))
    d.rectangle((30, 200, 320, 240), fill=(70, 60, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ---- /api/impact ----
class TestImpact:
    def test_impact_shape(self, session):
        r = session.get(f"{API}/impact", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["population_total", "population_affected",
                    "asthma_cases_prevented_today", "schools_in_risk_zone", "school_risk_pct"]:
            assert key in data, f"missing {key}: {data}"
        assert data["population_total"] > 0
        assert data["population_affected"] >= 0
        assert isinstance(data["school_risk_pct"], (int, float))


# ---- /api/risks ----
class TestRisks:
    def test_risks_list(self, session):
        r = session.get(f"{API}/risks", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        item = data[0]
        for key in ["ward_name", "current_aqi", "predicted_peak", "narrative"]:
            assert key in item
        assert isinstance(item["narrative"], str) and len(item["narrative"]) > 10


# ---- /api/risk-narrative/{ward_id} ----
class TestRiskNarrative:
    def test_av_narrative(self, session):
        r = session.get(f"{API}/risk-narrative/AV", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "narrative" in data and isinstance(data["narrative"], str)
        assert len(data["narrative"]) > 20
        causes = data.get("causes")
        assert isinstance(causes, list) and len(causes) == 5
        total = sum(c["pct"] for c in causes)
        assert 95 <= total <= 105, f"sum of pct not ~100: {total}"


# ---- /api/polluters ----
class TestPolluters:
    def test_polluters_all(self, session):
        r = session.get(f"{API}/polluters?limit=50", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) >= 10
        item = data[0]
        for key in ["id", "name", "ward_name", "compliance_score", "badge",
                    "violations_count", "penalties_inr", "trend"]:
            assert key in item, f"missing {key} in {item}"
        assert item["badge"] in ("green", "amber", "red")

    def test_polluters_filter_red(self, session):
        r = session.get(f"{API}/polluters?badge=red&limit=50", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for it in data:
            assert it["badge"] == "red", it


# ---- /api/sensors/{ward_id} ----
class TestSensors:
    def test_sensor_av(self, session):
        r = session.get(f"{API}/sensors/AV", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["source", "station_code", "last_update_minutes",
                    "confidence", "missing_data_pct_24h"]:
            assert key in data, f"missing {key}"
        assert 0.0 <= data["confidence"] <= 1.0


# ---- /api/notice/{rec_id} ----
class TestNotice:
    def test_notice_rec1001(self, session):
        # Get a real enforcement id first (REC-1001 should exist as first id)
        r0 = session.get(f"{API}/enforcement", timeout=10)
        assert r0.status_code == 200
        rec_ids = [x["id"] for x in r0.json()]
        assert "REC-1001" in rec_ids, f"REC-1001 not in {rec_ids[:5]}"

        r = session.get(f"{API}/notice/REC-1001", timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        txt = data.get("notice_text", "")
        assert "VIOLATION" in txt.upper(), f"no VIOLATION in notice: {txt[:200]}"
        # ward name presence (data["ward_name"] should appear in text)
        assert data["ward_name"].split()[0] in txt
        # at least one source id like XX-YY-001
        import re
        assert re.search(r"[A-Z]{2,3}-[A-Z]{2}-\d{3}", txt), f"no source ID in notice"


# ---- /api/copilot/chat ----
class TestCopilot:
    def test_copilot_general(self, session):
        r = session.post(f"{API}/copilot/chat",
                         json={"question": "Why did AQI spike today?"}, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("answer"), str) and len(data["answer"]) > 10
        assert isinstance(data.get("context_used"), list) and len(data["context_used"]) >= 1

    def test_copilot_with_ward(self, session):
        r = session.post(f"{API}/copilot/chat",
                         json={"question": "What is happening here?", "ward_id": "AV"},
                         timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("answer"), str) and len(data["answer"]) > 5


# ---- /api/complaints ----
class TestComplaints:
    def test_submit_and_list_complaint(self, session):
        img_b64 = _make_jpeg_b64()
        payload = {
            "image_base64": img_b64,
            "ward_id": "AV",
            "location_text": "near park",
            "citizen_note": "thick smoke from burning waste"
        }
        r = session.post(f"{API}/complaints", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"].startswith("CMP-"), data
        an = data.get("analysis", {})
        for key in ["detected", "confidence", "severity", "description", "recommended_action"]:
            assert key in an, f"missing {key} in analysis"

        # List and find it
        r2 = session.get(f"{API}/complaints?limit=20", timeout=15)
        assert r2.status_code == 200
        items = r2.json()
        assert any(it["id"] == data["id"] for it in items), "submitted complaint not in list"

    def test_complaint_rejects_empty_image(self, session):
        r = session.post(f"{API}/complaints",
                         json={"image_base64": "", "ward_id": "AV"}, timeout=10)
        assert r.status_code == 400


# ---- Existing v1 smoke (light coverage) ----
class TestV1Smoke:
    def test_wards(self, session):
        r = session.get(f"{API}/wards", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) == 14

    def test_kpis(self, session):
        r = session.get(f"{API}/kpis", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "city_aqi" in d
