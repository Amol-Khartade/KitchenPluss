import { Server, Socket } from 'socket.io';

// ------------------------------------------------------------------ //
// Payload types
// ------------------------------------------------------------------ //

export interface TicketPayload {
  id: string;
  recipe_id: string;
  recipe_name: string;
  station: string;
  status: string;
  table_number?: number | null;
  notes?: string | null;
  created_at?: Date | string;
  completed_at?: Date | string | null;
}

export interface StockAlertPayload {
  ingredient_id: string;
  name: string;
  stock_qty: number;
  threshold_qty: number;
  current_stock?: number;
  minimum_threshold?: number;
}

export interface FoodCostPayload {
  refreshed_at: Date;
  [key: string]: unknown;
}

// ------------------------------------------------------------------ //
// initSockets — register all connection-level handlers
// ------------------------------------------------------------------ //

export function initSockets(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // Listen for station_workload or station:workload
    socket.on('station:workload', (data: { station: string; active_tickets: number }) => {
      console.log(`[socket] station:workload from ${socket.id}:`, data);
      io.emit('station:workload', data);
      io.emit('station_workload', data);
    });

    socket.on('station_workload', (data: { station: string; active_tickets: number }) => {
      console.log(`[socket] station_workload from ${socket.id}:`, data);
      io.emit('station:workload', data);
      io.emit('station_workload', data);
    });

    // Listen for client ping / heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`[socket] Client disconnected: ${socket.id} — reason: ${reason}`);
    });

    socket.on('error', (err: Error) => {
      console.error(`[socket] Error on ${socket.id}:`, err);
    });
  });
}

// ------------------------------------------------------------------ //
// Helper emit functions — used by route handlers and agents
// ------------------------------------------------------------------ //

export function emitTicketCreated(io: Server, payload: TicketPayload): void {
  io.emit('ticket:created', payload);
  io.emit('new_ticket', payload);
  console.log(`[socket] Emitted ticket created → ticket #${payload.id} (${payload.recipe_name})`);
}

export function emitTicketUpdated(io: Server, payload: TicketPayload): void {
  io.emit('ticket:updated', payload);
  io.emit('update_ticket_status', payload);
  console.log(`[socket] Emitted ticket updated → ticket #${payload.id} [${payload.status}]`);
}

export function emitStockAlert(io: Server, payload: StockAlertPayload): void {
  io.emit('stock:alert', payload);
  io.emit('stock_alert', payload);
  console.warn(
    `[socket] Emitted stock alert → "${payload.name}" stock ${payload.stock_qty ?? payload.current_stock} ≤ threshold ${payload.threshold_qty ?? payload.minimum_threshold}`
  );
}

export function emitFoodCostUpdated(io: Server, payload: FoodCostPayload): void {
  io.emit('food_cost:updated', payload);
  io.emit('food_cost_updated', payload);
  console.log(`[socket] Emitted food cost updated at ${payload.refreshed_at.toISOString()}`);
}
