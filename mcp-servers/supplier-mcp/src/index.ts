/**
 * KitchenPulse — Supplier MCP Server
 *
 * Exposes 4 MCP tools backed by realistic mock supplier data:
 *  • get_supplier_pricing       — Unit/total pricing for an ingredient + quantity
 *  • get_supplier_catalog       — Full ingredient catalog with availability
 *  • create_purchase_order      — Simulate submitting a purchase order (returns UUID)
 *  • check_supplier_availability — Check if an ingredient is currently in stock
 *
 * Transport: StdioServerTransport (runs as a child process)
 * All data is mocked — no external API calls.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

type Availability = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

interface CatalogItem {
  ingredient: string;
  unit: string;
  unit_price: number;        // USD per unit
  currency: "USD";
  availability: Availability;
  lead_time_days: number;
  supplier: string;
  min_order_qty: number;
  description: string;
}

// ─── Mock Catalog ─────────────────────────────────────────────────────────────

/**
 * Static price/availability catalog for a restaurant wholesale supplier.
 * Keys are normalised lowercase ingredient names for fuzzy matching.
 */
const CATALOG: Record<string, CatalogItem> = {
  "chicken breast": {
    ingredient: "Chicken Breast",
    unit: "kg",
    unit_price: 4.50,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 1,
    supplier: "FreshFarm Wholesale",
    min_order_qty: 5,
    description: "Boneless skinless chicken breast, fresh, Grade A",
  },
  "pasta": {
    ingredient: "Pasta",
    unit: "kg",
    unit_price: 1.20,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 2,
    supplier: "Mediterranean Dry Goods Co.",
    min_order_qty: 10,
    description: "Durum wheat semolina pasta, various shapes available",
  },
  "tomato sauce": {
    ingredient: "Tomato Sauce",
    unit: "L",
    unit_price: 2.80,
    currency: "USD",
    availability: "LOW_STOCK",
    lead_time_days: 3,
    supplier: "Mediterranean Dry Goods Co.",
    min_order_qty: 5,
    description: "Premium crushed tomato sauce, no additives",
  },
  "mozzarella": {
    ingredient: "Mozzarella",
    unit: "kg",
    unit_price: 8.50,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 2,
    supplier: "Alpine Dairy Suppliers",
    min_order_qty: 3,
    description: "Fresh whole-milk mozzarella, refrigerated",
  },
  "olive oil": {
    ingredient: "Olive Oil",
    unit: "L",
    unit_price: 6.00,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 3,
    supplier: "Mediterranean Dry Goods Co.",
    min_order_qty: 5,
    description: "Extra virgin olive oil, cold-pressed, first harvest",
  },
  "beef tenderloin": {
    ingredient: "Beef Tenderloin",
    unit: "kg",
    unit_price: 22.00,
    currency: "USD",
    availability: "LOW_STOCK",
    lead_time_days: 2,
    supplier: "FreshFarm Wholesale",
    min_order_qty: 2,
    description: "USDA Choice beef tenderloin, vacuum sealed",
  },
  "heavy cream": {
    ingredient: "Heavy Cream",
    unit: "L",
    unit_price: 3.20,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 1,
    supplier: "Alpine Dairy Suppliers",
    min_order_qty: 5,
    description: "36% fat heavy whipping cream, pasteurised",
  },
  "parmesan": {
    ingredient: "Parmesan",
    unit: "kg",
    unit_price: 14.00,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 3,
    supplier: "Alpine Dairy Suppliers",
    min_order_qty: 1,
    description: "Parmigiano-Reggiano DOP, 24-month aged, block",
  },
  "garlic": {
    ingredient: "Garlic",
    unit: "kg",
    unit_price: 2.50,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 1,
    supplier: "FreshFarm Wholesale",
    min_order_qty: 3,
    description: "Fresh whole garlic bulbs, loose",
  },
  "salmon fillet": {
    ingredient: "Salmon Fillet",
    unit: "kg",
    unit_price: 18.00,
    currency: "USD",
    availability: "OUT_OF_STOCK",
    lead_time_days: 5,
    supplier: "Pacific Seafood Direct",
    min_order_qty: 3,
    description: "Atlantic salmon fillets, skin-on, fresh",
  },
};

/** Fallback entry for unknown ingredients */
function buildFallback(ingredientName: string): CatalogItem {
  return {
    ingredient: ingredientName,
    unit: "unit",
    unit_price: 5.00,
    currency: "USD",
    availability: "IN_STOCK",
    lead_time_days: 3,
    supplier: "Generic Wholesale Co.",
    min_order_qty: 1,
    description: "Standard wholesale item",
  };
}

/** Resolve a CatalogItem by ingredient name (case-insensitive, partial match) */
function resolveItem(ingredientName: string): CatalogItem {
  const key = ingredientName.trim().toLowerCase();
  // Exact match first
  if (CATALOG[key]) return CATALOG[key];
  // Partial match
  const partialKey = Object.keys(CATALOG).find(
    (k) => k.includes(key) || key.includes(k)
  );
  if (partialKey) return CATALOG[partialKey];
  return buildFallback(ingredientName);
}

// ─── Zod Input Schemas ────────────────────────────────────────────────────────

const GetSupplierPricingInput = z.object({
  ingredient_name: z.string().min(1, "ingredient_name is required"),
  quantity: z.number().positive("quantity must be > 0"),
});

const GetSupplierCatalogInput = z.object({});

const CreatePurchaseOrderInput = z.object({
  ingredient_name: z.string().min(1, "ingredient_name is required"),
  quantity: z.number().positive("quantity must be > 0"),
  unit_price: z.number().positive("unit_price must be > 0"),
  urgency: z.enum(["NORMAL", "URGENT"]),
});

const CheckSupplierAvailabilityInput = z.object({
  ingredient_name: z.string().min(1, "ingredient_name is required"),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

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

/** Compute estimated delivery date string given lead days and urgency */
function estimatedDelivery(leadTimeDays: number, urgency: "NORMAL" | "URGENT"): string {
  const days = urgency === "URGENT" ? Math.max(1, Math.ceil(leadTimeDays / 2)) : leadTimeDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_supplier_pricing",
    description:
      "Returns pricing from the supplier for a given ingredient and quantity. Includes unit price, total price, availability status, lead time, and supplier name.",
    inputSchema: {
      type: "object",
      required: ["ingredient_name", "quantity"],
      properties: {
        ingredient_name: {
          type: "string",
          description: "Name of the ingredient (e.g. 'Chicken Breast', 'Olive Oil').",
        },
        quantity: {
          type: "number",
          description: "Quantity to price (in the item's native unit, e.g. kg or L).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_supplier_catalog",
    description:
      "Returns the full supplier product catalog with pricing, availability, lead times, and minimum order quantities for all stocked ingredients.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "create_purchase_order",
    description:
      "Simulates submitting a purchase order to the supplier. Returns a UUID order ID, estimated delivery date, and total cost. Supports NORMAL and URGENT urgency levels (urgent halves the lead time).",
    inputSchema: {
      type: "object",
      required: ["ingredient_name", "quantity", "unit_price", "urgency"],
      properties: {
        ingredient_name: {
          type: "string",
          description: "Ingredient being ordered.",
        },
        quantity: {
          type: "number",
          description: "Quantity to order.",
        },
        unit_price: {
          type: "number",
          description: "Agreed unit price (USD).",
        },
        urgency: {
          type: "string",
          enum: ["NORMAL", "URGENT"],
          description: "'URGENT' halves lead time but may incur a surcharge.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "check_supplier_availability",
    description:
      "Check whether a specific ingredient is currently in stock at the supplier. Returns availability status, lead time, and supplier details.",
    inputSchema: {
      type: "object",
      required: ["ingredient_name"],
      properties: {
        ingredient_name: {
          type: "string",
          description: "Name of the ingredient to check.",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

// ─── Tool Handlers ────────────────────────────────────────────────────────────

function handleGetSupplierPricing(rawInput: unknown) {
  const parsed = GetSupplierPricingInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { ingredient_name, quantity } = parsed.data;
  const item = resolveItem(ingredient_name);
  const total_price = parseFloat((item.unit_price * quantity).toFixed(2));

  return mcpSuccess({
    supplier: item.supplier,
    ingredient: item.ingredient,
    quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    total_price,
    availability: item.availability,
    lead_time_days: item.lead_time_days,
    currency: item.currency,
    min_order_qty: item.min_order_qty,
  });
}

function handleGetSupplierCatalog(_rawInput: unknown) {
  const catalog = Object.values(CATALOG).map((item) => ({
    ingredient: item.ingredient,
    unit: item.unit,
    unit_price: item.unit_price,
    currency: item.currency,
    availability: item.availability,
    lead_time_days: item.lead_time_days,
    supplier: item.supplier,
    min_order_qty: item.min_order_qty,
    description: item.description,
  }));

  return mcpSuccess(catalog);
}

function handleCreatePurchaseOrder(rawInput: unknown) {
  const parsed = CreatePurchaseOrderInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { ingredient_name, quantity, unit_price, urgency } = parsed.data;
  const item = resolveItem(ingredient_name);

  // Urgent orders carry a 15% surcharge
  const effectiveUnitPrice = urgency === "URGENT"
    ? parseFloat((unit_price * 1.15).toFixed(2))
    : unit_price;
  const total_cost = parseFloat((effectiveUnitPrice * quantity).toFixed(2));
  const order_id = randomUUID();
  const estimated_delivery = estimatedDelivery(item.lead_time_days, urgency);

  const message =
    urgency === "URGENT"
      ? `URGENT order submitted. A 15% surcharge has been applied. Expected delivery: ${estimated_delivery}.`
      : `Order submitted successfully. Expected delivery: ${estimated_delivery}.`;

  return mcpSuccess({
    order_id,
    status: "SUBMITTED",
    ingredient: item.ingredient,
    quantity,
    unit: item.unit,
    unit_price: effectiveUnitPrice,
    total_cost,
    urgency,
    supplier: item.supplier,
    estimated_delivery,
    currency: item.currency,
    message,
  });
}

function handleCheckSupplierAvailability(rawInput: unknown) {
  const parsed = CheckSupplierAvailabilityInput.safeParse(rawInput);
  if (!parsed.success) return mcpError(`Invalid input: ${parsed.error.message}`);

  const { ingredient_name } = parsed.data;
  const item = resolveItem(ingredient_name);

  const availabilityMessages: Record<Availability, string> = {
    IN_STOCK: "Item is available for immediate order.",
    LOW_STOCK: "Item has limited stock — place your order soon to avoid shortages.",
    OUT_OF_STOCK: "Item is currently out of stock. Please check back or contact the supplier directly.",
  };

  return mcpSuccess({
    ingredient: item.ingredient,
    supplier: item.supplier,
    availability: item.availability,
    availability_message: availabilityMessages[item.availability],
    lead_time_days: item.lead_time_days,
    unit_price: item.unit_price,
    unit: item.unit,
    currency: item.currency,
    min_order_qty: item.min_order_qty,
    checked_at: new Date().toISOString(),
  });
}

// ─── MCP Server Setup ─────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "kitchenpulse-supplier-mcp",
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
    case "get_supplier_pricing":
      return handleGetSupplierPricing(args);
    case "get_supplier_catalog":
      return handleGetSupplierCatalog(args);
    case "create_purchase_order":
      return handleCreatePurchaseOrder(args);
    case "check_supplier_availability":
      return handleCheckSupplierAvailability(args);
    default:
      return mcpError(`Unknown tool: "${name}"`);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[supplier-mcp] KitchenPulse Supplier MCP server running on stdio.");
}

main().catch((err) => {
  console.error("[supplier-mcp] Fatal startup error:", err);
  process.exit(1);
});
