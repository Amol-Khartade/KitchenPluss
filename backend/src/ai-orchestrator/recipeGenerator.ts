// ============================================================
// KitchenPulse — AI Recipe Generator & Ingredient Extractor
// Generates culinary Bill of Materials (BOM) from natural prompts,
// detects new vs existing inventory items, and estimates costs.
// ============================================================

import { getGeminiModel } from './geminiClient.js';
import {
  AiRecipeGenerateResponse,
  AiRecipeGeneratedIngredient,
} from '@kitchenpulse/shared';

interface ExistingIngredientLookup {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

// ── Fallback Culinary Knowledge Base ─────────────────────────

const CULINARY_KNOWLEDGE_BASE: Record<
  string,
  {
    station: string;
    price: number;
    prep_time_minutes: number;
    description: string;
    ingredients: Array<{
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit: number;
      current_stock: number;
      minimum_threshold: number;
    }>;
  }
> = {
  'chicken masala handi': {
    station: 'Sauté',
    price: 24.0,
    prep_time_minutes: 25,
    description:
      'Traditional creamy Mughlai chicken curry slow-cooked in a clay handi with fresh ground spices, yogurt, and aromatic herbs.',
    ingredients: [
      {
        name: 'Chicken Thighs (Handi Cut)',
        unit: 'kg',
        quantity_required: 0.35,
        cost_per_unit: 7.2,
        current_stock: 18.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'Fresh Onions',
        unit: 'kg',
        quantity_required: 0.15,
        cost_per_unit: 1.6,
        current_stock: 25.0,
        minimum_threshold: 6.0,
      },
      {
        name: 'Tomatoes',
        unit: 'kg',
        quantity_required: 0.2,
        cost_per_unit: 2.4,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Ginger Garlic Paste',
        unit: 'kg',
        quantity_required: 0.03,
        cost_per_unit: 6.5,
        current_stock: 4.0,
        minimum_threshold: 1.0,
      },
      {
        name: 'Garam Masala Blend',
        unit: 'g',
        quantity_required: 12.0,
        cost_per_unit: 0.03,
        current_stock: 500.0,
        minimum_threshold: 100.0,
      },
      {
        name: 'Plain Yogurt (Dahi)',
        unit: 'kg',
        quantity_required: 0.08,
        cost_per_unit: 3.2,
        current_stock: 6.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Cooking Oil / Ghee',
        unit: 'L',
        quantity_required: 0.04,
        cost_per_unit: 5.5,
        current_stock: 12.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Fresh Cilantro & Green Chilies',
        unit: 'kg',
        quantity_required: 0.02,
        cost_per_unit: 4.0,
        current_stock: 2.5,
        minimum_threshold: 0.5,
      },
    ],
  },
  'paneer tikka': {
    station: 'Starters',
    price: 16.5,
    prep_time_minutes: 15,
    description:
      'Char-grilled cottage cheese cubes marinated in spiced yogurt, mustard oil, and bell peppers.',
    ingredients: [
      {
        name: 'Fresh Paneer',
        unit: 'kg',
        quantity_required: 0.25,
        cost_per_unit: 8.5,
        current_stock: 10.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Bell Peppers (Tri-color)',
        unit: 'kg',
        quantity_required: 0.12,
        cost_per_unit: 3.8,
        current_stock: 8.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Plain Yogurt (Dahi)',
        unit: 'kg',
        quantity_required: 0.08,
        cost_per_unit: 3.2,
        current_stock: 6.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Mustard Oil & Tandoori Spices',
        unit: 'L',
        quantity_required: 0.02,
        cost_per_unit: 6.0,
        current_stock: 5.0,
        minimum_threshold: 1.0,
      },
    ],
  },
  'classic mojito': {
    station: 'Bar & Drinks',
    price: 13.0,
    prep_time_minutes: 4,
    description:
      'Refreshing highball cocktail muddled with fresh garden mint leaves, lime juice, cane sugar, and sparkling club soda.',
    ingredients: [
      {
        name: 'Fresh Mint Leaves',
        unit: 'g',
        quantity_required: 15.0,
        cost_per_unit: 0.05,
        current_stock: 300.0,
        minimum_threshold: 50.0,
      },
      {
        name: 'Fresh Limes',
        unit: 'pcs',
        quantity_required: 1.5,
        cost_per_unit: 0.45,
        current_stock: 40.0,
        minimum_threshold: 10.0,
      },
      {
        name: 'Simple Cane Syrup',
        unit: 'L',
        quantity_required: 0.03,
        cost_per_unit: 3.0,
        current_stock: 5.0,
        minimum_threshold: 1.5,
      },
      {
        name: 'Club Soda',
        unit: 'L',
        quantity_required: 0.15,
        cost_per_unit: 1.2,
        current_stock: 24.0,
        minimum_threshold: 6.0,
      },
    ],
  },
};

function inferStationFromPrompt(prompt: string, hint?: string): string {
  if (hint && hint !== 'ALL') return hint;
  const p = prompt.toLowerCase();
  if (
    p.includes('mojito') ||
    p.includes('cocktail') ||
    p.includes('drink') ||
    p.includes('cooler') ||
    p.includes('juice') ||
    p.includes('smoothie') ||
    p.includes('tea') ||
    p.includes('coffee')
  ) {
    return 'Bar & Drinks';
  }
  if (
    p.includes('starter') ||
    p.includes('appetizer') ||
    p.includes('wings') ||
    p.includes('tikka') ||
    p.includes('salad') ||
    p.includes('soup') ||
    p.includes('bruschetta') ||
    p.includes('nachos')
  ) {
    return 'Starters';
  }
  if (
    p.includes('grill') ||
    p.includes('steak') ||
    p.includes('kebab') ||
    p.includes('bbq') ||
    p.includes('burger')
  ) {
    return 'Grill';
  }
  if (
    p.includes('dessert') ||
    p.includes('cake') ||
    p.includes('brownie') ||
    p.includes('ice cream') ||
    p.includes('tiramisu')
  ) {
    return 'Desserts';
  }
  return 'Sauté';
}

function generateGenericFallback(
  prompt: string,
  stationHint?: string
): {
  dish_name: string;
  station: string;
  price: number;
  prep_time_minutes: number;
  description: string;
  ingredients: Array<{
    name: string;
    unit: string;
    quantity_required: number;
    cost_per_unit: number;
    current_stock: number;
    minimum_threshold: number;
  }>;
} {
  const station = inferStationFromPrompt(prompt, stationHint);
  const isDrink = station === 'Bar & Drinks';
  const isDessert = station === 'Desserts';

  if (isDrink) {
    return {
      dish_name: prompt.trim(),
      station,
      price: 11.5,
      prep_time_minutes: 5,
      description: `Handcrafted ${prompt.trim()} freshly prepared at the beverage bar with artisanal ingredients.`,
      ingredients: [
        {
          name: `${prompt.trim()} Base Mix`,
          unit: 'L',
          quantity_required: 0.12,
          cost_per_unit: 4.5,
          current_stock: 10.0,
          minimum_threshold: 2.5,
        },
        {
          name: 'Fresh Citrus / Garnish',
          unit: 'pcs',
          quantity_required: 1.0,
          cost_per_unit: 0.5,
          current_stock: 30.0,
          minimum_threshold: 8.0,
        },
        {
          name: 'Sparkling Soda Water',
          unit: 'L',
          quantity_required: 0.15,
          cost_per_unit: 1.2,
          current_stock: 20.0,
          minimum_threshold: 5.0,
        },
      ],
    };
  }

  if (isDessert) {
    return {
      dish_name: prompt.trim(),
      station,
      price: 12.0,
      prep_time_minutes: 8,
      description: `Decadent dessert crafted with rich cream, artisanal flavorings, and house-made garnish.`,
      ingredients: [
        {
          name: `${prompt.trim()} Pastry Base`,
          unit: 'pcs',
          quantity_required: 1.0,
          cost_per_unit: 2.2,
          current_stock: 15.0,
          minimum_threshold: 4.0,
        },
        {
          name: 'Heavy Cream',
          unit: 'L',
          quantity_required: 0.05,
          cost_per_unit: 4.5,
          current_stock: 6.0,
          minimum_threshold: 2.0,
        },
        {
          name: 'Belgian Chocolate / Fruit Coulis',
          unit: 'kg',
          quantity_required: 0.04,
          cost_per_unit: 14.0,
          current_stock: 3.0,
          minimum_threshold: 1.0,
        },
      ],
    };
  }

  return {
    dish_name: prompt.trim(),
    station,
    price: 21.0,
    prep_time_minutes: 18,
    description: `Chef special ${prompt.trim()} featuring prime ingredients, aromatic seasonings, and house sauce.`,
    ingredients: [
      {
        name: `Prime ${prompt.trim().replace(/(curry|handi|masala|pasta|special)/gi, '').trim() || 'Protein'}`,
        unit: 'kg',
        quantity_required: 0.28,
        cost_per_unit: 9.5,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Aromatic Mirepoix & Onions',
        unit: 'kg',
        quantity_required: 0.12,
        cost_per_unit: 1.8,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'House Culinary Sauce / Broth',
        unit: 'L',
        quantity_required: 0.15,
        cost_per_unit: 3.5,
        current_stock: 12.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Culinary Oil & Seasoning',
        unit: 'L',
        quantity_required: 0.03,
        cost_per_unit: 6.0,
        current_stock: 8.0,
        minimum_threshold: 2.0,
      },
    ],
  };
}

// ── Main AI Generator Entrypoint ─────────────────────────────

export async function generateAiRecipe(
  prompt: string,
  stationHint?: string,
  existingIngredients: ExistingIngredientLookup[] = []
): Promise<AiRecipeGenerateResponse> {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  let rawResult: {
    dish_name: string;
    station: string;
    price: number;
    prep_time_minutes: number;
    description?: string;
    ingredients: Array<{
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit?: number;
      current_stock?: number;
      minimum_threshold?: number;
    }>;
  } | null = null;

  // 1. Try Gemini API first if configured
  if (apiKey && apiKey !== 'your_key_here' && apiKey.trim().length > 10) {
    try {
      const model = getGeminiModel('gemini-1.5-flash');

      const existingNames = existingIngredients
        .map((i) => `"${i.name}" (${i.unit}, ~$${Number(i.cost_per_unit).toFixed(2)}/${i.unit})`)
        .slice(0, 40)
        .join(', ');

      const systemPrompt = `You are an Executive Chef and Commercial Kitchen Costing Consultant.
A restaurant kitchen needs a standard recipe Bill of Materials (BOM) for the following dish or drink:
"${prompt}".

KITCHEN INVENTORY CONTEXT:
The kitchen currently stocks these ingredients:
[${existingNames || 'Standard commercial kitchen pantry'}]

INSTRUCTIONS:
1. Provide a realistic standard commercial portion Bill of Materials (BOM).
2. Whenever an existing inventory ingredient fits, USE THE EXACT NAME from the kitchen inventory context above.
3. If essential ingredients are missing, name them clearly with realistic commercial units (kg, g, L, ml, oz, pcs).
4. Assign an appropriate kitchen station: "Starters", "Grill", "Sauté", "Bar & Drinks", "Desserts", "Pizza & Oven", or "Salad & Cold".
5. Estimate realistic selling price ($), prep time (minutes), portion quantity required per dish, unit cost ($), initial stock (if new), and safety threshold.
6. Provide a 1-sentence appetizing description.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "dish_name": "<Proper Dish Name>",
  "station": "<Station>",
  "price": <number>,
  "prep_time_minutes": <number>,
  "description": "<Appetizing description>",
  "ingredients": [
    {
      "name": "<Ingredient Name>",
      "unit": "<kg | g | L | ml | oz | pcs>",
      "quantity_required": <number>,
      "cost_per_unit": <number>,
      "current_stock": <number>,
      "minimum_threshold": <number>
    }
  ]
}`;

      const response = await model.generateContent(systemPrompt);
      const text = response.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      rawResult = JSON.parse(cleaned);
    } catch (aiErr) {
      console.warn('[RecipeAI] Gemini API call failed or timed out, using culinary knowledge fallback:', aiErr);
    }
  }

  // 2. Fallback to Culinary Knowledge Base if AI unavailable or failed
  if (!rawResult || !rawResult.ingredients || rawResult.ingredients.length === 0) {
    const matchedKnown = Object.keys(CULINARY_KNOWLEDGE_BASE).find((key) =>
      normalizedPrompt.includes(key)
    );

    if (matchedKnown) {
      const template = CULINARY_KNOWLEDGE_BASE[matchedKnown];
      rawResult = {
        dish_name: prompt.trim(),
        station: stationHint && stationHint !== 'ALL' ? stationHint : template.station,
        price: template.price,
        prep_time_minutes: template.prep_time_minutes,
        description: template.description,
        ingredients: template.ingredients,
      };
    } else {
      rawResult = generateGenericFallback(prompt, stationHint);
    }
  }

  // 3. Reconcile against Existing Inventory (Tag New vs Existing)
  const resolvedIngredients: AiRecipeGeneratedIngredient[] = rawResult.ingredients.map((item) => {
    const itemNameClean = item.name.trim().toLowerCase();

    // Check exact or substring match in existing ingredients
    const match = existingIngredients.find((existing) => {
      const exName = existing.name.trim().toLowerCase();
      return (
        exName === itemNameClean ||
        itemNameClean.includes(exName) ||
        exName.includes(itemNameClean)
      );
    });

    if (match) {
      return {
        name: match.name,
        unit: match.unit || item.unit,
        quantity_required: Number(item.quantity_required) || 0.1,
        cost_per_unit: Number(match.cost_per_unit) || Number(item.cost_per_unit) || 0,
        matched_ingredient_id: match.id,
        is_new: false,
      };
    }

    return {
      name: item.name.trim(),
      unit: item.unit.trim() || 'kg',
      quantity_required: Number(item.quantity_required) || 0.1,
      cost_per_unit: Number(item.cost_per_unit) || 0,
      current_stock: Number(item.current_stock) || 10.0,
      minimum_threshold: Number(item.minimum_threshold) || 3.0,
      is_new: true,
    };
  });

  // 4. Calculate Food Cost & Margins
  const totalCost = resolvedIngredients.reduce(
    (sum, ing) => sum + Number(ing.quantity_required) * Number(ing.cost_per_unit),
    0
  );

  const price = Number(rawResult.price) || Math.max(12, Math.round(totalCost * 3.5));
  const suggestedMarginPct = price > 0 ? Math.round(((price - totalCost) / price) * 100) : 70;

  return {
    dish_name: rawResult.dish_name || prompt.trim(),
    station: rawResult.station || inferStationFromPrompt(prompt, stationHint),
    price: Math.round(price * 100) / 100,
    prep_time_minutes: Math.max(1, Number(rawResult.prep_time_minutes) || 15),
    description: rawResult.description,
    ingredients: resolvedIngredients,
    estimated_cost_per_portion: Math.round(totalCost * 100) / 100,
    suggested_margin_pct: suggestedMarginPct,
  };
}
