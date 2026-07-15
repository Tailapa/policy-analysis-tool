from .conftest import ISSUE_I_PDF, ISSUE_II_PDF


async def test_upload_issue_i_produces_exactly_54_items(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files=[("files", (ISSUE_I_PDF.name, f, "application/pdf"))],
        )

    assert resp.status_code == 201
    result = resp.json()["results"][0]
    assert result["success"] is True
    assert result["item_count"] == 54
    assert len(result["items"]) == 54
    assert result["issue_label"] == "May 2026 | Issue I"

    # exact pillar breakdown from backend-spec.md §10
    from collections import Counter
    pillar_counts = Counter(item["theme"] for item in result["items"])
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
            files=[("files", (ISSUE_I_PDF.name, f, "application/pdf"))],
        )
    result = upload_resp.json()["results"][0]
    item_id = result["items"][0]["id"]

    resp = await client.get(f"/api/items/{item_id}")
    assert resp.status_code == 200

    resp = await client.get("/api/items", params={"issue_id": result["issue_id"]})
    assert resp.json()["total"] == 54


async def test_upload_state_tagging(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files=[("files", (ISSUE_I_PDF.name, f, "application/pdf"))],
        )

    items = resp.json()["results"][0]["items"]
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
            files=[("files", (ISSUE_I_PDF.name, f, "application/pdf"))],
        )

    after = await test_db["ministries"].count_documents({})
    assert after > before


async def test_upload_issue_ii_also_parses_cleanly(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_II_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files=[("files", (ISSUE_II_PDF.name, f, "application/pdf"))],
        )
    assert resp.status_code == 201
    result = resp.json()["results"][0]
    assert result["success"] is True
    assert result["issue_label"] == "May 2026 | Issue II"
    assert result["item_count"] > 0


async def test_upload_rejects_unsupported_file_type(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = await client.post(
        "/api/admin/issues/upload",
        headers=headers,
        files=[("files", ("report.txt", b"not a real report", "text/plain"))],
    )
    # The batch endpoint itself always returns 201 — per-file failures are
    # reported inside `results` so one bad file in a batch doesn't mask the
    # others' success.
    assert resp.status_code == 201
    result = resp.json()["results"][0]
    assert result["success"] is False
    assert result["error"]


async def test_upload_requires_admin(client):
    with open(ISSUE_I_PDF, "rb") as f:
        resp = await client.post(
            "/api/admin/issues/upload",
            files=[("files", (ISSUE_I_PDF.name, f, "application/pdf"))],
        )
    assert resp.status_code == 401


async def test_upload_multiple_files_in_one_batch(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f1, open(ISSUE_II_PDF, "rb") as f2:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files=[
                ("files", (ISSUE_I_PDF.name, f1, "application/pdf")),
                ("files", (ISSUE_II_PDF.name, f2, "application/pdf")),
            ],
        )

    assert resp.status_code == 201
    results = resp.json()["results"]
    assert len(results) == 2
    assert all(r["success"] for r in results)
    assert {r["issue_label"] for r in results} == {"May 2026 | Issue I", "May 2026 | Issue II"}


async def test_upload_batch_continues_after_one_file_fails(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(ISSUE_I_PDF, "rb") as f1:
        resp = await client.post(
            "/api/admin/issues/upload",
            headers=headers,
            files=[
                ("files", ("bad.txt", b"not a real report", "text/plain")),
                ("files", (ISSUE_I_PDF.name, f1, "application/pdf")),
            ],
        )

    assert resp.status_code == 201
    results = resp.json()["results"]
    assert len(results) == 2
    assert results[0]["success"] is False
    assert results[1]["success"] is True
    assert results[1]["item_count"] == 54
