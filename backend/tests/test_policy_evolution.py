from datetime import datetime, timezone

from app.services.policy_evolution import generate_item_evolution


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
        "is_draft": False,
        "parsing_meta": {"ministry_match_score": 100.0},
        "created_at": now,
        "updated_at": now,
    }
    doc.update(overrides)
    result = await test_db["policy_items"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def test_generate_item_evolution_clusters_similar_earlier_item(test_db, seeded_ministry, seeded_issue):
    earlier = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Green Hydrogen Mission allocates funding for electrolyser manufacturing",
        description="Union Cabinet approves incentives for green hydrogen electrolyser production capacity.",
        item_date=datetime(2026, 4, 1),
    )
    later = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Green Hydrogen Mission expands electrolyser manufacturing incentives",
        description="Cabinet expands incentive scheme for green hydrogen electrolyser manufacturing capacity.",
        item_date=datetime(2026, 5, 1),
    )

    await generate_item_evolution(test_db, later["_id"])

    updated = await test_db["policy_items"].find_one({"_id": later["_id"]})
    evolution = updated.get("evolution")
    assert evolution is not None
    assert evolution["method"] == "tfidf-keyword-match-v1"
    assert len(evolution["stages"]) == 2
    assert evolution["stages"][0]["item_id"] == str(earlier["_id"])
    assert evolution["stages"][1]["item_id"] == str(later["_id"])
    assert evolution["stages"][0]["year"] == "Apr 2026"
    assert evolution["stages"][1]["year"] == "May 2026"
    assert evolution["theme_label"]
    assert evolution["synthesis"]


async def test_generate_item_evolution_leaves_unset_when_no_earlier_relatives(test_db, seeded_ministry, seeded_issue):
    unrelated_earlier = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Coastal Fisheries Subsidy scheme launched for small boat owners",
        description="Ministry launches subsidy programme for coastal fishing communities and boat owners.",
        item_date=datetime(2026, 4, 1),
    )
    item = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Semiconductor Fabrication Unit cleared for Gujarat plant",
        description="Cabinet clears proposal for a new semiconductor fabrication plant in Gujarat.",
        item_date=datetime(2026, 5, 1),
    )

    await generate_item_evolution(test_db, item["_id"])

    updated = await test_db["policy_items"].find_one({"_id": item["_id"]})
    assert updated.get("evolution") is None
    assert unrelated_earlier["_id"] is not None  # keeps the fixture referenced


async def test_generate_item_evolution_ignores_same_or_later_issues(test_db, seeded_ministry, seeded_issue):
    same_period = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Green Hydrogen Mission allocates funding for electrolyser manufacturing",
        description="Union Cabinet approves incentives for green hydrogen electrolyser production capacity.",
        item_date=datetime(2026, 5, 1),
    )
    item = await _insert_item(
        test_db, seeded_ministry["_id"], seeded_issue["_id"],
        title="Green Hydrogen Mission allocates funding for electrolyser manufacturing",
        description="Union Cabinet approves incentives for green hydrogen electrolyser production capacity.",
        item_date=datetime(2026, 5, 1),
    )

    await generate_item_evolution(test_db, item["_id"])

    updated = await test_db["policy_items"].find_one({"_id": item["_id"]})
    assert updated.get("evolution") is None
    assert same_period["_id"] is not None  # keeps the fixture referenced
