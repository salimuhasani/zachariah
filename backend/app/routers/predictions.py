from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.core.database import get_db
from app.core.security import get_current_operator
from app.ml.predictor import run_prediction
from app import models, schemas

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/", response_model=schemas.PredictionResponse, status_code=status.HTTP_201_CREATED)
def create_prediction(
    request: schemas.PredictionRequest,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """
    Run prediction for a network.
    User chooses how many days ahead (horizon_days).
    """
    network = db.query(models.Network).filter(
        models.Network.id == request.network_id,
        models.Network.operator_id == current.id
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    # Get historical metrics (last 30 days or all available)
    metrics = db.query(models.DailyMetric).filter(
        models.DailyMetric.network_id == request.network_id
    ).order_by(models.DailyMetric.date.asc()).all()

    if not metrics:
        raise HTTPException(
            status_code=400,
            detail="No historical metrics found for this network. Please add data first."
        )

    history = [
        {
            "date": m.date,
            "active_users": m.active_users,
            "traffic_gb": m.traffic_gb,
            "prb_utilization": m.prb_utilization,
            "latency_ms": m.latency_ms,
            "packet_loss": m.packet_loss,
            "throughput_mbps": m.throughput_mbps,
        }
        for m in metrics
    ]

    latest = history[-1]
    result = run_prediction(latest, history, request.horizon_days)

    prediction = models.Prediction(
        network_id=request.network_id,
        operator_id=current.id,
        horizon_days=request.horizon_days,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        congestion_probability=result["congestion_probability"],
        degradation_probability=result["degradation_probability"],
        predicted_prb=result["predicted_prb"],
        predicted_latency=result["predicted_latency"],
        predicted_packet_loss=result["predicted_packet_loss"],
        explanation=result["explanation"],
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


@router.get("/", response_model=List[schemas.PredictionResponse])
def list_predictions(
    network_id: int = None,
    limit: int = 50,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    query = db.query(models.Prediction).filter(
        models.Prediction.operator_id == current.id
    )
    if network_id:
        query = query.filter(models.Prediction.network_id == network_id)
    return query.order_by(models.Prediction.created_at.desc()).limit(limit).all()


@router.get("/{prediction_id}", response_model=schemas.PredictionResponse)
def get_prediction(
    prediction_id: int,
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    pred = db.query(models.Prediction).filter(
        models.Prediction.id == prediction_id,
        models.Prediction.operator_id == current.id
    ).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return pred
