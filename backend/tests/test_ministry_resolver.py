from app.services.ministry_resolver import resolve_ministry


async def test_resolve_ministry_does_not_confuse_unrelated_ministry_of_x_names(test_db):
    # Regression test: fuzz.WRatio scored "Ministry of Rural Development"
    # at 85.5 against *every* existing "Ministry of X" name (Finance, Coal,
    # Steel, ...) purely on the shared "Ministry of " prefix, tying right at
    # the default threshold and auto-linking a brand-new ministry to
    # whichever unrelated one process.extractOne saw first. fuzz.ratio must
    # correctly treat these as distinct and create a new entity instead.
    await test_db["ministries"].insert_one(
        {
            "name": "Ministry of Finance",
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "Building2",
            "category": "ministry",
        }
    )

    ministry_id, score = await resolve_ministry(test_db, "Ministry of Rural Development", threshold=85)

    doc = await test_db["ministries"].find_one({"_id": ministry_id})
    assert doc["name"] == "Ministry of Rural Development"
    assert doc["category"] == "ministry"
    assert score == 0.0


async def test_resolve_ministry_still_matches_case_variation(test_db):
    await test_db["ministries"].insert_one(
        {
            "name": "Ministry of Rural Development",
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "Building2",
            "category": "ministry",
        }
    )

    ministry_id, score = await resolve_ministry(test_db, "ministry of rural development", threshold=85)

    doc = await test_db["ministries"].find_one({"_id": ministry_id})
    assert doc["name"] == "Ministry of Rural Development"
    assert score == 100.0
