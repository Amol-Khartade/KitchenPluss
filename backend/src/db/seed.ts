/**
 * Multi-Tenant Seed Script — run with: npm run seed
 * Clears existing operational data and populates a rich multi-tenant dataset
 * across multiple organizations: "The Grand Palace Hotel" and "Bistro Bella Napoli".
 */

import bcrypt from 'bcryptjs';
import pool from './pool.js';

const ORG_GRAND_PALACE = '11111111-1111-1111-1111-111111111111';
const ORG_BELLA_NAPOLI = '22222222-2222-2222-2222-222222222222';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clean existing data for clean seed
    await client.query('DELETE FROM supplier_orders;');
    await client.query('DELETE FROM live_tickets;');
    await client.query('DELETE FROM prep_logs;');
    await client.query('DELETE FROM recipe_ingredients;');
    await client.query('DELETE FROM recipes;');
    await client.query('DELETE FROM ingredients;');
    await client.query('DELETE FROM users;');
    await client.query('DELETE FROM organizations;');

    console.log('🏢 Seeding Organizations (Clients)...');
    await client.query(`
      INSERT INTO organizations (id, name, slug, code, address, phone)
      VALUES 
        ('${ORG_GRAND_PALACE}', 'The Grand Palace Hotel', 'grand-palace', 'HOTEL-GP-101', '742 Grand Avenue, Downtown Metro', '+1 (555) 234-5678'),
        ('${ORG_BELLA_NAPOLI}', 'Bistro Bella Napoli', 'bella-napoli', 'BISTRO-BN-202', '12 Via Roma, Waterfront District', '+1 (555) 876-5432');
    `);

    // ------------------------------------------------------------------ //
    // 1. Seed Users with Owner, Admin, and Kitchen Staff Roles
    // ------------------------------------------------------------------ //
    console.log('👥 Seeding Users (Owner, Admin, Executive Chef, Line Cook)...');
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const users = [
      // Grand Palace Hotel
      {
        email: 'owner@grandpalace.com',
        name: 'Charles Montgomery',
        role: 'Owner',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'admin@grandpalace.com',
        name: 'Victoria Vance',
        role: 'Admin',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'chef@grandpalace.com',
        name: 'Marco Pierre White',
        role: 'Executive Chef',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'cook@grandpalace.com',
        name: 'Remy Ratatouille',
        role: 'Line Cook',
        orgId: ORG_GRAND_PALACE,
      },
      // Bistro Bella Napoli
      {
        email: 'owner@bellanapoli.com',
        name: 'Luigi Rossi',
        role: 'Owner',
        orgId: ORG_BELLA_NAPOLI,
      },
      {
        email: 'admin@bellanapoli.com',
        name: 'Francesca Moretti',
        role: 'Admin',
        orgId: ORG_BELLA_NAPOLI,
      },
      {
        email: 'chef@bellanapoli.com',
        name: 'Mario Batali',
        role: 'Executive Chef',
        orgId: ORG_BELLA_NAPOLI,
      },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, organization_id, auth_provider)
         VALUES ($1, $2, $3, $4, $5, 'email')`,
        [u.email, defaultPasswordHash, u.name, u.role, u.orgId]
      );
    }

    // ------------------------------------------------------------------ //
    // 2. Ingredients (Scoped by Organization)
    // ------------------------------------------------------------------ //
    console.log('🥦 Seeding Ingredients for both organizations...');

    // Grand Palace Ingredients
    await client.query(`
      INSERT INTO ingredients (organization_id, name, unit, current_stock, minimum_threshold, cost_per_unit)
      VALUES
        ('${ORG_GRAND_PALACE}', 'Chicken Breast', 'kg',  25.0, 5.0, 8.50),
        ('${ORG_GRAND_PALACE}', 'Pasta',          'kg',  30.0, 5.0, 2.20),
        ('${ORG_GRAND_PALACE}', 'Tomato Sauce',   'L',   20.0, 4.0, 3.10),
        ('${ORG_GRAND_PALACE}', 'Mozzarella',     'kg',  15.0, 3.0, 9.75),
        ('${ORG_GRAND_PALACE}', 'Olive Oil',      'L',   12.0, 2.0, 6.40),
        ('${ORG_GRAND_PALACE}', 'Beef Tenderloin','kg',   4.0, 5.0, 22.00), -- low stock alert!
        ('${ORG_GRAND_PALACE}', 'Heavy Cream',    'L',    2.5, 3.0, 3.20),  -- low stock alert!
        ('${ORG_GRAND_PALACE}', 'Garlic',         'kg',  10.0, 2.0, 2.50)
    `);

    // Bella Napoli Ingredients
    await client.query(`
      INSERT INTO ingredients (organization_id, name, unit, current_stock, minimum_threshold, cost_per_unit)
      VALUES
        ('${ORG_BELLA_NAPOLI}', 'Pizza Flour (Caputo 00)', 'kg', 50.0, 10.0, 1.80),
        ('${ORG_BELLA_NAPOLI}', 'San Marzano Tomatoes',    'kg', 35.0, 8.0, 4.50),
        ('${ORG_BELLA_NAPOLI}', 'Buffalo Mozzarella',      'kg',  3.5, 5.0, 14.00), -- low stock alert!
        ('${ORG_BELLA_NAPOLI}', 'Fresh Basil',             'kg',  1.0, 1.5, 8.00),  -- low stock alert!
        ('${ORG_BELLA_NAPOLI}', 'Extra Virgin Olive Oil',  'L',  20.0, 3.0, 9.50),
        ('${ORG_BELLA_NAPOLI}', 'Parmigiano Reggiano',     'kg',  8.0, 2.0, 24.00)
    `);

    // Helper map to retrieve ingredients
    const { rows: gpIngs } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM ingredients WHERE organization_id = $1`,
      [ORG_GRAND_PALACE]
    );
    const gpIngMap = Object.fromEntries(gpIngs.map((r) => [r.name, r.id]));

    const { rows: bnIngs } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM ingredients WHERE organization_id = $1`,
      [ORG_BELLA_NAPOLI]
    );
    const bnIngMap = Object.fromEntries(bnIngs.map((r) => [r.name, r.id]));

    // ------------------------------------------------------------------ //
    // 3. Recipes (Scoped by Organization)
    // ------------------------------------------------------------------ //
    console.log('📖 Seeding Recipes...');

    // Grand Palace Recipes
    await client.query(`
      INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
      VALUES
        ('${ORG_GRAND_PALACE}', 'Grilled Chicken',        'Grill', 18.99, 20),
        ('${ORG_GRAND_PALACE}', 'Pasta Marinara',         'Sauté', 14.99, 15),
        ('${ORG_GRAND_PALACE}', 'Margherita Pizza',       'Oven',  16.99, 18),
        ('${ORG_GRAND_PALACE}', 'Beef Tenderloin Steak',  'Grill', 34.99, 25)
    `);

    // Bella Napoli Recipes
    await client.query(`
      INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
      VALUES
        ('${ORG_BELLA_NAPOLI}', 'Pizza Margherita Verace', 'Oven',  17.50, 12),
        ('${ORG_BELLA_NAPOLI}', 'Spaghetti Pomodoro',      'Sauté', 15.00, 14),
        ('${ORG_BELLA_NAPOLI}', 'Caprese Fresca Salad',    'Pantry',12.50, 8)
    `);

    const { rows: gpRecipes } = await client.query<{ id: string; menu_item_name: string }>(
      `SELECT id, menu_item_name FROM recipes WHERE organization_id = $1`,
      [ORG_GRAND_PALACE]
    );
    const gpRecMap = Object.fromEntries(gpRecipes.map((r) => [r.menu_item_name, r.id]));

    const { rows: bnRecipes } = await client.query<{ id: string; menu_item_name: string }>(
      `SELECT id, menu_item_name FROM recipes WHERE organization_id = $1`,
      [ORG_BELLA_NAPOLI]
    );
    const bnRecMap = Object.fromEntries(bnRecipes.map((r) => [r.menu_item_name, r.id]));

    // ------------------------------------------------------------------ //
    // 4. Recipe Ingredients (Bill of Materials)
    // ------------------------------------------------------------------ //
    console.log('🥘 Seeding Recipe Ingredients (BOM)...');

    const gpRecipeIngredients = [
      [gpRecMap['Grilled Chicken'], gpIngMap['Chicken Breast'], 0.35],
      [gpRecMap['Grilled Chicken'], gpIngMap['Olive Oil'], 0.02],
      [gpRecMap['Grilled Chicken'], gpIngMap['Garlic'], 0.01],
      [gpRecMap['Pasta Marinara'], gpIngMap['Pasta'], 0.20],
      [gpRecMap['Pasta Marinara'], gpIngMap['Tomato Sauce'], 0.15],
      [gpRecMap['Pasta Marinara'], gpIngMap['Olive Oil'], 0.02],
      [gpRecMap['Margherita Pizza'], gpIngMap['Tomato Sauce'], 0.12],
      [gpRecMap['Margherita Pizza'], gpIngMap['Mozzarella'], 0.18],
      [gpRecMap['Margherita Pizza'], gpIngMap['Olive Oil'], 0.02],
      [gpRecMap['Beef Tenderloin Steak'], gpIngMap['Beef Tenderloin'], 0.30],
      [gpRecMap['Beef Tenderloin Steak'], gpIngMap['Olive Oil'], 0.02],
    ];

    for (const [rid, iid, qty] of gpRecipeIngredients) {
      if (rid && iid) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [rid, iid, qty]
        );
      }
    }

    const bnRecipeIngredients = [
      [bnRecMap['Pizza Margherita Verace'], bnIngMap['Pizza Flour (Caputo 00)'], 0.25],
      [bnRecMap['Pizza Margherita Verace'], bnIngMap['San Marzano Tomatoes'], 0.15],
      [bnRecMap['Pizza Margherita Verace'], bnIngMap['Buffalo Mozzarella'], 0.15],
      [bnRecMap['Pizza Margherita Verace'], bnIngMap['Extra Virgin Olive Oil'], 0.02],
      [bnRecMap['Caprese Fresca Salad'], bnIngMap['San Marzano Tomatoes'], 0.20],
      [bnRecMap['Caprese Fresca Salad'], bnIngMap['Buffalo Mozzarella'], 0.20],
      [bnRecMap['Caprese Fresca Salad'], bnIngMap['Fresh Basil'], 0.03],
    ];

    for (const [rid, iid, qty] of bnRecipeIngredients) {
      if (rid && iid) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [rid, iid, qty]
        );
      }
    }

    // ------------------------------------------------------------------ //
    // 5. Prep Logs (Scoped by Organization)
    // ------------------------------------------------------------------ //
    console.log('📝 Seeding Prep Logs...');

    const prepLogs = [
      // Grand Palace
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Grilled Chicken'], day: 'Monday', prepped: 30, waste: 2, daysAgo: 6 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Pasta Marinara'], day: 'Tuesday', prepped: 40, waste: 3, daysAgo: 5 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Margherita Pizza'], day: 'Wednesday', prepped: 35, waste: 2, daysAgo: 4 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Beef Tenderloin Steak'], day: 'Friday', prepped: 20, waste: 1, daysAgo: 2 },
      // Bella Napoli
      { org: ORG_BELLA_NAPOLI, rid: bnRecMap['Pizza Margherita Verace'], day: 'Thursday', prepped: 50, waste: 2, daysAgo: 3 },
      { org: ORG_BELLA_NAPOLI, rid: bnRecMap['Caprese Fresca Salad'], day: 'Friday', prepped: 30, waste: 1, daysAgo: 2 },
    ];

    for (const log of prepLogs) {
      if (log.rid) {
        await client.query(
          `INSERT INTO prep_logs (organization_id, recipe_id, prep_date, day_of_week, prepped_qty, waste_qty)
           VALUES ($1, $2, CURRENT_DATE - ($3 || ' days')::INTERVAL, $4, $5, $6)`,
          [log.org, log.rid, log.daysAgo, log.day, log.prepped, log.waste]
        );
      }
    }

    // ------------------------------------------------------------------ //
    // 6. Live Tickets (Scoped by Organization)
    // ------------------------------------------------------------------ //
    console.log('🎟️ Seeding Live Tickets...');

    // Grand Palace Tickets
    if (gpRecMap['Grilled Chicken'] && gpRecMap['Pasta Marinara'] && gpRecMap['Margherita Pizza']) {
      await client.query(`
        INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, status, notes)
        VALUES
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Grilled Chicken']}',   'Grill', 3, 'QUEUE',     'Extra crispy'),
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Pasta Marinara']}',    'Sauté', 7, 'FIRING',    'No onions, extra parmesan'),
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Margherita Pizza']}',  'Oven',  1, 'COMPLETED', 'Well done crust');
      `);
    }

    // Bella Napoli Tickets
    if (bnRecMap['Pizza Margherita Verace'] && bnRecMap['Caprese Fresca Salad']) {
      await client.query(`
        INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, status, notes)
        VALUES
          ('${ORG_BELLA_NAPOLI}', '${bnRecMap['Pizza Margherita Verace']}', 'Oven',   12, 'QUEUE',  'Extra basil'),
          ('${ORG_BELLA_NAPOLI}', '${bnRecMap['Caprese Fresca Salad']}',     'Pantry',  5, 'FIRING', 'Balsamic on side');
      `);
    }

    // ------------------------------------------------------------------ //
    // 7. Supplier Orders
    // ------------------------------------------------------------------ //
    console.log('📦 Seeding Supplier Orders...');
    if (gpIngMap['Beef Tenderloin']) {
      await client.query(`
        INSERT INTO supplier_orders (organization_id, ingredient_id, quantity_ordered, status, quality_flag)
        VALUES ('${ORG_GRAND_PALACE}', '${gpIngMap['Beef Tenderloin']}', 15.0, 'PENDING', 'PENDING_INSPECTION');
      `);
    }

    if (bnIngMap['Buffalo Mozzarella']) {
      await client.query(`
        INSERT INTO supplier_orders (organization_id, ingredient_id, quantity_ordered, status, quality_flag)
        VALUES ('${ORG_BELLA_NAPOLI}', '${bnIngMap['Buffalo Mozzarella']}', 10.0, 'PENDING', 'PENDING_INSPECTION');
      `);
    }

    // Refresh Materialized View
    await client.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary;');

    await client.query('COMMIT');
    console.log('✅ Multi-tenant seed complete! Organizations, users, stock, and tickets populated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
