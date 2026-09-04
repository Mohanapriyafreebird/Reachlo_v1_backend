from fastapi import APIRouter

router = APIRouter(prefix="/wallet", tags=["wallet"])

@router.get("/seller")
def get_seller_wallet():
    return {
        "status": "success",
        "data": {
            "balance": 1500,
            "currency": "INR",
            "message": "Dummy wallet data"
        }
    }

@router.get("/transactions")
def get_wallet_transactions():
    return {
        "status": "success",
        "data": [
            {
                "id": "txn_1",
                "amount": 500,
                "type": "credit",
                "date": "2026-09-01T00:00:00Z",
                "description": "Dummy Credit"
            }
        ]
    }
