from datetime import datetime, timezone


async def test_compare_by_pillar_count(client, test_db, seeded_ministry, seeded_issue):
    now = datetime.now(timezone.utc)
    for pillar in ["Economic Growth", "Economic Growth", "Infrastructure"]:
        await test_db["policy_items"].insert_one({
            "title": "Item", "description": "desc", "pillar": pillar,
            "subtype": "Policy Update", "status": "Initiated", "impact_level": "High",
            "ministry_id": seeded_ministry["_id"], "sources": [],
            "geography": {"scope": "national", "states": []}, "tags": [],
            "issue_id": seeded_issue["_id"], "item_date": datetime(2026, 5, 1),
            "key_features": None, "why_it_matters": None, "embedding": None,
            "parsing_meta": {"ministry_match_score": 0.0, "geo_match_terms": []},
            "created_at": now, "updated_at": now,
        })

    resp = await client.get(
        "/api/compare", params={"axis": "pillar", "ids": "Economic Growth,Infrastructure", "metric": "count"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["results"][0]["value"] == 2
    assert body["results"][1]["value"] == 1


async def test_compare_by_ministry_impact_metric(client, test_db, seeded_ministry, seeded_issue):
    now = datetime.now(timezone.utc)
    await test_db["policy_items"].insert_one({
        "title": "Item", "description": "desc", "pillar": "Economic Growth",
        "subtype": "Policy Update", "status": "Initiated", "impact_level": "High",
        "ministry_id": seeded_ministry["_id"], "sources": [],
        "geography": {"scope": "national", "states": []}, "tags": [],
        "issue_id": seeded_issue["_id"], "item_date": datetime(2026, 5, 1),
        "key_features": None, "why_it_matters": None, "embedding": None,
        "parsing_meta": {"ministry_match_score": 0.0, "geo_match_terms": []},
        "created_at": now, "updated_at": now,
    })

    resp = await client.get(
        "/api/compare",
        params={"axis": "ministry", "ids": str(seeded_ministry["_id"]), "metric": "impact"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["results"][0]["label"] == "Union Cabinet"
    assert body["results"][0]["value"] == 3  # High impact weight


async def test_compare_by_issue(client, test_db, seeded_ministry, seeded_issue):
    resp = await client.get(
        "/api/compare", params={"axis": "issue", "ids": str(seeded_issue["_id"])}
    )
    assert resp.status_code == 200
    assert resp.json()["results"][0]["label"] == seeded_issue["label"]
