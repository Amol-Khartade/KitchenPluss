import { Server, Socket } from 'socket.io';

// ------------------------------------------------------------------ //
// Payload types
// ------------------------------------------------------------------ //

export interface TicketPayload {
  id: string;
  organization_id?: string;
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
  organization_id?: string;
  ingredient_id: string;
  name: string;
  stock_qty: number;
  threshold_qty: number;
  current_stock?: number;
  minimum_threshold?: number;
}

export interface FoodCostPayload {
  organization_id?: string;
  refreshed_at: Date;
  [key: string]: unknown;
}

// ------------------------------------------------------------------ //
// initSockets — register all connection-level handlers
// ------------------------------------------------------------------ //

export function initSockets(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // Extract orgId from auth or query params
    const orgId =
      socket.handshake.auth?.organizationId ||
      socket.handshake.query?.orgId ||
      socket.handshake.query?.organizationId;

    if (orgId && typeof orgId === 'string') {
      socket.join(`org:${orgId}`);
      console.log(`[socket] Client ${socket.id} joined room org:${orgId}`);
    }

    // Allow client to join an organization room dynamically after login
    socket.on('join:org', (data: { organizationId: string }) => {
      if (data?.organizationId) {
        socket.join(`org:${data.organizationId}`);
        console.log(`[socket] Client ${socket.id} dynamically joined org:${data.organizationId}`);
      }
    });

    // Workload sync
    socket.on('station:workload', (data: { station: string; active_tickets: number; organizationId?: string }) => {
      const targetOrg = data?.organizationId || orgId;
      if (targetOrg) {
        io.to(`org:${targetOrg}`).emit('station:workload', data);
        io.to(`org:${targetOrg}`).emit('station_workload', data);
      } else {
        io.emit('station:workload', data);
        io.emit('station_workload', data);
      }
    });

    socket.on('station_workload', (data: { station: string; active_tickets: number; organizationId?: string }) => {
      const targetOrg = data?.organizationId || orgId;
      if (targetOrg) {
        io.to(`org:${targetOrg}`).emit('station:workload', data);
        io.to(`org:${targetOrg}`).emit('station_workload', data);
      } else {
        io.emit('station:workload', data);
        io.emit('station_workload', data);
      }
    });

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
// Helper emit functions — with tenant-aware routing
// ------------------------------------------------------------------ //

export function emitTicketCreated(io: Server, payload: TicketPayload, orgId?: string): void {
  const targetOrg = orgId || payload.organization_id;
  if (targetOrg) {
    io.to(`org:${targetOrg}`).emit('ticket:created', payload);
    io.to(`org:${targetOrg}`).emit('new_ticket', payload);
    console.log(`[socket] Emitted ticket created to org:${targetOrg} → ticket #${payload.id} (${payload.recipe_name})`);
  } else {
    io.emit('ticket:created', payload);
    io.emit('new_ticket', payload);
    console.log(`[socket] Emitted ticket created globally → ticket #${payload.id} (${payload.recipe_name})`);
  }
}

export function emitTicketUpdated(io: Server, payload: TicketPayload, orgId?: string): void {
  const targetOrg = orgId || payload.organization_id;
  if (targetOrg) {
    io.to(`org:${targetOrg}`).emit('ticket:updated', payload);
    io.to(`org:${targetOrg}`).emit('update_ticket_status', payload);
    console.log(`[socket] Emitted ticket updated to org:${targetOrg} → ticket #${payload.id} [${payload.status}]`);
  } else {
    io.emit('ticket:updated', payload);
    io.emit('update_ticket_status', payload);
    console.log(`[socket] Emitted ticket updated globally → ticket #${payload.id} [${payload.status}]`);
  }
}

export function emitStockAlert(io: Server, payload: StockAlertPayload, orgId?: string): void {
  const targetOrg = orgId || payload.organization_id;
  if (targetOrg) {
    io.to(`org:${targetOrg}`).emit('stock:alert', payload);
    io.to(`org:${targetOrg}`).emit('stock_alert', payload);
    console.warn(`[socket] Emitted stock alert to org:${targetOrg} → "${payload.name}"`);
  } else {
    io.emit('stock:alert', payload);
    io.emit('stock_alert', payload);
    console.warn(`[socket] Emitted stock alert globally → "${payload.name}"`);
  }
}

export function emitFoodCostUpdated(io: Server, payload: FoodCostPayload, orgId?: string): void {
  const targetOrg = orgId || payload.organization_id;
  if (targetOrg) {
    io.to(`org:${targetOrg}`).emit('food_cost:updated', payload);
    io.to(`org:${targetOrg}`).emit('food_cost_updated', payload);
    console.log(`[socket] Emitted food cost updated to org:${targetOrg}`);
  } else {
    io.emit('food_cost:updated', payload);
    io.emit('food_cost_updated', payload);
    console.log(`[socket] Emitted food cost updated globally`);
  }
}
