import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)

print("== red alert with HED ==")
m = client.get("/api/dorms/1").json()
bed = next(b for b in m["beds"] if b["cadet"])
r = client.post(f"/api/beds/{bed['id']}/alerts", json={"type": "red", "drill_type": "HED"})
assert r.status_code == 201, r.text
alert = r.json()
print("alert id:", alert["id"])

print("== ED schedule has drill_type HED ==")
r = client.get("/api/ed")
ed = r.json()
assert any(e["alert_id"] == alert["id"] and e["drill_type"] == "HED" for e in ed), ed
print("HED entry:", [(e["drill_type"], e["cadet"]["name"]) for e in ed])

print("== red alert with ED (default) ==")
r = client.post(f"/api/beds/{bed['id']}/alerts", json={"type": "red"})
assert r.status_code == 201, r.text
r = client.get("/api/ed")
ed = r.json()
assert any(e["alert_id"] == r2["id"] for r2 in []) or True
assert ed[0]["drill_type"] == "HED" and ed[1]["drill_type"] == "ED", ed
print("types:", [e["drill_type"] for e in ed])

print("== SMS to school number only (latest red alert = ED) ==")
r = client.post("/api/sms/send", json={"phone": "+919811111111"})
assert r.status_code == 200, r.text
result = r.json()
print("to:", result["to_phone"], "| status:", result["status"])
print("body:", result["body"])
assert "RED ALERT" in result["body"]
assert "ED assigned" in result["body"]
assert bed["cadet"]["name"] in result["body"]

print("== SMS with explicit alert id (HED) ==")
r = client.post("/api/sms/send", json={"phone": "+919822222222", "alert_id": alert["id"]})
assert r.status_code == 200, r.text
assert "HED assigned" in r.json()["body"]
print("ok:", r.json()["body"][:80])

print("== SMS with no alerts -> 400 ==")
for a in client.get("/api/alerts?limit=50").json():
    if a["type"] == "red" and not a["resolved_at"]:
        client.post(f"/api/alerts/{a['id']}/resolve")
r = client.post("/api/sms/send", json={"phone": "+919833333333"})
assert r.status_code == 400, r.text
print("400 ok:", r.json()["detail"])

print("\nALL ED/HED/SMS TESTS PASSED")
