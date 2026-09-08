# 🩸 Integrated Blood Donation and Digital Blood Safety Verification Platform

> Major Project — Department of Information Science & Engineering, NNM College

## Team
- Aditi Sandikar (NNM23IS006)
- Ashmith D Suvarna (NNM23IS024)
- Dhanush D Shetty (NNM23IS048)

---

## Project Structure

```
BloodPlatform/
├── backend/          → Node.js + Express + MongoDB (Main API)
├── frontend/         → React.js (Hospital Dashboard + Donor Portal)
└── ai-service/       → Python Flask (AI/ML microservice)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, React Router, Chart.js, Leaflet.js |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB (Mongoose ODM) |
| AI/ML | Python, Flask, scikit-learn, Prophet |
| Auth | JWT (JSON Web Tokens) |
| Real-time | Socket.IO |

---

## AI Features

1. **Smart Donor Ranking** — Ranks donors using a weighted ML model (response rate, donation history, proximity, readiness)
2. **Blood Safety Anomaly Detection** — Flags borderline/abnormal test values the rule engine might miss
3. **Blood Demand Forecasting** — Predicts 7-day demand per blood group from 90-day history
4. **Urgency Prediction** — Scores incoming requests 0–1 for priority alerting
5. **AI Donor Chatbot** — NLP-based FAQ assistant for donors

---

## Setup & Running

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB (local or Atlas)

---

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```
Server runs on: `http://localhost:5000`

---

### 2. AI Service

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```
AI service runs on: `http://localhost:8000`

---

### 3. Frontend

```bash
cd frontend
npm install
npm start
```
Frontend runs on: `http://localhost:3000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register/donor | Register a donor |
| POST | /api/auth/register/hospital | Register a hospital |
| POST | /api/auth/login | Login (donor or hospital) |

### Donors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/donors/profile | Get donor profile |
| PUT | /api/donors/profile | Update profile |
| PATCH | /api/donors/availability | Toggle availability |
| GET | /api/donors/nearby | Find nearby donors (geospatial) |

### Blood Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/requests | Create emergency request |
| GET | /api/requests/hospital | Hospital's requests |
| GET | /api/requests/open | Open requests (donor view) |
| POST | /api/requests/:id/respond | Donor responds |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/inventory | Add blood unit |
| GET | /api/inventory | Get inventory + summary |
| POST | /api/inventory/verify-transfusion | Pre-transfusion check |

### AI Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/match-donors | AI donor ranking |
| GET | /api/ai/forecast | Blood demand forecast |
| POST | /api/ai/chat | Donor chatbot |

---

## Safety Verification Logic

```
Rule-Based Engine:
  ✓ Checks HIV, Hepatitis B/C, Syphilis test results
  ✓ Validates hemoglobin levels (min 12.5 g/dL)
  ✓ Checks blood pressure ranges
  ✓ Verifies expiry date (42-day shelf life for RBCs)
  ✓ Blood group compatibility (cross-match before transfusion)

AI Safety Layer:
  ✓ Detects borderline hemoglobin (12.5–13.0 g/dL)
  ✓ Flags abnormal storage temperature (outside 2–6°C)
  ✓ Identifies combined risk factors
```

---

## Guide
Dr. Vandana b 

## Project Code: 35
