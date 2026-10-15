from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.routers import auth, networks, metrics, predictions, dashboard
from app import models

# Create tables
Base.metadata.create_all(bind=engine)


def seed_admin():
    """Ensure default admin exists: zachariah@gmail.com / 123456"""
    db = SessionLocal()
    try:
        email = "zachariah@gmail.com"
        existing = db.query(models.Operator).filter(models.Operator.email == email).first()
        if not existing:
            admin = models.Operator(
                email=email,
                full_name="Zachariah Admin",
                hashed_password=get_password_hash("123456"),
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print(f"[seed] Admin created: {email}")
        else:
            print(f"[seed] Admin already exists: {email}")
    except Exception as e:
        print(f"[seed] Skipped or failed: {e}")
        db.rollback()
    finally:
        db.close()


seed_admin()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Network Performance Degradation & Congestion Prediction System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(networks.router, prefix=settings.API_V1_STR)
app.include_router(metrics.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Network Prediction System API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
