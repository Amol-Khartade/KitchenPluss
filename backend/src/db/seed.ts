/**
 * Seed script — run with: npm run seed
 * Clears existing data and inserts a fresh, representative dataset.
 */

import pool from './pool.js';

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

    // ------------------------------------------------------------------ //
    // 1. Ingredients
    // ------------------------------------------------------------------ //
    console.log('Seeding ingredients…');

    await client.query(`
      INSERT INTO ingredients (name, unit, current_stock, minimum_threshold, cost_per_unit)
      VALUES
        ('Chicken Breast', 'kg',  25.0, 5.0, 8.50),
        ('Pasta',          'kg',  30.0, 5.0, 2.20),
        ('Tomato Sauce',   'L',   20.0, 4.0, 3.10),
        ('Mozzarella',     'kg',  15.0, 3.0, 9.75),
        ('Olive Oil',      'L',   12.0, 2.0, 6.40),
        ('Beef Tenderloin','kg',   4.0, 5.0, 22.00), -- intentionally low stock to test alerts!
        ('Heavy Cream',    'L',    2.5, 3.0, 3.20),  -- intentionally low stock
        ('Garlic',         'kg',  10.0, 2.0, 2.50)
      ON CONFLICT (name) DO UPDATE
      SET current_stock = EXCLUDED.current_stock,
          minimum_threshold = EXCLUDED.minimum_threshold,
          cost_per_unit = EXCLUDED.cost_per_unit;
    `);

    // Fetch IDs by name for use below
    const { rows: ingRows } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM ingredients WHERE name = ANY($1)`,
      [['Chicken Breast', 'Pasta', 'Tomato Sauce', 'Mozzarella', 'Olive Oil', 'Beef Tenderloin', 'Heavy Cream', 'Garlic']]
    );

    const ingId = Object.fromEntries(ingRows.map((r) => [r.name, r.id])) as Record<string, string>;

    // ------------------------------------------------------------------ //
    // 2. Recipes
    // ------------------------------------------------------------------ //
    console.log('Seeding recipes…');

    await client.query(`
      INSERT INTO recipes (menu_item_name, station, price, prep_time_minutes)
      VALUES
        ('Grilled Chicken',  'Grill', 18.99, 20),
        ('Pasta Marinara',   'Sauté', 14.99, 15),
        ('Margherita Pizza', 'Oven',  16.99, 18),
        ('Beef Tenderloin Steak', 'Grill', 34.99, 25)
      ON CONFLICT (menu_item_name) DO UPDATE
      SET price = EXCLUDED.price, station = EXCLUDED.station;
    `);

    const { rows: recipeRows } = await client.query<{ id: string; menu_item_name: string }>(
      `SELECT id, menu_item_name FROM recipes WHERE menu_item_name = ANY($1)`,
      [['Grilled Chicken', 'Pasta Marinara', 'Margherita Pizza', 'Beef Tenderloin Steak']]
    );

    const recipeId = Object.fromEntries(
      recipeRows.map((r) => [r.menu_item_name, r.id])
    ) as Record<string, string>;

    // ------------------------------------------------------------------ //
    // 3. Recipe ingredients
    // ------------------------------------------------------------------ //
    console.log('Seeding recipe_ingredients…');

    const recipeIngredients: Array<[string, string, number]> = [
      // [recipe_id, ingredient_id, quantity]
      [recipeId['Grilled Chicken'],  ingId['Chicken Breast'], 0.35],
      [recipeId['Grilled Chicken'],  ingId['Olive Oil'],      0.02],
      [recipeId['Grilled Chicken'],  ingId['Garlic'],         0.01],
      [recipeId['Pasta Marinara'],   ingId['Pasta'],          0.20],
      [recipeId['Pasta Marinara'],   ingId['Tomato Sauce'],   0.15],
      [recipeId['Pasta Marinara'],   ingId['Olive Oil'],      0.02],
      [recipeId['Pasta Marinara'],   ingId['Garlic'],         0.01],
      [recipeId['Margherita Pizza'], ingId['Tomato Sauce'],   0.12],
      [recipeId['Margherita Pizza'], ingId['Mozzarella'],     0.18],
      [recipeId['Margherita Pizza'], ingId['Olive Oil'],      0.02],
      [recipeId['Beef Tenderloin Steak'], ingId['Beef Tenderloin'], 0.30],
      [recipeId['Beef Tenderloin Steak'], ingId['Olive Oil'],       0.02],
    ];

    for (const [rid, iid, qty] of recipeIngredients) {
      if (rid && iid) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3)
           ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
          [rid, iid, qty]
        );
      }
    }

    // ------------------------------------------------------------------ //
    // 4. Prep logs (realistic distribution spanning Monday-Sunday)
    // ------------------------------------------------------------------ //
    console.log('Seeding prep_logs…');

    const rIds = Object.values(recipeId);

    const prepLogs: Array<{ recipe_id: string; day: string; prepped: number; waste: number; daysAgo: number }> = [
      { recipe_id: rIds[0], day: 'Monday', prepped: 30, waste: 2, daysAgo: 6 },
      { recipe_id: rIds[1], day: 'Monday', prepped: 45, waste: 3, daysAgo: 6 },
      { recipe_id: rIds[2], day: 'Tuesday', prepped: 40, waste: 4, daysAgo: 5 },
      { recipe_id: rIds[0], day: 'Tuesday', prepped: 28, waste: 1, daysAgo: 5 },
      { recipe_id: rIds[1], day: 'Wednesday', prepped: 50, waste: 5, daysAgo: 4 },
      { recipe_id: rIds[2], day: 'Wednesday', prepped: 35, waste: 2, daysAgo: 4 },
      { recipe_id: rIds[0], day: 'Thursday', prepped: 32, waste: 3, daysAgo: 3 },
      { recipe_id: rIds[1], day: 'Friday', prepped: 60, waste: 6, daysAgo: 2 },
      { recipe_id: rIds[2], day: 'Saturday', prepped: 55, waste: 4, daysAgo: 1 },
      { recipe_id: rIds[0], day: 'Sunday', prepped: 25, waste: 1, daysAgo: 0 },
      { recipe_id: rIds[1], day: 'Sunday', prepped: 35, waste: 2, daysAgo: 0 },
    ];

    for (const log of prepLogs) {
      await client.query(
        `INSERT INTO prep_logs (recipe_id, prep_date, day_of_week, prepped_qty, waste_qty)
         VALUES ($1, CURRENT_DATE - ($2 || ' days')::INTERVAL, $3, $4, $5)`,
        [log.recipe_id, log.daysAgo, log.day, log.prepped, log.waste]
      );
    }

    // ------------------------------------------------------------------ //
    // 5. Live tickets
    // ------------------------------------------------------------------ //
    console.log('Seeding live_tickets…');

    await client.query(`
      INSERT INTO live_tickets (recipe_id, station, table_number, status, notes)
      VALUES
        ($1, 'Grill', 3, 'QUEUE',     'Extra crispy'),
        ($2, 'Sauté', 7, 'FIRING',    'No onions'),
        ($3, 'Oven',  1, 'COMPLETED', 'Well done crust')
    `, [rIds[0], rIds[1], rIds[2]]);

    // Refresh Materialized View
    await client.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary;');

    await client.query('COMMIT');
    console.log('✅ Seed complete. Database ready with rich sample dataset.');
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
