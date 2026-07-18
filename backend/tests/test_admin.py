async def test_admin_routes_require_token(client):
    resp = await client.get("/api/admin/ministries")
    assert resp.status_code == 401

    resp = await client.get("/api/admin/ministries", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


async def test_login_wrong_password(client, admin_user):
    resp = await client.post("/api/auth/login", json={"email": "admin@test.dev", "password": "wrong"})
    assert resp.status_code == 401


async def test_login_success(client, admin_user):
    resp = await client.post("/api/auth/login", json={"email": "admin@test.dev", "password": "adminpass"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["role"] == "admin"


async def test_ministry_crud_roundtrip(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.post(
        "/api/admin/ministries",
        headers=headers,
        json={"name": "Ministry of Testing", "minister_name": "Test Minister"},
    )
    assert resp.status_code == 201
    ministry_id = resp.json()["id"]
    assert resp.json()["minister"] == "Test Minister"

    resp = await client.post(
        "/api/admin/ministries",
        headers=headers,
        json={"name": "Ministry of Testing"},
    )
    assert resp.status_code == 409

    resp = await client.patch(
        f"/api/admin/ministries/{ministry_id}",
        headers=headers,
        json={"minister_name": "New Minister"},
    )
    assert resp.status_code == 200
    assert resp.json()["minister"] == "New Minister"

    resp = await client.get("/api/ministries")
    names = [m["name"] for m in resp.json()]
    assert "Ministry of Testing" in names

    resp = await client.delete(f"/api/admin/ministries/{ministry_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get("/api/ministries")
    names = [m["name"] for m in resp.json()]
    assert "Ministry of Testing" not in names


async def test_manual_item_create_requires_existing_issue(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/admin/items",
        headers=headers,
        json={
            "title": "Test Item",
            "description": "Test description",
            "ministry": "Ministry of Testing",
            "theme": "Economic Growth",
            "status": "Initiated",
            "impact": "Medium",
            "date": "24 Jun",
            "dateValue": 24,
            "sources": [{"label": "PIB", "url": "https://pib.gov.in"}],
            "tags": ["Test"],
        },
    )
    assert resp.status_code == 400


async def test_manual_item_create_success(client, admin_token, seeded_issue):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/admin/items",
        headers=headers,
        json={
            "title": "Test Item",
            "description": "Test description",
            "ministry": "Union Cabinet",
            "theme": "Economic Growth",
            "status": "Initiated",
            "impact": "Medium",
            "date": "24 Jun",
            "dateValue": 24,
            "sources": [{"label": "PIB", "url": "https://pib.gov.in"}],
            "tags": ["Test"],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["ministry"] == "Union Cabinet"
    assert body["date"] == "24 Jun"


async def test_merge_ministry_repoints_items_and_deletes_source(client, admin_token, test_db, seeded_ministry, seeded_issue):
    headers = {"Authorization": f"Bearer {admin_token}"}

    dept = await test_db["misc_entities"].insert_one(
        {
            "name": "Department of Consumer Affairs",
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "AlertTriangle",
            "category": "misc",
        }
    )
    other = await test_db["ministries"].insert_one(
        {
            "name": "Ministry of Testing",
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "Building2",
            "category": "ministry",
        }
    )

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    primary_item = await test_db["policy_items"].insert_one(
        {
            "title": "Primary-linked item", "description": "desc", "pillar": "Economic Growth",
            "subtype": "Announcement", "status": "Announced", "impact_level": "Medium",
            "ministry_id": dept.inserted_id, "additional_ministry_ids": [], "sources": [], "tags": [],
            "issue_id": seeded_issue["_id"], "item_date": seeded_issue["period_start"],
            "key_features": None, "why_it_matters": None, "is_draft": False,
            "parsing_meta": {"ministry_match_score": 0.0}, "created_at": now, "updated_at": now,
        }
    )
    additional_item = await test_db["policy_items"].insert_one(
        {
            "title": "Additional-linked item", "description": "desc", "pillar": "Economic Growth",
            "subtype": "Announcement", "status": "Announced", "impact_level": "Medium",
            "ministry_id": other.inserted_id, "additional_ministry_ids": [dept.inserted_id], "sources": [], "tags": [],
            "issue_id": seeded_issue["_id"], "item_date": seeded_issue["period_start"],
            "key_features": None, "why_it_matters": None, "is_draft": False,
            "parsing_meta": {"ministry_match_score": 0.0}, "created_at": now, "updated_at": now,
        }
    )

    resp = await client.post(
        f"/api/admin/ministries/{dept.inserted_id}/merge",
        headers=headers,
        json={"target_id": str(seeded_ministry["_id"])},
    )
    assert resp.status_code == 200
    assert resp.json()["items_moved"] == 2

    updated_primary = await test_db["policy_items"].find_one({"_id": primary_item.inserted_id})
    assert updated_primary["ministry_id"] == seeded_ministry["_id"]

    updated_additional = await test_db["policy_items"].find_one({"_id": additional_item.inserted_id})
    assert updated_additional["additional_ministry_ids"] == [seeded_ministry["_id"]]

    assert await test_db["misc_entities"].find_one({"_id": dept.inserted_id}) is None


async def test_merge_ministry_rejects_self_merge(client, admin_token, seeded_ministry):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        f"/api/admin/ministries/{seeded_ministry['_id']}/merge",
        headers=headers,
        json={"target_id": str(seeded_ministry["_id"])},
    )
    assert resp.status_code == 422
