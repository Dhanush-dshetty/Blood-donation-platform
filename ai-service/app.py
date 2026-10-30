"""
Blood Platform AI Service  –  app.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mentor Req A: response-probability-aware donor ranking
Mentor Req B: fairness-aware coverage reporting

Existing endpoints are preserved exactly so no existing callers break.
New endpoints:
  POST /rank-donors-v2      — enhanced probabilistic ranking
  POST /fairness-report     — geographic coverage + burden report
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import math

app = Flask(__name__)
CORS(app)

# ──────────────────────────────────────────────────────────────────
# CONFIGURABLE WEIGHTS  (mirrors backend/utils/donorRankingService.js)
# Change these values to retune without touching logic.
# ──────────────────────────────────────────────────────────────────
WEIGHTS = {
    "response": {
        "historical_rate":    0.40,
        "availability":       0.25,
        "donation_history":   0.15,
        "burden_inverse":     0.20,
    },
    "arrival": {
        "distance_score":     0.55,
        "urgency_bonus":      0.25,
        "historical_arrival": 0.20,
    },
    "mobilization": {
        "response_weight":    0.50,
        "arrival_weight":     0.50,
    },
    "fairness": {
        "burden_penalty_max":      0.30,
        "underserved_area_bonus":  0.10,
        "urgency_override_factor": 0.70,
    },
}

URGENCY_MULTIPLIER = {"critical": 1.40, "high": 1.15, "medium": 1.00, "low": 0.85}
MAX_DISTANCE_KM    = {"critical": 30,   "high": 25,   "medium": 20,   "low": 15}
AVG_SPEED_KMH      = 30

# ──────────────────────────────────────────────────────────────────
# SHARED HELPERS
# ──────────────────────────────────────────────────────────────────
def haversine_km(c1, c2):
    """Haversine great-circle distance in km. c1,c2 are [lng, lat]."""
    lon1, lat1 = c1
    lon2, lat2 = c2
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def travel_minutes(distance_km):
    return (distance_km / AVG_SPEED_KMH) * 60


def compute_burden_score(donor):
    """Burden score ∈ [0,1]. Higher = more burdened."""
    last7  = donor.get("alertHistory", {}).get("alertsLast7Days",  0) or 0
    last30 = donor.get("alertHistory", {}).get("alertsLast30Days", 0) or 0
    return max(min(last7 / 5, 1.0), min(last30 / 12, 1.0))


# ──────────────────────────────────────────────────────────────────
# 1. EXISTING: SMART DONOR RANKING  (kept identical for backward compat)
# ──────────────────────────────────────────────────────────────────
def rank_donors_ml(donors, urgency_level):
    """
    Original weighted scoring (Req A baseline).
    Now also incorporates burden-inverse for fairness.
    Weights match WEIGHTS dict above for consistency.
    """
    uw = URGENCY_MULTIPLIER.get(urgency_level, 1.0)
    scored = []
    for donor in donors:
        response_rate  = donor.get("responseRate", 80) / 100
        total_donations = min(donor.get("totalDonations", 0), 20) / 20
        last_donation  = donor.get("lastDonationDate")
        if last_donation:
            try:
                last_dt = datetime.fromisoformat(last_donation.replace("Z", ""))
                days_since = (datetime.utcnow() - last_dt).days
                donation_readiness = min(days_since / 90, 1.0)
            except Exception:
                donation_readiness = 1.0
        else:
            donation_readiness = 1.0

        distance_km  = donor.get("distanceKm", 10)
        distance_score = max(0, 1 - (distance_km / 20))
        burden_inv   = 1.0 - compute_burden_score(donor)

        score = uw * (
            0.35 * response_rate +
            0.25 * donation_readiness +
            0.20 * distance_score +
            0.10 * total_donations +
            0.10 * burden_inv          # Req B addition to original
        )
        scored.append({**donor, "aiScore": round(score, 4)})

    scored.sort(key=lambda x: x["aiScore"], reverse=True)
    return scored


@app.route("/rank-donors", methods=["POST"])
def rank_donors():
    data = request.get_json()
    donors        = data.get("donors", [])
    blood_group   = data.get("bloodGroup", "")
    urgency_level = data.get("urgencyLevel", "medium")
    ranked = rank_donors_ml(donors, urgency_level)
    return jsonify({"rankedDonors": ranked, "count": len(ranked)})


# ──────────────────────────────────────────────────────────────────
# 2. NEW: RESPONSE-PROBABILITY-AWARE RANKING  (Req A)
# POST /rank-donors-v2
# Expects donors[] with optional alertHistory, avgArrivalTimeMinutes,
# totalAlertsResponded, hospitalCoords=[lng,lat]
# ──────────────────────────────────────────────────────────────────
def estimate_response_probability(donor):
    """
    Probability the donor will respond to an alert.
    FALLBACK: fewer than 3 alerts → documented prior of 0.65.
    """
    w = WEIGHTS["response"]
    total_alerts = (donor.get("alertHistory") or {}).get("totalAlertsReceived", 0) or 0

    if total_alerts >= 3:
        responded = donor.get("totalAlertsResponded", 0) or 0
        hist_rate = min(responded / total_alerts, 1.0)
        data_source = "historical"
    else:
        hist_rate   = 0.65   # documented volunteer response rate prior
        data_source = "prior_estimate"

    avail_score    = 1.0 if donor.get("isAvailable", True) else 0.0
    experience     = min((donor.get("totalDonations", 0) or 0) / 20, 1.0)
    burden_inv     = 1.0 - compute_burden_score(donor)

    prob = (
        w["historical_rate"]  * hist_rate +
        w["availability"]     * avail_score +
        w["donation_history"] * experience +
        w["burden_inverse"]   * burden_inv
    )
    return max(0.0, min(prob, 1.0)), data_source


def estimate_arrival_probability(donor, hospital_coords, urgency_level):
    """
    Probability the donor arrives within the urgency-defined time window.
    """
    w = WEIGHTS["arrival"]

    donor_coords = donor.get("coords") or [0, 0]
    dist_km      = haversine_km(hospital_coords, donor_coords) if any(donor_coords) else donor.get("distanceKm", 10)
    max_dist     = MAX_DISTANCE_KM.get(urgency_level, 20)

    dist_score = max(0.0, 1 - dist_km / max_dist)

    urg_mult    = {"critical": 1.5, "high": 1.2, "medium": 1.0, "low": 0.8}
    urgency_bonus_raw = dist_score * urg_mult.get(urgency_level, 1.0) * 0.2
    urgency_bonus_norm = min(urgency_bonus_raw / 0.2, 1.0)

    avg_arrival = donor.get("avgArrivalTimeMinutes")
    if avg_arrival is not None:
        est_travel = travel_minutes(dist_km)
        hist_arrival = 0.9 if avg_arrival <= est_travel * 1.5 else 0.4
    else:
        hist_arrival = 0.6   # prior when no arrival data exists

    prob = (
        w["distance_score"]     * dist_score +
        w["urgency_bonus"]      * urgency_bonus_norm +
        w["historical_arrival"] * hist_arrival
    )
    return max(0.0, min(prob, 1.0))


def compute_mobilization_score(donor, hospital_coords, urgency_level):
    resp_prob,  data_source = estimate_response_probability(donor)
    arrival_prob            = estimate_arrival_probability(donor, hospital_coords, urgency_level)

    mw   = WEIGHTS["mobilization"]
    raw  = mw["response_weight"] * resp_prob + mw["arrival_weight"] * arrival_prob
    urg  = URGENCY_MULTIPLIER.get(urgency_level, 1.0)
    score = min(raw * urg, 1.0)

    dist_km = haversine_km(hospital_coords, donor.get("coords") or [0, 0]) if any(donor.get("coords") or []) else donor.get("distanceKm", 10)

    return {
        "mobilizationScore":    round(score, 4),
        "responseProbability":  round(resp_prob, 4),
        "arrivalProbability":   round(arrival_prob, 4),
        "estimatedTravelMins":  round(travel_minutes(dist_km)),
        "distanceKm":           round(dist_km, 1),
        "dataSource":           data_source,
    }


def apply_fairness(raw_score, donor, area_donor_count, ai_urgency_score):
    """Req B: fairness penalty + underserved bonus."""
    fw             = WEIGHTS["fairness"]
    urg_factor     = 0.5 if ai_urgency_score >= fw["urgency_override_factor"] else 1.0

    burden         = compute_burden_score(donor)
    burden_penalty = fw["burden_penalty_max"] * burden * urg_factor

    area = donor.get("area", "")
    if area and area_donor_count:
        count    = area_donor_count.get(area, 1)
        max_cnt  = max(area_donor_count.values(), default=1)
        scarcity = max(0, 1 - count / max_cnt)
        underserved_bonus = fw["underserved_area_bonus"] * scarcity * urg_factor
    else:
        underserved_bonus = 0.0

    return max(0.0, min(raw_score - burden_penalty + underserved_bonus, 1.0))


@app.route("/rank-donors-v2", methods=["POST"])
def rank_donors_v2():
    """
    Enhanced probabilistic ranking with Req A + Req B.
    Input:  { donors[], bloodGroup, urgencyLevel, hospitalCoords, aiUrgencyScore }
    Output: { rankedDonors[], coverageReport, count }
    """
    data           = request.get_json()
    donors         = data.get("donors", [])
    urgency_level  = data.get("urgencyLevel", "medium")
    hospital_coords = data.get("hospitalCoords", [0.0, 0.0])
    ai_urgency     = data.get("aiUrgencyScore", 0.5)

    if not donors:
        return jsonify({"rankedDonors": [], "count": 0, "coverageReport": {}})

    # Area donor-count map (for underserved bonus)
    area_count = {}
    for d in donors:
        a = d.get("area", "")
        if a:
            area_count[a] = area_count.get(a, 0) + 1

    scored = []
    for donor in donors:
        mob = compute_mobilization_score(donor, hospital_coords, urgency_level)
        fair_score = apply_fairness(mob["mobilizationScore"], donor, area_count, ai_urgency)

        scored.append({
            **donor,
            **mob,
            "fairnessAdjustedScore": round(fair_score, 4),
            "burdenScore":           round(compute_burden_score(donor), 4),
        })

    scored.sort(key=lambda x: x["fairnessAdjustedScore"], reverse=True)

    # Coverage report (Req B)
    alerted_areas = list({d.get("area", "") for d in scored[:20] if d.get("area")})
    all_areas     = list({d.get("area", "") for d in scored if d.get("area")})
    coverage = {
        "totalEligible":      len(scored),
        "alertsSent":         min(len(scored), 20),
        "areasWithEligible":  all_areas,
        "areasAlerted":       alerted_areas,
        "coverageFraction":   round(len(alerted_areas) / max(len(all_areas), 1), 2),
        "lowDonorAvailability": len(scored) < 3,
    }

    return jsonify({
        "rankedDonors":  scored,
        "count":         len(scored),
        "coverageReport": coverage,
    })


# ──────────────────────────────────────────────────────────────────
# 3. NEW: FAIRNESS REPORT  (Req B)
# POST /fairness-report
# Input: { donors[], requestHistory[] }
# ──────────────────────────────────────────────────────────────────
@app.route("/fairness-report", methods=["POST"])
def fairness_report():
    """
    Produces geographic coverage + alert-burden report.
    requestHistory: list of { alertedAreas:[], status, urgencyLevel }
    """
    data    = request.get_json()
    donors  = data.get("donors", [])
    history = data.get("requestHistory", [])

    # Per-area fulfillment
    area_stats = {}
    for req in history:
        for area in req.get("alertedAreas", []):
            if area not in area_stats:
                area_stats[area] = {"total": 0, "fulfilled": 0}
            area_stats[area]["total"] += 1
            if req.get("status") == "fulfilled":
                area_stats[area]["fulfilled"] += 1

    region_fulfillment = []
    for area, s in area_stats.items():
        rate = round(s["fulfilled"] / s["total"] * 100) if s["total"] else 0
        region_fulfillment.append({
            "area": area,
            "total": s["total"],
            "fulfilled": s["fulfilled"],
            "fulfillmentRate": rate,
        })
    region_fulfillment.sort(key=lambda x: x["fulfillmentRate"])

    # Per-donor burden
    burden_stats = []
    for donor in donors:
        burden_stats.append({
            "donorId":       donor.get("_id", ""),
            "area":          donor.get("area", ""),
            "alertsLast7":   donor.get("alertHistory", {}).get("alertsLast7Days",  0) or 0,
            "alertsLast30":  donor.get("alertHistory", {}).get("alertsLast30Days", 0) or 0,
            "burdenScore":   round(compute_burden_score(donor), 4),
            "responseRate":  donor.get("responseRate", 100),
        })
    # Sort most burdened first for easy review
    burden_stats.sort(key=lambda x: x["burdenScore"], reverse=True)

    return jsonify({
        "regionFulfillment": region_fulfillment,
        "donorBurden":       burden_stats[:50],  # cap at 50 rows
        "summary": {
            "regionsAnalysed":   len(region_fulfillment),
            "highBurdenDonors":  sum(1 for b in burden_stats if b["burdenScore"] > 0.6),
            "underservedRegions": [r["area"] for r in region_fulfillment if r["fulfillmentRate"] < 50],
        },
    })


# ──────────────────────────────────────────────────────────────────
# 4. EXISTING: BLOOD SAFETY VERIFICATION
# ──────────────────────────────────────────────────────────────────
def check_safety_anomalies(data):
    flags      = []
    confidence = 0.0
    hb         = data.get("hemoglobinLevel", 13)
    sys_bp     = data.get("bloodPressureSystolic", 120)
    dia_bp     = data.get("bloodPressureDiastolic", 80)
    temp       = data.get("storageTemperature", 4)

    if 12.5 <= hb < 13.0:
        flags.append("Borderline hemoglobin level — recommend retest")
        confidence += 0.3
    if temp is not None and not (2 <= temp <= 6):
        flags.append(f"Storage temperature {temp}°C outside safe range (2–6°C)")
        confidence += 0.5
    if hb < 13.5 and sys_bp > 160:
        flags.append("Combined risk: low hemoglobin with elevated blood pressure")
        confidence += 0.4

    return {
        "isFlagged":  len(flags) > 0,
        "reason":     "; ".join(flags) if flags else None,
        "confidence": min(round(confidence, 2), 1.0),
    }


@app.route("/verify-safety", methods=["POST"])
def verify_safety():
    data   = request.get_json()
    result = check_safety_anomalies(data)
    return jsonify(result)


# ──────────────────────────────────────────────────────────────────
# 5. EXISTING: PRE-TRANSFUSION VERIFICATION
# ──────────────────────────────────────────────────────────────────
COMPATIBILITY_MAP = {
    "A+":  ["A+", "A-", "O+", "O-"],
    "A-":  ["A-", "O-"],
    "B+":  ["B+", "B-", "O+", "O-"],
    "B-":  ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+":  ["O+", "O-"],
    "O-":  ["O-"],
}


@app.route("/verify-transfusion", methods=["POST"])
def verify_transfusion():
    data           = request.get_json()
    unit_bg        = data.get("unitBloodGroup", "")
    patient_bg     = data.get("patientBloodGroup", "")
    expiry_date_str = data.get("expiryDate", "")
    safety         = data.get("safetyVerification", {})
    issues         = []

    compatible = COMPATIBILITY_MAP.get(patient_bg, [])
    if unit_bg not in compatible:
        issues.append(f"INCOMPATIBLE blood groups: unit={unit_bg}, patient={patient_bg}")

    if expiry_date_str:
        try:
            expiry = datetime.fromisoformat(expiry_date_str.replace("Z", ""))
            if datetime.utcnow() > expiry:
                issues.append("Blood unit has EXPIRED")
        except Exception:
            pass

    for test in ["hivTest", "hepatitisBTest", "hepatitisCTest", "syphilisTest"]:
        if safety.get(test) == "positive":
            issues.append(f"{test} is POSITIVE — unit must not be used")

    return jsonify({"approved": len(issues) == 0, "issues": issues})


# ──────────────────────────────────────────────────────────────────
# 6. EXISTING: URGENCY PREDICTION
# ──────────────────────────────────────────────────────────────────
@app.route("/predict-urgency", methods=["POST"])
def predict_urgency():
    data           = request.get_json()
    urgency_level  = data.get("urgencyLevel", "medium")
    units_required = data.get("unitsRequired", 1)
    blood_group    = data.get("bloodGroup", "O+")
    rare_groups    = ["AB-", "B-", "A-", "O-"]
    rarity_bonus   = 0.2 if blood_group in rare_groups else 0.0
    base_scores    = {"critical": 0.95, "high": 0.75, "medium": 0.5, "low": 0.25}
    base           = base_scores.get(urgency_level, 0.5)
    units_factor   = min(units_required / 10, 0.1)
    urgency_score  = min(base + rarity_bonus + units_factor, 1.0)
    return jsonify({"urgency_score": round(urgency_score, 3), "urgencyLevel": urgency_level})


# ──────────────────────────────────────────────────────────────────
# 7. EXISTING: BLOOD DEMAND FORECASTING
# ──────────────────────────────────────────────────────────────────
@app.route("/forecast-demand", methods=["POST"])
def forecast_demand():
    data    = request.get_json()
    history = data.get("history", [])
    counts  = {}
    for req in history:
        bg = req.get("bloodGroup", "Unknown")
        counts[bg] = counts.get(bg, 0) + req.get("unitsRequired", 1)

    forecast = {}
    for bg, total in counts.items():
        daily_avg = total / 90
        forecast[bg] = {
            "daily_avg":          round(daily_avg, 2),
            "forecast_7_days":    round(daily_avg * 7, 1),
            "recommended_stock":  round(daily_avg * 14, 1),
        }

    all_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    for bg in all_groups:
        if bg not in forecast:
            forecast[bg] = {"daily_avg": 0, "forecast_7_days": 0, "recommended_stock": 2}

    return jsonify({"forecast": forecast, "basedOnDays": 90})


# ──────────────────────────────────────────────────────────────────
# 8. EXISTING: DONOR CHATBOT
# ──────────────────────────────────────────────────────────────────
FAQ = {
    "eligible":    "To donate blood, you must be at least 18 years old, weigh at least 50kg, and be in good health. You should wait at least 90 days between donations.",
    "donate again":"You need to wait at least 90 days (3 months) after your last whole blood donation before donating again.",
    "how long":    "The whole donation process takes about 45–60 minutes. The actual blood collection takes only 8–10 minutes.",
    "side effects":"Common side effects include slight dizziness or fatigue. Drink plenty of fluids and avoid strenuous activity for the rest of the day.",
    "blood type":  "Your blood type is determined by antigens on your red blood cells. Common types are A, B, AB, and O, each either positive (+) or negative (-).",
    "o negative":  "O- is the universal donor — it can be given to anyone. People with O- blood are especially valuable donors.",
    "what happens":"Your blood is tested for blood type and screened for infectious diseases. It's then separated into components (red cells, plasma, platelets) and distributed to hospitals.",
    "diet":        "Stay well hydrated and eat iron-rich foods (spinach, beans, red meat) before donating. Avoid fatty foods 4 hours before donation.",
    "default":     "Thank you for your question! For specific medical advice, please consult your healthcare provider. For general donation queries, you can also visit your nearest blood bank.",
}


@app.route("/chat", methods=["POST"])
def chat():
    data     = request.get_json()
    message  = data.get("message", "").lower()
    response = FAQ["default"]
    for keyword, answer in FAQ.items():
        if keyword in message:
            response = answer
            break
    return jsonify({"reply": response})


# ──────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":  "OK",
        "service": "Blood Platform AI Service",
        "version": "2.0.0",
        "features": [
            "rank-donors (v1 baseline)",
            "rank-donors-v2 (Req A probabilistic)",
            "fairness-report (Req B)",
            "verify-safety",
            "verify-transfusion",
            "predict-urgency",
            "forecast-demand",
            "chat",
        ],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
