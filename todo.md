# 🏢 KitchenPulse Multi-Tenant Organization & RBAC Implementation Plan

## 📌 Project Overview
Implement multi-tenant client/organization isolation (e.g., hotel or restaurant name), role-based permissions with **Admin** and **Owner** roles having full access to user management, stock, and reports, and strict authentication guards preventing dashboard display without login across both **Web** and **Mobile** platforms.

---

## 🏛️ System Architecture & Data Model

```
                    ┌───────────────────────────────┐
                    │    Organizations (Clients)    │
                    │  (e.g., Grand Palace Hotel)   │
                    └───────────────┬───────────────┘
                                    │ 1 : N
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│     Users     │           │  Ingredients  │           │ Live Tickets  │
│(Owner, Admin, │           │  & Recipes    │           │ & Prep Logs   │
│ Staff, Chefs) │           │ (Stock/Costs) │           │ (Real-Time)   │
└───────────────┘           └───────────────┘           └───────────────┘
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Section / Capability | Owner | Admin | Executive Chef | Line Cook / Staff |
| :--- | :---: | :---: | :---: | :---: |
| **Kitchen Display System (KDS)** (Queue, Firing, Complete) | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Daily Prep & Scrap/Waste Logging** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Inventory Stock Management & Thresholds** | ✅ Edit / Update | ✅ Edit / Update | 👁️ View Only | 👁️ View Only |
| **Supplier Orders & Purchasing** | ✅ Full Access | ✅ Full Access | 👁️ View Pending | ❌ No Access |
| **Ingredient Unit Cost & Profit Margins** | ✅ Full Access | ✅ Full Access | ❌ Masked / Hidden | ❌ Hidden |
| **Financial & Food Cost Reports** | ✅ Full Access | ✅ Full Access | 👁️ Operational Only | ❌ No Access |
| **AI Prep Sheet & Inventory Audit** | ✅ Trigger & View | ✅ Trigger & View | 👁️ View Prep Sheet | 👁️ View Stations |
| **User Data & Team Management** | ✅ Full (Add/Edit/Del) | ✅ Add/Edit/View | ❌ No Access | ❌ No Access |
| **Organization Branding & Settings** | ✅ Full Control | 👁️ View Details | ❌ No Access | ❌ No Access |

---

## 📋 Phased Task List

### Phase 1: Database Schema & Multi-Tenancy Foundation
- [x] **1.1. Create Organizations Table**
  - Created table `organizations` (`id`, `name`, `slug`, `code`, `created_at`, `updated_at`).
  - Added unique indexes on `slug` and `code`.
- [x] **1.2. Add Multi-Tenant Foreign Keys**
  - Added `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE` to:
    - `users`
    - `ingredients`
    - `recipes`
    - `prep_logs`
    - `live_tickets`
    - `supplier_orders`
  - Added composite indexes `(organization_id, status)` and `(organization_id, name)` for high-throughput tenant filtering.
- [x] **1.3. Migration & Startup Integration**
  - Created migration script `backend/src/db/migrations/03_organizations.sql`.
  - Updated `backend/src/db/initDb.ts` to automatically execute migration and verify schema on startup.
- [x] **1.4. Multi-Tenant Seed Script**
  - Updated `backend/src/db/seed.ts` with two distinct client organizations:
    1. *"The Grand Palace Hotel"* (Owner: `owner@grandpalace.com`, Admin: `admin@grandpalace.com`, Chef: `chef@grandpalace.com`, Cook: `cook@grandpalace.com`)
    2. *"Bistro Bella Napoli"* (Owner: `owner@bellanapoli.com`, Admin: `admin@bellanapoli.com`, Chef: `chef@bellanapoli.com`)
  - Populated distinct ingredients, recipes, live tickets, and prep logs for each organization.

---

### Phase 2: Backend API & Tenant-Scoped Middleware
- [x] **2.1. JWT Token & Tenant Middleware**
  - Updated `AuthJwtPayload` in `backend/src/middleware/auth.ts` to embed `organizationId`, `organizationName`, and `role`.
  - Created `requireRole(['Owner', 'Admin'])` role-guard middleware for privileged endpoints.
- [x] **2.2. Authentication Routes (`/api/auth`)**
  - **Organizations Endpoint**: `GET /api/auth/organizations` returns active client list.
  - **Register**: Support creating a new organization (user assigned role `Owner`) or joining an existing organization as `Admin` or `Staff`.
  - **Login**: Returns `{ user, organization, token }` with tenant metadata.
  - **Me (`/api/auth/me`)**: Returns active user profile and organization details.
- [x] **2.3. User & Team Management Routes (`/api/users`)**
  - `GET /api/users`: Lists all users belonging to the caller's organization (Owner/Admin only).
  - `POST /api/users`: Adds a new team member to the organization (Owner/Admin only).
  - `PATCH /api/users/:id/role`: Updates user role (Owner/Admin only; Owner can assign Owner/Admin).
  - `DELETE /api/users/:id`: Removes user from the organization (Owner only).
- [x] **2.4. Scoping Core API Endpoints**
  - Scoped `GET/POST/PATCH /api/tickets` to `organizationId`.
  - Scoped `GET/PATCH /api/ingredients` (including `/:id/stock`) to `organizationId`.
  - Scoped `GET/POST /api/recipes` to `organizationId`.
  - Scoped `GET/POST /api/prep-logs` to `organizationId`.
  - Scoped `GET /api/food-cost` to `organizationId`.
  - Scoped `GET/POST/PATCH /api/supplier-orders` to `organizationId`.
- [x] **2.5. Real-Time Socket.IO Room Partitioning**
  - Added `org:${organizationId}` room routing in `backend/src/sockets/index.ts`.
  - Emitted ticket, stock, and food cost updates strictly to caller's organization room.

---

### Phase 3: Web Command Center Auth Guard & Admin/Owner Dashboard
- [x] **3.1. Strict Authentication Guard (`web/src/App.tsx`)**
  - Enforced guard: if `!isAuthenticated`, do not mount KDS, Inventory, Prep, or Waste views.
  - Created dedicated full-screen Authentication Portal (`AuthPortal.tsx`).
  - Supported **Sign In** and **Sign Up** (with organization creation or selection).
- [x] **3.2. Header Client Branding & Role Badges (`web/src/components/Header.tsx`)**
  - Displays current Hotel/Restaurant name prominently with client badge (`🏨 The Grand Palace Hotel`).
  - Displays user's Role (`Owner`, `Admin`, `Executive Chef`, etc.) with color-coded status pills.
  - Added quick logout and organization info in the user menu.
- [x] **3.3. Admin & Owner Console (Team Management) (`web/src/components/UserManagementView.tsx`)**
  - Added **"Team & Roles"** management tab accessible exclusively to `Owner` and `Admin`.
  - Table of all organization users (Name, Email, Role, Joined Date).
  - "Add New Member" form and role change dropdown.
- [x] **3.4. All Stock & Reports Access Control**
  - Ensured `Owner` and `Admin` have full access to ingredient unit costs, margin percentages, and financial breakdowns.

---

### Phase 4: Mobile App Auth Guard & Feature Parity
- [x] **4.1. Mobile Authentication State Store**
  - Created `mobile/src/store/useAuthStore.ts` using Zustand to store `{ user, organization, token, isAuthenticated }`.
- [x] **4.2. Mobile Auth Screen (`mobile/src/screens/AuthScreen.tsx`)**
  - Created mobile-optimized login & registration screen.
  - Included Hotel/Restaurant selection/entry and Role selector (`Owner`, `Admin`, `Chef`, etc.).
  - Added 1-tap quick demo login buttons for rapid client testing.
- [x] **4.3. Mobile Root Guard (`mobile/App.tsx`)**
  - Hides tabs and kitchen queue when unauthenticated; renders `<AuthScreen />`.
  - Reveals Kitchen Queue, Prep Sheet, and Waste Log only upon successful authentication.
- [x] **4.4. Mobile Header & RBAC UI**
  - Displays Hotel/Restaurant name and user role in the mobile status header.
  - Added a 1-tap Logout button.
  - Updated `mobile/src/api/client.ts` to attach `Authorization: Bearer <token>`.
  - Passed `organizationId` in `mobile/src/hooks/useSocket.ts` for tenant-isolated socket events.

---

### Phase 5: Verification & End-to-End Testing
- [x] **5.1. Multi-Tenant Data Isolation Test**
  - Verified Grand Palace Hotel tickets and stock are completely isolated from Bistro Bella Napoli.
- [x] **5.2. Role Hierarchy Test**
  - Verified `Owner` and `Admin` can access `/api/users` and manage staff.
  - Verified `Line Cook` is blocked with `403 Forbidden` from viewing user data.
- [x] **5.3. Auth Guard Verification**
  - Verified that neither Web nor Mobile displays any dashboard before logging in.
- [x] **5.4. Organization Creation Test**
  - Verified registering a new Hotel/Restaurant creates an organization and assigns the `Owner` role.
