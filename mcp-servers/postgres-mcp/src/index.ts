/**
 * KitchenPulse — Postgres MCP Server
 *
 * Exposes 6 MCP tools for interacting with the KitchenPulse PostgreSQL database:
 *  • query_stock            — Current ingredient stock levels
 *  • log_waste              — Insert a prep/waste log entry
 *  • fetch_historical_prep  — Prep logs filtered by day_of_week
 *  • get_food_cost_summary  — Materialized view mv_food_cost_summary
 *  • create_supplier_order  — Insert a supplier order for low-stock items
 *  • get_low_stock_ingredients — Ingredients below minimum_threshold
 *
 * Transport: StdioServerTransport (runs as a child process)
 * DB:        DATABASE_URL environment variable (pg Pool)
 */

import dotenv from "dotenv";
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import { z } from "zod";

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ─── Database Pool ────────────────────────────────────────────────────────────

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "admin"}:${process.env.POSTGRES_PASSWORD || "password123"}@localhost:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || "kitchenpulse"}`;

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[postgres-mcp] Unexpected pool error:", err.message);
});

// ─── Zod Input Schemas ────────────────────────────────────────────────────────

const QueryStockInput = z.object({
  ingredient_name: z.string().optional(),
});

const LogWasteInput = z.object({
  recipe_id: z.string().uuid("recipe_id must be a UUID"),
  prepped_qty: z.number().positive("prepped_qty must be positive"),
  waste_qty: z.number().min(0, "waste_qty must be >= 0"),
  notes: z.string().optional(),
});

const FetchHistoricalPrepInput = z.object({
  day_of_week: z.string().min(1, "day_of_week is required"),
  limit: z.number().int().positive().max(500).default(50),
});

const GetFoodCostSummaryInput = z.object({});

const CreateSupplierOrderInput = z.object({
  ingredient_id: z.string().uuid("ingredient_id must be a UUID"),
  quantity_ordered: z.number().positive("quantity_ordered must be positive"),
});

const GetLowStockIngredientsInput = z.object({});

// ─── Helper: wrap DB errors as MCP tool errors ───────────────────────────────

function mcpError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function mcpSuccess(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError: false,
  };
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "query_stock",
    description:
      "Get current stock levels for all ingredients, or filter by ingredient name. Returns id, name, unit, current_stock, minimum_threshold, cost_per_unit and a computed is_low_stock boolean.",
    inputSchema: {
      type: "object",
      properties: {
        ingredient_name: {
          type: "string",
          description: "Optional partial or exact ingredient name to filter by (case-insensitive).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "log_waste",
    description:
      "Insert a prep log entry recording how much of a recipe was prepped and how much was wasted. Automatically refreshes the mv_food_cost_summary materialized view after insert.",
    inputSchema: {
      type: "object",
      required: ["recipe_id", "prepped_qty", "waste_qty"],
      properties: {
        recipe_id: { type: "string", description: "UUID of the recipe being prepped." },
        prepped_qty: { type: "number", description: "Total quantity prepped (must be > 0)." },
        waste_qty: { type: "number", description: "Quantity wasted (must be >= 0)." },
        notes: { type: "string", description: "Optional free-text notes about this prep session." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "fetch_historical_prep",
    description:
      "Retrieve historical prep logs filtered by day of week (e.g. 'Monday', 'Tuesday'). Joins with the recipes table to include the recipe name.",
    inputSchema: {
      type: "object",
      required: ["day_of_week"],
      properties: {
        day_of_week: {
          type: "string",
          description: "Day of the week to filter by, e.g. 'Monday', 'Tuesday'.",
        },
        limit: {
          type: "number",
          description: "Maximum number of rows to return (default 50, max 500).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_food_cost_summary",
    description:
      "Returns all rows from the mv_food_cost_summary materialized view, showing aggregated food cost data per recipe.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "create_supplier_order",
    description:
      "Insert a new supplier order record for a low-stock ingredient. Returns the created order row.",
    inputSchema: {
      type: "object",
      required: ["ingredient_id", "quantity_ordered"],
      properties: {
        ingredient_id: {
          type: "string",
          description: "UUID of the ingredient to reorder.",
        },
        quantity_ordered: {
          type: "number",
          description: "Quantity to order from the supplier (must be > 0).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_low_stock_ingredients",
    description:
      "Returns all ingredients whose current_stock is below their minimum_threshold, indicating they need to be reordered.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

// ─── Tool Handlers ────────────────────────────────────────────────────────────

async function handleQueryStock(rawInput: unknown) {
  const parsed = QueryStockInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { ingredient_name } = parsed.data;
  try {
    let query: string;
    let params: unknown[];

    if (ingredient_name) {
      query = `
        SELECT
          id,
          name,
          unit,
          current_stock,
          minimum_threshold,
          min_threshold,
          cost_per_unit,
          current_stock < minimum_threshold AS is_low_stock
        FROM ingredients
        WHERE name ILIKE $1
        ORDER BY name ASC
      `;
      params = [`%${ingredient_name}%`];
    } else {
      query = `
        SELECT
          id,
          name,
          unit,
          current_stock,
          minimum_threshold,
          min_threshold,
          cost_per_unit,
          current_stock < minimum_threshold AS is_low_stock
        FROM ingredients
        ORDER BY name ASC
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    return mcpSuccess(result.rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`query_stock failed: ${msg}`);
  }
}

async function handleLogWaste(rawInput: unknown) {
  const parsed = LogWasteInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { recipe_id, prepped_qty, waste_qty, notes } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO prep_logs (recipe_id, prepped_qty, waste_qty, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [recipe_id, prepped_qty, waste_qty, notes ?? null]
    );

    await client.query("COMMIT");

    // Refresh view outside transaction
    try {
      await pool.query("REFRESH MATERIALIZED VIEW mv_food_cost_summary");
    } catch {}

    return mcpSuccess({
      prep_log: insertResult.rows[0],
      materialized_view_refreshed: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`log_waste failed: ${msg}`);
  } finally {
    client.release();
  }
}

async function handleFetchHistoricalPrep(rawInput: unknown) {
  const parsed = FetchHistoricalPrepInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { day_of_week, limit } = parsed.data;
  try {
    const result = await pool.query(
      `SELECT
         pl.id,
         pl.recipe_id,
         r.menu_item_name AS recipe_name,
         r.name           AS name,
         pl.prep_date,
         pl.prepped_qty,
         pl.waste_qty,
         pl.notes,
         pl.created_at,
         pl.day_of_week
       FROM prep_logs pl
       JOIN recipes r ON r.id = pl.recipe_id
       WHERE pl.day_of_week ILIKE $1 OR TRIM(TO_CHAR(pl.created_at, 'Day')) ILIKE $1
       ORDER BY pl.prep_date DESC, pl.created_at DESC
       LIMIT $2`,
      [`%${day_of_week.trim()}%`, limit]
    );
    return mcpSuccess(result.rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`fetch_historical_prep failed: ${msg}`);
  }
}

async function handleGetFoodCostSummary(_rawInput: unknown) {
  try {
    const result = await pool.query(`SELECT * FROM mv_food_cost_summary ORDER BY total_cost DESC`);
    return mcpSuccess(result.rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`get_food_cost_summary failed: ${msg}`);
  }
}

async function handleCreateSupplierOrder(rawInput: unknown) {
  const parsed = CreateSupplierOrderInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { ingredient_id, quantity_ordered } = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO supplier_orders (ingredient_id, quantity_ordered, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [ingredient_id, quantity_ordered]
    );
    return mcpSuccess(result.rows[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`create_supplier_order failed: ${msg}`);
  }
}

async function handleGetLowStockIngredients(_rawInput: unknown) {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         unit,
         current_stock,
         minimum_threshold,
         min_threshold,
         cost_per_unit,
         (minimum_threshold - current_stock) AS deficit
       FROM ingredients
       WHERE current_stock < minimum_threshold
       ORDER BY deficit DESC`
    );
    return mcpSuccess(result.rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return mcpError(`get_low_stock_ingredients failed: ${msg}`);
  }
}

// ─── MCP Server Setup ─────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "kitchenpulse-postgres-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "query_stock":
      return handleQueryStock(args);
    case "log_waste":
      return handleLogWaste(args);
    case "fetch_historical_prep":
      return handleFetchHistoricalPrep(args);
    case "get_food_cost_summary":
      return handleGetFoodCostSummary(args);
    case "create_supplier_order":
      return handleCreateSupplierOrder(args);
    case "get_low_stock_ingredients":
      return handleGetLowStockIngredients(args);
    default:
      return mcpError(`Unknown tool: "${name}"`);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[postgres-mcp] KitchenPulse Postgres MCP server running on stdio.");
}

main().catch((err) => {
  console.error("[postgres-mcp] Fatal startup error:", err);
  process.exit(1);
});
