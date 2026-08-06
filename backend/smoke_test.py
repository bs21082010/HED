import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)

print("== health ==")
r = client.get("/api/health")
assert r.status_code == 200 and r.json()["status"] == "ok", r.text

print("== dorms ==")
r = client.get("/api/dorms")
assert r.status_code == 200, r.text
dorms = r.json()
assert len(dorms) == 4, dorms
dorm_id = dorms[0]["id"]
print("dorms:", [(d["id"], d["name"], d["house"]["name"]) for d in dorms])

print("== dorm map ==")
r = client.get(f"/api/dorms/{dorm_id}")
assert r.status_code == 200, r.text
m = r.json()
assert m["rows"] == 4 and m["cols"] == 6
occupied = [b for b in m["beds"] if b["status"] != "empty"]
assert len(occupied) == 24
assert all(b["status"] == "normal" for b in occupied)
occupied_bed = next(b for b in occupied if b["status"] == "normal")
print("map ok, first occupied bed:", occupied_bed["id"], occupied_bed["cadet"]["name"], occupied_bed["status"])

print("== single click -> warning ==")
r = client.post(f"/api/beds/{occupied_bed['id']}/alerts", json={"type": "warning"})
assert r.status_code == 201, r.text
w = r.json()
assert w["type"] == "warning" and w["cadet_id"] == occupied_bed["cadet"]["id"]
print("warning alert id:", w["id"], "|", w["message"])

print("== double click -> red ==")
r = client.post(f"/api/beds/{occupied_bed['id']}/alerts", json={"type": "red"})
assert r.status_code == 201, r.text
red = r.json()
assert red["type"] == "red"
print("red alert id:", red["id"])

print("== ED schedule ==")
r = client.get("/api/ed")
assert r.status_code == 200, r.text
ed = r.json()
assert any(e["alert_id"] == red["id"] for e in ed), ed
print("ED entries:", len(ed), "| cadet:", ed[0]["cadet"]["name"])

print("== map reflects status ==")
r = client.get(f"/api/dorms/{dorm_id}")
m = r.json()
bed = next(b for b in m["beds"] if b["id"] == occupied_bed["id"])
assert bed["status"] == "red", bed
print("bed status now:", bed["status"])

print("== sms outbox ==")
r = client.get("/api/alerts?limit=50")
assert r.status_code == 200, r.text
outbox = Path(__file__).parent / "sms_outbox.log"
assert outbox.exists(), "mock SMS outbox missing"
body = outbox.read_text(encoding="utf-8")
assert f"Cadet {bed['cadet']['name']}" in body
assert "RED ALERT" in body
print("SMS log sample:", [l for l in body.strip().splitlines()][-1])

print("== resolve ==")
r = client.post(f"/api/alerts/{w['id']}/resolve")
assert r.status_code == 200 and r.json()["resolved_at"], r.text
print("warning resolved")

print("\nALL SMOKE TESTS PASSED")
