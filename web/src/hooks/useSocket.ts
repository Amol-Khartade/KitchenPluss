import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { StationWorkload } from '../types/index.js';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const orgStored = typeof window !== 'undefined' ? localStorage.getItem('kitchenpulse_org') : null;
    let orgId = '';
    try {
      if (orgStored) orgId = JSON.parse(orgStored)?.id || '';
    } catch {
      orgId = '';
    }

    socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      query: orgId ? { orgId } : undefined,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [stationWorkloads, setStationWorkloads] = useState<StationWorkload[]>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; timestamp: Date; type: 'stock' | 'ai' | 'ticket' }>>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setIsConnected(true);
      // Ensure we join the current organization room
      try {
        const storedOrg = localStorage.getItem('kitchenpulse_org');
        if (storedOrg) {
          const org = JSON.parse(storedOrg);
          if (org?.id) {
            socket.emit('join:org', { organizationId: org.id });
          }
        }
      } catch {
        // Ignored
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewTicket(_ticket: any) {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          message: `New Ticket fired: ${_ticket.recipe_name ?? 'Item'} (Table ${_ticket.table_number ?? '1'})`,
          timestamp: new Date(),
          type: 'ticket',
        },
        ...prev.slice(0, 9),
      ]);
    }

    function onUpdateTicketStatus(_ticket: any) {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    }

    function onStockAlert(data: any) {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          message: `CRITICAL STOCK ALERT: ${data.name} is down to ${data.current_stock ?? data.stock_qty}!`,
          timestamp: new Date(),
          type: 'stock',
        },
        ...prev.slice(0, 9),
      ]);
    }

    function onFoodCostUpdated() {
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    }

    function onStationWorkload(workloadData: any) {
      if (Array.isArray(workloadData)) {
        setStationWorkloads(workloadData);
      } else if (workloadData && typeof workloadData === 'object') {
        const arr = Object.entries(workloadData).map(([stn, count]) => ({
          station: stn,
          queue_count: Number(count),
          firing_count: 0,
          total_active: Number(count),
          workload_percentage: Math.min(100, Number(count) * 15),
        }));
        setStationWorkloads(arr);
      }
    }

    function onAiPrepSheet() {
      queryClient.invalidateQueries({ queryKey: ['ai-prep'] });
      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          message: 'AI Prep Sheet updated with new predictive recommendations',
          timestamp: new Date(),
          type: 'ai',
        },
        ...prev.slice(0, 9),
      ]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_ticket', onNewTicket);
    socket.on('ticket:created', onNewTicket);
    socket.on('update_ticket_status', onUpdateTicketStatus);
    socket.on('ticket:updated', onUpdateTicketStatus);
    socket.on('stock_alert', onStockAlert);
    socket.on('stock:alert', onStockAlert);
    socket.on('food_cost_updated', onFoodCostUpdated);
    socket.on('food_cost:updated', onFoodCostUpdated);
    socket.on('station_workload', onStationWorkload);
    socket.on('ai:prep_sheet', onAiPrepSheet);

    if (socket.connected) {
      setIsConnected(true);
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_ticket', onNewTicket);
      socket.off('ticket:created', onNewTicket);
      socket.off('update_ticket_status', onUpdateTicketStatus);
      socket.off('ticket:updated', onUpdateTicketStatus);
      socket.off('stock_alert', onStockAlert);
      socket.off('stock:alert', onStockAlert);
      socket.off('food_cost_updated', onFoodCostUpdated);
      socket.off('food_cost:updated', onFoodCostUpdated);
      socket.off('station_workload', onStationWorkload);
      socket.off('ai:prep_sheet', onAiPrepSheet);
    };
  }, [queryClient]);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    isConnected,
    stationWorkloads,
    alerts,
    dismissAlert,
  };
}
