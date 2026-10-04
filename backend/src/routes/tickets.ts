import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import pool from '../db/pool.js';
import {
  emitTicketCreated,
  emitTicketUpdated,
  emitStockAlert,
  emitFoodCostUpdated,
} from '../sockets/index.js';

// ------------------------------------------------------------------ //
// Validation schemas
// ------------------------------------------------------------------ //

const TICKET_STATUSES = ['QUEUE', 'FIRING', 'COMPLETED', 'CANCELLED'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const CreateTicketSchema = z.object({
  recipe_id: z.string().uuid(),
  station: z.string().min(1).max(100).optional(),
  table_number: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

const PatchTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

function formatTicket(row: any) {
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    recipe_name: row.recipe_name ?? row.menu_item_name,
    station: row.station,
    status: row.status,
    table_number: row.table_number,
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

// ------------------------------------------------------------------ //
// Factory: returns a configured router bound to the io instance
// ------------------------------------------------------------------ //
export function createTicketsRouter(io: Server): Router {
  const router = Router();

  // ---------------------------------------------------------------- //
  // GET /api/tickets — list, optional ?status= filter
  // ---------------------------------------------------------------- //
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query['status'] as string | undefined;

      if (status !== undefined && !TICKET_STATUSES.includes(status as TicketStatus)) {
        res.status(400).json({
          error: `status must be one of: ${TICKET_STATUSES.join(', ')}`,
        });
        return;
      }

      const { rows } = status
        ? await pool.query(
            `SELECT lt.id,
                    lt.recipe_id,
                    r.menu_item_name AS recipe_name,
                    COALESCE(lt.station, r.station) AS station,
                    lt.status,
                    lt.table_number,
                    lt.notes,
                    lt.created_at,
                    lt.completed_at
             FROM live_tickets lt
             JOIN recipes r ON r.id = lt.recipe_id
             WHERE lt.status = $1
             ORDER BY lt.created_at ASC`,
            [status]
          )
        : await pool.query(
            `SELECT lt.id,
                    lt.recipe_id,
                    r.menu_item_name AS recipe_name,
                    COALESCE(lt.station, r.station) AS station,
                    lt.status,
                    lt.table_number,
                    lt.notes,
                    lt.created_at,
                    lt.completed_at
             FROM live_tickets lt
             JOIN recipes r ON r.id = lt.recipe_id
             ORDER BY lt.created_at ASC`
          );

      res.json(rows.map(formatTicket));
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------- //
  // POST /api/tickets — create and emit socket event
  // ---------------------------------------------------------------- //
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const { recipe_id, station, table_number, notes } = parsed.data;

      // Verify recipe exists
      const { rows: recipeCheck } = await pool.query(
        `SELECT id, menu_item_name, station FROM recipes WHERE id = $1`,
        [recipe_id]
      );
      if (recipeCheck.length === 0) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      const finalStation = station || recipeCheck[0].station || 'Main Kitchen';

      const { rows } = await pool.query(
        `INSERT INTO live_tickets (recipe_id, station, table_number, notes, status)
         VALUES ($1, $2, $3, $4, 'QUEUE')
         RETURNING *`,
        [recipe_id, finalStation, table_number ?? 1, notes ?? null]
      );

      const ticket = {
        ...formatTicket(rows[0]),
        recipe_name: recipeCheck[0].menu_item_name,
        station: finalStation,
      };

      // Emit both naming conventions
      emitTicketCreated(io, ticket as any);
      io.emit('new_ticket', ticket);

      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------- //
  // PATCH /api/tickets/:id/status — update status, deduct stock on COMPLETED
  // ---------------------------------------------------------------- //
  router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      const parsed = PatchTicketStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const { status } = parsed.data;

      await client.query('BEGIN');

      // Fetch current ticket + recipe details
      const { rows: ticketRows } = await client.query(
        `SELECT lt.id, lt.recipe_id, lt.status, lt.station, lt.table_number, lt.notes, lt.created_at,
                r.menu_item_name AS recipe_name, r.station AS recipe_station
         FROM live_tickets lt
         JOIN recipes r ON r.id = lt.recipe_id
         WHERE lt.id = $1
         FOR UPDATE`,
        [id]
      );

      if (ticketRows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const currentTicket = ticketRows[0];

      // Update the ticket status
      const completedClause = status === 'COMPLETED' ? ', completed_at = NOW()' : '';
      const { rows: updated } = await client.query(
        `UPDATE live_tickets
         SET status = $1 ${completedClause}
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      // When COMPLETED: deduct ingredients from current_stock and check thresholds
      const stockAlerts: Array<{ ingredient_id: string; name: string; current_stock: number; minimum_threshold: number }> = [];

      if (status === 'COMPLETED' && currentTicket.status !== 'COMPLETED') {
        const { rows: ingredients } = await client.query(
          `SELECT ri.ingredient_id, ri.quantity_required, i.name, i.minimum_threshold
           FROM recipe_ingredients ri
           JOIN ingredients i ON i.id = ri.ingredient_id
           WHERE ri.recipe_id = $1`,
          [currentTicket.recipe_id]
        );

        for (const ing of ingredients) {
          const { rows: stockRows } = await client.query(
            `UPDATE ingredients
             SET current_stock = GREATEST(current_stock - $1, 0),
                 updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, current_stock, minimum_threshold`,
            [ing.quantity_required, ing.ingredient_id]
          );

          const updatedIng = stockRows[0];
          if (updatedIng && Number(updatedIng.current_stock) <= Number(updatedIng.minimum_threshold)) {
            stockAlerts.push({
              ingredient_id: updatedIng.id,
              name: updatedIng.name,
              current_stock: Number(updatedIng.current_stock),
              minimum_threshold: Number(updatedIng.minimum_threshold),
            });
          }
        }
      }

      await client.query('COMMIT');

      const result = {
        ...formatTicket(updated[0]),
        recipe_name: currentTicket.recipe_name,
        station: currentTicket.station || currentTicket.recipe_station,
      };

      // Emit both ticket update events
      emitTicketUpdated(io, result as any);
      io.emit('update_ticket_status', result);

      // Fire stock alerts after commit
      for (const alert of stockAlerts) {
        emitStockAlert(io, {
          ingredient_id: alert.ingredient_id as any,
          name: alert.name,
          stock_qty: alert.current_stock,
          threshold_qty: alert.minimum_threshold,
        });
        io.emit('stock_alert', alert);
      }

      // If completed, refresh food cost view asynchronously
      if (status === 'COMPLETED') {
        pool.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary')
          .then(() => {
            emitFoodCostUpdated(io, { refreshed_at: new Date() });
          })
          .catch(() => {});
      }

      res.json(result);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  });

  return router;
}
