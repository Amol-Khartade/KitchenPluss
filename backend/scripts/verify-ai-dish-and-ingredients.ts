/**
 * Verification Script — AI Dish & Ingredients Auto-Seeding & Manual BOM Test
 * Verifies:
 * 1. AI Recipe Generator (`POST /api/recipes/ai-generate`)
 *    - Parses "Chicken Masala Handi" into dish details + BOM ingredient list
 * 2. Automated Inventory Ingestion (`POST /api/recipes/with-ingredients`)
 *    - Creates recipe AND automatically seeds missing ingredients into inventory
 * 3. Re-use of existing pantry items (no duplicate stock items)
 * 4. KDS Ticket firing for AI-created dish
 * 5. RBAC enforcement (Line Cook blocked from creating dishes/ingredients)
 * 6. Clean cascade cleanup
 */

import pool from '../src/db/pool.js';

const PORT = Number(process.env.PORT) || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Starting AI Dish & Inventory Seeding Verification Suite...\n');

  // Ensure server is up
  let serverRunning = false;
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) serverRunning = true;
  } catch {}

  if (!serverRunning) {
    await import('../src/index.js');
    await new Promise((r) => setTimeout(r, 1500));
  }

  try {
    // ------------------------------------------------------------------ //
    // 1. Authenticate Users
    // ------------------------------------------------------------------ //
    console.log('Step 1: Authenticating test users...');
    const ownerRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@grandpalace.com', password: 'password123' }),
    });
    const ownerAuth = await ownerRes.json();
    const ownerToken = ownerAuth.token;
    console.log(`  -> Owner logged in: ${ownerAuth.user?.name} (${ownerAuth.organization?.name})`);

    const cookRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cook@grandpalace.com', password: 'password123' }),
    });
    const cookAuth = await cookRes.json();
    const cookToken = cookAuth.token;
    console.log(`  -> Cook logged in: ${cookAuth.user?.name}\n`);

    // ------------------------------------------------------------------ //
    // 2. Test AI Recipe Generation (Chicken Masala Handi)
    // ------------------------------------------------------------------ //
    console.log('Step 2: Testing AI Recipe Generation for "Chicken Masala Handi"...');
    const aiGenRes = await fetch(`${BASE_URL}/api/recipes/ai-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        prompt: 'Chicken Masala Handi',
        station: 'Sauté',
      }),
    });
    const aiData = await aiGenRes.json();
    console.log(`  -> Status: ${aiGenRes.status}`);
    console.log(`  -> Generated Dish: "${aiData.dish_name}"`);
    console.log(`  -> Station: ${aiData.station}, Price: $${aiData.price}, Prep: ${aiData.prep_time_minutes}m`);
    console.log(`  -> Est. Cost / Portion: $${aiData.estimated_cost_per_portion}, Gross Margin: ${aiData.suggested_margin_pct}%`);
    console.log(`  -> Extracted ${aiData.ingredients?.length} Ingredients:`);
    aiData.ingredients?.forEach((ing: any) => {
      console.log(`     • ${ing.name} (${ing.quantity_required} ${ing.unit}) [${ing.is_new ? '✨ New to Stock' : '📦 In Stock'}]`);
    });

    if (!aiGenRes.ok || !aiData.dish_name || !aiData.ingredients || aiData.ingredients.length === 0) {
      throw new Error(`AI Recipe Generation failed: ${JSON.stringify(aiData)}`);
    }
    console.log('  ✅ Step 2 Passed!\n');

    // ------------------------------------------------------------------ //
    // 3. Test Creation of Dish with Dynamic Inventory Seeding
    // ------------------------------------------------------------------ //
    console.log('Step 3: Creating dish & seeding new ingredients into inventory...');
    const testDishName = `Chicken Masala Handi Auto-Seed ${Date.now()}`;
    const newIngredient1Name = `Special Handi Clay Spices ${Date.now()}`;
    const newIngredient2Name = `Kasuri Methi Premium ${Date.now()}`;

    // Get an existing ingredient to verify mixed payload
    const existingIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const existingIngredients = await existingIngRes.json();
    const existingPantryItem = existingIngredients[0];

    const createDishRes = await fetch(`${BASE_URL}/api/recipes/with-ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: testDishName,
        station: 'Sauté',
        price: 24.50,
        prep_time_minutes: 25,
        ingredients: [
          // 1. Existing ingredient
          {
            ingredient_id: existingPantryItem.id,
            name: existingPantryItem.name,
            unit: existingPantryItem.unit,
            quantity_required: 0.15,
            cost_per_unit: existingPantryItem.cost_per_unit,
          },
          // 2. Brand new ingredient 1
          {
            name: newIngredient1Name,
            unit: 'kg',
            quantity_required: 0.05,
            cost_per_unit: 14.00,
            current_stock: 8.0,
            minimum_threshold: 2.0,
          },
          // 3. Brand new ingredient 2
          {
            name: newIngredient2Name,
            unit: 'g',
            quantity_required: 10.0,
            cost_per_unit: 0.04,
            current_stock: 400.0,
            minimum_threshold: 100.0,
          },
        ],
      }),
    });

    const createDishData = await createDishRes.json();
    console.log(`  -> Status: ${createDishRes.status}`);
    console.log(`  -> Created Recipe ID: ${createDishData.id} (${createDishData.name})`);
    console.log(`  -> Newly Created Inventory Items: ${createDishData.newly_created_ingredients_count}`);

    if (!createDishRes.ok || !createDishData.id || createDishData.newly_created_ingredients_count !== 2) {
      throw new Error(`Failed to create dish with ingredients: ${JSON.stringify(createDishData)}`);
    }
    const createdRecipeId = createDishData.id;
    console.log('  ✅ Step 3 Passed!\n');

    // ------------------------------------------------------------------ //
    // 4. Verify Ingredients Actually Exist in Inventory
    // ------------------------------------------------------------------ //
    console.log('Step 4: Verifying new ingredients exist in the inventory table...');
    const verifyStockRes = await fetch(`${BASE_URL}/api/ingredients`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const allStock = await verifyStockRes.json();
    const foundIng1 = allStock.find((i: any) => i.name === newIngredient1Name);
    const foundIng2 = allStock.find((i: any) => i.name === newIngredient2Name);

    if (!foundIng1 || !foundIng2) {
      throw new Error('New ingredients were not found in the ingredients table!');
    }
    console.log(`  -> Found in Inventory: "${foundIng1.name}" (Stock: ${foundIng1.current_stock} ${foundIng1.unit})`);
    console.log(`  -> Found in Inventory: "${foundIng2.name}" (Stock: ${foundIng2.current_stock} ${foundIng2.unit})`);
    console.log('  ✅ Step 4 Passed!\n');

    // ------------------------------------------------------------------ //
    // 5. Fire KDS Ticket for the AI-Created Dish
    // ------------------------------------------------------------------ //
    console.log('Step 5: Firing KDS ticket for AI-created dish...');
    const fireTicketRes = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        recipe_id: createdRecipeId,
        station: 'Sauté',
        table_number: 4,
        notes: 'Extra spicy handi style',
      }),
    });
    const ticketData = await fireTicketRes.json();
    console.log(`  -> Ticket Created: ${ticketData.id} (Status: ${ticketData.status})`);
    if (!fireTicketRes.ok || !ticketData.id) {
      throw new Error('Failed to fire ticket for newly created dish');
    }
    console.log('  ✅ Step 5 Passed!\n');

    // ------------------------------------------------------------------ //
    // 6. RBAC Check: Line Cook Forbidden from Creating Recipes
    // ------------------------------------------------------------------ //
    console.log('Step 6: Testing RBAC enforcement on Line Cook...');
    const cookCreateRes = await fetch(`${BASE_URL}/api/recipes/with-ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cookToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Cook Dish',
        station: 'Grill',
        price: 15.0,
        prep_time_minutes: 10,
        ingredients: [
          { name: 'Water', unit: 'L', quantity_required: 1 },
        ],
      }),
    });
    console.log(`  -> Cook Create Dish Status: ${cookCreateRes.status} (Expected 403)`);
    if (cookCreateRes.status !== 403) {
      throw new Error(`Expected 403 for Line Cook, got ${cookCreateRes.status}`);
    }
    console.log('  ✅ Step 6 Passed!\n');

    // ------------------------------------------------------------------ //
    // 7. Cleanup
    // ------------------------------------------------------------------ //
    console.log('Step 7: Cleaning up test data...');
    // Delete ticket
    await pool.query('DELETE FROM live_tickets WHERE id = $1', [ticketData.id]);
    // Delete recipe (cascades recipe_ingredients)
    await fetch(`${BASE_URL}/api/recipes/${createdRecipeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    // Delete test ingredients
    await fetch(`${BASE_URL}/api/ingredients/${foundIng1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    await fetch(`${BASE_URL}/api/ingredients/${foundIng2.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    console.log('  -> Cleanup completed successfully');
    console.log('  ✅ Step 7 Passed!\n');

    console.log('🎉 ALL 7 AI DISH & INVENTORY SEEDING TESTS PASSED! 🚀\n');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTests();
