# Network Performance Prediction System

Mfumo wa kutabiri **Performance Degradation** na **Network Congestion** kwa Operators.

## Features

- Multi-operator (kila operator ana data yake)
- Data input **mbili**:
  - Manual (kupitia Dashboard)
  - API (kutoka system yako kwa kutumia `X-API-Key`)
- Prediction yenye **horizon** inayochaguliwa (1–30 siku)
- Dashboard nzuri ya React
- Risk levels: Low / Medium / High / Critical

## Factors zinazotumika

| Factor            | Description              |
|-------------------|--------------------------|
| Active Users      | Idadi ya watumiaji       |
| Traffic (GB)      | Traffic volume           |
| PRB Utilization % | Physical Resource Block  |
| Latency (ms)      | Network latency          |
| Packet Loss %     | Packet loss rate         |
| Throughput (Mbps) | Data throughput          |

## Tech Stack

- **Backend**: FastAPI + PostgreSQL + scikit-learn
- **Frontend**: React (Vite) + Tailwind CSS + Recharts
- **Auth**: JWT + API Key
- **Deploy**: Railway + GitHub

---

## Local Development

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment (or use .env)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/network_prediction"
export SECRET_KEY="your-secret-key"

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:3000

---

## Deploy on Railway (GitHub)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Network Prediction System"
git remote add origin https://github.com/YOUR_USERNAME/network-prediction-system.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo
3. Add **PostgreSQL** service (Railway → New → Database → PostgreSQL)
4. For **Backend** service:
   - Root Directory: `backend`
   - Build: uses Dockerfile
   - Environment variables:
     - `DATABASE_URL` → reference from Postgres service
     - `SECRET_KEY` → generate a strong random string
     - `PORT` → 8000 (or leave Railway default)

5. For **Frontend** (optional separate service or static):
   - You can deploy frontend as another Railway service
   - Or build and serve via any static host
   - Set `VITE_API_URL` to your backend public URL (e.g. `https://your-backend.up.railway.app/api/v1`)

### Step 3: Connect Services

- Backend service → Variables → Add `DATABASE_URL` from Postgres
- After deploy, open backend URL + `/docs` to test API

---

## API Endpoints Summary

| Method | Endpoint                        | Auth          | Description                |
|--------|---------------------------------|---------------|----------------------------|
| POST   | /api/v1/auth/register           | None          | Register operator          |
| POST   | /api/v1/auth/login              | None          | Login                      |
| GET    | /api/v1/auth/me                 | JWT           | Current operator           |
| POST   | /api/v1/networks/               | JWT           | Create network             |
| GET    | /api/v1/networks/               | JWT           | List networks              |
| POST   | /api/v1/metrics/                | JWT           | Manual metric entry        |
| POST   | /api/v1/metrics/api             | X-API-Key     | API metric entry           |
| POST   | /api/v1/metrics/api/bulk        | X-API-Key     | Bulk API metrics           |
| POST   | /api/v1/predictions/            | JWT           | Run prediction             |
| GET    | /api/v1/dashboard/stats         | JWT           | Dashboard stats            |

---

## How Operators Use It

1. **Register** → get JWT + API Key
2. **Create Network** (e.g. "Site-A", Area: "Kinondoni")
3. **Add Metrics** daily (manual or via API)
4. **Run Prediction** → choose 1 / 3 / 7 / 14 / 30 days
5. View risk level + explanation on Dashboard

---

## License

MIT – free for operators and telecom teams.
