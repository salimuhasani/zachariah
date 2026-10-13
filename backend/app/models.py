from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, 
    Boolean, Text, Date, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import secrets


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    api_key = Column(String(64), unique=True, index=True, default=lambda: secrets.token_hex(32))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    networks = relationship("Network", back_populates="owner", cascade="all, delete-orphan")
    metrics = relationship("DailyMetric", back_populates="owner", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="owner", cascade="all, delete-orphan")


class Network(Base):
    __tablename__ = "networks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    area = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("Operator", back_populates="networks")
    metrics = relationship("DailyMetric", back_populates="network", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="network", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("name", "area", "operator_id", name="uq_network_name_area_operator"),
    )


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)

    active_users = Column(Integer, nullable=False)
    traffic_gb = Column(Float, nullable=False)          # Traffic in GB
    prb_utilization = Column(Float, nullable=False)     # Percentage 0-100
    latency_ms = Column(Float, nullable=False)          # Latency in ms
    packet_loss = Column(Float, nullable=False)         # Percentage 0-100
    throughput_mbps = Column(Float, nullable=False)     # Throughput in Mbps

    source = Column(String(20), default="manual")       # "manual" or "api"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    network = relationship("Network", back_populates="metrics")
    owner = relationship("Operator", back_populates="metrics")

    __table_args__ = (
        UniqueConstraint("network_id", "date", name="uq_metric_network_date"),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    prediction_date = Column(DateTime(timezone=True), server_default=func.now())
    horizon_days = Column(Integer, nullable=False)      # How many days ahead

    risk_score = Column(Float, nullable=False)          # 0.0 - 1.0
    risk_level = Column(String(20), nullable=False)     # Low, Medium, High, Critical
    congestion_probability = Column(Float, nullable=False)
    degradation_probability = Column(Float, nullable=False)

    # Predicted values (optional)
    predicted_prb = Column(Float, nullable=True)
    predicted_latency = Column(Float, nullable=True)
    predicted_packet_loss = Column(Float, nullable=True)

    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    network = relationship("Network", back_populates="predictions")
    owner = relationship("Operator", back_populates="predictions")
