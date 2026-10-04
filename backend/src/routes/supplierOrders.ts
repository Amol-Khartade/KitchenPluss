import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';

const router = Router();

// ------------------------------------------------------------------ //
// Validation schemas
// ------------------------------------------------------------------ //

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const QUALITY_FLAGS = ['PASS', 'FAIL', 'PENDING_INSPECTION'] as const;
export type QualityFlag = (typeof QUALITY_FLAGS)[number];

const CreateSupplierOrderSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity_ordered: z.number().positive(),
  status: z.enum(ORDER_STATUSES).default('PENDING'),
  quality_flag: z.enum(QUALITY_FLAGS).default('PENDING_INSPECTION'),
});

const PatchSupplierOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  quality_flag: z.enum(QUALITY_FLAGS).optional(),
  quantity_ordered: z.number().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

function formatOrder(row: any) {
  return {
    id: row.id,
    ingredient_id: row.ingredient_id,
    ingredient_name: row.ingredient_name,
    unit: row.unit,
    quantity_ordered: Number(row.quantity_ordered),
    status: row.status,
    quality_flag: row.quality_flag,
    created_at: row.created_at,
    ordered_at: row.created_at,
  };
}

// ------------------------------------------------------------------ //
// GET /api/supplier-orders — list, optional ?status= filter
// ------------------------------------------------------------------ //
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query['status'] as string | undefined;

    const { rows } = status
      ? await pool.query(
          `SELECT so.id,
                  so.ingredient_id,
                  i.name AS ingredient_name,
                  i.unit,
                  so.quantity_ordered,
                  so.status,
                  so.quality_flag,
                  so.created_at
           FROM supplier_orders so
           JOIN ingredients i ON i.id = so.ingredient_id
           WHERE so.status = $1
           ORDER BY so.created_at DESC`,
          [status]
        )
      : await pool.query(
          `SELECT so.id,
                  so.ingredient_id,
                  i.name AS ingredient_name,
                  i.unit,
                  so.quantity_ordered,
                  so.status,
                  so.quality_flag,
                  so.created_at
           FROM supplier_orders so
           JOIN ingredients i ON i.id = so.ingredient_id
           ORDER BY so.created_at DESC`
        );

    res.json(rows.map(formatOrder));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// GET /api/supplier-orders/:id — get one
// ------------------------------------------------------------------ //
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT so.id,
              so.ingredient_id,
              i.name AS ingredient_name,
              i.unit,
              so.quantity_ordered,
              so.status,
              so.quality_flag,
              so.created_at
       FROM supplier_orders so
       JOIN ingredients i ON i.id = so.ingredient_id
       WHERE so.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Supplier order not found' });
      return;
    }

    res.json(formatOrder(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/supplier-orders — create order
// ------------------------------------------------------------------ //
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateSupplierOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { ingredient_id, quantity_ordered, status = 'PENDING', quality_flag = 'PENDING_INSPECTION' } = parsed.data;

    // Verify ingredient exists
    const { rows: ingCheck } = await pool.query(
      `SELECT id, name, unit FROM ingredients WHERE id = $1`,
      [ingredient_id]
    );
    if (ingCheck.length === 0) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO supplier_orders (ingredient_id, quantity_ordered, status, quality_flag)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ingredient_id, quantity_ordered, status, quality_flag]
    );

    res.status(201).json({
      ...formatOrder(rows[0]),
      ingredient_name: ingCheck[0].name,
      unit: ingCheck[0].unit,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// PATCH /api/supplier-orders/:id/status — update order status
// ------------------------------------------------------------------ //
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const parsed = PatchSupplierOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { status, quality_flag, quantity_ordered } = parsed.data;

    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      `SELECT id, ingredient_id, quantity_ordered, status FROM supplier_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (orderRows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Supplier order not found' });
      return;
    }

    const currentOrder = orderRows[0];
    const setClauses: string[] = [];
    const values: unknown[] = [id];

    if (status !== undefined) {
      values.push(status);
      setClauses.push(`status = $${values.length}`);
    }
    if (quality_flag !== undefined) {
      values.push(quality_flag);
      setClauses.push(`quality_flag = $${values.length}`);
    }
    if (quantity_ordered !== undefined) {
      values.push(quantity_ordered);
      setClauses.push(`quantity_ordered = $${values.length}`);
    }

    const { rows: updated } = await client.query(
      `UPDATE supplier_orders
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );

    // If marked DELIVERED: add stock to current_stock
    if (status === 'DELIVERED' && currentOrder.status !== 'DELIVERED') {
      await client.query(
        `UPDATE ingredients
         SET current_stock = current_stock + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [currentOrder.quantity_ordered, currentOrder.ingredient_id]
      );
    }

    await client.query('COMMIT');

    res.json(formatOrder(updated[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
