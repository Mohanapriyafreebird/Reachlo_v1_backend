from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import AppFeedback, User

def view_complaints():
    db = SessionLocal()
    print("\n" + "="*50)
    print(" REACHLO COMPLAINTS VIEWER ")
    print("="*50)
    
    try:
        # Fetch feedbacks with 3 stars or lower
        complaints = db.query(AppFeedback).filter(AppFeedback.rating <= 3).order_by(AppFeedback.created_at.desc()).all()
        
        if not complaints:
            print("\n✅ No complaints found! Users are happy.")
            return

        print(f"\nFound {len(complaints)} complaints/low ratings:\n")
        
        for c in complaints:
            user = db.query(User).filter(User.id == c.user_id).first()
            user_info = f"{user.name} ({user.phone})" if user else f"Unknown User ({c.user_id})"
            
            print(f"[{c.created_at.strftime('%Y-%m-%d %H:%M')}] {c.rating} Stars - {c.role.upper()}")
            print(f"User: {user_info}")
            if c.category:
                print(f"Category: {c.category}")
            print(f"Feedback: {c.feedback_text or 'No text provided'}")
            print(f"Status: {c.status}")
            print("-" * 40)
            
    finally:
        db.close()

if __name__ == "__main__":
    view_complaints()
