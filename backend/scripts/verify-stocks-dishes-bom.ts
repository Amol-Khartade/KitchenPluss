/**
 * Verification Script — Dynamic Stocks, Dishes & Recipe BOM Management Test
 * Verifies:
 * 1. Ingredient CRUD (add/delete stock items with cost, safety threshold)
 * 2. Recipe CRUD (add/delete dishes, drinks, starters with station and pricing)
 * 3. Recipe BOM attachment, update, and removal (Bill of Materials)
 * 4. Multi-tenant isolation between Grand Palace and Bella Napoli
 * 5. RBAC enforcement (Cook cannot delete recipes or stocks, Owner/Admin can)
 */

import pool from '../src/db/pool.js';

const PORT = Number(process.env.PORT) || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Starting Stocks, Dishes & Recipe BOM Verification Suite...\n');

  // Check if server is already running on port
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
    // 1. Authenticate Users (Owner, Cook, and foreign tenant Owner)
    // ------------------------------------------------------------------ //
    console.log('Step 1: Authenticating test users...');
    const gpOwnerRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@grandpalace.com', password: 'password123' }),
    });
    const gpOwnerAuth = await gpOwnerRes.json();
    const gpOwnerToken = gpOwnerAuth.token;
    console.log(`  -> GP Owner logged in (${gpOwnerAuth.user?.name})`);

    const gpCookRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cook@grandpalace.com', password: 'password123' }),
    });
    const gpCookAuth = await gpCookRes.json();
    const gpCookToken = gpCookAuth.token;
    console.log(`  -> GP Cook logged in (${gpCookAuth.user?.name})`);

    const bnOwnerRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@bellanapoli.com', password: 'password123' }),
    });
    const bnOwnerAuth = await bnOwnerRes.json();
    const bnOwnerToken = bnOwnerAuth.token;
    console.log(`  -> BN Owner logged in (${bnOwnerAuth.user?.name})\n`);

    // ------------------------------------------------------------------ //
    // 2. Create Stock Item (Ingredient) as Grand Palace Owner
    // ------------------------------------------------------------------ //
    console.log('Step 2: Creating new stock item (Truffle Butter)...');
    const createIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gpOwnerToken}`,
      },
      body: JSON.stringify({
        name: `Truffle Butter Test ${Date.now()}`,
        unit: 'kg',
        current_stock: 12.5,
        minimum_threshold: 3.0,
        cost_per_unit: 24.50,
      }),
    });
    const createIngData = await createIngRes.json();
    console.log(`  -> Status: ${createIngRes.status}`);
    if (!createIngRes.ok || !createIngData.id) {
      throw new Error(`Failed to create ingredient: ${JSON.stringify(createIngData)}`);
    }
    const ingredientId = createIngData.id;
    console.log(`  -> Created Ingredient ID: ${ingredientId} (${createIngData.name})`);
    console.log('  ✅ Step 2 Passed!\n');

    // Also get an existing ingredient to test multi-item BOM
    const listIngRes = await fetch(`${BASE_URL}/api/ingredients`, {
      headers: { Authorization: `Bearer ${gpOwnerToken}` },
    });
    const allIngredients = await listIngRes.json();
    const secondIngredient = allIngredients.find((i: any) => i.id !== ingredientId);
    console.log(`  -> Using second ingredient for BOM: ${secondIngredient?.name} (${secondIngredient?.id})\n`);

    // ------------------------------------------------------------------ //
    // 3. Create New Dish / Drink / Starter (Recipe) with Station
    // ------------------------------------------------------------------ //
    console.log('Step 3: Creating new Dish (Truffle Risotto)...');
    const dishName = `Truffle Risotto Special ${Date.now()}`;
    const createRecipeRes = await fetch(`${BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gpOwnerToken}`,
      },
      body: JSON.stringify({
        menu_item_name: dishName,
        price: 29.50,
        station: 'Sauté',
        prep_time_minutes: 15,
      }),
    });
    const createRecipeData = await createRecipeRes.json();
    console.log(`  -> Status: ${createRecipeRes.status}`);
    if (!createRecipeRes.ok || !createRecipeData.id) {
      throw new Error(`Failed to create recipe: ${JSON.stringify(createRecipeData)}`);
    }
    const recipeId = createRecipeData.id;
    console.log(`  -> Created Recipe ID: ${recipeId} (${createRecipeData.name || createRecipeData.menu_item_name})`);
    console.log('  ✅ Step 3 Passed!\n');

    // ------------------------------------------------------------------ //
    // 4. Attach Bill of Materials (BOM) to Recipe
    // ------------------------------------------------------------------ //
    console.log('Step 4: Attaching BOM items to recipe...');
    // Test single BOM item add
    const addBom1Res = await fetch(`${BASE_URL}/api/recipes/${recipeId}/ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gpOwnerToken}`,
      },
      body: JSON.stringify({
        ingredient_id: ingredientId,
        quantity_required: 0.15,
      }),
    });
    const addBom1Data = await addBom1Res.json();
    console.log(`  -> BOM Item 1 Status: ${addBom1Res.status}`);
    if (!addBom1Res.ok) {
      throw new Error(`Failed to add BOM item: ${JSON.stringify(addBom1Data)}`);
    }

    // Test batch BOM sync
    if (secondIngredient) {
      const batchBomRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}/ingredients`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gpOwnerToken}`,
        },
        body: JSON.stringify({
          ingredients: [
            { ingredient_id: ingredientId, quantity_required: 0.20 },
            { ingredient_id: secondIngredient.id, quantity_required: 0.35 },
          ],
        }),
      });
      const batchBomData = await batchBomRes.json();
      console.log(`  -> Batch BOM Sync Status: ${batchBomRes.status}`);
      console.log(`  -> BOM items saved: ${batchBomData.ingredients?.length}`);
      if (!batchBomRes.ok || batchBomData.ingredients?.length !== 2) {
        throw new Error(`Batch BOM sync failed: ${JSON.stringify(batchBomData)}`);
      }
    }
    console.log('  ✅ Step 4 Passed!\n');

    // ------------------------------------------------------------------ //
    // 5. Fetch Recipe by ID and verify BOM breakdown
    // ------------------------------------------------------------------ //
    console.log('Step 5: Verifying Recipe BOM query...');
    const getRecipeRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}`, {
      headers: { Authorization: `Bearer ${gpOwnerToken}` },
    });
    const recipeDetails = await getRecipeRes.json();
    console.log(`  -> Status: ${getRecipeRes.status}`);
    console.log(`  -> Dish: ${recipeDetails.name}, Station: ${recipeDetails.station}, Price: $${recipeDetails.price}`);
    console.log(`  -> BOM Items (${recipeDetails.ingredients?.length}):`, recipeDetails.ingredients?.map((i: any) => `${i.name}: ${i.quantity_required} ${i.unit}`));
    if (!recipeDetails.ingredients || recipeDetails.ingredients.length === 0) {
      throw new Error('Expected recipe to return nested BOM ingredients');
    }
    console.log('  ✅ Step 5 Passed!\n');

    // ------------------------------------------------------------------ //
    // 6. RBAC Verification (Line Cook forbidden from mutating/deleting)
    // ------------------------------------------------------------------ //
    console.log('Step 6: Testing RBAC enforcement on Line Cook...');
    // Line cook attempts to delete ingredient -> 403 Forbidden
    const cookDelIngRes = await fetch(`${BASE_URL}/api/ingredients/${ingredientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gpCookToken}` },
    });
    console.log(`  -> Cook Delete Ingredient Status: ${cookDelIngRes.status} (Expected 403)`);
    if (cookDelIngRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Line Cook deleting ingredient, got ${cookDelIngRes.status}`);
    }

    // Line cook attempts to delete recipe -> 403 Forbidden
    const cookDelRecipeRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gpCookToken}` },
    });
    console.log(`  -> Cook Delete Recipe Status: ${cookDelRecipeRes.status} (Expected 403)`);
    if (cookDelRecipeRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for Line Cook deleting recipe, got ${cookDelRecipeRes.status}`);
    }
    console.log('  ✅ Step 6 Passed!\n');

    // ------------------------------------------------------------------ //
    // 7. Multi-Tenant Isolation (Bella Napoli cannot view or mutate GP items)
    // ------------------------------------------------------------------ //
    console.log('Step 7: Testing Multi-Tenant Isolation...');
    // Bella Napoli attempts to query GP recipe -> 404 Not Found
    const bnGetRecipeRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}`, {
      headers: { Authorization: `Bearer ${bnOwnerToken}` },
    });
    console.log(`  -> Foreign Tenant Query Recipe Status: ${bnGetRecipeRes.status} (Expected 404)`);
    if (bnGetRecipeRes.status !== 404) {
      throw new Error(`Expected 404 for Bella Napoli trying to view Grand Palace recipe, got ${bnGetRecipeRes.status}`);
    }

    // Bella Napoli attempts to delete GP ingredient -> 404 Not Found
    const bnDelIngRes = await fetch(`${BASE_URL}/api/ingredients/${ingredientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bnOwnerToken}` },
    });
    console.log(`  -> Foreign Tenant Delete Ingredient Status: ${bnDelIngRes.status} (Expected 404)`);
    if (bnDelIngRes.status !== 404) {
      throw new Error(`Expected 404 for Bella Napoli trying to delete Grand Palace ingredient, got ${bnDelIngRes.status}`);
    }
    console.log('  ✅ Step 7 Passed!\n');

    // ------------------------------------------------------------------ //
    // 8. Delete BOM Item, Recipe, and Stock Item as Grand Palace Owner
    // ------------------------------------------------------------------ //
    console.log('Step 8: Cleaning up test items (Delete BOM item, Recipe, Ingredient)...');
    // Remove single BOM item
    const delBomRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gpOwnerToken}` },
    });
    console.log(`  -> Remove BOM item status: ${delBomRes.status} (Expected 200)`);
    if (!delBomRes.ok) {
      throw new Error('Failed to remove BOM item from recipe');
    }

    // Delete Recipe
    const delRecipeRes = await fetch(`${BASE_URL}/api/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gpOwnerToken}` },
    });
    console.log(`  -> Delete Recipe status: ${delRecipeRes.status} (Expected 200)`);
    if (!delRecipeRes.ok) {
      throw new Error('Failed to delete recipe');
    }

    // Delete Ingredient
    const delIngRes = await fetch(`${BASE_URL}/api/ingredients/${ingredientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gpOwnerToken}` },
    });
    console.log(`  -> Delete Ingredient status: ${delIngRes.status} (Expected 200)`);
    if (!delIngRes.ok) {
      throw new Error('Failed to delete ingredient');
    }
    console.log('  ✅ Step 8 Passed!\n');

    console.log('🎉 ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀\n');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTests();
