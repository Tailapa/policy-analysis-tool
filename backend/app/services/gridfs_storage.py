"""Stores the original uploaded issue PDFs in MongoDB GridFS — Fly.io's
backend machine has no persistent volume, so local-disk storage wouldn't
survive a redeploy, while GridFS reuses the Atlas connection already in use
for everything else."""

from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket

from bson import ObjectId

from app.core.db import COLLECTIONS

BUCKET_NAME = "issue_pdfs"


def get_bucket(db: AsyncIOMotorDatabase) -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BUCKET_NAME)


async def store_issue_pdf(db: AsyncIOMotorDatabase, filename: str, file_bytes: bytes) -> ObjectId:
    bucket = get_bucket(db)
    return await bucket.upload_from_stream(filename, file_bytes)


async def read_issue_pdf(db: AsyncIOMotorDatabase, file_id: ObjectId) -> bytes:
    bucket = get_bucket(db)
    grid_out = await bucket.open_download_stream(file_id)
    return await grid_out.read()


async def store_issue_pdf_and_link(db: AsyncIOMotorDatabase, issue_id: ObjectId, filename: str, file_bytes: bytes) -> None:
    """Background-task entry point (see routers/admin_uploads.py) — stores
    the PDF then links it to its issue doc. Decoupled from the synchronous
    upload response the same way evolution generation already is: never
    block or risk the publish flow on a secondary step."""
    file_id = await store_issue_pdf(db, filename, file_bytes)
    await db[COLLECTIONS["issues"]].update_one({"_id": issue_id}, {"$set": {"pdf_file_id": file_id}})
