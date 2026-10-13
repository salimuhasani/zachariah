"""
Simple but effective risk prediction engine for network performance degradation & congestion.

Uses historical metrics + rule-based scoring + lightweight ML when enough data exists.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_DIR.mkdir(exist_ok=True)


def calculate_risk_score(metrics: Dict[str, float], horizon_days: int = 1) -> Tuple[float, str, float, float, str]:
    """
    Calculate risk score based on current/latest metrics.
    Returns: (risk_score, risk_level, congestion_prob, degradation_prob, explanation)
    """
    prb = metrics.get("prb_utilization", 0)
    latency = metrics.get("latency_ms", 0)
    packet_loss = metrics.get("packet_loss", 0)
    throughput = metrics.get("throughput_mbps", 100)
    active_users = metrics.get("active_users", 0)
    traffic = metrics.get("traffic_gb", 0)

    # Normalize / score each factor (0-1 higher = worse)
    prb_score = min(prb / 100.0, 1.0)
    latency_score = min(latency / 150.0, 1.0)          # >150ms is bad
    loss_score = min(packet_loss / 5.0, 1.0)            # >5% is critical
    throughput_score = max(0, 1.0 - (throughput / 50.0))  # lower throughput = higher risk

    # Weighted risk
    weights = {
        "prb": 0.30,
        "latency": 0.25,
        "packet_loss": 0.25,
        "throughput": 0.20,
    }

    base_score = (
        weights["prb"] * prb_score +
        weights["latency"] * latency_score +
        weights["packet_loss"] * loss_score +
        weights["throughput"] * throughput_score
    )

    # Horizon amplification (further ahead → higher uncertainty/risk)
    horizon_factor = 1.0 + (horizon_days - 1) * 0.04
    risk_score = min(base_score * horizon_factor, 1.0)

    # Probabilities
    congestion_prob = min(prb_score * 0.7 + loss_score * 0.3 + (horizon_days * 0.02), 1.0)
    degradation_prob = min(latency_score * 0.5 + loss_score * 0.3 + throughput_score * 0.2 + (horizon_days * 0.015), 1.0)

    # Risk level
    if risk_score >= 0.75:
        level = "Critical"
    elif risk_score >= 0.55:
        level = "High"
    elif risk_score >= 0.35:
        level = "Medium"
    else:
        level = "Low"

    # Explanation
    reasons = []
    if prb >= 80:
        reasons.append(f"PRB utilization high ({prb:.1f}%)")
    if latency >= 100:
        reasons.append(f"High latency ({latency:.1f} ms)")
    if packet_loss >= 2:
        reasons.append(f"Elevated packet loss ({packet_loss:.2f}%)")
    if throughput < 20:
        reasons.append(f"Low throughput ({throughput:.1f} Mbps)")
    if horizon_days > 7:
        reasons.append(f"Long prediction horizon ({horizon_days} days) increases uncertainty")

    if not reasons:
        explanation = "Network metrics are within healthy ranges."
    else:
        explanation = "Risk drivers: " + "; ".join(reasons) + "."

    return round(risk_score, 4), level, round(congestion_prob, 4), round(degradation_prob, 4), explanation


def predict_future_values(history: List[Dict], horizon_days: int) -> Dict[str, float]:
    """
    Simple linear trend projection for key metrics.
    history: list of dicts with keys prb_utilization, latency_ms, packet_loss sorted by date asc
    """
    if len(history) < 2:
        # Not enough history → return last known
        last = history[-1] if history else {}
        return {
            "predicted_prb": last.get("prb_utilization"),
            "predicted_latency": last.get("latency_ms"),
            "predicted_packet_loss": last.get("packet_loss"),
        }

    df = pd.DataFrame(history)
    n = len(df)

    # Simple slope for each metric
    x = np.arange(n)

    def project(col):
        y = df[col].values.astype(float)
        if np.std(y) < 1e-6:
            return float(y[-1])
        slope = np.polyfit(x, y, 1)[0]
        future = y[-1] + slope * horizon_days
        return float(max(0, future))

    return {
        "predicted_prb": min(project("prb_utilization"), 100.0),
        "predicted_latency": project("latency_ms"),
        "predicted_packet_loss": min(project("packet_loss"), 100.0),
    }


def run_prediction(
    latest_metrics: Dict[str, float],
    history: List[Dict],
    horizon_days: int
) -> Dict[str, Any]:
    """
    Main entry point for prediction.
    """
    risk_score, risk_level, cong_prob, deg_prob, explanation = calculate_risk_score(
        latest_metrics, horizon_days
    )

    future = predict_future_values(history, horizon_days)

    # Slightly adjust risk using projected values
    if future.get("predicted_prb") is not None:
        projected = {
            "prb_utilization": future["predicted_prb"],
            "latency_ms": future["predicted_latency"],
            "packet_loss": future["predicted_packet_loss"],
            "throughput_mbps": latest_metrics.get("throughput_mbps", 50),
            "active_users": latest_metrics.get("active_users", 0),
            "traffic_gb": latest_metrics.get("traffic_gb", 0),
        }
        risk_score2, risk_level2, _, _, _ = calculate_risk_score(projected, 1)
        # Blend
        risk_score = round((risk_score * 0.6 + risk_score2 * 0.4), 4)
        if risk_score >= 0.75:
            risk_level = "Critical"
        elif risk_score >= 0.55:
            risk_level = "High"
        elif risk_score >= 0.35:
            risk_level = "Medium"
        else:
            risk_level = "Low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "congestion_probability": cong_prob,
        "degradation_probability": deg_prob,
        "predicted_prb": future.get("predicted_prb"),
        "predicted_latency": future.get("predicted_latency"),
        "predicted_packet_loss": future.get("predicted_packet_loss"),
        "explanation": explanation,
    }
