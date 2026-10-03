from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/seller")
def get_seller_analytics(period: int = 30):
    return {
        "status": "success",
        "data": {
            "period": period,
            "views": 120,
            "leads": 45,
            "conversion_rate": 37.5,
            "revenue": 5000,
            "message": "Dummy analytics data"
        }
    }
