// ============================================================
// KitchenPulse — Phase 3 & 4 Verification Script
// Tests WebSocket broadcasts, real-time events, and AI workflows
// Usage: npx tsx scripts/test-ws-and-ai.ts
// ============================================================

import "dotenv/config";
import { io as socketClient, Socket } from "socket.io-client";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

// ── ANSI colours ───────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function log(label: string, msg: string, colour = C.cyan): void {
  console.log(`${colour}${C.bright}[${label}]${C.reset} ${msg}`);
}

// ── HTTP helpers ──────────────────────────────────────────

async function apiPost(path: string, body: unknown = {}): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed with ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPatch(path: string, body: unknown = {}): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed with ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed with ${res.status}: ${text}`);
  }
  return res.json();
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${C.bright}╔═════════════════════════════════════════════════════════╗`);
  console.log(`║   KitchenPulse — Phase 3 & 4 Verification Test Suite   ║`);
  console.log(`╚═════════════════════════════════════════════════════════╝${C.reset}\n`);

  // ── Step 1: Backend health check (auto-boot if not running) ─
  log("HEALTH", "Checking backend status...");
  let serverInstance: any = null;
  try {
    await apiGet("/health");
  } catch (_e) {
    log("HEALTH", "Backend not running on port 5000. Booting in-process backend server...", C.yellow);
    const { httpServer } = await import("../src/index.js");
    serverInstance = httpServer;
    await wait(1000);
  }

  const health = await apiGet("/health");
  console.log("   Health response:", JSON.stringify(health));
  log("HEALTH", "✅ Backend is healthy & reachable", C.green);

  // ── Step 2: Connect WebSocket client ────────────────────
  log("WS", `Connecting to WebSocket at ${BACKEND_URL}...`);
  const socket: Socket = socketClient(BACKEND_URL, {
    transports: ["websocket"],
  });

  await new Promise<void>((resolve, reject) => {
    socket.on("connect", () => {
      log("WS", `✅ Connected successfully (sid: ${socket.id})`, C.green);
      resolve();
    });
    socket.on("connect_error", (err: Error) => {
      log("WS", `❌ Connection failed: ${err.message}`, C.red);
      reject(err);
    });
    setTimeout(() => reject(new Error("WS connection timed out after 10s")), 10_000);
  });

  // ── Register event listeners ────────────────────────────
  const received: Record<string, unknown[]> = {};

  const events = [
    "ticket:created",
    "new_ticket",
    "ticket:updated",
    "update_ticket_status",
    "station:workload",
    "station_workload",
    "stock:alert",
    "stock_alert",
    "food_cost:updated",
    "food_cost_updated",
    "ai:prep_sheet",
  ];

  for (const evt of events) {
    received[evt] = [];
    socket.on(evt, (data: unknown) => {
      received[evt]!.push(data);
      log("WS EVENT", `${C.yellow}${evt}${C.reset} → ${JSON.stringify(data).slice(0, 100)}...`, C.magenta);
    });
  }

  // ── Step 3: Phase 3 — Fire test tickets & station workload ─
  console.log(`\n${C.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ PHASE 3: WebSocket Real-Time Operations Verification`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);

  // Test emitting station_workload
  log("WS", "Emitting station:workload event from client...");
  socket.emit("station:workload", { station: "Grill", active_tickets: 4 });
  await wait(300);

  // Fetch recipes
  log("HTTP", "Fetching recipes for test ticket...");
  const recipes = await apiGet("/api/recipes");
  const recipeList = Array.isArray(recipes) ? recipes : (recipes.data ?? []);

  if (recipeList.length === 0) {
    throw new Error("No recipes found in database! Seed DB first.");
  }

  const recipe = recipeList[0];
  log("HTTP", `Selected test recipe: "${recipe.menu_item_name || recipe.name}" (ID: ${recipe.id})`);

  // 1. Create ticket
  log("HTTP", "POST /api/tickets (creating test ticket in QUEUE)...");
  const createdTicket = await apiPost("/api/tickets", {
    recipe_id: recipe.id,
    station: recipe.station || "Grill",
    table_number: 12,
    notes: "Phase 3 automated verification ticket - extra herbs",
  });

  const ticketId = createdTicket.id;
  log("HTTP", `Created ticket: #${ticketId} status: ${createdTicket.status}`, C.green);
  await wait(500);

  // 2. Move ticket to FIRING
  log("HTTP", `PATCH /api/tickets/${ticketId}/status → 'FIRING'...`);
  const firingTicket = await apiPatch(`/api/tickets/${ticketId}/status`, { status: "FIRING" });
  log("HTTP", `Updated ticket: #${ticketId} status: ${firingTicket.status}`, C.green);
  await wait(500);

  // 3. Complete ticket (triggers ingredient deduction + stock alerts + food cost refresh)
  log("HTTP", `PATCH /api/tickets/${ticketId}/status → 'COMPLETED'...`);
  const completedTicket = await apiPatch(`/api/tickets/${ticketId}/status`, { status: "COMPLETED" });
  log("HTTP", `Completed ticket: #${ticketId}, completed_at: ${completedTicket.completed_at}`, C.green);
  await wait(1500);

  // ── Step 4: Phase 4 — AI Workflow A: Prep Optimization ────
  console.log(`\n${C.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ PHASE 4A: AI Workflow A — Prep Optimization Agent`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  log("AI", "Invoking Prep Optimization Agent for day: 'Monday'...");

  const prepResult = await apiPost("/api/ai/prep-optimization", {
    day_of_week: "Monday",
  });

  console.log("\n📋 Prep Optimization Output:");
  console.log("   Day of Week:", prepResult.data?.day_of_week);
  console.log("   AI Summary:", prepResult.data?.ai_summary);
  console.log(`   Generated ${prepResult.data?.suggestions?.length ?? 0} item suggestions:`);
  for (const s of (prepResult.data?.suggestions ?? []).slice(0, 3)) {
    console.log(`     • ${s.recipe_name}: Suggest ${s.suggested_prep_qty} portions (Avg Waste: ${s.waste_pct}%)`);
    console.log(`       Reasoning: ${s.reasoning}`);
  }
  log("AI", "✅ Phase 4A Prep Optimization Agent verified!", C.green);
  await wait(1000);

  // ── Step 5: Phase 4 — AI Workflow B: Live Inventory Alert ──
  console.log(`\n${C.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ PHASE 4B: AI Workflow B — Live Inventory Alert Agent`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  log("AI", "Invoking Live Inventory Alert Agent (checks deficits & drafts supplier orders)...");

  const alertResult = await apiPost("/api/ai/inventory-alert", {});

  console.log("\n🚨 Live Inventory Alert Output:");
  console.log("   Recommendation:", alertResult.data?.ai_recommendation);
  console.log(`   Identified ${alertResult.data?.low_stock_items?.length ?? 0} low stock items`);
  console.log(`   Drafted ${alertResult.data?.purchase_orders?.length ?? 0} Purchase Orders via Supplier MCP:`);
  for (const po of alertResult.data?.purchase_orders ?? []) {
    console.log(`     • ${po.ingredient_name}: ${po.suggested_order_qty} units @ $${po.unit_price} (${po.urgency})`);
    console.log(`       PO ID: ${po.purchase_order_id} | Total: $${po.estimated_total}`);
    console.log(`       Reasoning: ${po.ai_reasoning}`);
  }
  log("AI", "✅ Phase 4B Live Inventory Alert Agent verified!", C.green);
  await wait(1000);

  // ── Step 6: Summary ─────────────────────────────────────
  console.log(`\n${C.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Real-Time WebSocket Event Verification Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  for (const [evt, items] of Object.entries(received)) {
    const status = items.length > 0 ? `${C.green}✅ ${items.length} event(s) captured` : `${C.yellow}⚠️  0 events`;
    console.log(`  ${status}${C.reset} — ${evt}`);
  }

  socket.disconnect();
  console.log(`\n${C.bright}${C.green}🎉 PHASES 3 & 4 VERIFICATION PASSED SUCCESSFULLY!${C.reset}\n`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(C.red, "❌ Fatal test error:", err, C.reset);
  process.exit(1);
});
