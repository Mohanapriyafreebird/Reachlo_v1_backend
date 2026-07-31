import os
import uuid
import shutil
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Cloudinary upload (persistent — survives Render redeployments)
# ---------------------------------------------------------------------------

CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_UPLOAD_PRESET = os.environ.get("CLOUDINARY_UPLOAD_PRESET", "")

def upload_to_cloudinary(file_bytes: bytes, file_ext: str) -> str:
    """Upload raw bytes to Cloudinary unsigned and return the secure_url."""
    url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    files = {"file": (f"upload{file_ext}", file_bytes, f"image/{file_ext.lstrip('.')}") }
    data = {"upload_preset": CLOUDINARY_UPLOAD_PRESET}
    resp = requests.post(url, files=files, data=data, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Cloudinary upload failed: {resp.status_code} {resp.text[:200]}")
    result = resp.json()
    return result["secure_url"]

def upload_file_persistent(file_bytes: bytes, file_ext: str, request: Request = None) -> str:
    """Tries Cloudinary first, falls back to local storage."""
    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET:
        try:
            return upload_to_cloudinary(file_bytes, file_ext)
        except Exception as e:
            print(f"[WARN] Cloudinary upload failed, falling back to local: {e}")

    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    return f"/uploads/{unique_filename}"


@router.post("/upload/image")
async def upload_image(request: Request, file: UploadFile = File(...)):
    # Validate file extension
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = os.path.splitext(file.filename or "upload.jpg")[1].lower() or ".jpg"
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and WEBP are allowed.")

    file_bytes = await file.read()
    
    url = upload_file_persistent(file_bytes, file_ext, request)
    return {"url": url}
