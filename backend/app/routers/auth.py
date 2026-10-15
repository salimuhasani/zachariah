from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_operator
)
from app.core.config import settings
from app import models, schemas

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Public registration DISABLED ───────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_403_FORBIDDEN)
def register(operator_in: schemas.OperatorCreate, db: Session = Depends(get_db)):
    """Public self-registration is disabled. Contact your administrator."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public registration is disabled. Contact your system administrator to get an account."
    )


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    operator = db.query(models.Operator).filter(models.Operator.email == form_data.username).first()
    if not operator or not verify_password(form_data.password, operator.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not operator.is_active:
        raise HTTPException(status_code=400, detail="Inactive account")

    access_token = create_access_token(
        data={"sub": str(operator.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "operator": operator
    }


@router.get("/me", response_model=schemas.OperatorResponse)
def get_me(current: models.Operator = Depends(get_current_operator)):
    return current


@router.post("/regenerate-api-key", response_model=schemas.OperatorResponse)
def regenerate_api_key(
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    import secrets
    current.api_key = secrets.token_urlsafe(32)
    db.add(current)
    db.commit()
    db.refresh(current)
    return current


# ─── Update own profile / credentials ───────────────────────────────────────
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=6)


@router.put("/profile", response_model=schemas.OperatorResponse)
def update_profile(
    body: ProfileUpdate,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """Admin (or any logged-in operator) can update name, email, and password."""
    if body.full_name is not None:
        current.full_name = body.full_name.strip()

    if body.email is not None and body.email.lower() != current.email.lower():
        exists = db.query(models.Operator).filter(
            models.Operator.email == body.email.lower(),
            models.Operator.id != current.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current.email = body.email.lower()

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(body.current_password, current.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current.hashed_password = get_password_hash(body.new_password)

    db.add(current)
    db.commit()
    db.refresh(current)
    return current


# ─── Admin: create additional operators ─────────────────────────────────────
@router.post("/operators", response_model=schemas.OperatorResponse, status_code=status.HTTP_201_CREATED)
def create_operator(
    operator_in: schemas.OperatorCreate,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """Only a logged-in admin/operator can create new accounts."""
    existing = db.query(models.Operator).filter(models.Operator.email == operator_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    operator = models.Operator(
        email=operator_in.email.lower(),
        full_name=operator_in.full_name,
        hashed_password=get_password_hash(operator_in.password),
    )
    db.add(operator)
    db.commit()
    db.refresh(operator)
    return operator


@router.get("/operators", response_model=list[schemas.OperatorResponse])
def list_operators(
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    return db.query(models.Operator).order_by(models.Operator.id).all()
