// ============================================================
// KitchenPulse Mobile — Socket.IO Hook
// Manages connection lifecycle and maps tenant events to store
// ============================================================

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useKitchenStore } from "../store/useKitchenStore";
import { useAuthStore } from "../store/useAuthStore";
import { API_BASE_URL } from "../api/client";
import type { LiveTicket, PrepOptimizationResult } from "../types";

export function useSocket(): void {
  const socketRef = useRef<Socket | null>(null);
  const { organization } = useAuthStore();
  const {
    setConnected,
    addTicket,
    updateTicket,
    addStockAlert,
    setPrepSheet,
  } = useKitchenStore();

  useEffect(() => {
    const orgId = organization?.id;

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      query: orgId ? { orgId } : undefined,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setConnected(true);
      if (orgId) {
        socket.emit("join:org", { organizationId: orgId });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err: Error) => {
      console.warn("[Socket] Connection error:", err.message);
    });

    // Ticket events
    const handleTicketCreated = (ticket: LiveTicket) => {
      console.log("[Socket] ticket:created", ticket.id);
      addTicket(ticket);
    };
    socket.on("ticket:created", handleTicketCreated);
    socket.on("new_ticket", handleTicketCreated);

    const handleTicketUpdated = (payload: Pick<LiveTicket, "id" | "status" | "completed_at">) => {
      console.log("[Socket] ticket:updated", payload.id, "→", payload.status);
      updateTicket(payload.id, {
        status: payload.status,
        completed_at: payload.completed_at,
      });
    };
    socket.on("ticket:updated", handleTicketUpdated);
    socket.on("update_ticket_status", handleTicketUpdated);

    // Stock alerts
    const handleStockAlert = (payload: any) => {
      const name = payload.ingredient_name ?? payload.name;
      const currentStock = payload.current_stock ?? payload.stock_qty;
      const minThreshold = payload.min_threshold ?? payload.minimum_threshold ?? payload.threshold_qty;
      const id = payload.ingredient_id ?? payload.id;
      console.log("[Socket] stock alert:", name);
      addStockAlert({
        id: `${id}-${Date.now()}`,
        ingredient_name: name,
        current_stock: currentStock,
        min_threshold: minThreshold,
        timestamp: new Date().toISOString(),
      });
    };
    socket.on("stock:alert", handleStockAlert);
    socket.on("stock_alert", handleStockAlert);

    // AI prep sheet broadcast
    socket.on("ai:prep_sheet", (sheet: PrepOptimizationResult) => {
      console.log("[Socket] ai:prep_sheet received for:", sheet.day_of_week);
      setPrepSheet(sheet);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [organization?.id]);
}
