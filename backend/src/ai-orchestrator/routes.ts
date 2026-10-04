// ============================================================
// KitchenPulse — AI Orchestrator Routes
// Exposes HTTP endpoints to trigger AI workflows manually
// ============================================================

import { Router, Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { runPrepOptimization } from "./prepOptimization.js";
import { runInventoryAlert } from "./inventoryAlert.js";

export function createAiRoutes(io: Server): Router {
  const router = Router();

  /**
   * POST /api/ai/prep-optimization
   * Trigger the nightly prep optimization agent manually.
   * Body: { day_of_week?: string }
   */
  router.post(
    "/prep-optimization",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { day_of_week } = req.body as { day_of_week?: string };
        console.log(`[AI] Manual prep-optimization trigger for: ${day_of_week ?? "tomorrow"}`);

        const result = await runPrepOptimization(day_of_week);

        // Broadcast the new prep sheet via WebSocket
        io.emit("ai:prep_sheet", result);

        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/ai/inventory-alert
   * Trigger the inventory alert agent manually.
   */
  router.post(
    "/inventory-alert",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        console.log("[AI] Manual inventory-alert trigger");

        const result = await runInventoryAlert(io);

        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/ai/health
   * Quick check that the AI module is reachable
   */
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      module: "ai-orchestrator",
      workflows: ["prep-optimization", "inventory-alert"],
    });
  });

  return router;
}
