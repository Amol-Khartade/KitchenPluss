# KitchenPulse AI Agent Microservice

Autonomous Python AI agent service built with **FastAPI** and **Uvicorn** for commercial kitchen prep forecasting and inventory deficit evaluation.

---

## 🛠️ Tech Stack
- **Framework**: FastAPI
- **ASGI Server**: Uvicorn
- **Validation**: Pydantic v2 & Pydantic Settings
- **HTTP Client**: HTTPX
- **Runtime**: Python 3.11+ / Docker

---

## 🚀 Local Development Setup

### 1. Create and Activate Virtual Environment
```bash
cd services/ai-agent
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Linux / macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

### 4. Run Development Server with Hot-Reload
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Liveness healthcheck and service status |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |
| `POST` | `/api/v1/agent/forecast` | Nightly kitchen prep sheet recommendation engine |
| `POST` | `/api/v1/agent/inventory-eval` | Stock shortfall audit and supplier PO recommendations |

---

## 🐳 Docker Deployment
The service is pre-configured in the root [`docker-compose.yml`](../../docker-compose.yml):

```bash
docker compose up -d ai-agent
```
