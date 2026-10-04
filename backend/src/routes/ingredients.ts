import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';

const router = Router();

// ------------------------------------------------------------------ //
// Validation schemas
// ------------------------------------------------------------------ //

const CreateIngredientSchema = z.object({
  name: z.string().min(1).max(255),
  unit: z.string().min(1).max(50),
  current_stock: z.number().nonnegative().optional(),
  stock_qty: z.number().nonnegative().optional(),
  minimum_threshold: z.number().nonnegative().optional(),
  threshold_qty: z.number().nonnegative().optional(),
  min_threshold: z.number().nonnegative().optional(),
  cost_per_unit: z.number().nonnegative().default(0),
});

const PatchIngredientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  unit: z.string().min(1).max(50).optional(),
  current_stock: z.number().nonnegative().optional(),
  stock_qty: z.number().nonnegative().optional(),
  minimum_threshold: z.number().nonnegative().optional(),
  threshold_qty: z.number().nonnegative().optional(),
  min_threshold: z.number().nonnegative().optional(),
  cost_per_unit: z.number().nonnegative().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// ------------------------------------------------------------------ //
// Helper to normalize ingredient row
// ------------------------------------------------------------------ //
function formatIngredient(row: any) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    current_stock: Number(row.current_stock),
    stock_qty: Number(row.current_stock),
    minimum_threshold: Number(row.minimum_threshold),
    min_threshold: Number(row.minimum_threshold),
    threshold_qty: Number(row.minimum_threshold),
    cost_per_unit: Number(row.cost_per_unit),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/ingredients — list all
// ------------------------------------------------------------------ //
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, unit, current_stock, minimum_threshold, cost_per_unit, created_at, updated_at
       FROM ingredients
       ORDER BY name ASC`
    );
    res.json(rows.map(formatIngredient));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// GET /api/ingredients/:id — get one
// ------------------------------------------------------------------ //
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, unit, current_stock, minimum_threshold, cost_per_unit, created_at, updated_at
       FROM ingredients
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    res.json(formatIngredient(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/ingredients — create
// ------------------------------------------------------------------ //
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateIngredientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const {
      name,
      unit,
      current_stock,
      stock_qty,
      minimum_threshold,
      threshold_qty,
      min_threshold,
      cost_per_unit = 0,
    } = parsed.data;

    const finalStock = current_stock ?? stock_qty ?? 0;
    const finalThreshold = minimum_threshold ?? min_threshold ?? threshold_qty ?? 0;

    const { rows } = await pool.query(
      `INSERT INTO ingredients (name, unit, current_stock, minimum_threshold, cost_per_unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, unit, finalStock, finalThreshold, cost_per_unit]
    );

    res.status(201).json(formatIngredient(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// PATCH /api/ingredients/:id — update stock/threshold/etc.
// ------------------------------------------------------------------ //
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parsed = PatchIngredientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const updates = parsed.data;
    const setClauses: string[] = [];
    const values: unknown[] = [id];

    if (updates.name !== undefined) {
      values.push(updates.name);
      setClauses.push(`name = $${values.length}`);
    }
    if (updates.unit !== undefined) {
      values.push(updates.unit);
      setClauses.push(`unit = $${values.length}`);
    }
    const newStock = updates.current_stock ?? updates.stock_qty;
    if (newStock !== undefined) {
      values.push(newStock);
      setClauses.push(`current_stock = $${values.length}`);
    }
    const newThreshold = updates.minimum_threshold ?? updates.min_threshold ?? updates.threshold_qty;
    if (newThreshold !== undefined) {
      values.push(newThreshold);
      setClauses.push(`minimum_threshold = $${values.length}`);
    }
    if (updates.cost_per_unit !== undefined) {
      values.push(updates.cost_per_unit);
      setClauses.push(`cost_per_unit = $${values.length}`);
    }

    setClauses.push('updated_at = NOW()');

    const { rows } = await pool.query(
      `UPDATE ingredients
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    res.json(formatIngredient(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// DELETE /api/ingredients/:id
// ------------------------------------------------------------------ //
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM ingredients WHERE id = $1`,
      [id]
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
