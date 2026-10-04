import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';

const router = Router();

// ------------------------------------------------------------------ //
// Validation schemas
// ------------------------------------------------------------------ //

const CreateRecipeSchema = z.object({
  menu_item_name: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  station: z.string().min(1).max(100).default('Main Kitchen'),
  price: z.number().nonnegative(),
  prep_time_minutes: z.number().int().positive().default(15),
  ingredients: z.array(z.object({
    ingredient_id: z.string().uuid(),
    quantity_required: z.number().positive(),
  })).optional(),
}).refine((data) => data.menu_item_name || data.name, {
  message: 'Either menu_item_name or name must be provided',
});

const PatchRecipeSchema = z.object({
  menu_item_name: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  station: z.string().min(1).max(100).optional(),
  price: z.number().nonnegative().optional(),
  prep_time_minutes: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

function formatRecipe(row: any) {
  return {
    id: row.id,
    menu_item_name: row.menu_item_name,
    name: row.name ?? row.menu_item_name,
    station: row.station,
    price: Number(row.price),
    sale_price: Number(row.price),
    prep_time_minutes: row.prep_time_minutes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/recipes — list all, optional ?station= filter
// ------------------------------------------------------------------ //
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const station = req.query['station'] as string | undefined;

    const { rows } = station
      ? await pool.query(
          `SELECT id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
           FROM recipes
           WHERE station = $1
           ORDER BY menu_item_name ASC`,
          [station]
        )
      : await pool.query(
          `SELECT id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
           FROM recipes
           ORDER BY menu_item_name ASC`
        );

    res.json(rows.map(formatRecipe));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// GET /api/recipes/:id — get one, include recipe_ingredients
// ------------------------------------------------------------------ //
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows: recipeRows } = await pool.query(
      `SELECT id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
       FROM recipes
       WHERE id = $1`,
      [id]
    );

    if (recipeRows.length === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const { rows: ingredients } = await pool.query(
      `SELECT ri.ingredient_id,
              i.name  AS ingredient_name,
              i.unit,
              ri.quantity_required,
              ri.quantity_used
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY i.name ASC`,
      [id]
    );

    res.json({
      ...formatRecipe(recipeRows[0]),
      ingredients: ingredients.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredient_name,
        unit: ing.unit,
        quantity_required: Number(ing.quantity_required),
        quantity_used: Number(ing.quantity_used),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/recipes — create
// ------------------------------------------------------------------ //
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const parsed = CreateRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { menu_item_name, name, station, price, prep_time_minutes, ingredients } = parsed.data;
    const finalName = menu_item_name || name!;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO recipes (menu_item_name, station, price, prep_time_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [finalName, station, price, prep_time_minutes]
    );

    const recipe = rows[0];

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3)
           ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
          [recipe.id, ing.ingredient_id, ing.quantity_required]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(formatRecipe(recipe));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ------------------------------------------------------------------ //
// PATCH /api/recipes/:id — update
// ------------------------------------------------------------------ //
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parsed = PatchRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const updates = parsed.data;
    const setClauses: string[] = [];
    const values: unknown[] = [id];

    const newName = updates.menu_item_name ?? updates.name;
    if (newName !== undefined) {
      values.push(newName);
      setClauses.push(`menu_item_name = $${values.length}`);
    }
    if (updates.station !== undefined) {
      values.push(updates.station);
      setClauses.push(`station = $${values.length}`);
    }
    if (updates.price !== undefined) {
      values.push(updates.price);
      setClauses.push(`price = $${values.length}`);
    }
    if (updates.prep_time_minutes !== undefined) {
      values.push(updates.prep_time_minutes);
      setClauses.push(`prep_time_minutes = $${values.length}`);
    }

    setClauses.push('updated_at = NOW()');

    const { rows } = await pool.query(
      `UPDATE recipes
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.json(formatRecipe(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// DELETE /api/recipes/:id
// ------------------------------------------------------------------ //
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(`DELETE FROM recipes WHERE id = $1`, [id]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
