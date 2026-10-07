import os
import certifi
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Sanitize DATABASE_URL to remove any vulnerable SSL cert verification bypass flags
db_url = settings.DATABASE_URL
for param in ("ssl_verify_cert=false", "ssl_verify_identity=false", "ssl_verify_cert=0", "ssl_verify_identity=0"):
    db_url = db_url.replace(param, "")
db_url = db_url.replace("&&", "&").rstrip("&").rstrip("?")

connect_args = {'connect_timeout': 10}

# Enforce TLS CA verification for TiDB Cloud / MySQL SSL connections
if "tidbcloud.com" in db_url.lower() or "ssl" in db_url.lower() or "mysql" in db_url.lower():
    ca_cert_path = settings.DB_CA_CERT or os.environ.get("DB_CA_CERT")
    if ca_cert_path and os.path.exists(ca_cert_path):
        connect_args["ssl"] = {"ca": ca_cert_path}
    else:
        # Pass Mozilla / certifi CA bundle for verified TLS connection
        connect_args["ssl"] = {"ca": certifi.where()}

# Create engine with production-grade connection pool settings
engine = create_engine(
    db_url,
    pool_pre_ping=True,       # Check connection health before using
    pool_recycle=280,          # Recycle connections before MySQL 5-min timeout
    pool_size=10,              # Keep 10 warm connections ready
    max_overflow=20,           # Allow up to 20 extra burst connections
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

