import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)

print("== add bed ==")
r = client.post("/api/beds/dorms/7", json={"row": 4, "col": 1, "location": "Corner near window"})
assert r.status_code == 201, r.text
new_bed = r.json()
assert new_bed["location"] == "Corner near window"
print("added bed id:", new_bed["id"], "->", new_bed["location"])

print("== duplicate add rejected ==")
r = client.post("/api/beds/dorms/7", json={"row": 4, "col": 1})
assert r.status_code == 409, r.text
print("409 ok")

print("== move bed ==")
r = client.put(f"/api/beds/{new_bed['id']}", json={"row": 4, "col": 2})
assert r.status_code == 200, r.text
print("moved to 4,2 ->", r.json()["row"], r.json()["col"])

print("== collision rejected ==")
r = client.put(f"/api/beds/{new_bed['id']}", json={"row": 1, "col": 1})
assert r.status_code == 409, r.text
print("409 ok")

print("== edit location only ==")
r = client.put(f"/api/beds/{new_bed['id']}", json={"location": "Near door"})
assert r.status_code == 200 and r.json()["location"] == "Near door", r.text
print("location updated")

print("== delete occupied rejected ==")
occupied = client.get("/api/dorms/1").json()["beds"][0]
r = client.delete(f"/api/beds/{occupied['id']}")
assert r.status_code == 409, r.text
print("409 ok")

print("== delete empty ==")
r = client.delete(f"/api/beds/{new_bed['id']}")
assert r.status_code == 204, r.text
print("deleted")

print("== submit layout (scan simulation) ==")
layout_beds = [
    {"row": 1, "col": 1, "location": "Window side"},
    {"row": 1, "col": 2, "location": "Window side"},
    {"row": 2, "col": 1, "location": "Door side"},
    {"row": 2, "col": 2, "location": "Door side"},
]
r = client.post("/api/dorms/7/layout", json={"rows": 2, "cols": 2, "beds": layout_beds})
assert r.status_code == 200, r.text
m = r.json()
assert m["rows"] == 2 and m["cols"] == 2 and len(m["beds"]) == 4, m
print("new grid:", m["rows"], "x", m["cols"], "| beds:", len(m["beds"]))
print("beds:", [(b["row"], b["col"], b["location"], "occupied" if b["cadet"] else "empty") for b in m["beds"]])

print("== duplicate in layout rejected ==")
r = client.post(
    "/api/dorms/7/layout",
    json={"rows": 2, "cols": 2, "beds": [{"row": 1, "col": 1}, {"row": 1, "col": 1}]},
)
assert r.status_code == 400, r.text
print("400 ok")

print("\nALL BED/LAYOUT TESTS PASSED")
