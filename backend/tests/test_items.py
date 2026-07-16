import pytest


async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_list_items_shape_matches_frontend(client, seeded_item):
    resp = await client.get("/api/items")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["total_pages"] == 1

    item = body["items"][0]
    assert set(item.keys()) == {
        "id", "issueId", "title", "description", "ministry", "linkedMinistries", "theme",
        "subtype", "status", "impact", "date", "dateValue", "geography",
        "sources", "tags", "isDraft", "draftVerification", "financialOutlay", "needsMinistryReview",
    }
    assert item["ministry"] == "Union Cabinet"
    assert item["theme"] == "Economic Growth"
    assert item["impact"] == "High"
    assert item["geography"] == "national"
    assert item["date"] == "1 May"
    assert item["dateValue"] == 1


async def test_list_items_filters(client, seeded_item):
    resp = await client.get("/api/items", params={"pillar": "Infrastructure"})
    assert resp.json()["total"] == 0

    resp = await client.get("/api/items", params={"pillar": "Economic Growth", "status": "Initiated"})
    assert resp.json()["total"] == 1

    resp = await client.get("/api/items", params={"impact_level": "Low"})
    assert resp.json()["total"] == 0


async def test_get_item_404(client):
    resp = await client.get("/api/items/000000000000000000000000")
    assert resp.status_code == 404

    resp = await client.get("/api/items/not-an-object-id")
    assert resp.status_code == 404


async def test_get_item_by_id(client, seeded_item):
    item_id = str(seeded_item["_id"])
    resp = await client.get(f"/api/items/{item_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == item_id


async def test_state_geography_serialization(client, test_db, seeded_ministry, seeded_issue):
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    await test_db["policy_items"].insert_one({
        "title": "State item",
        "description": "desc",
        "pillar": "Infrastructure",
        "subtype": "Announcement",
        "status": "Announced",
        "impact_level": "Medium",
        "ministry_id": seeded_ministry["_id"],
        "sources": [{"label": "PIB", "url": None}],
        "geography": {"scope": "state", "states": ["Gujarat"]},
        "tags": [],
        "issue_id": seeded_issue["_id"],
        "item_date": seeded_issue["period_start"],
        "key_features": None,
        "why_it_matters": None,
        "embedding": None,
        "parsing_meta": {"ministry_match_score": 0.0, "geo_match_terms": ["Gujarat"]},
        "created_at": now,
        "updated_at": now,
    })

    resp = await client.get("/api/items")
    item = resp.json()["items"][0]
    assert item["geography"] == "state: Gujarat"
    assert item["sources"][0]["url"] == ""


async def test_ministries_list_and_detail(client, seeded_ministry, seeded_item):
    resp = await client.get("/api/ministries")
    assert resp.status_code == 200
    ministries = resp.json()
    assert len(ministries) == 1
    assert ministries[0]["itemCount"] == 1
    assert ministries[0]["minister"] == "Narendra Modi (Chair)"

    ministry_id = ministries[0]["id"]
    resp = await client.get(f"/api/ministries/{ministry_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["itemCount"] == 1
    assert len(detail["items"]) == 1


async def test_issues_list_and_detail(client, seeded_issue, seeded_item):
    resp = await client.get("/api/issues")
    assert resp.status_code == 200
    issues = resp.json()
    assert len(issues) == 1
    assert issues[0]["itemsCount"] == 1
    assert issues[0]["dateRange"] == "1–15 May 2026"

    issue_id = issues[0]["id"]
    resp = await client.get(f"/api/issues/{issue_id}")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1


async def test_states_endpoint(client, test_db, seeded_ministry, seeded_issue):
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    await test_db["policy_items"].insert_one({
        "title": "Mizoram item",
        "description": "desc",
        "pillar": "Rural & Agri",
        "subtype": "Announcement",
        "status": "Announced",
        "impact_level": "Medium",
        "ministry_id": seeded_ministry["_id"],
        "sources": [],
        "geography": {"scope": "state", "states": ["Mizoram"]},
        "tags": [],
        "issue_id": seeded_issue["_id"],
        "item_date": seeded_issue["period_start"],
        "key_features": None,
        "why_it_matters": None,
        "embedding": None,
        "parsing_meta": {"ministry_match_score": 0.0, "geo_match_terms": ["Mizoram"]},
        "created_at": now,
        "updated_at": now,
    })

    resp = await client.get("/api/states/Mizoram/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = await client.get("/api/states/Kerala/items")
    assert resp.json() == []
