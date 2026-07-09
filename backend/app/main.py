from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import close_client, ensure_indexes, get_database
from app.routers import (
    admin,
    admin_uploads,
    auth,
    compare,
    health,
    issues,
    ministries,
    items,
    stats,
)
from app.services.admin_sync import sync_env_admins


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await sync_env_admins(get_database())
    yield
    await close_client()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="India Governance Watch API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(items.router)
    app.include_router(items.states_router)
    app.include_router(issues.router)
    app.include_router(ministries.router)
    app.include_router(stats.router)
    app.include_router(compare.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(admin_uploads.router)

    return app


app = create_app()
