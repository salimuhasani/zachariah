from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_operator
)
from app.core.config import settings
from app import models, schemas

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(operator_in: schemas.OperatorCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Operator).filter(models.Operator.email == operator_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    operator = models.Operator(
        email=operator_in.email,
        full_name=operator_in.full_name,
        hashed_password=get_password_hash(operator_in.password),
    )
    db.add(operator)
    db.commit()
    db.refresh(operator)

    access_token = create_access_token(
        data={"sub": str(operator.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "operator": operator
    }


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
    current.api_key = secrets.token_hex(32)
    db.commit()
    db.refresh(current)
    return current
