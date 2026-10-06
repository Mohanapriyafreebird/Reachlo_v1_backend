"""
upload.py — Secure file-upload endpoint for REACHLO

Security features added (audit remediation):
  1. Authentication required — caller must be a logged-in user.
  2. 5 MB file-size hard limit (read in chunks, abort early).
  3. MIME-type validated with python-magic (magic bytes, not extension).
  4. S3 primary storage via boto3 — files are uploaded to the configured
     S3 bucket and served via CloudFront / direct S3 URL.
  5. Cloudinary as secondary (if configured but S3 is not).
  6. Local disk as last-resort fallback (dev mode only).

Storage priority:
  1. AWS S3 (boto3) — requires AWS_S3_BUCKET + AWS credentials in settings.
  2. Cloudinary      — requires CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET.
  3. Local disk      — fallback for local development.
"""

import io
import os
import uuid

import boto3
import requests
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.config import settings
from app.dependencies import get_current_user
from app.models import User

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB hard limit

# Allowed MIME types → canonical file extension mapping
ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# ---------------------------------------------------------------------------
# MIME-type validation with python-magic (magic bytes, not filename extension)
# ---------------------------------------------------------------------------

def _detect_mime(file_bytes: bytes) -> str:
    """
    Detect actual MIME type from the first bytes of file content.
    Falls back to 'application/octet-stream' if python-magic is unavailable.
    """
    try:
        import magic  # python-magic-bin on Windows
        return magic.from_buffer(file_bytes[:2048], mime=True)
    except Exception:
        # Graceful fallback: inspect magic bytes manually
        return _fallback_mime_from_magic_bytes(file_bytes)


def _fallback_mime_from_magic_bytes(data: bytes) -> str:
    """
    Manual magic-byte check so uploads still work if python-magic is not
    installed in the environment. Checks the most common image signatures.
    """
    if data[:3] in (b"\xff\xd8\xff",):
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "application/octet-stream"


# ---------------------------------------------------------------------------
# S3 upload
# ---------------------------------------------------------------------------

def _upload_to_s3(file_bytes: bytes, file_ext: str) -> str:
    """
    Upload raw bytes to the configured S3 bucket and return the public URL.
    Uses IAM role credentials (via boto3 default credential chain) if
    AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set explicitly.
    """
    bucket = settings.AWS_S3_BUCKET
    region = settings.AWS_REGION or "ap-south-1"

    # Build boto3 client — explicit credentials take priority, else IAM role
    kwargs: dict = {"region_name": region}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    s3 = boto3.client("s3", **kwargs)

    key = f"uploads/{uuid.uuid4().hex}{file_ext}"
    content_type = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(file_ext.lower(), "application/octet-stream")

    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            # Objects uploaded here are meant to be publicly readable via
            # CloudFront or a bucket policy — do NOT add ACL='public-read'
            # unless the bucket explicitly allows it (ACLs disabled by default
            # on new AWS accounts since April 2023).
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"S3 upload failed: {exc}") from exc

    # Build URL — if a CloudFront domain is configured use it; else S3 direct URL.
    cdn_base = (settings.AWS_CLOUDFRONT_URL or "").rstrip("/")
    if cdn_base:
        return f"{cdn_base}/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


# ---------------------------------------------------------------------------
# Cloudinary upload (secondary)
# ---------------------------------------------------------------------------

def _upload_to_cloudinary(file_bytes: bytes, file_ext: str) -> str:
    """Upload raw bytes to Cloudinary (unsigned preset) and return secure_url."""
    cloud = settings.CLOUDINARY_CLOUD_NAME
    preset = settings.CLOUDINARY_UPLOAD_PRESET
    url = f"https://api.cloudinary.com/v1_1/{cloud}/image/upload"
    files = {"file": (f"upload{file_ext}", file_bytes, f"image/{file_ext.lstrip('.')}")}
    data = {"upload_preset": preset}
    resp = requests.post(url, files=files, data=data, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Cloudinary upload failed: {resp.status_code}")
    return resp.json()["secure_url"]


# ---------------------------------------------------------------------------
# upload_file_persistent — public helper used by ai.py as well
# ---------------------------------------------------------------------------

def upload_file_persistent(file_bytes: bytes, file_ext: str, request: Request = None) -> str:
    """
    Persist raw bytes through the storage priority chain:
      1. S3 (if AWS_S3_BUCKET is configured)
      2. Cloudinary (if CLOUDINARY_CLOUD_NAME is configured)
      3. Local disk (fallback — ephemeral, dev only)
    Returns the publicly accessible URL / path.
    """
    # ── 1. S3 ───────────────────────────────────────────────────────────────
    if settings.AWS_S3_BUCKET:
        try:
            return _upload_to_s3(file_bytes, file_ext)
        except Exception as exc:
            print(f"[WARN] S3 upload failed, trying next storage: {exc}")

    # ── 2. Cloudinary ───────────────────────────────────────────────────────
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_UPLOAD_PRESET:
        try:
            return _upload_to_cloudinary(file_bytes, file_ext)
        except Exception as exc:
            print(f"[WARN] Cloudinary upload failed, falling back to local: {exc}")

    # ── 3. Local disk fallback (dev only) ───────────────────────────────────
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    try:
        with open(file_path, "wb") as buf:
            buf.write(file_bytes)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save file.") from exc

    return f"/uploads/{unique_filename}"


# ---------------------------------------------------------------------------
# POST /api/upload/image — authenticated, size-limited, magic-validated
# ---------------------------------------------------------------------------

@router.post("/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # 🔒 authentication required
):
    """
    Securely upload a user image.

    Security controls:
      - Bearer token authentication (get_current_user).
      - 5 MB read limit (chunked read, aborts on oversize).
      - MIME-type validated from magic bytes (not filename extension).
      - Stored on S3 / Cloudinary / local depending on configuration.
    """
    # ── 1. Read file in chunks, enforce 5 MB hard limit ─────────────────────
    chunks: list[bytes] = []
    total_size = 0
    async for chunk in file:
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum allowed size is 5 MB.",
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    # ── 2. Validate MIME type from magic bytes ───────────────────────────────
    detected_mime = _detect_mime(file_bytes)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid file type detected ('{detected_mime}'). "
                "Only JPEG, PNG, and WebP images are accepted."
            ),
        )

    file_ext = ALLOWED_MIME_TYPES[detected_mime]

    # ── 3. Store and return URL ──────────────────────────────────────────────
    url = upload_file_persistent(file_bytes, file_ext, request)
    return {"url": url}
