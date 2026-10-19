import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { optionalAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { generateAiRecipe } from '../ai-orchestrator/recipeGenerator.js';
import {
  AiRecipeGenerateSchema,
  CreateRecipeWithIngredientsSchema,
} from '@kitchenpulse/shared';

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
    organization_id: row.organization_id,
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
// GET /api/recipes — list all scoped to caller's organization
// ------------------------------------------------------------------ //
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const station = req.query['station'] as string | undefined;

    const { rows } = station
      ? await pool.query(
          `SELECT id, organization_id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
           FROM recipes
           WHERE organization_id = $1 AND station = $2
           ORDER BY menu_item_name ASC`,
          [orgId, station]
        )
      : await pool.query(
          `SELECT id, organization_id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
           FROM recipes
           WHERE organization_id = $1
           ORDER BY menu_item_name ASC`,
          [orgId]
        );

    res.json(rows.map(formatRecipe));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/recipes/ai-generate — AI recipe BOM builder
// ------------------------------------------------------------------ //
router.post('/ai-generate', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const parsed = AiRecipeGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { prompt, station } = parsed.data;

    // Fetch existing pantry items for this organization
    const { rows: existingIngredients } = await pool.query(
      `SELECT id, name, unit, cost_per_unit
       FROM ingredients
       WHERE organization_id = $1
       ORDER BY name ASC`,
      [orgId]
    );

    const aiResult = await generateAiRecipe(
      prompt,
      station,
      existingIngredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        cost_per_unit: Number(i.cost_per_unit),
      }))
    );

    res.json(aiResult);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/recipes/with-ingredients — create dish & seed new inventory
// ------------------------------------------------------------------ //
router.post('/with-ingredients', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    const parsed = CreateRecipeWithIngredientsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { name, station, price, prep_time_minutes, ingredients } = parsed.data;

    await client.query('BEGIN');

    // 1. Resolve or create each ingredient in this tenant's inventory
    const resolvedBomItems: Array<{ ingredient_id: string; quantity_required: number }> = [];
    let newlyCreatedCount = 0;

    for (const item of ingredients) {
      let resolvedId = item.ingredient_id;

      if (!resolvedId) {
        // Check case-insensitive match for this organization
        const { rows: existingRows } = await client.query(
          `SELECT id FROM ingredients
           WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
           LIMIT 1`,
          [orgId, item.name]
        );

        if (existingRows.length > 0) {
          resolvedId = existingRows[0].id;
        } else {
          // Insert new ingredient into inventory!
          const { rows: newIngRows } = await client.query(
            `INSERT INTO ingredients (
               organization_id, name, unit, current_stock, minimum_threshold, cost_per_unit
             ) VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              orgId,
              item.name.trim(),
              item.unit.trim(),
              Number(item.current_stock) || 10,
              Number(item.minimum_threshold) || 3,
              Number(item.cost_per_unit) || 0,
            ]
          );
          resolvedId = newIngRows[0].id;
          newlyCreatedCount++;
        }
      }

      if (!resolvedId) {
        throw new Error(`Failed to resolve or create ingredient for "${item.name}"`);
      }

      resolvedBomItems.push({
        ingredient_id: resolvedId,
        quantity_required: Number(item.quantity_required) || 0.1,
      });
    }

    // 2. Insert Recipe
    const { rows: recipeRows } = await client.query(
      `INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orgId, name.trim(), station, price, prep_time_minutes]
    );

    const recipe = recipeRows[0];

    // 3. Insert BOM in recipe_ingredients
    for (const bom of resolvedBomItems) {
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (recipe_id, ingredient_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required`,
        [recipe.id, bom.ingredient_id, bom.quantity_required]
      );
    }

    await client.query('COMMIT');

    // 4. Query back full recipe with joined ingredient details
    const { rows: fullIngredients } = await pool.query(
      `SELECT ri.ingredient_id,
              i.name AS ingredient_name,
              i.name,
              i.unit,
              i.current_stock,
              i.minimum_threshold,
              i.cost_per_unit,
              ri.quantity_required
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY i.name ASC`,
      [recipe.id]
    );

    res.status(201).json({
      ...formatRecipe(recipe),
      ingredients: fullIngredients,
      newly_created_ingredients_count: newlyCreatedCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ------------------------------------------------------------------ //
// GET /api/recipes/:id — get one, include recipe_ingredients
// ------------------------------------------------------------------ //
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { id } = req.params;

    const { rows: recipeRows } = await pool.query(
      `SELECT id, organization_id, menu_item_name, name, station, price, prep_time_minutes, created_at, updated_at
       FROM recipes
       WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (recipeRows.length === 0) {
      res.status(404).json({ error: 'Recipe not found in your organization' });
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
        name: ing.ingredient_name,
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
// POST /api/recipes — create (Owner, Admin, Executive Chef)
// ------------------------------------------------------------------ //
router.post('/', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    const parsed = CreateRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { menu_item_name, name, station, price, prep_time_minutes, ingredients } = parsed.data;
    const finalName = menu_item_name || name!;

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orgId, finalName, station, price, prep_time_minutes]
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
// PATCH /api/recipes/:id — update (Owner, Admin, Executive Chef)
// ------------------------------------------------------------------ //
router.patch('/:id', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { id } = req.params;

    const parsed = PatchRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const updates = parsed.data;
    const setClauses: string[] = [];
    const values: unknown[] = [id, orgId];

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
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    res.json(formatRecipe(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// DELETE /api/recipes/:id (Owner, Admin, Executive Chef)
// ------------------------------------------------------------------ //
router.delete('/:id', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM recipes WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// POST /api/recipes/:id/ingredients — attach or update single ingredient
// ------------------------------------------------------------------ //
const AddRecipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity_required: z.number().positive(),
});

router.post('/:id/ingredients', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { id } = req.params;
    const parsed = AddRecipeIngredientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { rows: recipeRows } = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
    if (recipeRows.length === 0) {
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    const { ingredient_id, quantity_required } = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
       VALUES ($1, $2, $3)
       ON CONFLICT (recipe_id, ingredient_id) DO UPDATE
       SET quantity_required = EXCLUDED.quantity_required
       RETURNING *`,
      [id, ingredient_id, quantity_required]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// DELETE /api/recipes/:id/ingredients/:ingredientId — remove ingredient
// ------------------------------------------------------------------ //
router.delete('/:id/ingredients/:ingredientId', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = resolveOrgId(req);
    const { id, ingredientId } = req.params;

    const { rows: recipeRows } = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
    if (recipeRows.length === 0) {
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    const { rowCount } = await pool.query(
      'DELETE FROM recipe_ingredients WHERE recipe_id = $1 AND ingredient_id = $2',
      [id, ingredientId]
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'Ingredient not linked to this recipe' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
// PUT /api/recipes/:id/ingredients — batch replace BOM ingredients
// ------------------------------------------------------------------ //
const SyncRecipeIngredientsSchema = z.object({
  ingredients: z.array(z.object({
    ingredient_id: z.string().uuid(),
    quantity_required: z.number().positive(),
  })),
});

router.put('/:id/ingredients', requireRole(['Owner', 'Admin', 'Executive Chef']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    const { id } = req.params;
    const parsed = SyncRecipeIngredientsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    await client.query('BEGIN');

    const { rows: recipeRows } = await client.query(
      'SELECT id FROM recipes WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
    if (recipeRows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Recipe not found in your organization' });
      return;
    }

    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

    for (const item of parsed.data.ingredients) {
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
         VALUES ($1, $2, $3)`,
        [id, item.ingredient_id, item.quantity_required]
      );
    }

    await client.query('COMMIT');

    const { rows: updatedIngredients } = await pool.query(
      `SELECT ri.ingredient_id,
              i.name AS ingredient_name,
              i.unit,
              ri.quantity_required
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY i.name ASC`,
      [id]
    );

    res.json({
      recipe_id: id,
      ingredients: updatedIngredients.map((ing) => ({
        ...ing,
        name: ing.ingredient_name,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
