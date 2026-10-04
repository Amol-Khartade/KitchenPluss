# KitchenPulse — Autonomous Restaurant Kitchen Operations & Supply Chain System

**KitchenPulse** is an end-to-end, state-aware commercial kitchen operations system featuring real-time kitchen queue management, automated inventory deductions, Model Context Protocol (MCP) data & supplier integrations, autonomous AI inventory predictions, and waste tracking.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│               React Native Expo Tablet App  &  React + Vite Web App            │
│       Mobile (/mobile: Expo SDK 57)   │   Web (/web: React 18, Tailwind, KDS)  │
│          Zustand, TanStack Query, Reanimated, Zod, Socket.io-client            │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │ WebSocket (Socket.io) + REST HTTP
┌───────────────────────────────────────▼────────────────────────────────────────┐
│                      Node.js Express TypeScript Backend                        │
│         (/api/tickets, /api/ingredients, /api/food-cost, /api/ai, etc.)        │
└───────────────────────┬────────────────────────────────────────┬───────────────┘
                        │                                        │
                Direct Pool / REST                     AI Orchestrator (Gemini)
                        │                                        │
┌───────────────────────▼─────┐                        ┌─────────▼───────────────┐
│ PostgreSQL Database (v16+)  │                        │  MCP Client Connector   │
│ - Relational Core Tables    │                        └────┬────────────────┬───┘
│ - Materialized View (Cost)  │                             │ Stdio          │ Stdio
└─────────────────────────────┘                        ┌────▼────────┐  ┌────▼────────┐
                                                       │Postgres MCP │  │Supplier MCP │
                                                       │Server       │  │Server       │
                                                       └─────────────┘  └─────────────┘
```

---

## 📦 Tech Stack (100% Free / Open Source)

- **Web Command Center (`/web`)**: React 18 with Vite, TypeScript, Tailwind CSS, Lucide icons, TanStack Query, Socket.io-client. Features a 3-column Kanban KDS, dynamic order elapsed timers, live pantry stock bars, AI prep sheet drawer, and food cost analytics. Built adhering to `ui-ux-pro-max` dark OLED data-dense design tokens.
- **Mobile Frontend (`/mobile`)**: React Native with Expo (SDK 57), TypeScript, Zustand (local UI state), TanStack Query (server state), React Native Reanimated (card layout transitions).
- **Backend API (`/backend`)**: Node.js, Express, TypeScript, Socket.io (bi-directional real-time events).
- **Database**: PostgreSQL (local Windows service or Dockerized via `docker-compose.yml`).
- **Protocol Layer (`/mcp-servers`)**: Model Context Protocol (MCP) using official `@modelcontextprotocol/sdk`.
- **AI Orchestration (`/backend/src/ai-orchestrator`)**: Google Gemini API SDK (`@google/generative-ai`) with heuristic fallback.
- **Containerization**: Docker Compose (`docker-compose.yml`) for multi-container deployment.

---

## 🗄️ Relational Schema

Migration located at: [`backend/src/db/migrations/01_init.sql`](file:///D:/KitchenPluss/backend/src/db/migrations/01_init.sql)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| **`ingredients`** | Inventory stock & reorder limits | `id` (UUID), `name`, `unit`, `current_stock`, `minimum_threshold`, `cost_per_unit` |
| **`recipes`** | Menu items & prep station assignments | `id` (UUID), `menu_item_name`, `price`, `station`, `prep_time_minutes` |
| **`recipe_ingredients`** | BOM (Bill of Materials) junction | `recipe_id`, `ingredient_id`, `quantity_required` |
| **`prep_logs`** | Daily kitchen prep and scrap records | `id` (UUID), `recipe_id`, `prep_date`, `prepped_qty`, `waste_qty`, `day_of_week` |
| **`live_tickets`** | Kitchen Display System active tickets | `id` (UUID), `recipe_id`, `station`, `table_number`, `status` (`QUEUE`, `FIRING`, `COMPLETED`), `created_at`, `completed_at` |
| **`supplier_orders`** | AI-generated purchase orders | `id` (UUID), `ingredient_id`, `quantity_ordered`, `status`, `quality_flag`, `created_at` |
| **`mv_food_cost_summary`** | Materialized view tracking food & waste costs | `recipe_id`, `menu_item_name`, `price`, `total_prepped`, `total_waste`, `food_cost_pct`, `waste_pct` |

---

## 🔌 MCP Server Layer (`/mcp-servers`)

### 1. Postgres MCP Server (`/mcp-servers/postgres-mcp`)
Exposes secure read/write database tools via Stdio transport:
- `query_stock`: Inspect real-time stock levels and compute deficits.
- `log_waste`: Record prep quantities, scrap, and refresh cost materialized view.
- `fetch_historical_prep`: Query prep logs filtered by day of the week.
- `get_food_cost_summary`: Query the aggregated food cost materialized view.
- `create_supplier_order`: Insert supplier order records for low-stock items.
- `get_low_stock_ingredients`: Identify all items where `current_stock < minimum_threshold`.

### 2. Supplier MCP Server (`/mcp-servers/supplier-mcp`)
Simulates external wholesale suppliers (pricing, lead times, availability, purchase orders):
- `get_supplier_pricing`: Retrieve unit price, total price, and lead times.
- `get_supplier_catalog`: Browse wholesale ingredients catalog.
- `create_purchase_order`: Issue POs with urgency levels (`NORMAL` or `URGENT` with expedited delivery).
- `check_supplier_availability`: Check immediate warehouse stock.

---

## ⚡ Real-Time Operations (Socket.io)

Real-time bi-directional events synchronize station display tablets and web command consoles:
- `new_ticket` / `ticket:created`: Live order injected into station queue.
- `update_ticket_status` / `ticket:updated`: Status changes (`QUEUE` → `FIRING` → `COMPLETED`).
- Automatic inventory deduction when ticket reaches `COMPLETED`.
- `stock_alert` / `stock:alert`: Triggered when an ingredient drops below `minimum_threshold`.
- `station_workload` / `station:workload`: Kitchen load balancing across stations.
- `food_cost_updated`: Instant cost broadcast when tickets finish or prep is recorded.

---

## 🧠 AI Agent Workflows (`/backend/src/ai-orchestrator`)

### Workflow A: Nightly Prep Optimization
- Analyzes historical `prep_logs` for tomorrow's `day_of_week`.
- Calculates recipe waste percentages and patterns.
- AI generates a suggested prep list with portion counts and reasoning.
- Endpoint: `POST /api/ai/prep-optimization` (also broadcasts `ai:prep_sheet` to clients).

### Workflow B: Live Autonomous Inventory Alert & Reordering
- Triggers on stock shortfall alerts or manual audit.
- Evaluates stock deficit, lead time, and station velocity.
- Calls Supplier MCP to fetch real-time wholesale quotes.
- Automatically drafts purchase orders and records them in the database.
- Endpoint: `POST /api/ai/inventory-alert`.

---

## 🖥️ Web Operations Command Center (`/web`)

Modern desktop & tablet browser dashboard designed with **Dark Mode OLED** (#090D16) & data-dense layouts:
- **Live KDS Board**: 3-column Kanban (`Queue` → `Firing` → `Completed`) with station tabs, real-time wait clocks (`T+ mm:ss`), and one-click status advancement.
- **Inventory & Supply Chain Console**: Visual stock level bars vs safety thresholds, inline quick adjustments, and active supplier PO management.
- **AI Prep & Cost Intelligence**: Target day forecasting with LLM reasoning breakdown and live PostgreSQL Materialized View food cost metrics.
- **Shift Waste Logger**: Fast scrap entry with instant calculation and audit trail history.

---

## 📱 Mobile Kitchen Tablet App (`/mobile`)

- **Live Kitchen Queue Screen**: Real-time 3-column view with smooth transitions powered by `react-native-reanimated`.
- **AI Prep Sheet Screen**: Live TanStack Query hook fetching AI prep recommendations and historical waste metrics.
- **End of Day Waste Form**: Multi-item waste logging form with strict `zod` client-side validation (`waste_qty <= prepped_qty`).
- **Live Alert Banner**: Real-time stock alert pill at the top of the tablet screen.

---

## 🚀 Quickstart & Verification

### 1. Database Setup
```bash
# Seed local PostgreSQL with sample menu, recipes, prep logs, and stock
npm run seed
```

### 2. Run Comprehensive Test Suite
```bash
# Verifies MCP manifests, WebSocket ticket transitions, and AI workflows:
npm run test:all
```

### 3. Build All Projects
```bash
# Compiles backend TypeScript and builds Vite web production assets:
npm run build:all
```

### 4. Start Development Servers
```bash
# Start backend API (Port 5000)
npm run dev:backend

# Start Web Command Center (Port 3000)
npm run dev:web

# Start Mobile Tablet App (Port 8081)
npm run dev:mobile
```
