import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(optionalAuth);

function resolveOrgId(req: AuthenticatedRequest): string {
  return (
    req.user?.organizationId ||
    (req.headers['x-organization-id'] as string) ||
    '11111111-1111-1111-1111-111111111111'
  );
}

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
    organization_id: row.organization_id,
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
// GET /api/prep-logs — list scoped to caller's organization
// ------------------------------------------------------------------ //
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const conditions: string[] = ['pl.organization_id = $1'];
    const values: unknown[] = [orgId];

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

    const where = `WHERE ${conditions.join(' AND ')}`;

    const { rows } = await pool.query(
      `SELECT pl.id,
              pl.organization_id,
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
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  let createdLog: any = null;
  const orgId = resolveOrgId(req);

  try {
    const parsed = CreatePrepLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { recipe_id, day_of_week, prepped_qty, portions_prepped, waste_qty, notes } = parsed.data;
    const finalPrepped = prepped_qty ?? portions_prepped ?? 0;

    await client.query('BEGIN');

    // Verify recipe exists in this organization
    const { rows: recipeCheck } = await client.query(
      `SELECT id, menu_item_name FROM recipes WHERE id = $1 AND organization_id = $2`,
      [recipe_id, orgId]
    );
    if (recipeCheck.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    const { rows } = await client.query(
      `INSERT INTO prep_logs (organization_id, recipe_id, day_of_week, prepped_qty, waste_qty, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, recipe_id, day_of_week, finalPrepped, waste_qty, notes ?? null]
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
    await pool.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary');
  } catch (mvErr) {
    console.warn('[prepLogs] Note: non-concurrent view refresh fallback:', (mvErr as Error).message);
  }

  res.status(201).json(formatPrepLog(createdLog));
});

export default router;
