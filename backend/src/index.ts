import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { initSockets } from './sockets/index.js';
import ingredientsRouter from './routes/ingredients.js';
import recipesRouter from './routes/recipes.js';
import prepLogsRouter from './routes/prepLogs.js';
import { createTicketsRouter } from './routes/tickets.js';
import foodCostRouter from './routes/foodCost.js';
import supplierOrdersRouter from './routes/supplierOrders.js';
import { createAiRoutes } from './ai-orchestrator/routes.js';

// ------------------------------------------------------------------ //
// App + HTTP server
// ------------------------------------------------------------------ //

const app = express();
const httpServer = createServer(app);

// ------------------------------------------------------------------ //
// Socket.IO
// ------------------------------------------------------------------ //

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

initSockets(io);

// ------------------------------------------------------------------ //
// Middleware
// ------------------------------------------------------------------ //

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------ //
// Health check
// ------------------------------------------------------------------ //

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ------------------------------------------------------------------ //
// Routes
// ------------------------------------------------------------------ //

app.use('/api/ingredients', ingredientsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/prep-logs', prepLogsRouter);
app.use('/api/tickets', createTicketsRouter(io));
app.use('/api/food-cost', foodCostRouter);
app.use('/api/supplier-orders', supplierOrdersRouter);
app.use('/api/ai', createAiRoutes(io));

// ------------------------------------------------------------------ //
// Global error handler
// ------------------------------------------------------------------ //

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ------------------------------------------------------------------ //
// Start
// ------------------------------------------------------------------ //

const PORT = Number(process.env['PORT']) || 5000;

httpServer.listen(PORT, () => {
  const dbUrl = process.env['DATABASE_URL'] ?? '(not set)';
  // Mask the password portion of the connection string for safe logging
  const maskedDb = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`🚀 KitchenPulse API listening on port ${PORT}`);
  console.log(`   Database: ${maskedDb}`);
});

export { app, io, httpServer };
