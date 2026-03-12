# 🚀 AircraftWorth Backend API

![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge)
![Neuron](https://img.shields.io/badge/Neuron-MLAT-blue?style=for-the-badge)
![Hedera](https://img.shields.io/badge/Hedera-Testnet-8b5cf6?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge)
![Marketplace](https://img.shields.io/badge/Data-Marketplace-green?style=for-the-badge)

> **Complete backend for AircraftWorth MLAT tracking and Data Marketplace.** FastAPI-based service handling Neuron sensor data, MLAT calculations, Hedera blockchain integration, and comprehensive marketplace functionality.

## 📦 Tech Stack

- **Framework**: FastAPI + Uvicorn
- **MLAT Processing**: SciPy + NumPy + pyModeS
- **Blockchain**: Hedera SDK (HCS logging + HTS payments)
- **Database**: Supabase PostgreSQL + PostGIS
- **Authentication**: JWT + API keys
- **Testing**: Pytest + pytest-asyncio + coverage

## ⚙️ Setup

### Prerequisites
- Python 3.12+
- Supabase account
- Hedera testnet credentials
- Neuron buyer credentials (optional)

### Installation
```bash
# Clone and navigate
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=302e...
HCS_TOPIC_ID=0.0.xxxxx
SWT_TOKEN_ID=0.0.xxxxx

# Neuron Network
NEURON_BUYER_ACCOUNT_ID=0.0.xxxxx
NEURON_BUYER_PRIVATE_KEY=...
NEURON_SENSOR_IDS=021a29e7...,037ec65f...

# Supabase Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Marketplace
MARKETPLACE_ESCROW_ACCOUNT=0.0.1234567
JWT_SECRET=your_jwt_secret_key
```

### Database Setup
```bash
# 1. Create Supabase project
# 2. Run schemas in Supabase SQL Editor:
\i supabase/schema.sql
\i supabase/marketplace_schema.sql

# 3. Seed data
python scripts/seed_sensors.py
```

## 🚀 Running the Server

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📡 API Endpoints

### 🛩️ MLAT Tracking
- `POST /api/mlat/ingest` - Ingest Mode-S message batches
- `POST /api/mlat/process` - Process MLAT for specific aircraft
- `GET /api/mlat/health` - Pipeline health check

### 🏪 Marketplace Discovery
- `GET /api/marketplace/sensors` - Browse sensors with offerings
- `GET /api/marketplace/offerings` - List all offerings
- `POST /api/marketplace/offerings` - Create offering (operators)

### 💰 Marketplace Transactions
- `POST /api/marketplace/purchase` - Initiate purchase
- `POST /api/marketplace/confirm` - Confirm payment
- `GET /api/marketplace/my-subscriptions` - View subscriptions
- `GET /api/marketplace/data` - Access purchased data

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing
```

---

**The AircraftWorth backend provides a complete, production-ready foundation for aircraft tracking and data marketplace functionality.**
