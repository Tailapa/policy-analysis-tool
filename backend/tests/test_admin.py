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
            "geography": "national",
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
            "geography": "state: Gujarat",
            "sources": [{"label": "PIB", "url": "https://pib.gov.in"}],
            "tags": ["Test"],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["ministry"] == "Union Cabinet"
    assert body["geography"] == "state: Gujarat"
    assert body["date"] == "24 Jun"
