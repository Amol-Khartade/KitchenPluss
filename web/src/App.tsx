import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import {
  ticketsApi,
  ingredientsApi,
  recipesApi,
  prepLogsApi,
  foodCostApi,
  supplierOrdersApi,
  aiApi,
} from './api/client.js';
import { useSocket } from './hooks/useSocket.js';
import { Header, AppTab } from './components/Header.js';
import { StationFilter } from './components/StationFilter.js';
import { KdsBoard } from './components/KdsBoard.js';
import { NewTicketModal } from './components/NewTicketModal.js';
import { InventoryView } from './components/InventoryView.js';
import { AiPrepView } from './components/AiPrepView.js';
import { WasteLogForm } from './components/WasteLogForm.js';
import { UserManagementView } from './components/UserManagementView.js';
import { AuthPortal } from './components/AuthPortal.js';
import { useAuth } from './context/AuthContext.js';
import { TicketStatus, AiPrepSheetResponse } from './types/index.js';

export function App() {
  const { isAuthenticated, isLoading, hasAdminAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<AppTab>('kds');
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState<boolean>(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [prepSheet, setPrepSheet] = useState<AiPrepSheetResponse | null>(null);

  const queryClient = useQueryClient();
  const { isConnected, stationWorkloads, alerts, dismissAlert } = useSocket();

  // ---------------------------------------------------------------- //
  // Queries (Only active when authenticated)
  // ---------------------------------------------------------------- //
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.getAll(),
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ingredientsApi.getAll(),
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.getAll(),
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  const { data: prepLogs = [] } = useQuery({
    queryKey: ['prep-logs'],
    queryFn: () => prepLogsApi.getAll(),
    enabled: isAuthenticated,
  });

  const { data: foodCostSummaries = [] } = useQuery({
    queryKey: ['food-cost'],
    queryFn: () => foodCostApi.getSummary(),
    enabled: isAuthenticated,
  });

  const { data: supplierOrders = [] } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn: () => supplierOrdersApi.getAll(),
    enabled: isAuthenticated,
  });

  // ---------------------------------------------------------------- //
  // Derived Data
  // ---------------------------------------------------------------- //
  const stations = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) set.add(r.station);
    });
    tickets.forEach((t) => {
      if (t.station) set.add(t.station);
    });
    return Array.from(set).sort();
  }, [recipes, tickets]);

  const filteredTickets = useMemo(() => {
    if (selectedStation === 'ALL') return tickets;
    return tickets.filter(
      (t) => t.station?.toLowerCase() === selectedStation.toLowerCase()
    );
  }, [tickets, selectedStation]);

  const ticketCounts = useMemo(() => {
    const queue = tickets.filter((t) => t.status === 'QUEUE').length;
    const firing = tickets.filter((t) => t.status === 'FIRING').length;
    const lowStock = ingredients.filter(
      (i) => Number(i.current_stock) <= Number(i.minimum_threshold)
    ).length;
    return { queue, firing, lowStock };
  }, [tickets, ingredients]);

  // ---------------------------------------------------------------- //
  // Mutations
  // ---------------------------------------------------------------- //
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketsApi.updateStatus(id, status),
    onMutate: ({ id }) => setUpdatingTicketId(id),
    onSettled: () => {
      setUpdatingTicketId(null);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      ingredientsApi.updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: ({ ingredientId, qty }: { ingredientId: string; qty: number }) =>
      supplierOrdersApi.create({ ingredient_id: ingredientId, quantity_ordered: qty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    },
  });

  const receiveOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      supplierOrdersApi.updateStatus(orderId, 'DELIVERED', 'PASS'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const prepOptimizationMutation = useMutation({
    mutationFn: (dayOfWeek: string) => aiApi.runPrepOptimization(dayOfWeek),
    onSuccess: (res) => {
      if (res.data) {
        setPrepSheet(res.data);
      }
    },
  });

  const inventoryAlertMutation = useMutation({
    mutationFn: aiApi.runInventoryAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const createPrepLogMutation = useMutation({
    mutationFn: prepLogsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep-logs'] });
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  const refreshFoodCostMutation = useMutation({
    mutationFn: foodCostApi.refresh,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-cost'] });
    },
  });

  // ---------------------------------------------------------------- //
  // Strict Authentication Guard
  // Without user login, NEVER show the dashboard!
  // ---------------------------------------------------------------- //
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 animate-pulse">
          <div className="w-full h-full bg-bg-surface rounded-[14px] flex items-center justify-center">
            <Flame className="w-7 h-7 text-amber-400" />
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">Authenticating KitchenPulse session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPortal />;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-slate-100 flex flex-col font-sans">
      {/* Global Navigation Header with Hotel Branding */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
        alerts={alerts}
        onDismissAlert={dismissAlert}
        ticketCounts={ticketCounts}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab 1: Live Kitchen Display System (KDS) */}
        {activeTab === 'kds' && (
          <div className="space-y-4">
            <StationFilter
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
              stations={stations}
              stationWorkloads={stationWorkloads}
            />

            <KdsBoard
              tickets={filteredTickets}
              onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
              updatingTicketId={updatingTicketId}
            />
          </div>
        )}

        {/* Tab 2: Inventory & Supply Chain Console */}
        {activeTab === 'inventory' && (
          <InventoryView
            ingredients={ingredients}
            supplierOrders={supplierOrders}
            onUpdateStock={(id, stock) => updateStockMutation.mutateAsync({ id, stock }).then(() => {})}
            onCreateOrder={(ingredientId, qty) =>
              createOrderMutation.mutateAsync({ ingredientId, qty }).then(() => {})
            }
            onReceiveOrder={(orderId) => receiveOrderMutation.mutateAsync(orderId).then(() => {})}
            onRunAiAudit={() => inventoryAlertMutation.mutateAsync().then(() => {})}
            isAuditing={inventoryAlertMutation.isPending}
          />
        )}

        {/* Tab 3: AI Prep & Food Cost Intelligence */}
        {activeTab === 'ai-prep' && (
          <AiPrepView
            prepSheet={prepSheet}
            foodCostSummaries={foodCostSummaries}
            onRunOptimization={(dayOfWeek) => prepOptimizationMutation.mutateAsync(dayOfWeek).then(() => {})}
            onRefreshFoodCost={() => refreshFoodCostMutation.mutateAsync().then(() => {})}
            isLoadingPrep={prepOptimizationMutation.isPending}
            isRefreshingCost={refreshFoodCostMutation.isPending}
          />
        )}

        {/* Tab 4: Shift Scrap & Waste Logging */}
        {activeTab === 'waste-log' && (
          <WasteLogForm
            recipes={recipes}
            prepLogs={prepLogs}
            onSubmit={(data) => createPrepLogMutation.mutateAsync(data).then(() => {})}
            isSubmitting={createPrepLogMutation.isPending}
          />
        )}

        {/* Tab 5: Team & Staff Management (Owner & Admin Only) */}
        {activeTab === 'team' && hasAdminAccess && <UserManagementView />}
      </main>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        recipes={recipes}
        onSubmit={(data) => createTicketMutation.mutateAsync(data).then(() => {})}
      />
    </div>
  );
}

export default App;
