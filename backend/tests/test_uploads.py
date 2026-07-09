from .conftest import ISSUE_I_PDF, ISSUE_II_PDF


async def test_upload_issue_i_produces_exactly_54_items(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files={"file": (ISSUE_I_PDF.name, f, "application/pdf")},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["item_count"] == 54
    assert len(body["items"]) == 54
    assert body["issue_label"] == "May 2026 | Issue I"

    # exact pillar breakdown from backend-spec.md §10
    from collections import Counter
    pillar_counts = Counter(item["theme"] for item in body["items"])
    assert pillar_counts == {
        "Economic Growth": 14,
        "Infrastructure": 13,
        "Human Development": 3,
        "National Security": 8,
        "Rural & Agri": 2,
        "Misc": 14,
    }


async def test_upload_items_immediately_queryable(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f:
        upload_resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files={"file": (ISSUE_I_PDF.name, f, "application/pdf")},
        )
    item_id = upload_resp.json()["items"][0]["id"]

    resp = await client.get(f"/api/items/{item_id}")
    assert resp.status_code == 200

    resp = await client.get("/api/items", params={"issue_id": upload_resp.json()["issue_id"]})
    assert resp.json()["total"] == 54


async def test_upload_state_tagging(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files={"file": (ISSUE_I_PDF.name, f, "application/pdf")},
        )

    items = resp.json()["items"]
    mizoram_items = [i for i in items if "Mizoram" in i["title"]]
    assert mizoram_items
    assert mizoram_items[0]["geography"] == "state: Mizoram"

    national_items = [i for i in items if "ECLGS" in i["title"]]
    assert national_items[0]["geography"] == "national"


async def test_upload_creates_ministries_as_needed(client, admin_token, test_db):
    headers = {"Authorization": f"Bearer {admin_token}"}
    before = await test_db["ministries"].count_documents({})

    with open(ISSUE_I_PDF, "rb") as f:
        await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files={"file": (ISSUE_I_PDF.name, f, "application/pdf")},
        )

    after = await test_db["ministries"].count_documents({})
    assert after > before


async def test_upload_issue_ii_also_parses_cleanly(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_II_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files={"file": (ISSUE_II_PDF.name, f, "application/pdf")},
        )
    assert resp.status_code == 201
    assert resp.json()["issue_label"] == "May 2026 | Issue II"
    assert resp.json()["item_count"] > 0


async def test_upload_rejects_unsupported_file_type(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/admin/issues/upload",
        headers=headers,
        files={"file": ("report.txt", b"not a real report", "text/plain")},
    )
    assert resp.status_code == 422


async def test_upload_requires_admin(client):
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            files={"file": (ISSUE_I_PDF.name, f, "application/pdf")},
        )
    assert resp.status_code == 401
