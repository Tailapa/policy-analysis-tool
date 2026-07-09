from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.db import COLLECTIONS
from app.core.security import hash_password


def parse_admin_users(raw: str) -> list[tuple[str, str]]:
    """Parse the ADMIN_USERS env var: comma-separated 'email:password' pairs.
    Malformed entries (no colon, empty email/password) are skipped rather
    than raising — a typo in one pair shouldn't take down the whole app."""
    pairs: list[tuple[str, str]] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry or ":" not in entry:
            continue
        email, _, password = entry.partition(":")
        email = email.strip()
        password = password.strip()
        if email and password:
            pairs.append((email, password))
    return pairs


async def sync_env_admins(db: AsyncIOMotorDatabase) -> int:
    """Upsert every ADMIN_USERS pair into admin_users on startup, so admin
    credentials are managed via env vars/config rather than a one-off
    seed script — restart the backend after editing ADMIN_USERS to apply
    changes (including rotating an existing admin's password)."""
    settings = get_settings()
    pairs = parse_admin_users(settings.ADMIN_USERS)

    for email, password in pairs:
        await db[COLLECTIONS["admin_users"]].update_one(
            {"email": email},
            {"$set": {"hashed_password": hash_password(password), "role": "admin"}},
            upsert=True,
        )

    return len(pairs)
