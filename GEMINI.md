# GEMINI.md — KitchenPulse System Context & Architecture Guide

> **Project Reference for Antigravity & AI Assistants**  
> **Purpose**: Load this document to understand the full system architecture, multi-tenancy rules, tech stack, file maps, and coding conventions without having to re-scan the entire repository, minimizing token usage on future prompts.

---

## 1. Executive Summary & Core Mission

**KitchenPulse** is an enterprise-grade, multi-tenant autonomous commercial kitchen operations and supply chain system. It synchronizes kitchen order workflows, inventory tracking, automated recipe deductions, Model Context Protocol (MCP) data bridges, and Google Gemini AI-driven prep and stock forecasting.

### Key Capabilities
- **Real-Time KDS (Kitchen Display System)**: Multi-station kanban (`QUEUE` → `FIRING` → `COMPLETED`) with live wait clocks (`T+ mm:ss`) and automatic recipe Bill-of-Materials (BOM) inventory deductions upon completion.
- **Strict Multi-Tenant Client Isolation**: Full multi-tenant partitioning for hotel & restaurant groups (e.g., Grand Palace Hotel, Bistro Bella Napoli). Every query and socket channel is strictly scoped to `organization_id`.
- **Role-Based Access Control (RBAC)**: Strict permission tiers (`Owner`, `Admin`, `Executive Chef`, `Line Cook`/`Staff`) controlling access to financial costs, profit margins, team management, and purchasing.
- **Model Context Protocol (MCP)**: Twin MCP servers (`postgres-mcp` and `supplier-mcp`) connecting AI agents directly to Postgres databases and simulated wholesale supplier APIs via Stdio transport.
- **Gemini AI Operations**: Nightly prep forecasting based on day-of-week historical waste patterns, and autonomous supplier PO generation during stock shortfalls.

---

## 2. Monorepo Structure & File Map

```
KitchenPluss/
├── backend/                       # Node.js + Express + Socket.IO API Server (Port 5000)
│   ├── package.json               # Express, @google/generative-ai, @modelcontextprotocol/sdk, pg, zod, jsonwebtoken
│   ├── tsconfig.json
│   ├── scripts/                   # Verification and test runners
│   │   ├── runMigration.ts        # Manual migration execution
│   │   ├── test-auth.ts           # Authentication route test
│   │   ├── test-mcp-servers.ts    # Direct MCP tool invocations
│   │   ├── test-ws-and-ai.ts      # WebSocket and Gemini AI integration tests
│   │   └── verify-multi-tenant-rbac.ts # End-to-end multi-tenant isolation & RBAC suite
│   └── src/
│       ├── index.ts               # Server entry point, Socket.io initialization, route mounting
│       ├── types/index.ts         # Shared TypeScript interfaces, enums, DTOs
│       ├── middleware/auth.ts     # JWT verify token & role-guard middleware (`requireRole`)
│       ├── db/
│       │   ├── pool.ts            # pg.Pool connection singleton
│       │   ├── initDb.ts          # Auto-runs pending migrations on server startup
│       │   ├── seed.ts            # Multi-tenant demo dataset seeder
│       │   └── migrations/
│       │       ├── 01_init.sql    # Base tables & materialized view (mv_food_cost_summary)
│       │       ├── 02_users.sql   # User table with bcrypt passwords & Google auth
│       │       └── 03_organizations.sql # Multi-tenant organizations & organization_id FKs
│       ├── routes/
│       │   ├── auth.ts            # /api/auth (login, register, organizations, me, google)
│       │   ├── users.ts           # /api/users (team & role management - Owner/Admin)
│       │   ├── tickets.ts         # /api/tickets (KDS ticket lifecycle & auto stock deduction)
│       │   ├── ingredients.ts     # /api/ingredients (stock levels & safety thresholds)
│       │   ├── recipes.ts         # /api/recipes (menu items, prep stations, BOM)
│       │   ├── prepLogs.ts        # /api/prep-logs (daily prepped & wasted scrap counts)
│       │   ├── foodCost.ts        # /api/food-cost (mv_food_cost_summary metrics)
│       │   └── supplierOrders.ts  # /api/supplier-orders (PO tracking & quality inspection)
│       ├── sockets/
│       │   └── index.ts           # Socket.io room partitioning (`org:${organizationId}`)
│       └── ai-orchestrator/
│           ├── geminiClient.ts    # GoogleGenerativeAI singleton (@google/generative-ai)
│           ├── mcpClient.ts       # Stdio MCP Client connecting to postgres-mcp & supplier-mcp
│           ├── prepOptimization.ts# Prep sheet recommendation engine
│           ├── inventoryAlert.ts  # Auto PO generator on low-stock triggers
│           └── routes.ts          # /api/ai/prep-optimization & /api/ai/inventory-alert
│
├── web/                           # Command Center Web App (Port 3000, Vite + React 18)
│   ├── package.json               # React 18, Vite, Tailwind CSS, TanStack Query v5, Lucide
│   ├── vite.config.ts
│   ├── tailwind.config.js         # Dark OLED (#090D16) data-dense design tokens
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                # Auth guard, top navigation tab controller, global queries
│       ├── context/AuthContext.tsx# Authentication state provider & session persistence
│       ├── api/client.ts          # Typed REST API client with Bearer token injection
│       ├── hooks/useSocket.ts     # Socket.io listener with organization room subscription
│       ├── types/index.ts         # Web frontend TypeScript types
│       └── components/
│           ├── AuthPortal.tsx     # Full-screen login & register portal with org selection
│           ├── Header.tsx         # Hotel branding badge, role pills, tab switcher
│           ├── KdsBoard.tsx       # 3-column Kanban KDS (QUEUE / FIRING / COMPLETED)
│           ├── TicketCard.tsx     # Ticket card with elapsed timer & status advance
│           ├── InventoryView.tsx  # Live pantry bars, min thresholds, PO actions
│           ├── AiPrepView.tsx     # Gemini prep sheet display with reasoning breakdowns
│           ├── WasteLogForm.tsx   # Shift scrap logging form
│           ├── UserManagementView.tsx # Team member invitation & role assignment
│           ├── NewTicketModal.tsx # Manual ticket injector
│           └── StationFilter.tsx  # Station selector pills (ALL, Grill, Sauté, etc.)
│
├── mobile/                        # Kitchen Tablet App (Port 8081, Expo SDK 57 + RN 0.86)
│   ├── package.json               # Expo SDK ~57.0.26, React Native 0.86, Zustand 5, TanStack Query 5
│   ├── app.json / app.config.ts
│   ├── App.tsx                    # Mobile root, strict auth guard, top status header, tabs
│   └── src/
│       ├── store/useAuthStore.ts  # Zustand store for user, organization & JWT
│       ├── store/useKitchenStore.ts# Zustand store for tickets & live stock alerts
│       ├── api/client.ts          # Axios/fetch client attaching Bearer token
│       ├── hooks/useSocket.ts     # Mobile Socket.IO listener for `org:${orgId}` events
│       ├── hooks/useQueries.ts    # TanStack Query wrappers for mobile
│       ├── types/index.ts         # Mobile TypeScript types
│       ├── components/tickets/TicketCard.tsx # Reanimated interactive ticket card
│       └── screens/
│           ├── AuthScreen.tsx     # Mobile login/signup + 1-tap demo credentials
│           ├── KitchenQueueScreen.tsx # Multi-column ticket queue
│           ├── PrepSheetScreen.tsx# AI prep recommendations view
│           └── WasteFormScreen.tsx# Zod-validated scrap logger
│
├── mcp-servers/                   # Model Context Protocol Servers (Stdio Transport)
│   ├── postgres-mcp/              # MCP Server exposing PostgreSQL database tools
│   │   ├── package.json
│   │   └── src/index.ts           # Tools: query_stock, log_waste, fetch_historical_prep,
│   │                              #        get_food_cost_summary, create_supplier_order,
│   │                              #        get_low_stock_ingredients
│   └── supplier-mcp/              # MCP Server simulating wholesale vendor supply chains
│       ├── package.json
│       └── src/index.ts           # Tools: get_supplier_pricing, get_supplier_catalog,
│                                  #        create_purchase_order, check_supplier_availability
│
├── docker-compose.yml             # Postgres (port 5432) & multi-service deployment
├── .env.example                   # Environment configuration template
├── package.json                   # Root monorepo scripts
└── GEMINI.md                      # This architecture & system guide file
```

---

## 3. Technology Stack & Key Dependencies

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Backend API** | Node.js (>=20.0), Express 4, TypeScript 5.7, `tsx`, `pg` (PostgreSQL client), `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`, `zod` |
| **Real-Time** | `socket.io` (v4.8) on server, `socket.io-client` on web & mobile |
| **Web Frontend** | React 18, Vite 5, Tailwind CSS 3.4, Lucide React, `@tanstack/react-query` v5, Dark OLED theme (`ui-ux-pro-max`) |
| **Mobile App** | Expo SDK 57, React Native 0.86, React 19, `zustand` v5, `@tanstack/react-query` v5, `react-native-reanimated` v4, `zod` |
| **AI & MCP** | Google Gemini SDK (`@google/generative-ai`), `@modelcontextprotocol/sdk` (v1.0), Stdio transports |
| **Database** | PostgreSQL 16+ (Docker or native Windows service) |

---

## 4. Multi-Tenant Architecture & RBAC Rules

### 4.1 Tenant Scoping Directive (Mandatory)
Every database table holding operational data has an `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`.
- **Primary Rule**: Whenever writing queries, mutations, or migrations in `backend/src/routes/` or MCP tools, **always filter by `organization_id`**. Never execute unbounded `SELECT * FROM live_tickets` without `WHERE organization_id = $1`.
- **Socket Rooms**: Sockets join room `org:${organizationId}` immediately after connecting with their handshake auth token. All event emissions (`ticket:created`, `ticket:updated`, `stock:alert`, etc.) are partitioned: `io.to(\`org:${organizationId}\`).emit(...)`.

### 4.2 Seed Organizations & Credentials
| Organization Name | Slug | Code | Seed Users (Password: `password123`) |
| :--- | :--- | :--- | :--- |
| **The Grand Palace Hotel** | `grand-palace` | `HOTEL-GP-101` | Owner: `owner@grandpalace.com`<br>Admin: `admin@grandpalace.com`<br>Chef: `chef@grandpalace.com`<br>Cook: `cook@grandpalace.com` |
| **Bistro Bella Napoli** | `bella-napoli` | `BISTRO-BN-202` | Owner: `owner@bellanapoli.com`<br>Admin: `admin@bellanapoli.com`<br>Chef: `chef@bellanapoli.com` |

### 4.3 Role Hierarchy Matrix
- **`Owner`**: Full tenant authority (organization settings, user deletion, role promotions, financial costs, inventory, POs).
- **`Admin`**: High management authority (staff invitation, role updates, inventory adjustments, POs, financial reports).
- **`Executive Chef`**: Kitchen operations authority (KDS management, prep logging, scrap recording, AI prep sheet view). Unit cost numbers and profit margins are hidden.
- **`Line Cook` / `Staff`**: Station operations authority (KDS status transitions, prep logging). Blocked with `403 Forbidden` from `/api/users` and supplier ordering.

---

## 5. Database Schema & Migration Reference

Migrations are located in `backend/src/db/migrations/`:
1. `01_init.sql`:
   - `ingredients`: `id`, `name`, `unit`, `current_stock`, `minimum_threshold` (alias `min_threshold`), `cost_per_unit`.
   - `recipes`: `id`, `menu_item_name` (alias `name`), `price` (alias `sale_price`), `station`, `prep_time_minutes`.
   - `recipe_ingredients`: Bill of Materials (BOM) junction (`recipe_id`, `ingredient_id`, `quantity_required`).
   - `prep_logs`: `id`, `recipe_id`, `prep_date`, `prepped_qty`, `waste_qty`, `day_of_week`, `notes`.
   - `live_tickets`: `id`, `recipe_id`, `station`, `table_number`, `status` (`QUEUE`, `FIRING`, `COMPLETED`), `created_at`, `completed_at`.
   - `supplier_orders`: `id`, `ingredient_id`, `quantity_ordered`, `status`, `quality_flag`, `created_at`.
   - `mv_food_cost_summary`: Materialized view aggregating cost per portion, total prep, total waste, food cost %, waste %.
2. `02_users.sql`:
   - `users`: `id`, `email`, `password_hash`, `name`, `role`, `auth_provider`, `google_id`, `avatar_url`.
3. `03_organizations.sql`:
   - `organizations`: `id`, `name`, `slug`, `code`, `address`, `phone`.
   - Added `organization_id` foreign keys, unique composite indexes `(organization_id, name)` and `(organization_id, menu_item_name)`.
   - Updated `mv_food_cost_summary` to include `organization_id`.

---

## 6. Real-Time Socket.IO Events

| Event Name | Direction | Payload Structure / Description |
| :--- | :--- | :--- |
| `ticket:created` | Server → Client | Complete `LiveTicket` object injected into station queue |
| `ticket:updated` | Server → Client | `{ id, status, completed_at }` when tickets advance |
| `stock:alert` | Server → Client | `{ ingredient_id, ingredient_name, current_stock, min_threshold }` when inventory dips below minimum safety line |
| `station:workload` | Server → Client | Workload distribution map across stations |
| `food_cost_updated`| Server → Client | Notification that ticket completion or waste log refreshed cost metrics |
| `ai:prep_sheet` | Server → Client | Real-time broadcast of generated AI prep recommendations |

---

## 7. Model Context Protocol (MCP) Tools

The backend connects to two standalone MCP servers (`mcp-servers/`):

### `postgres-mcp` (Port 8001 / Stdio)
- `query_stock`: Inspect stock levels and identify deficits.
- `log_waste`: Insert prep/waste log entry and trigger `REFRESH MATERIALIZED VIEW mv_food_cost_summary`.
- `fetch_historical_prep`: Query prep logs filtered by `day_of_week`.
- `get_food_cost_summary`: Query cost and waste metrics from `mv_food_cost_summary`.
- `create_supplier_order`: Create supplier order records for low-stock items.
- `get_low_stock_ingredients`: Retrieve all items below safety threshold.

### `supplier-mcp` (Port 8002 / Stdio)
- `get_supplier_pricing`: Retrieve unit price, total cost, lead times, and stock availability.
- `get_supplier_catalog`: Browse wholesale ingredients catalog.
- `create_purchase_order`: Issue POs (`NORMAL` or `URGENT` expedited delivery).
- `check_supplier_availability`: Check immediate supplier warehouse stock.

---

## 8. Common Commands & Runbooks

All commands can be executed from the workspace root `D:\KitchenPluss`:

```bash
# Install dependencies across all workspaces
npm run install:all

# Database seeding (Resets and populates multi-tenant demo data)
npm run seed

# Run verification test suites (MCP, WebSocket, Multi-tenant RBAC)
npm run test:all
npx tsx backend/scripts/verify-multi-tenant-rbac.ts

# Start development servers
npm run dev:backend       # Backend API & Sockets -> http://localhost:5000
npm run dev:web           # Web Command Center    -> http://localhost:3000
npm run dev:mobile        # Expo React Native App -> http://localhost:8081

# Production build check
npm run build:all
```

---

## 9. Antigravity Agent Guidelines & Conventions

When modifying this repository, adhere strictly to these engineering standards:

1. **Token Efficiency**: Reference file paths and line ranges directly without dumping whole files. Use the structure in this `GEMINI.md` to target relevant files immediately.
2. **Tenant Isolation**: Never bypass `organization_id`. Any new table must have `organization_id UUID REFERENCES organizations(id)` and any new API route must extract `req.user.organizationId` and filter queries accordingly.
3. **State Management Division**:
   - **TanStack Query (`@tanstack/react-query`)**: Use for all server data (tickets, inventory, recipes, prep logs, supplier orders).
   - **Zustand (`useAuthStore`, `useKitchenStore`)**: Use exclusively for local client state (active user session, client-side transient UI states, dismissed alert pills).
4. **Mobile & Expo Guardrails**:
   - Expo SDK version is **57**. Do not use legacy APIs or manual native code edits in `ios/` or `android/`.
   - Never replace `npx expo install` with bare `npm install` when adding Expo packages.
5. **Design System Consistency**:
   - Web adheres to the dark OLED scheme (`#090D16` canvas, `#0E1526` surface, `#1E293B` borders, emerald/amber/rose functional accents).
   - Maintain data-density and high legibility suitable for high-speed commercial kitchen line environments.
