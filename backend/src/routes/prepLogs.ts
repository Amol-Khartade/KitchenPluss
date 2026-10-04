import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';

const router = Router();

// ------------------------------------------------------------------ //
// Validation schema
// ------------------------------------------------------------------ //

const CreatePrepLogSchema = z.object({
  recipe_id: z.string().uuid(),
  day_of_week: z.string().min(1).default(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }),
  prepped_qty: z.number().int().nonnegative().optional(),
  portions_prepped: z.number().int().nonnegative().optional(),
  waste_qty: z.number().nonnegative(),
  notes: z.string().optional(),
});

function formatPrepLog(row: any) {
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    recipe_name: row.recipe_name ?? row.menu_item_name,
    prep_date: row.prep_date,
    day_of_week: row.day_of_week,
    prepped_qty: Number(row.prepped_qty),
    portions_prepped: Number(row.prepped_qty),
    waste_qty: Number(row.waste_qty),
    notes: row.notes,
    created_at: row.created_at,
    logged_at: row.created_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/prep-logs — list, optional ?recipe_id= and ?day_of_week=
// ------------------------------------------------------------------ //
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const recipeId = req.query['recipe_id'] as string | undefined;
    const dayOfWeek = req.query['day_of_week'] as string | undefined;

    if (recipeId) {
      values.push(recipeId);
      conditions.push(`pl.recipe_id = $${values.length}`);
    }

    if (dayOfWeek) {
      values.push(`%${dayOfWeek.trim()}%`);
      conditions.push(`pl.day_of_week ILIKE $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT pl.id,
              pl.recipe_id,
              r.menu_item_name AS recipe_name,
              pl.prep_date,
              pl.day_of_week,
              pl.prepped_qty,
              pl.waste_qty,
              pl.notes,
              pl.created_at
       FROM prep_logs pl
       JOIN recipes r ON r.id = pl.recipe_id
       ${where}
       ORDER BY pl.prep_date DESC, pl.created_at DESC`,
      values
    );

    res.json(rows.map(formatPrepLog));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/prep-logs — create and refresh materialized view
// ------------------------------------------------------------------ //
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  let createdLog: any = null;

  try {
    const parsed = CreatePrepLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { recipe_id, day_of_week, prepped_qty, portions_prepped, waste_qty, notes } = parsed.data;
    const finalPrepped = prepped_qty ?? portions_prepped ?? 0;

    await client.query('BEGIN');

    // Verify recipe exists
    const { rows: recipeCheck } = await client.query(
      `SELECT id, menu_item_name FROM recipes WHERE id = $1`,
      [recipe_id]
    );
    if (recipeCheck.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const { rows } = await client.query(
      `INSERT INTO prep_logs (recipe_id, day_of_week, prepped_qty, waste_qty, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [recipe_id, day_of_week, finalPrepped, waste_qty, notes ?? null]
    );

    await client.query('COMMIT');
    createdLog = { ...rows[0], recipe_name: recipeCheck[0].menu_item_name };
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
    return;
  } finally {
    client.release();
  }

  // Refresh materialized view outside the transaction block
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_food_cost_summary');
  } catch (mvErr) {
    console.warn('[prepLogs] Note: non-concurrent view refresh fallback:', (mvErr as Error).message);
    await pool.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary').catch(() => {});
  }

  res.status(201).json(formatPrepLog(createdLog));
});

export default router;
