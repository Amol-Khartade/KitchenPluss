// ============================================================
// KitchenPulse — MCP Client Connector
// Connects to both Postgres-MCP and Supplier-MCP servers
// and exposes typed wrappers for each tool.
// ============================================================

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Types ──────────────────────────────────────────────────

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  cost_per_unit: number;
  is_low_stock: boolean;
}

export interface PrepLogRow {
  id: string;
  recipe_id: string;
  recipe_name: string;
  prep_date: string;
  prepped_qty: number;
  waste_qty: number;
  day_of_week: string;
  notes: string | null;
}

export interface FoodCostRow {
  recipe_id: string;
  recipe_name: string;
  sale_price: number;
  total_prepped: number;
  total_waste: number;
  estimated_cost_per_serving: number;
  food_cost_pct: number;
  waste_pct: number;
}

export interface SupplierPricing {
  supplier: string;
  ingredient: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  lead_time_days: number;
  currency: "USD";
}

export interface PurchaseOrder {
  order_id: string;
  status: string;
  estimated_delivery: string;
  total_cost: number;
  message: string;
}

// ── Client Factories ───────────────────────────────────────

function createPostgresMcpClient(): Client {
  const client = new Client({
    name: "kitchenpulse-orchestrator",
    version: "1.0.0",
  });
  return client;
}

function createSupplierMcpClient(): Client {
  const client = new Client({
    name: "kitchenpulse-orchestrator",
    version: "1.0.0",
  });
  return client;
}

// ── Connection Helpers ─────────────────────────────────────

function getSafeEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function connectPostgresMcp(): Promise<Client> {
  const client = createPostgresMcpClient();
  const mcpPath = path.resolve(
    __dirname,
    "../../../mcp-servers/postgres-mcp/src/index.ts"
  );
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  const transport = new StdioClientTransport({
    command: npxCmd,
    args: ["tsx", mcpPath],
    env: {
      ...getSafeEnv(),
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  });

  await client.connect(transport);
  return client;
}

async function connectSupplierMcp(): Promise<Client> {
  const client = createSupplierMcpClient();
  const mcpPath = path.resolve(
    __dirname,
    "../../../mcp-servers/supplier-mcp/src/index.ts"
  );
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  const transport = new StdioClientTransport({
    command: npxCmd,
    args: ["tsx", mcpPath],
    env: getSafeEnv(),
  });

  await client.connect(transport);
  return client;
}

// ── Typed Tool Wrappers ───────────────────────────────────

export class PostgresMcpClient {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  static async connect(): Promise<PostgresMcpClient> {
    const client = await connectPostgresMcp();
    return new PostgresMcpClient(client);
  }

  async queryStock(ingredientName?: string): Promise<StockItem[]> {
    const result = await this.client.callTool({
      name: "query_stock",
      arguments: ingredientName ? { ingredient_name: ingredientName } : {},
    });
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? "[]";
    return JSON.parse(text) as StockItem[];
  }

  async fetchHistoricalPrep(
    dayOfWeek: string,
    limit = 30
  ): Promise<PrepLogRow[]> {
    const result = await this.client.callTool({
      name: "fetch_historical_prep",
      arguments: { day_of_week: dayOfWeek, limit },
    });
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? "[]";
    return JSON.parse(text) as PrepLogRow[];
  }

  async getFoodCostSummary(): Promise<FoodCostRow[]> {
    const result = await this.client.callTool({
      name: "get_food_cost_summary",
      arguments: {},
    });
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? "[]";
    return JSON.parse(text) as FoodCostRow[];
  }

  async getLowStockIngredients(): Promise<StockItem[]> {
    const result = await this.client.callTool({
      name: "get_low_stock_ingredients",
      arguments: {},
    });
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? "[]";
    return JSON.parse(text) as StockItem[];
  }

  async logWaste(params: {
    recipe_id: string;
    prepped_qty: number;
    waste_qty: number;
    notes?: string;
  }): Promise<PrepLogRow> {
    const result = await this.client.callTool({
      name: "log_waste",
      arguments: params,
    });
    const text =
      (result.content as Array<{ text: string }>)[0]?.text ?? "{}";
    return JSON.parse(text) as PrepLogRow;
  }

  async createSupplierOrder(params: {
    ingredient_id: string;
    quantity_ordered: number;
  }): Promise<unknown> {
    const result = await this.client.callTool({
      name: "create_supplier_order",
      arguments: params,
    });
    const text =
      (result.content as Array<{ text: string }>)[0]?.text ?? "{}";
    return JSON.parse(text);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export class SupplierMcpClient {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  static async connect(): Promise<SupplierMcpClient> {
    const client = await connectSupplierMcp();
    return new SupplierMcpClient(client);
  }

  async getSupplierPricing(
    ingredientName: string,
    quantity: number
  ): Promise<SupplierPricing> {
    const result = await this.client.callTool({
      name: "get_supplier_pricing",
      arguments: { ingredient_name: ingredientName, quantity },
    });
    const text =
      (result.content as Array<{ text: string }>)[0]?.text ?? "{}";
    return JSON.parse(text) as SupplierPricing;
  }

  async createPurchaseOrder(params: {
    ingredient_name: string;
    quantity: number;
    unit_price: number;
    urgency: "NORMAL" | "URGENT";
  }): Promise<PurchaseOrder> {
    const result = await this.client.callTool({
      name: "create_purchase_order",
      arguments: params,
    });
    const text =
      (result.content as Array<{ text: string }>)[0]?.text ?? "{}";
    return JSON.parse(text) as PurchaseOrder;
  }

  async getSupplierCatalog(): Promise<SupplierPricing[]> {
    const result = await this.client.callTool({
      name: "get_supplier_catalog",
      arguments: {},
    });
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? "[]";
    return JSON.parse(text) as SupplierPricing[];
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
