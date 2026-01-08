# ChainFreight Local Development

Quick guide to run both **Server** (Node.js) and **Optimizer** (Python) locally.

## Prerequisites

- **Node.js** 18+
- **Python** 3.9+
- **pip** (Python package manager)

## Quick Start (Windows PowerShell)

```powershell
# From project root
.\start-all.ps1
```

This opens 2 terminal windows:
- **Server** on http://localhost:5000
- **Optimizer** on http://localhost:8000

## Manual Start

### 1. Start Optimizer (Python)

```bash
cd optimizer
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# or: source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 2. Start Server (Node.js)

```bash
cd server
npm install
npm run dev
```

## Environment Variables

### Server (`.env`)
```env
SUPABASE_URL=your_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET_KEY=your_jwt_secret
OPTIMIZER_URL=http://localhost:8000
```

### Optimizer (`.env`)
```env
SUPABASE_URL=your_url
SUPABASE_KEY=your_anon_key
HANDOFF_SECRET_KEY=your_handoff_secret
```

## API Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Server | http://localhost:5000/api | Express REST API |
| Optimizer | http://localhost:8000/docs | FastAPI Swagger UI |
| Health Check | http://localhost:5000/api/optimize/health | Both services |

## Test Chain Optimization

```bash
curl -X POST http://localhost:5000/api/optimize/chain \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 13.08, "lng": 80.27},
    "destination": {"lat": 12.97, "lng": 77.59},
    "product_type": "electronics",
    "shipments": [{"id": "ship-1", "weight_kg": 500}]
  }'
```
