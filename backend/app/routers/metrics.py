from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.security import get_current_operator, get_current_operator_api_key
from app import models, schemas

router = APIRouter(prefix="/metrics", tags=["Metrics"])


def _get_network_or_404(db: Session, network_id: int, operator_id: int):
    network = db.query(models.Network).filter(
        models.Network.id == network_id,
        models.Network.operator_id == operator_id
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    return network


@router.post("/", response_model=schemas.MetricResponse, status_code=status.HTTP_201_CREATED)
def create_metric_manual(
    metric_in: schemas.MetricCreate,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """Manual data entry by operator via dashboard"""
    _get_network_or_404(db, metric_in.network_id, current.id)

    existing = db.query(models.DailyMetric).filter(
        models.DailyMetric.network_id == metric_in.network_id,
        models.DailyMetric.date == metric_in.date
    ).first()
    if existing:
        # Update existing
        for field, value in metric_in.model_dump(exclude={"network_id"}).items():
            setattr(existing, field, value)
        existing.source = "manual"
        db.commit()
        db.refresh(existing)
        return existing

    metric = models.DailyMetric(
        **metric_in.model_dump(),
        operator_id=current.id,
        source="manual"
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.post("/api", response_model=schemas.MetricResponse, status_code=status.HTTP_201_CREATED)
def create_metric_via_api(
    metric_in: schemas.MetricCreate,
    current: models.Operator = Depends(get_current_operator_api_key),
    db: Session = Depends(get_db)
):
    """API data ingestion using X-API-Key header"""
    _get_network_or_404(db, metric_in.network_id, current.id)

    existing = db.query(models.DailyMetric).filter(
        models.DailyMetric.network_id == metric_in.network_id,
        models.DailyMetric.date == metric_in.date
    ).first()
    if existing:
        for field, value in metric_in.model_dump(exclude={"network_id"}).items():
            setattr(existing, field, value)
        existing.source = "api"
        db.commit()
        db.refresh(existing)
        return existing

    metric = models.DailyMetric(
        **metric_in.model_dump(),
        operator_id=current.id,
        source="api"
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.post("/api/bulk", response_model=List[schemas.MetricResponse], status_code=status.HTTP_201_CREATED)
def create_metrics_bulk_api(
    bulk: schemas.MetricBulkCreate,
    current: models.Operator = Depends(get_current_operator_api_key),
    db: Session = Depends(get_db)
):
    """Bulk insert via API"""
    _get_network_or_404(db, bulk.network_id, current.id)
    results = []
    for m in bulk.metrics:
        m.network_id = bulk.network_id
        existing = db.query(models.DailyMetric).filter(
            models.DailyMetric.network_id == m.network_id,
            models.DailyMetric.date == m.date
        ).first()
        if existing:
            for field, value in m.model_dump(exclude={"network_id"}).items():
                setattr(existing, field, value)
            existing.source = "api"
            results.append(existing)
        else:
            metric = models.DailyMetric(
                **m.model_dump(),
                operator_id=current.id,
                source="api"
            )
            db.add(metric)
            results.append(metric)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.get("/", response_model=List[schemas.MetricResponse])
def list_metrics(
    network_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=1000),
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    query = db.query(models.DailyMetric).filter(
        models.DailyMetric.operator_id == current.id
    )
    if network_id:
        query = query.filter(models.DailyMetric.network_id == network_id)
    if start_date:
        query = query.filter(models.DailyMetric.date >= start_date)
    if end_date:
        query = query.filter(models.DailyMetric.date <= end_date)

    return query.order_by(models.DailyMetric.date.desc()).limit(limit).all()


@router.get("/{metric_id}", response_model=schemas.MetricResponse)
def get_metric(
    metric_id: int,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    metric = db.query(models.DailyMetric).filter(
        models.DailyMetric.id == metric_id,
        models.DailyMetric.operator_id == current.id
    ).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return metric
