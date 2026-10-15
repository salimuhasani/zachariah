# Network Performance Prediction & Congestion Management System

Enterprise-ready platform for **NOC Operators** to monitor, simulate, and predict network performance degradation and congestion.

Built for telecom operators, ISPs, and network operations centres.

---

## Core Capabilities

| Module | Description |
|--------|-------------|
| **Networks** | Register and manage radio sites / areas |
| **Metrics** | Daily KPI ingestion (manual or API) |
| **Simulation** | Live tower simulation — change Active Users and see PRB, Latency, Packet Loss, Throughput react in real time |
| **Predictions** | AI-assisted risk forecast (1–30 day horizon) with Risk Level + actionable recommendations |
| **Dashboard** | Executive overview of all sites and high-risk alerts |
| **API Integration** | Push metrics from existing OSS/BSS via API Key |

## KPI Factors

- Active Users
- Traffic (GB)
- PRB Utilization (%)
- Latency (ms)
- Packet Loss (%)
- Throughput (Mbps)

## Risk Levels

`Low` → `Medium` → `High` → `Critical`

Each prediction includes:
- Risk Score (%)
- Congestion Probability
- Performance Degradation Probability
- Scientific explanation of drivers
- **Actionable recommendations** for field / NOC teams

---

## Tech Stack

- **Backend**: FastAPI, PostgreSQL, scikit-learn
- **Frontend**: React (Vite), Tailwind CSS, Recharts, Lucide
- **Auth**: JWT + per-operator API Key
- **Deploy**: Railway / Docker ready

---

## Quick Start (Local)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/network_prediction"
export SECRET_KEY="change-me-in-production"
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Operator Workflow

1. **Register / Login**
2. **Create Network** (e.g. Site-A-4G, Kinondoni)
3. **Add Metrics** (manual or via API)
4. **Simulation** — select the network, change Active Users, observe live KPI impact, save metrics
5. **Run Prediction** — choose horizon (3 / 7 / 14 / 30 days)
6. Review Risk Level + recommendations on Dashboard / Predictions

---

## API (Key Endpoints)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/v1/auth/register | — |
| POST | /api/v1/auth/login | — |
| POST | /api/v1/networks/ | JWT |
| POST | /api/v1/metrics/ | JWT |
| POST | /api/v1/metrics/api | X-API-Key |
| POST | /api/v1/predictions/ | JWT |
| GET  | /api/v1/dashboard/stats | JWT |

Full docs: `http://localhost:8000/docs`

---

## Why Operators Buy This

- **Proactive** — see congestion before customers complain
- **Visual Simulation** — demonstrate capacity limits to management
- **Recommendations** — not just scores, but what to do next
- **API-first** — fits into existing monitoring pipelines
- **Multi-tenant** — each operator sees only their data

---

## License

MIT — free for commercial and internal use.
