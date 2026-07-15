from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from mongomock import Collection as MongoMockCollection
from mongomock import Database as MongoMockDatabase
from mongomock_motor import AsyncMongoMockClient
from pymongo.synchronous.collection import Collection as PyMongoCollection
from pymongo.synchronous.database import Database as PyMongoDatabase

from app.core.db import get_db
from app.core.security import hash_password
from app.main import app


@pytest.fixture(autouse=True)
def _gridfs_mock_compat():
    """motor's AsyncIOMotorGridFSBucket type-checks its db/collection args
    against real pymongo classes internally — mongomock's fake equivalents
    aren't subclasses, so upload tests (which store the source file in
    GridFS) fail that check. mongomock_motor ships enabled_gridfs_integration()
    for exactly this, but it patches gridfs.Database, a location that no
    longer exists in this pymongo version (moved to
    gridfs.synchronous.grid_file.Database) — so this patches the current
    location directly instead."""
    with patch("gridfs.synchronous.grid_file.Database", (PyMongoDatabase, MongoMockDatabase)), patch(
        "gridfs.synchronous.grid_file.Collection", (PyMongoCollection, MongoMockCollection)
    ):
        yield

FIXTURES_DIR = Path(__file__).parent / "fixtures"
ISSUE_I_PDF = FIXTURES_DIR / "sample_issue_1_may_1_15_2026.pdf"
ISSUE_II_PDF = FIXTURES_DIR / "sample_issue_2_may_16_31_2026.pdf"


DEFAULT_TEST_PILLARS = [
    "Economic Growth",
    "Infrastructure",
    "Human Development",
    "National Security",
    "Rural & Agri",
    "Misc",
]


@pytest.fixture
async def test_db():
    client = AsyncMongoMockClient()
    db = client["governance_watch_test"]
    await db["ministries"].create_index("name", unique=True)
    await db["admin_users"].create_index("email", unique=True)
    await db["pillars"].create_index("name", unique=True)
    now = datetime.now(timezone.utc)
    await db["pillars"].insert_many([{"name": name, "created_at": now} for name in DEFAULT_TEST_PILLARS])
    return db


@pytest.fixture
def override_db(test_db):
    async def _get_db():
        return test_db

    app.dependency_overrides[get_db] = _get_db
    yield test_db
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
async def client(override_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_user(test_db):
    doc = {
        "email": "admin@test.dev",
        "hashed_password": hash_password("adminpass"),
        "role": "admin",
    }
    result = await test_db["admin_users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


@pytest.fixture
async def admin_token(client, admin_user):
    resp = await client.post(
        "/api/auth/login", json={"email": "admin@test.dev", "password": "adminpass"}
    )
    return resp.json()["access_token"]


@pytest.fixture
async def seeded_ministry(test_db):
    doc = {
        "name": "Union Cabinet",
        "minister_name": "Narendra Modi (Chair)",
        "department": None,
        "seal_url": None,
        "icon": "Building2",
    }
    result = await test_db["ministries"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


@pytest.fixture
async def seeded_issue(test_db):
    doc = {
        "label": "May 2026 | Issue I",
        "period_start": datetime(2026, 5, 1),
        "period_end": datetime(2026, 5, 15),
        "pdf_url": "",
        "executive_summary": "",
        "contributors": [],
        "published_at": datetime.now(timezone.utc),
    }
    result = await test_db["issues"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


@pytest.fixture
async def seeded_item(test_db, seeded_ministry, seeded_issue):
    now = datetime.now(timezone.utc)
    doc = {
        "title": "ECLGS 5.0 approved for MSMEs and airlines",
        "description": "Union Cabinet approves guaranteed credit support for MSMEs.",
        "pillar": "Economic Growth",
        "subtype": "Policy Update",
        "status": "Initiated",
        "impact_level": "High",
        "ministry_id": seeded_ministry["_id"],
        "sources": [{"label": "PIB", "url": "https://pib.gov.in"}],
        "geography": {"scope": "national", "states": []},
        "tags": ["ECLGS", "MSME"],
        "issue_id": seeded_issue["_id"],
        "item_date": seeded_issue["period_start"],
        "key_features": None,
        "why_it_matters": None,
        "embedding": None,
        "parsing_meta": {"ministry_match_score": 100.0, "geo_match_terms": []},
        "created_at": now,
        "updated_at": now,
    }
    result = await test_db["policy_items"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc
