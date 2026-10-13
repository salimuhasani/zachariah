from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime


# ==================== Auth ====================
class OperatorCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=6)


class OperatorLogin(BaseModel):
    email: EmailStr
    password: str


class OperatorResponse(BaseModel):
    id: int
    email: str
    full_name: str
    api_key: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    operator: OperatorResponse


# ==================== Network ====================
class NetworkCreate(BaseModel):
    name: str
    area: str
    description: Optional[str] = None


class NetworkUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class NetworkResponse(BaseModel):
    id: int
    name: str
    area: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== Metrics ====================
class MetricCreate(BaseModel):
    network_id: int
    date: date
    active_users: int = Field(..., ge=0)
    traffic_gb: float = Field(..., ge=0)
    prb_utilization: float = Field(..., ge=0, le=100)
    latency_ms: float = Field(..., ge=0)
    packet_loss: float = Field(..., ge=0, le=100)
    throughput_mbps: float = Field(..., ge=0)


class MetricBulkCreate(BaseModel):
    network_id: int
    metrics: List[MetricCreate]


class MetricResponse(BaseModel):
    id: int
    network_id: int
    date: date
    active_users: int
    traffic_gb: float
    prb_utilization: float
    latency_ms: float
    packet_loss: float
    throughput_mbps: float
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== Prediction ====================
class PredictionRequest(BaseModel):
    network_id: int
    horizon_days: int = Field(..., ge=1, le=30, description="Number of days to predict ahead")


class PredictionResponse(BaseModel):
    id: int
    network_id: int
    prediction_date: datetime
    horizon_days: int
    risk_score: float
    risk_level: str
    congestion_probability: float
    degradation_probability: float
    predicted_prb: Optional[float]
    predicted_latency: Optional[float]
    predicted_packet_loss: Optional[float]
    explanation: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== Dashboard ====================
class DashboardStats(BaseModel):
    total_networks: int
    total_metrics: int
    high_risk_networks: int
    latest_predictions: List[PredictionResponse]


class NetworkWithLatest(BaseModel):
    network: NetworkResponse
    latest_metric: Optional[MetricResponse]
    latest_prediction: Optional[PredictionResponse]
