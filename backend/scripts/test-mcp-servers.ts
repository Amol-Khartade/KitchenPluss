/**
 * Phase 2 Verification Script:
 * Connects to both Postgres MCP and Supplier MCP using official MCP Client SDK,
 * queries tool manifests, and invokes tools to verify end-to-end functionality.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

function getSafeEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function testMcpServers() {
  console.log("=================================================");
  console.log("🚀 Testing MCP Server Manifests & Tool Execution");
  console.log("=================================================\n");

  // ── 1. Test Postgres MCP Server ──────────────────────────────
  console.log("▶ [1/2] Connecting to Postgres MCP Server...");
  const postgresMcpPath = path.resolve(__dirname, "../../mcp-servers/postgres-mcp/src/index.ts");
  
  const pgClient = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const pgTransport = new StdioClientTransport({
    command: npxCmd,
    args: ["tsx", postgresMcpPath],
    env: {
      ...getSafeEnv(),
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5432/kitchenpulse",
    },
  });

  await pgClient.connect(pgTransport);
  console.log("   Connected to Postgres MCP server!");

  const pgTools = await pgClient.listTools();
  console.log(`   Discovered ${pgTools.tools.length} Postgres MCP Tools:`);
  for (const tool of pgTools.tools) {
    console.log(`     • ${tool.name}: ${tool.description?.slice(0, 70)}...`);
  }

  // Call query_stock tool
  console.log("\n   Executing 'query_stock' tool...");
  const stockResult = await pgClient.callTool({
    name: "query_stock",
    arguments: {},
  });
  console.log("   query_stock result:", JSON.stringify(stockResult, null, 2).slice(0, 300) + "...\n");

  // Call fetch_historical_prep tool
  console.log("   Executing 'fetch_historical_prep' tool for 'Monday'...");
  const prepResult = await pgClient.callTool({
    name: "fetch_historical_prep",
    arguments: { day_of_week: "Monday", limit: 5 },
  });
  console.log("   fetch_historical_prep result:", JSON.stringify(prepResult, null, 2).slice(0, 300) + "...\n");

  await pgClient.close();
  console.log("✅ Postgres MCP Server verification passed!\n");

  // ── 2. Test Supplier MCP Server ──────────────────────────────
  console.log("▶ [2/2] Connecting to Supplier MCP Server...");
  const supplierMcpPath = path.resolve(__dirname, "../../mcp-servers/supplier-mcp/src/index.ts");

  const supplierClient = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const supplierTransport = new StdioClientTransport({
    command: npxCmd,
    args: ["tsx", supplierMcpPath],
    env: getSafeEnv(),
  });

  await supplierClient.connect(supplierTransport);
  console.log("   Connected to Supplier MCP server!");

  const supplierTools = await supplierClient.listTools();
  console.log(`   Discovered ${supplierTools.tools.length} Supplier MCP Tools:`);
  for (const tool of supplierTools.tools) {
    console.log(`     • ${tool.name}: ${tool.description?.slice(0, 70)}...`);
  }

  // Call get_supplier_pricing
  console.log("\n   Executing 'get_supplier_pricing' for 'Chicken Breast', qty: 25...");
  const pricingResult = await supplierClient.callTool({
    name: "get_supplier_pricing",
    arguments: { ingredient_name: "Chicken Breast", quantity: 25 },
  });
  console.log("   get_supplier_pricing result:", JSON.stringify(pricingResult, null, 2));

  // Call create_purchase_order
  console.log("\n   Executing 'create_purchase_order' (URGENT)...");
  const orderResult = await supplierClient.callTool({
    name: "create_purchase_order",
    arguments: {
      ingredient_name: "Chicken Breast",
      quantity: 15,
      unit_price: 4.5,
      urgency: "URGENT",
    },
  });
  console.log("   create_purchase_order result:", JSON.stringify(orderResult, null, 2));

  await supplierClient.close();
  console.log("\n✅ Supplier MCP Server verification passed!");
  console.log("=================================================");
  console.log("🎉 ALL MCP SERVERS VERIFIED SUCCESSFULLY!");
  console.log("=================================================");
  process.exit(0);
}

testMcpServers().catch((err) => {
  console.error("❌ MCP Server Verification failed:", err);
  process.exit(1);
});
