from app.core.security import verify_password
from app.services.admin_sync import parse_admin_users, sync_env_admins


def test_parse_admin_users_basic():
    assert parse_admin_users("admin:admin") == [("admin", "admin")]


def test_parse_admin_users_multiple():
    assert parse_admin_users("admin:pass1, editor@example.com:pass2") == [
        ("admin", "pass1"),
        ("editor@example.com", "pass2"),
    ]


def test_parse_admin_users_skips_malformed_entries():
    assert parse_admin_users("admin:admin, no-colon-here, :missing-email, trailing-colon:") == [
        ("admin", "admin"),
    ]


def test_parse_admin_users_empty():
    assert parse_admin_users("") == []


async def test_sync_env_admins_creates_and_updates(test_db, monkeypatch):
    from app.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("ADMIN_USERS", "admin:firstpass,second@admin.dev:secondpass")

    count = await sync_env_admins(test_db)
    assert count == 2

    doc = await test_db["admin_users"].find_one({"email": "admin"})
    assert verify_password("firstpass", doc["hashed_password"])
    assert doc["role"] == "admin"

    # rotating the password and re-syncing must update the existing user,
    # not create a duplicate
    monkeypatch.setenv("ADMIN_USERS", "admin:rotatedpass")
    get_settings.cache_clear()
    await sync_env_admins(test_db)

    total_admins = await test_db["admin_users"].count_documents({})
    assert total_admins == 2  # "admin" updated in place, "second@admin.dev" untouched

    doc = await test_db["admin_users"].find_one({"email": "admin"})
    assert verify_password("rotatedpass", doc["hashed_password"])

    get_settings.cache_clear()
