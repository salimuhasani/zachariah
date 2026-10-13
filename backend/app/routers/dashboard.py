from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.core.security import get_current_operator
from app import models, schemas

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    total_networks = db.query(models.Network).filter(
        models.Network.operator_id == current.id
    ).count()

    total_metrics = db.query(models.DailyMetric).filter(
        models.DailyMetric.operator_id == current.id
    ).count()

    # Latest prediction per network that is High or Critical
    high_risk = db.query(models.Prediction).filter(
        models.Prediction.operator_id == current.id,
        models.Prediction.risk_level.in_(["High", "Critical"])
    ).count()

    latest_predictions = db.query(models.Prediction).filter(
        models.Prediction.operator_id == current.id
    ).order_by(models.Prediction.created_at.desc()).limit(10).all()

    return {
        "total_networks": total_networks,
        "total_metrics": total_metrics,
        "high_risk_networks": high_risk,
        "latest_predictions": latest_predictions
    }


@router.get("/networks-overview", response_model=List[schemas.NetworkWithLatest])
def get_networks_overview(
    current: models.Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    networks = db.query(models.Network).filter(
        models.Network.operator_id == current.id,
        models.Network.is_active == True
    ).all()

    result = []
    for net in networks:
        latest_metric = db.query(models.DailyMetric).filter(
            models.DailyMetric.network_id == net.id
        ).order_by(models.DailyMetric.date.desc()).first()

        latest_pred = db.query(models.Prediction).filter(
            models.Prediction.network_id == net.id
        ).order_by(models.Prediction.created_at.desc()).first()

        result.append({
            "network": net,
            "latest_metric": latest_metric,
            "latest_prediction": latest_pred
        })
    return result
