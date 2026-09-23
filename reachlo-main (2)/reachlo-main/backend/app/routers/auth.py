from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import User, Business, LoginHistory
from app.schemas import UserRegister, UserLogin, Token, UserUpdate, UserResponse
from pydantic import BaseModel as _PydanticModel
from app.security import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user
import re
from datetime import datetime
import threading as _threading
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

class ResetPasswordRequest(PydanticBaseModel):
    email: str
    new_password: str

@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters."
        )
    
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    db.refresh(user)
    return {"message": "Password reset successfully."}


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
