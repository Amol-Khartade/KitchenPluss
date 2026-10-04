// ============================================================
// KitchenPulse — AI Workflow A: Prep Optimization Agent
// Runs nightly. Analyzes Prep_Logs for tomorrow's day_of_week,
// identifies waste patterns, outputs an optimized prep list.
// ============================================================

import { getGeminiModel } from "./geminiClient.js";
import { PostgresMcpClient } from "./mcpClient.js";

export interface PrepSuggestion {
  recipe_id: string;
  recipe_name: string;
  suggested_prep_qty: number;
  reasoning: string;
  historical_avg_prepped: number;
  historical_avg_waste: number;
  waste_pct: number;
}

export interface PrepOptimizationResult {
  day_of_week: string;
  generated_at: string;
  suggestions: PrepSuggestion[];
  ai_summary: string;
}

// Maps JS day number (0=Sun) to SQL day_of_week string
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getTomorrowDayName(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return DAY_NAMES[tomorrow.getDay()] ?? "Monday";
}

// ── Aggregate helper ───────────────────────────────────────

function aggregateLogs(
  logs: Awaited<ReturnType<PostgresMcpClient["fetchHistoricalPrep"]>>
): Map<
  string,
  {
    recipe_id: string;
    recipe_name: string;
    total_prepped: number;
    total_waste: number;
    count: number;
  }
> {
  const map = new Map<
    string,
    {
      recipe_id: string;
      recipe_name: string;
      total_prepped: number;
      total_waste: number;
      count: number;
    }
  >();

  for (const log of logs) {
    const existing = map.get(log.recipe_id);
    if (existing) {
      existing.total_prepped += Number(log.prepped_qty);
      existing.total_waste += Number(log.waste_qty);
      existing.count += 1;
    } else {
      map.set(log.recipe_id, {
        recipe_id: log.recipe_id,
        recipe_name: log.recipe_name,
        total_prepped: Number(log.prepped_qty),
        total_waste: Number(log.waste_qty),
        count: 1,
      });
    }
  }

  return map;
}

// ── Main Workflow ──────────────────────────────────────────

export async function runPrepOptimization(
  overrideDayOfWeek?: string
): Promise<PrepOptimizationResult> {
  const dayOfWeek = overrideDayOfWeek ?? getTomorrowDayName();
  console.log(`\n🤖 [PrepOptimization] Running for: ${dayOfWeek}`);

  const pgClient = await PostgresMcpClient.connect();

  try {
    // 1. Fetch historical prep logs for this day_of_week (last 60 days)
    console.log("   ↳ Fetching historical prep logs from MCP...");
    const logs = await pgClient.fetchHistoricalPrep(dayOfWeek, 100);
    console.log(`   ↳ Retrieved ${logs.length} historical log entries`);

    // 2. Also get food cost summary for waste context
    const foodCostSummary = await pgClient.getFoodCostSummary();

    // 3. Aggregate per recipe
    const aggregated = aggregateLogs(logs);

    // 4. Build suggestions with initial math
    const suggestions: PrepSuggestion[] = [];
    for (const [, agg] of aggregated) {
      const avgPrepped = agg.total_prepped / agg.count;
      const avgWaste = agg.total_waste / agg.count;
      const wastePct = avgPrepped > 0 ? (avgWaste / avgPrepped) * 100 : 0;
      const adjustedQty = Math.ceil(avgPrepped * (1 - wastePct / 200)); // reduce by half the waste %

      suggestions.push({
        recipe_id: agg.recipe_id,
        recipe_name: agg.recipe_name,
        suggested_prep_qty: Math.max(1, adjustedQty),
        reasoning: `Based on ${agg.count} historical ${dayOfWeek} entries with ${Math.round(wastePct)}% avg waste`,
        historical_avg_prepped: Math.round(avgPrepped * 10) / 10,
        historical_avg_waste: Math.round(avgWaste * 10) / 10,
        waste_pct: Math.round(wastePct * 10) / 10,
      });
    }

    // 5. If no historical data, return empty
    if (suggestions.length === 0) {
      return {
        day_of_week: dayOfWeek,
        generated_at: new Date().toISOString(),
        suggestions: [],
        ai_summary:
          "No historical prep data found for this day. Start with standard baseline quantities.",
      };
    }

    // 6. Ask Gemini to review and improve the suggestions, or use smart heuristics fallback
    console.log("   ↳ Calling AI optimization engine...");
    let finalSuggestions = suggestions;
    let finalSummary = `Prep optimization complete for ${dayOfWeek}: Analyzed ${suggestions.length} items. Targets adjusted to reduce historical waste while maintaining dinner rush service capacity.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_key_here" && apiKey.trim().length > 10) {
      try {
        const model = getGeminiModel("gemini-1.5-flash");

        const prompt = `You are an expert restaurant kitchen manager AI. Analyze the following historical prep data and provide an optimized prep list for ${dayOfWeek}.

HISTORICAL DATA:
${JSON.stringify(suggestions, null, 2)}

FOOD COST SUMMARY:
${JSON.stringify(foodCostSummary, null, 2)}

Your task:
1. Review the waste percentages and suggest adjusted prep quantities
2. Flag any recipes with high waste (>20%) with a warning
3. Consider that ${dayOfWeek} may have typical traffic patterns
4. Provide a concise, actionable summary for the kitchen team

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "recipe_id": "<same id>",
      "recipe_name": "<same name>",
      "suggested_prep_qty": <number>,
      "reasoning": "<1-2 sentence explanation>",
      "historical_avg_prepped": <number>,
      "historical_avg_waste": <number>,
      "waste_pct": <number>
    }
  ],
  "ai_summary": "<paragraph summary for kitchen team>"
}`;

        const response = await model.generateContent(prompt);
        const raw = response.response.text().trim();
        const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        const parsed = JSON.parse(jsonStr) as {
          suggestions: PrepSuggestion[];
          ai_summary: string;
        };

        if (parsed.suggestions && parsed.suggestions.length > 0) {
          finalSuggestions = parsed.suggestions;
          finalSummary = parsed.ai_summary;
        }
      } catch (geminiErr) {
        console.warn("   ⚠️ Gemini API call note (using local heuristics):", (geminiErr as Error).message);
      }
    } else {
      console.log("   ↳ Using local algorithmic intelligence (GEMINI_API_KEY not configured for live LLM)");
    }

    console.log("   ✅ Prep optimization complete");
    return {
      day_of_week: dayOfWeek,
      generated_at: new Date().toISOString(),
      suggestions: finalSuggestions,
      ai_summary: finalSummary,
    };
  } finally {
    await pgClient.close();
  }
}
