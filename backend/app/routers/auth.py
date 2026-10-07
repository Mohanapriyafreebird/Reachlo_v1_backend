from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import User, Business, LoginHistory, PasswordResetOTP
from app.schemas import UserRegister, UserLogin, Token, UserUpdate, UserResponse
from app.config import settings
from pydantic import BaseModel as _PydanticModel
from app.security import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user
import re
from datetime import datetime, timedelta
import threading as _threading
import secrets
from app.database import SessionLocal as _SessionLocal

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Indian state names and common country labels to skip when extracting city
_INDIAN_STATES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
    "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "delhi", "jammu and kashmir", "ladakh", "puducherry", "chandigarh",
    "india",
}


def _extract_city_from_address(address: str) -> str:
    """
    Smartly extract city from a full address string like:
    'Third floor, J4B, Periyar St, Medavakkam, Chennai, Tamil Nadu 600100, India'
    Strategy: split by comma, strip each part, skip pin codes / state names / country.
    The city is typically the last meaningful segment before the state+pincode.
    """
    if not address:
        return ""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    candidates = []
    for part in parts:
        # Remove embedded pin codes (6-digit numbers) from the part
        clean = re.sub(r"\b\d{6}\b", "", part).strip()
        if not clean:
            continue
        # Skip if it's a known state name or country (case-insensitive)
        if clean.lower() in _INDIAN_STATES:
            continue
        candidates.append(clean)
    # The city is typically the last clean candidate
    # (address goes from specific → general, so last = city/district level)
    if candidates:
        return candidates[-1]
    return ""


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Single registration endpoint for both BUYER and SELLER.
    For SELLER accounts: accepts additional seller-specific fields
    (business_description, usp, latitude, longitude, location_address).
    Both users and businesses rows are created in the same transaction to avoid orphaned records.
    AI enrichment (category detection, business analysis) runs in a background thread
    so the registration response is returned immediately without waiting for Gemini.
    """
    # Block ADMIN and unknown roles from public registration
    ALLOWED_PUBLIC_ROLES = {"BUYER", "SELLER"}
    if user_in.role not in ALLOWED_PUBLIC_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Only BUYER or SELLER are allowed."
        )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already registered. Please use a different email or log in."
        )

    # Check if phone number already exists
    clean_phone = user_in.phone.replace("+91", "").replace(" ", "").strip()
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mobile number is already registered. Please use a different number or log in."
        )

    # Create new user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        phone=clean_phone,
        password_hash=hashed_password,
        role=user_in.role,
        is_active=True,
        city=user_in.city
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        err_str = str(e).lower()
        if "email" in err_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already registered. Please use a different email or log in."
            )
        elif "phone" in err_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mobile number is already registered. Please use a different number or log in."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. An account with these details may already exist."
            )
    new_user = db.query(User).filter(User.email == user_in.email.lower()).first()

    # If the user is a SELLER, create the business profile immediately with default category,
    # then enrich with AI in the background (non-blocking).
    if new_user.role == "SELLER":
        business_name = (user_in.company_name or "").strip() or f"{new_user.name}'s Business"

        # Smart city extraction from location_address
        biz_city = ""
        if user_in.location_address:
            biz_city = _extract_city_from_address(user_in.location_address)
        if not biz_city and user_in.city:
            biz_city = user_in.city.strip()
        biz_city = biz_city or "Unknown"

        # Create the business row immediately with placeholder category so the seller
        # can log in and use the dashboard right away. AI enrichment updates it asynchronously.
        new_business = Business(
            user_id=new_user.id,
            name=business_name,
            category="Other",          # Updated by background AI thread
            sub_category=None,         # Updated by background AI thread
            business_description=user_in.business_description,
            usp=user_in.usp,
            city=biz_city,
            location_address=user_in.location_address,
            latitude=user_in.latitude,
            longitude=user_in.longitude,
            ai_business_analysis=None, # Updated by background AI thread
            whatsapp_number=new_user.phone,
            verified=False,
            rating=0.0,
            rating_count=0
        )
        db.add(new_business)
        db.commit()
        db.refresh(new_business)

        # ── Background AI enrichment ─────────────────────────────────────────
        # Runs AFTER the response has been sent so the seller is never blocked.
        business_id = new_business.id
        business_desc = user_in.business_description
        seller_usp = user_in.usp or ""

        def _enrich_business_ai(b_id, b_name, b_desc, b_usp, b_city, b_cat_placeholder):
            """Runs in a daemon thread — updates business row with AI-detected category."""
            if not b_desc:
                return
            bg_db = _SessionLocal()
            try:
                detected_category = "Other"
                detected_sub_category = None
                ai_analysis_json = None

                try:
                    from app.utils.ai_generation import detect_category
                    result = detect_category(b_desc)
                    detected_category = result.get("category", "Other") or "Other"
                    detected_sub_category = result.get("sub_category")
                except Exception as e:
                    print(f"[BG] Category auto-detection failed: {e}")

                try:
                    from app.utils.ai_generation import analyze_business
                    import json as _json
                    analysis = analyze_business(
                        business_name=b_name,
                        business_description=b_desc,
                        usp=b_usp,
                        category=detected_category,
                        city=b_city,
                    )
                    ai_analysis_json = _json.dumps(analysis)
                except Exception as e:
                    print(f"[BG] Business analysis pre-computation failed: {e}")

                # Write AI results back to the business row
                biz = bg_db.query(Business).filter(Business.id == b_id).first()
                if biz:
                    biz.category = detected_category
                    biz.sub_category = detected_sub_category
                    biz.ai_business_analysis = ai_analysis_json
                    bg_db.commit()
                    print(f"[BG] Business {b_id} enriched: category={detected_category}")
            except Exception as e:
                print(f"[BG] AI enrichment error for business {b_id}: {e}")
            finally:
                bg_db.close()

        t = _threading.Thread(
            target=_enrich_business_ai,
            args=(business_id, business_name, business_desc, seller_usp, biz_city, "Other"),
            daemon=True,
        )
        t.start()
        # ────────────────────────────────────────────────────────────────────

    # Generate token — seller is immediately logged in after registration
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": new_user.role,
        "user": new_user
    }


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not found."
        )
    
    if not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    # ── STRICT ROLE-BASED PORTAL VALIDATION ─────────────────────────────────
    # If the client declares which portal it is (BUYER or SELLER), enforce it.
    # This prevents a Buyer from logging into the Seller portal and vice versa.
    # The token is NEVER generated when the role doesn't match the portal.
    if login_in.requested_role:
        requested = login_in.requested_role.upper().strip()
        # ADMIN accounts are allowed through either portal (internal access)
        if user.role != "ADMIN" and user.role != requested:
            if user.role == "BUYER":
                detail_msg = (
                    "Wrong Login Portal. This account is registered as a Buyer. "
                    "Please sign in using the Buyer Login page."
                )
            elif user.role == "SELLER":
                detail_msg = (
                    "Wrong Login Portal. This account is registered as a Seller. "
                    "Please sign in using the Seller Login page."
                )
            else:
                detail_msg = f"Wrong login portal. This account role ({user.role}) does not match the requested portal ({requested})."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg,
            )
    # ────────────────────────────────────────────────────────────────────────

    # Record login event in login_history
    try:
        login_record = LoginHistory(
            user_id=user.id,
            login_time=datetime.utcnow()
        )
        db.add(login_record)
        db.commit()
    except Exception as e:
        # Non-fatal — don't block login if history insert fails
        print(f"[WARN] Failed to record login history: {e}")
        db.rollback()

    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user": user
    }

@router.post("/admin/create-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    user_in: UserRegister,
    db: Session = Depends(get_db),
    x_admin_secret: str = Header(None, alias="X-Admin-Secret")
):
    """
    Internal endpoint to create an ADMIN user.
    Requires the X-Admin-Secret header matching the ADMIN_SECRET_KEY in .env.
    """
    if x_admin_secret != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Secret header"
        )
    
    if user_in.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be ADMIN"
        )
        
    existing_email = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    clean_phone = user_in.phone.replace("+91", "").replace(" ", "").strip()
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone already registered")

    hashed_password = get_password_hash(user_in.password)
    new_admin = User(
        name=user_in.name,
        email=user_in.email.lower(),
        phone=clean_phone,
        password_hash=hashed_password,
        role="ADMIN",
        is_active=True,
        city=user_in.city
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin

@router.get("/me", response_model=Token)
def get_me(current_user: User = Depends(get_current_user)):
    access_token = create_access_token(data={"sub": current_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": current_user.role,
        "user": current_user
    }


@router.patch("/me", response_model=UserResponse)
def update_my_user_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update personal details (name, phone) from the profile edit page."""
    update_data = user_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user

class ChangePasswordRequest(_PydanticModel):
    current_password: str
    new_password: str

@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Re-fetch the user within this db session to ensure it is tracked
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters."
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    db.refresh(user)
    return {"message": "Password updated successfully."}


from pydantic import BaseModel as PydanticBaseModel


# ── OTP-based password reset ─────────────────────────────────────────────────
# 3-step flow:
#   1. POST /auth/forgot-password   → generate OTP, send to email
#   2. POST /auth/verify-otp        → validate OTP, return short-lived reset token
#   3. POST /auth/reset-password    → validate reset token, update password
# ─────────────────────────────────────────────────────────────────────────────

OTP_EXPIRY_MINUTES = 15
RESET_TOKEN_EXPIRY_MINUTES = 15
MAX_OTP_ATTEMPTS = 5
MAX_OTP_REQUESTS_PER_HOUR = 3


class ForgotPasswordRequest(PydanticBaseModel):
    email: str


class VerifyOTPRequest(PydanticBaseModel):
    email: str
    otp: str


class ResetPasswordRequest(PydanticBaseModel):
    reset_token: str
    new_password: str


@router.post("/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1: User enters their email.
    - If account exists, generates a 6-digit OTP, stores the hash in DB,
      and emails it to the user.
    - Rate-limited to 3 requests per email per hour.
    - Always returns the same success message to prevent email enumeration.
    """
    import asyncio
    from app.utils.email_utils import generate_otp, send_otp_email
    from passlib.context import CryptContext

    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    email = payload.email.strip().lower()
    now = datetime.utcnow()

    # Generic success message — never reveal whether the email exists
    GENERIC_MSG = {"message": "If an account with that email exists, an OTP has been sent."}

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Return same message to prevent email enumeration
        return GENERIC_MSG

    # ── Rate limit: max 3 OTPs per email per hour ────────────────────────────
    one_hour_ago = now - timedelta(hours=1)
    recent_count = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.created_at >= one_hour_ago,
        )
        .count()
    )
    if recent_count >= MAX_OTP_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait before trying again.",
        )

    # ── Invalidate any existing unused OTPs for this user ───────────────────
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.used == False,
    ).update({"used": True})

    # ── Generate + hash OTP ─────────────────────────────────────────────────
    raw_otp = generate_otp(6)
    otp_hash = _pwd_ctx.hash(raw_otp)

    otp_record = PasswordResetOTP(
        user_id=user.id,
        otp_hash=otp_hash,
        created_at=now,
        expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
        used=False,
        attempt_count=0,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    # ── Send OTP email ──────────────────────────────────────────────────────
    try:
        await send_otp_email(
            to_email=email,
            otp=raw_otp,
            user_name=user.name,
        )
    except Exception as exc:
        # Log internally but do not expose error details to the client
        print(f"[ERROR] Failed to send OTP email to {email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send OTP email. Please try again later.",
        )

    return GENERIC_MSG


@router.post("/verify-otp", status_code=200)
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Step 2: User enters the 6-digit OTP they received.
    - Validates OTP hash, expiry, single-use, and attempt limit.
    - On success: marks OTP as used, returns a short-lived reset token.
    """
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    email = payload.email.strip().lower()
    now = datetime.utcnow()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Find the latest valid (unused, unexpired) OTP for this user
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.used == False,
            PasswordResetOTP.expires_at > now,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired or is invalid. Please request a new one.",
        )

    # ── Attempt limit ────────────────────────────────────────────────────────
    if otp_record.attempt_count >= MAX_OTP_ATTEMPTS:
        otp_record.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new OTP.",
        )

    # ── Verify OTP ───────────────────────────────────────────────────────────
    if not _pwd_ctx.verify(payload.otp.strip(), otp_record.otp_hash):
        otp_record.attempt_count += 1
        db.commit()
        remaining = MAX_OTP_ATTEMPTS - otp_record.attempt_count
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect OTP. {remaining} attempt(s) remaining.",
        )

    # ── OTP is correct — mark used, issue reset token ────────────────────────
    reset_token = secrets.token_urlsafe(32)
    otp_record.used = True
    otp_record.reset_token = reset_token
    otp_record.reset_token_expires_at = now + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)
    db.commit()

    return {
        "message": "OTP verified successfully.",
        "reset_token": reset_token,
    }


@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 3: User sets a new password using the reset token from step 2.
    - Validates reset token, expiry.
    - Updates the user's password and invalidates the token.
    """
    now = datetime.utcnow()

    # Look up the OTP record by reset token
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.reset_token == payload.reset_token,
            PasswordResetOTP.reset_token_expires_at > now,
        )
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid or has expired. Please start over.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters.",
        )

    user = db.query(User).filter(User.id == otp_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # ── Update password + invalidate reset token ─────────────────────────────
    user.password_hash = get_password_hash(payload.new_password)
    # Nullify reset token so it can't be reused
    otp_record.reset_token = None
    otp_record.reset_token_expires_at = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


from app.schemas import PushTokenUpdate

@router.post("/push-token", status_code=200)
def update_push_token(
    payload: PushTokenUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the authenticated user's Expo push token."""
    current_user.expo_push_token = payload.expo_push_token
    db.commit()
    return {"message": "Push token updated."}
