import { Router, Response, NextFunction } from 'express';
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
// GET /api/food-cost — query mv_food_cost_summary scoped to organization
// ------------------------------------------------------------------ //
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { rows } = await pool.query(
      `SELECT *
       FROM mv_food_cost_summary
       WHERE organization_id = $1
       ORDER BY recipe_name ASC`,
      [orgId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/food-cost/refresh — manually refresh the materialized view
// ------------------------------------------------------------------ //
router.post('/refresh', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    try {
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_food_cost_summary');
    } catch {
      await pool.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary');
    }
    res.json({ message: 'Materialized view refreshed successfully', refreshed_at: new Date() });
  } catch (err) {
    next(err);
  }
});

export default router;
