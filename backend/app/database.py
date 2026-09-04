from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Create engine with production-grade connection pool settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Check connection health before using
    pool_recycle=280,          # Recycle connections before MySQL 5-min timeout
    pool_size=10,              # Keep 10 warm connections ready
    max_overflow=20,           # Allow up to 20 extra burst connections
    connect_args={'connect_timeout': 10},  # Fail fast on bad connections (was 60s)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

