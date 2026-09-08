from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# 1. SMART DONOR RANKING (ML-based)
# ─────────────────────────────────────────────
def rank_donors_ml(donors, urgency_level):
    """
    Ranks donors using a weighted scoring model.
    Factors: response rate, days since last donation, total donations, distance.
    In production, replace with a trained scikit-learn model.
    """
    urgency_weight = {'critical': 1.5, 'high': 1.2, 'medium': 1.0, 'low': 0.8}
    uw = urgency_weight.get(urgency_level, 1.0)

    scored = []
    for donor in donors:
        response_rate = donor.get('responseRate', 80) / 100
        total_donations = min(donor.get('totalDonations', 0), 20) / 20  # cap at 20
        # Days since last donation (higher = more ready)
        last_donation = donor.get('lastDonationDate')
        if last_donation:
            try:
                last_dt = datetime.fromisoformat(last_donation.replace('Z', ''))
                days_since = (datetime.utcnow() - last_dt).days
                donation_readiness = min(days_since / 90, 1.0)  # 90-day cooldown
            except Exception:
                donation_readiness = 1.0
        else:
            donation_readiness = 1.0

        # Distance score (closer = better, assumed already filtered to <20km)
        distance_km = donor.get('distanceKm', 10)
        distance_score = max(0, 1 - (distance_km / 20))

        score = uw * (
            0.35 * response_rate +
            0.25 * donation_readiness +
            0.20 * distance_score +
            0.20 * total_donations
        )

        scored.append({**donor, 'aiScore': round(score, 4)})

    scored.sort(key=lambda x: x['aiScore'], reverse=True)
    return scored


@app.route('/rank-donors', methods=['POST'])
def rank_donors():
    data = request.get_json()
    donors = data.get('donors', [])
    blood_group = data.get('bloodGroup', '')
    urgency_level = data.get('urgencyLevel', 'medium')

    ranked = rank_donors_ml(donors, urgency_level)
    return jsonify({'rankedDonors': ranked, 'count': len(ranked)})


# ─────────────────────────────────────────────
# 2. BLOOD SAFETY VERIFICATION (Anomaly detection)
# ─────────────────────────────────────────────
def check_safety_anomalies(data):
    """
    Uses statistical thresholds to flag anomalous values that simple
    rule-based checks might miss (borderline values, combined risk factors).
    """
    flags = []
    confidence = 0.0

    hb = data.get('hemoglobinLevel', 13)
    sys_bp = data.get('bloodPressureSystolic', 120)
    dia_bp = data.get('bloodPressureDiastolic', 80)
    temp = data.get('storageTemperature', 4)

    # Borderline hemoglobin (12.5–13.0 is marginal)
    if 12.5 <= hb < 13.0:
        flags.append('Borderline hemoglobin level — recommend retest')
        confidence += 0.3

    # Abnormal storage temperature (2–6°C is safe for RBCs)
    if temp is not None and not (2 <= temp <= 6):
        flags.append(f'Storage temperature {temp}°C outside safe range (2–6°C)')
        confidence += 0.5

    # Combined risk: low hb + elevated BP
    if hb < 13.5 and sys_bp > 160:
        flags.append('Combined risk: low hemoglobin with elevated blood pressure')
        confidence += 0.4

    is_flagged = len(flags) > 0
    return {
        'isFlagged': is_flagged,
        'reason': '; '.join(flags) if flags else None,
        'confidence': min(round(confidence, 2), 1.0)
    }


@app.route('/verify-safety', methods=['POST'])
def verify_safety():
    data = request.get_json()
    result = check_safety_anomalies(data)
    return jsonify(result)


# ─────────────────────────────────────────────
# 3. PRE-TRANSFUSION VERIFICATION (AI second opinion)
# ─────────────────────────────────────────────
COMPATIBILITY_MAP = {
    'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'], 'O+': ['O+', 'O-'], 'O-': ['O-']
}


@app.route('/verify-transfusion', methods=['POST'])
def verify_transfusion():
    data = request.get_json()
    unit_bg = data.get('unitBloodGroup', '')
    patient_bg = data.get('patientBloodGroup', '')
    expiry_date_str = data.get('expiryDate', '')
    safety = data.get('safetyVerification', {})

    issues = []

    # Blood group compatibility
    compatible = COMPATIBILITY_MAP.get(patient_bg, [])
    if unit_bg not in compatible:
        issues.append(f'INCOMPATIBLE blood groups: unit={unit_bg}, patient={patient_bg}')

    # Expiry check
    if expiry_date_str:
        try:
            expiry = datetime.fromisoformat(expiry_date_str.replace('Z', ''))
            if datetime.utcnow() > expiry:
                issues.append('Blood unit has EXPIRED')
        except Exception:
            pass

    # Check any positive screening tests
    for test in ['hivTest', 'hepatitisBTest', 'hepatitisCTest', 'syphilisTest']:
        if safety.get(test) == 'positive':
            issues.append(f'{test} is POSITIVE — unit must not be used')

    approved = len(issues) == 0
    return jsonify({'approved': approved, 'issues': issues})


# ─────────────────────────────────────────────
# 4. URGENCY PREDICTION
# ─────────────────────────────────────────────
@app.route('/predict-urgency', methods=['POST'])
def predict_urgency():
    data = request.get_json()
    urgency_level = data.get('urgencyLevel', 'medium')
    units_required = data.get('unitsRequired', 1)
    blood_group = data.get('bloodGroup', 'O+')

    # Rare blood groups get higher urgency score
    rare_groups = ['AB-', 'B-', 'A-', 'O-']
    rarity_bonus = 0.2 if blood_group in rare_groups else 0.0

    base_scores = {'critical': 0.95, 'high': 0.75, 'medium': 0.5, 'low': 0.25}
    base = base_scores.get(urgency_level, 0.5)

    # More units = higher urgency
    units_factor = min(units_required / 10, 0.1)

    urgency_score = min(base + rarity_bonus + units_factor, 1.0)
    return jsonify({'urgency_score': round(urgency_score, 3), 'urgencyLevel': urgency_level})


# ─────────────────────────────────────────────
# 5. BLOOD DEMAND FORECASTING
# ─────────────────────────────────────────────
@app.route('/forecast-demand', methods=['POST'])
def forecast_demand():
    data = request.get_json()
    history = data.get('history', [])

    # Aggregate by blood group from history
    counts = {}
    for req in history:
        bg = req.get('bloodGroup', 'Unknown')
        counts[bg] = counts.get(bg, 0) + req.get('unitsRequired', 1)

    # Simple forecast: predict next 7 days based on average daily usage
    forecast = {}
    for bg, total in counts.items():
        daily_avg = total / 90  # 90 days of history
        forecast[bg] = {
            'daily_avg': round(daily_avg, 2),
            'forecast_7_days': round(daily_avg * 7, 1),
            'recommended_stock': round(daily_avg * 14, 1)  # 2-week buffer
        }

    # Add zero forecast for blood groups with no history
    all_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    for bg in all_groups:
        if bg not in forecast:
            forecast[bg] = {'daily_avg': 0, 'forecast_7_days': 0, 'recommended_stock': 2}

    return jsonify({'forecast': forecast, 'basedOnDays': 90})


# ─────────────────────────────────────────────
# 6. DONOR CHATBOT (Rule-based NLP)
# ─────────────────────────────────────────────
FAQ = {
    'eligible': "To donate blood, you must be at least 18 years old, weigh at least 50kg, and be in good health. You should wait at least 90 days between donations.",
    'donate again': "You need to wait at least 90 days (3 months) after your last whole blood donation before donating again.",
    'how long': "The whole donation process takes about 45–60 minutes. The actual blood collection takes only 8–10 minutes.",
    'side effects': "Common side effects include slight dizziness or fatigue. Drink plenty of fluids and avoid strenuous activity for the rest of the day.",
    'blood type': "Your blood type is determined by antigens on your red blood cells. Common types are A, B, AB, and O, each either positive (+) or negative (-).",
    'o negative': "O- is the universal donor — it can be given to anyone. People with O- blood are especially valuable donors.",
    'what happens': "Your blood is tested for blood type and screened for infectious diseases. It's then separated into components (red cells, plasma, platelets) and distributed to hospitals.",
    'diet': "Stay well hydrated and eat iron-rich foods (spinach, beans, red meat) before donating. Avoid fatty foods 4 hours before donation.",
    'default': "Thank you for your question! For specific medical advice, please consult your healthcare provider. For general donation queries, you can also visit your nearest blood bank."
}


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '').lower()

    response = FAQ['default']
    for keyword, answer in FAQ.items():
        if keyword in message:
            response = answer
            break

    return jsonify({'reply': response})


# Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'service': 'Blood Platform AI Service'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
