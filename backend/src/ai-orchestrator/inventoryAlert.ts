// ============================================================
// KitchenPulse — AI Workflow B: Live Inventory Alert Agent
// Triggers on ticket completion. Deducts ingredients,
// checks thresholds, auto-drafts purchase orders via AI & MCP.
// ============================================================

import { getGeminiModel } from "./geminiClient.js";
import { PostgresMcpClient, SupplierMcpClient, StockItem } from "./mcpClient.js";
import type { Server } from "socket.io";

export interface PurchaseOrderDraft {
  ingredient_id: string;
  ingredient_name: string;
  current_stock: number;
  min_threshold: number;
  shortfall: number;
  suggested_order_qty: number;
  unit_price: number;
  estimated_total: number;
  urgency: "NORMAL" | "URGENT";
  supplier_order_id?: string;
  purchase_order_id?: string;
  ai_reasoning: string;
}

export interface InventoryAlertResult {
  triggered_at: string;
  low_stock_items: StockItem[];
  purchase_orders: PurchaseOrderDraft[];
  ai_recommendation: string;
}

// ── Main Workflow ──────────────────────────────────────────

export async function runInventoryAlert(
  io?: Server
): Promise<InventoryAlertResult> {
  console.log("\n🤖 [InventoryAlert] Running inventory check...");

  const pgClient = await PostgresMcpClient.connect();
  const supplierClient = await SupplierMcpClient.connect();

  try {
    // 1. Get all low-stock ingredients
    const lowStockItems = await pgClient.getLowStockIngredients();
    console.log(`   ↳ Found ${lowStockItems.length} low-stock ingredient(s)`);

    if (lowStockItems.length === 0) {
      console.log("   ✅ All ingredients above minimum threshold");
      return {
        triggered_at: new Date().toISOString(),
        low_stock_items: [],
        purchase_orders: [],
        ai_recommendation: "All ingredient stock levels are healthy. No action required.",
      };
    }

    // 2. Get supplier pricing for each low-stock item
    console.log("   ↳ Fetching supplier pricing via Supplier MCP...");
    const pricingData = await Promise.all(
      lowStockItems.map(async (item) => {
        const shortfall = Number(item.min_threshold) - Number(item.current_stock);
        // Order 2x the shortfall minimum, round up to nearest 5 kg/L
        const suggestedQty = Math.max(5, Math.ceil((shortfall * 2) / 5) * 5);
        const pricing = await supplierClient.getSupplierPricing(
          item.name,
          suggestedQty
        );
        return { item, pricing, shortfall, suggestedQty };
      })
    );

    // 3. Draft purchase orders via Gemini AI or intelligent heuristic fallback
    console.log("   ↳ Evaluating stock deficits and optimal reorder parameters...");
    let drafts: PurchaseOrderDraft[] = pricingData.map((d) => {
      const isUrgent = d.shortfall > Number(d.item.min_threshold) * 0.5;
      const effectivePrice = isUrgent ? parseFloat((d.pricing.unit_price * 1.15).toFixed(2)) : d.pricing.unit_price;
      const total = parseFloat((effectivePrice * d.suggestedQty).toFixed(2));

      return {
        ingredient_id: d.item.id,
        ingredient_name: d.item.name,
        current_stock: Number(d.item.current_stock),
        min_threshold: Number(d.item.min_threshold),
        shortfall: Math.max(0, d.shortfall),
        suggested_order_qty: d.suggestedQty,
        unit_price: effectivePrice,
        estimated_total: total,
        urgency: isUrgent ? "URGENT" : "NORMAL",
        ai_reasoning: `Stock deficit of ${d.shortfall} ${d.item.unit} (${Math.round((Number(d.item.current_stock) / Math.max(1, Number(d.item.min_threshold))) * 100)}% of threshold). Suggested replenishment of ${d.suggestedQty} ${d.item.unit} to ensure continuous station throughput.`,
      };
    });

    let overallRecommendation = `Identified ${drafts.length} critical low-stock ingredient(s). Purchase orders prioritized and drafted for supplier dispatch.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_key_here" && apiKey.trim().length > 10) {
      try {
        const model = getGeminiModel("gemini-1.5-flash");

        const prompt = `You are an autonomous kitchen supply chain manager. The following ingredients have fallen below their minimum thresholds.

LOW STOCK ALERT DATA:
${JSON.stringify(
  pricingData.map((d) => ({
    ingredient_id: d.item.id,
    ingredient_name: d.item.name,
    current_stock: d.item.current_stock,
    min_threshold: d.item.min_threshold,
    unit: d.item.unit,
    shortfall: d.shortfall,
    supplier_unit_price: d.pricing.unit_price,
    supplier_availability: d.pricing.availability,
    lead_time_days: d.pricing.lead_time_days,
    suggested_order_qty: d.suggestedQty,
  })),
  null,
  2
)}

For each item:
1. Determine if this is URGENT (shortfall > 50% of threshold) or NORMAL
2. Suggest a smart order quantity (at least 2x shortfall, consider lead time)
3. Provide brief reasoning

Return ONLY valid JSON:
{
  "purchase_orders": [
    {
      "ingredient_id": "<id>",
      "ingredient_name": "<name>",
      "current_stock": <number>,
      "min_threshold": <number>,
      "shortfall": <number>,
      "suggested_order_qty": <number>,
      "unit_price": <number>,
      "estimated_total": <number>,
      "urgency": "NORMAL" | "URGENT",
      "ai_reasoning": "<concise reasoning>"
    }
  ],
  "ai_recommendation": "<overall recommendation paragraph for kitchen manager>"
}`;

        const response = await model.generateContent(prompt);
        const raw = response.response.text().trim();
        const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const parsed = JSON.parse(jsonStr) as {
          purchase_orders: PurchaseOrderDraft[];
          ai_recommendation: string;
        };

        if (parsed.purchase_orders && parsed.purchase_orders.length > 0) {
          drafts = parsed.purchase_orders;
          overallRecommendation = parsed.ai_recommendation;
        }
      } catch (geminiErr) {
        console.warn("   ⚠️ Gemini API call note (using local heuristics):", (geminiErr as Error).message);
      }
    }

    // 4. Submit purchase orders via Supplier MCP + log in DB
    console.log("   ↳ Submitting purchase orders via Supplier MCP & recording in database...");
    const completedOrders: PurchaseOrderDraft[] = [];

    for (const order of drafts) {
      try {
        // Submit to supplier
        const poResult = await supplierClient.createPurchaseOrder({
          ingredient_name: order.ingredient_name,
          quantity: order.suggested_order_qty,
          unit_price: order.unit_price,
          urgency: order.urgency,
        });

        // Log in our database
        const dbOrder = await pgClient.createSupplierOrder({
          ingredient_id: order.ingredient_id,
          quantity_ordered: order.suggested_order_qty,
        });

        completedOrders.push({
          ...order,
          supplier_order_id: (dbOrder as { id?: string }).id,
          purchase_order_id: poResult.order_id,
        });

        console.log(
          `   ✅ Order created for ${order.ingredient_name}: ${order.suggested_order_qty} units (PO: ${poResult.order_id})`
        );

        // Emit socket event for real-time dashboard update
        if (io) {
          io.emit("stock:alert", {
            event: "order:created",
            payload: {
              ingredient_id: order.ingredient_id,
              ingredient_name: order.ingredient_name,
              current_stock: order.current_stock,
              min_threshold: order.min_threshold,
              purchase_order_id: poResult.order_id,
            },
          });
          io.emit("stock_alert", {
            ingredient_id: order.ingredient_id,
            name: order.ingredient_name,
            current_stock: order.current_stock,
            minimum_threshold: order.min_threshold,
            purchase_order_id: poResult.order_id,
          });
        }
      } catch (err) {
        console.error(`   ❌ Failed to create order for ${order.ingredient_name}:`, err);
        completedOrders.push(order);
      }
    }

    console.log("   ✅ Inventory alert workflow complete");

    return {
      triggered_at: new Date().toISOString(),
      low_stock_items: lowStockItems,
      purchase_orders: completedOrders,
      ai_recommendation: overallRecommendation,
    };
  } finally {
    await pgClient.close();
    await supplierClient.close();
  }
}
