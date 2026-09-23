from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AppFeedback, User
from app.schemas import AppFeedbackCreate, AppFeedbackResponse
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"]
)

@router.post("/submit", response_model=AppFeedbackResponse)
def submit_feedback(
    feedback: AppFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit rating and feedback for the application.
    """
    new_feedback = AppFeedback(
        user_id=current_user.id,
        role=current_user.role,
        rating=feedback.rating,
        feedback_text=feedback.feedback_text,
        category=feedback.category,
        status="new"
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback
