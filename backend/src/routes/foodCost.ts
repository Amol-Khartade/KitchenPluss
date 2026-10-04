import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/pool.js';

const router = Router();

// ------------------------------------------------------------------ //
// GET /api/food-cost — query mv_food_cost_summary
// ------------------------------------------------------------------ //
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM mv_food_cost_summary
       ORDER BY recipe_name ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/food-cost/refresh — manually refresh the materialized view
// ------------------------------------------------------------------ //
router.post('/refresh', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_food_cost_summary');
    res.json({ message: 'Materialized view refreshed successfully', refreshed_at: new Date() });
  } catch (err) {
    next(err);
  }
});

export default router;
