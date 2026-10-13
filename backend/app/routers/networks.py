from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_operator
from app import models, schemas

router = APIRouter(prefix="/networks", tags=["Networks"])


@router.post("/", response_model=schemas.NetworkResponse, status_code=status.HTTP_201_CREATED)
def create_network(
    network_in: schemas.NetworkCreate,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Network).filter(
        models.Network.name == network_in.name,
        models.Network.area == network_in.area,
        models.Network.operator_id == current.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Network with same name and area already exists")

    network = models.Network(
        **network_in.model_dump(),
        operator_id=current.id
    )
    db.add(network)
    db.commit()
    db.refresh(network)
    return network


@router.get("/", response_model=List[schemas.NetworkResponse])
def list_networks(
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    return db.query(models.Network).filter(
        models.Network.operator_id == current.id
    ).order_by(models.Network.created_at.desc()).all()


@router.get("/{network_id}", response_model=schemas.NetworkResponse)
def get_network(
    network_id: int,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    network = db.query(models.Network).filter(
        models.Network.id == network_id,
        models.Network.operator_id == current.id
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    return network


@router.put("/{network_id}", response_model=schemas.NetworkResponse)
def update_network(
    network_id: int,
    network_in: schemas.NetworkUpdate,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    network = db.query(models.Network).filter(
        models.Network.id == network_id,
        models.Network.operator_id == current.id
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    for field, value in network_in.model_dump(exclude_unset=True).items():
        setattr(network, field, value)

    db.commit()
    db.refresh(network)
    return network


@router.delete("/{network_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_network(
    network_id: int,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    network = db.query(models.Network).filter(
        models.Network.id == network_id,
        models.Network.operator_id == current.id
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    db.delete(network)
    db.commit()
    return None
