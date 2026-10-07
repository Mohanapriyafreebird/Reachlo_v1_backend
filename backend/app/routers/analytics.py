from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from collections import Counter
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Business, Campaign, Lead

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/seller")
def get_seller_analytics(
    period: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregate analytics for the authenticated seller's business.
    Covers campaigns created + leads received within the selected period (days).

    Response shape:
    {
      overview: { totalReach, totalLeads, conversionRate, activeCampaigns, totalCampaigns, aiGeneratedCount },
      leadQuality: { NEW, HOT, WARM, COLD },
      topCampaigns: [ { title, leads, views, status } ],
    }
    """
    # 1. Verify the user is a seller
    if current_user.role != "SELLER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers can access analytics."
        )

    # 2. Get seller's business
    business = db.query(Business).filter(
        Business.user_id == current_user.id
    ).first()

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found."
        )

    since = datetime.utcnow() - timedelta(days=period)

    # 3. Fetch all non-deleted campaigns for this business in the selected period
    campaigns = db.query(Campaign).filter(
        Campaign.business_id == business.id,
        Campaign.status != "DELETED",
        Campaign.created_at >= since
    ).all()

    # 4. Compute portfolio-level metrics
    total_views = sum(c.view_count or 0 for c in campaigns)
    total_leads = sum(c.lead_count or 0 for c in campaigns)
    active_count = sum(1 for c in campaigns if c.status == "ACTIVE")
    ai_count = sum(1 for c in campaigns if c.ai_generated)

    # Conversion rate: leads / views * 100, rounded to 1 decimal place
    if total_views > 0:
        conv_rate = round((total_leads / total_views) * 100, 1)
    else:
        conv_rate = 0.0

    # 5. Lead quality breakdown — count leads by their label in the period
    leads_in_period = db.query(Lead).join(Campaign).filter(
        Campaign.business_id == business.id,
        Lead.created_at >= since
    ).all()

    label_counts = Counter(l.label or "NEW" for l in leads_in_period)

    # 6. Top 5 campaigns sorted by lead_count descending
    top5 = sorted(campaigns, key=lambda c: c.lead_count or 0, reverse=True)[:5]

    return {
        "overview": {
            "totalReach": total_views,
            "totalLeads": total_leads,
            "conversionRate": f"{conv_rate}%",
            "activeCampaigns": active_count,
            "totalCampaigns": len(campaigns),
            "aiGeneratedCount": ai_count,
        },
        "leadQuality": {
            "NEW":  label_counts.get("NEW",  0),
            "HOT":  label_counts.get("HOT",  0),
            "WARM": label_counts.get("WARM", 0),
            "COLD": label_counts.get("COLD", 0),
        },
        "topCampaigns": [
            {
                "title":  c.title,
                "leads":  c.lead_count or 0,
                "views":  c.view_count or 0,
                "status": c.status,
            }
            for c in top5
        ],
    }
