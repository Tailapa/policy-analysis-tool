from datetime import datetime, timezone


async def _insert_item(test_db, ministry_id, issue_id, **overrides):
    now = datetime.now(timezone.utc)
    doc = {
        "title": "Item",
        "description": "desc",
        "pillar": "Economic Growth",
        "subtype": "Policy Update",
        "status": "Initiated",
        "impact_level": "Medium",
        "ministry_id": ministry_id,
        "sources": [],
        "tags": [],
        "issue_id": issue_id,
        "item_date": datetime(2026, 5, 1),
        "key_features": None,
        "why_it_matters": None,
        "parsing_meta": {"ministry_match_score": 0.0},
        "created_at": now,
        "updated_at": now,
    }
    doc.update(overrides)
    await test_db["policy_items"].insert_one(doc)


async def test_stats_summary(client, test_db, seeded_ministry, seeded_issue):
    await _insert_item(test_db, seeded_ministry["_id"], seeded_issue["_id"], subtype="Policy Update", impact_level="High")
    await _insert_item(test_db, seeded_ministry["_id"], seeded_issue["_id"], subtype="Announcement", impact_level="Low")

    resp = await client.get("/api/stats/summary", params={"issue_id": str(seeded_issue["_id"])})
    body = resp.json()
    assert body["total"] == 2
    assert body["policy_updates"] == 1
    assert body["announcements"] == 1
    assert body["high_impact"] == 1


async def test_stats_ministries_sorted_desc(client, test_db, seeded_ministry, seeded_issue):
    other = await test_db["ministries"].insert_one({
        "name": "Ministry of Finance", "minister_name": None, "department": None,
        "seal_url": None, "icon": "Coins",
    })

    await _insert_item(test_db, seeded_ministry["_id"], seeded_issue["_id"])
    await _insert_item(test_db, other.inserted_id, seeded_issue["_id"])
    await _insert_item(test_db, other.inserted_id, seeded_issue["_id"])

    resp = await client.get("/api/stats/ministries")
    body = resp.json()
    assert body[0]["name"] == "Ministry of Finance"
    assert body[0]["count"] == 2
    assert body[1]["count"] == 1


async def test_stats_pillars_includes_all_six(client, test_db, seeded_ministry, seeded_issue):
    await _insert_item(test_db, seeded_ministry["_id"], seeded_issue["_id"], pillar="Rural & Agri")

    resp = await client.get("/api/stats/pillars")
    body = resp.json()
    assert len(body) == 6
    pillars = {row["pillar"] for row in body}
    assert pillars == {
        "Economic Growth", "Infrastructure", "Human Development",
        "National Security", "Rural & Agri", "Misc",
    }
    rural = next(row for row in body if row["pillar"] == "Rural & Agri")
    assert rural["count"] == 1
    econ = next(row for row in body if row["pillar"] == "Economic Growth")
    assert econ["count"] == 0
