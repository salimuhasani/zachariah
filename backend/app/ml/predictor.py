"""
Enterprise-grade Network Performance & Congestion Prediction Engine.

Combines:
- Multi-factor risk scoring (PRB, Latency, Packet Loss, Throughput, Active Users, Traffic)
- Trend projection from historical data
- Actionable recommendations for NOC operators
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_DIR.mkdir(exist_ok=True)


def calculate_risk_score(metrics: Dict[str, float], horizon_days: int = 1) -> Tuple[float, str, float, float, str, List[str]]:
    """
    Calculate risk score based on current/latest metrics.
    Returns: (risk_score, risk_level, congestion_prob, degradation_prob, explanation, recommendations)
    """
    prb = float(metrics.get("prb_utilization", 0) or 0)
    latency = float(metrics.get("latency_ms", 0) or 0)
    packet_loss = float(metrics.get("packet_loss", 0) or 0)
    throughput = float(metrics.get("throughput_mbps", 50) or 50)
    active_users = float(metrics.get("active_users", 0) or 0)
    traffic = float(metrics.get("traffic_gb", 0) or 0)

    # Normalize (0-1, higher = worse)
    prb_score = min(prb / 100.0, 1.0)
    latency_score = min(latency / 150.0, 1.0)
    loss_score = min(packet_loss / 5.0, 1.0)
    throughput_score = max(0.0, 1.0 - (throughput / 50.0))

    # User density pressure (soft signal)
    user_pressure = min(active_users / 120.0, 1.0) * 0.15 if active_users else 0.0

    weights = {
        "prb": 0.28,
        "latency": 0.24,
        "packet_loss": 0.24,
        "throughput": 0.18,
        "users": 0.06,
    }

    base_score = (
        weights["prb"] * prb_score +
        weights["latency"] * latency_score +
        weights["packet_loss"] * loss_score +
        weights["throughput"] * throughput_score +
        weights["users"] * user_pressure
    )

    # Horizon uncertainty
    horizon_factor = 1.0 + (horizon_days - 1) * 0.035
    risk_score = min(base_score * horizon_factor, 1.0)

    congestion_prob = min(prb_score * 0.65 + loss_score * 0.25 + user_pressure * 0.5 + (horizon_days * 0.015), 1.0)
    degradation_prob = min(latency_score * 0.45 + loss_score * 0.30 + throughput_score * 0.20 + (horizon_days * 0.012), 1.0)

    if risk_score >= 0.75:
        level = "Critical"
    elif risk_score >= 0.55:
        level = "High"
    elif risk_score >= 0.35:
        level = "Medium"
    else:
        level = "Low"

    # Human-readable drivers
    reasons = []
    if prb >= 85:
        reasons.append(f"PRB utilization critical ({prb:.1f}%) — capacity almost exhausted")
    elif prb >= 70:
        reasons.append(f"PRB utilization elevated ({prb:.1f}%)")
    if latency >= 120:
        reasons.append(f"High latency ({latency:.0f} ms) degrading user experience")
    elif latency >= 80:
        reasons.append(f"Latency rising ({latency:.0f} ms)")
    if packet_loss >= 3:
        reasons.append(f"Severe packet loss ({packet_loss:.2f}%)")
    elif packet_loss >= 1:
        reasons.append(f"Elevated packet loss ({packet_loss:.2f}%)")
    if throughput < 12:
        reasons.append(f"Very low throughput ({throughput:.1f} Mbps)")
    elif throughput < 25:
        reasons.append(f"Throughput under pressure ({throughput:.1f} Mbps)")
    if active_users >= 100:
        reasons.append(f"High user density ({int(active_users)} active users)")
    if horizon_days > 10:
        reasons.append(f"Long horizon ({horizon_days} days) increases forecast uncertainty")

    if not reasons:
        explanation = "All key network metrics are within healthy operating ranges."
    else:
        explanation = "Primary risk drivers: " + "; ".join(reasons) + "."

    # Actionable recommendations (enterprise NOC style)
    recommendations = []
    if prb >= 80 or congestion_prob >= 0.6:
        recommendations.append("Consider capacity expansion or carrier aggregation on this site")
        recommendations.append("Enable load balancing / traffic steering to neighbouring cells")
    if latency >= 100 or degradation_prob >= 0.55:
        recommendations.append("Investigate backhaul latency and routing paths")
        recommendations.append("Check for interference or hardware faults on the radio")
    if packet_loss >= 1.5:
        recommendations.append("Inspect transport network and retransmit settings")
    if throughput < 20 and active_users > 60:
        recommendations.append("Evaluate spectrum efficiency and MIMO configuration")
    if active_users >= 90 and prb >= 70:
        recommendations.append("Plan small-cell or additional sector deployment for peak hours")
    if level in ("High", "Critical"):
        recommendations.append("Raise priority ticket and notify field operations team")
    if not recommendations:
        recommendations.append("Continue routine monitoring — no immediate action required")
        recommendations.append("Maintain daily metric collection for model accuracy")

    return round(risk_score, 4), level, round(congestion_prob, 4), round(degradation_prob, 4), explanation, recommendations


def predict_future_values(history: List[Dict], horizon_days: int) -> Dict[str, float]:
    """Linear + slight exponential trend projection."""
    if len(history) < 2:
        last = history[-1] if history else {}
        return {
            "predicted_prb": last.get("prb_utilization"),
            "predicted_latency": last.get("latency_ms"),
            "predicted_packet_loss": last.get("packet_loss"),
        }

    df = pd.DataFrame(history)
    n = len(df)
    x = np.arange(n)

    def project(col, upper=None):
        y = df[col].values.astype(float)
        if np.std(y) < 1e-6:
            return float(y[-1])
        slope = np.polyfit(x, y, 1)[0]
        # Mild acceleration if recent trend is rising
        recent = y[-min(5, n):]
        accel = 1.0
        if len(recent) >= 3 and np.mean(np.diff(recent)) > 0:
            accel = 1.0 + min(0.15, horizon_days * 0.01)
        future = y[-1] + slope * horizon_days * accel
        future = max(0.0, float(future))
        if upper is not None:
            future = min(future, upper)
        return future

    return {
        "predicted_prb": project("prb_utilization", 100.0),
        "predicted_latency": project("latency_ms"),
        "predicted_packet_loss": project("packet_loss", 100.0),
    }


def run_prediction(
    latest_metrics: Dict[str, float],
    history: List[Dict],
    horizon_days: int
) -> Dict[str, Any]:
    """Main prediction entry point used by the API."""
    risk_score, risk_level, cong_prob, deg_prob, explanation, recommendations = calculate_risk_score(
        latest_metrics, horizon_days
    )

    future = predict_future_values(history, horizon_days)

    # Blend current risk with projected future risk
    if future.get("predicted_prb") is not None:
        projected = {
            "prb_utilization": future["predicted_prb"],
            "latency_ms": future["predicted_latency"],
            "packet_loss": future["predicted_packet_loss"],
            "throughput_mbps": latest_metrics.get("throughput_mbps", 50),
            "active_users": latest_metrics.get("active_users", 0),
            "traffic_gb": latest_metrics.get("traffic_gb", 0),
        }
        risk2, level2, _, _, _, _ = calculate_risk_score(projected, 1)
        risk_score = round(risk_score * 0.55 + risk2 * 0.45, 4)
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
        "recommendations": recommendations,
    }
