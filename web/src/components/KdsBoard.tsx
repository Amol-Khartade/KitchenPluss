import React from 'react';
import { Ticket, TicketStatus } from '../types/index.js';
import { TicketCard } from './TicketCard.js';
import { Layers, Flame, CheckCircle, Inbox } from 'lucide-react';

interface KdsBoardProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  updatingTicketId?: string | null;
}

export const KdsBoard: React.FC<KdsBoardProps> = ({
  tickets,
  onUpdateStatus,
  updatingTicketId,
}) => {
  const queueTickets = tickets.filter((t) => t.status === 'QUEUE');
  const firingTickets = tickets.filter((t) => t.status === 'FIRING');
  const completedTickets = tickets
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
    .slice(0, 15); // Show latest 15 completed

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-14rem)] min-h-[500px]">
      {/* Column 1: QUEUE */}
      <div className="flex flex-col bg-bg-surface rounded-2xl border border-bg-border overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between bg-bg-surface/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
              Queue / Pending
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-sky-950 text-sky-400 border border-sky-800/60">
            {queueTickets.length}
          </span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {queueTickets.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-xs">No pending tickets in queue</p>
            </div>
          ) : (
            queueTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                onUpdateStatus={onUpdateStatus}
                isUpdating={updatingTicketId === t.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Column 2: FIRING */}
      <div className="flex flex-col bg-bg-surface rounded-2xl border border-amber-900/40 overflow-hidden ring-1 ring-amber-500/20">
        <div className="p-4 border-b border-bg-border flex items-center justify-between bg-amber-950/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-amber-300">
              Firing / Cooking
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-950 text-amber-300 border border-amber-700/60">
            {firingTickets.length}
          </span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {firingTickets.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Flame className="w-8 h-8 opacity-40 text-amber-600" />
              <p className="text-xs">No tickets actively firing</p>
            </div>
          ) : (
            firingTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                onUpdateStatus={onUpdateStatus}
                isUpdating={updatingTicketId === t.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Column 3: COMPLETED / EXPEDITE */}
      <div className="flex flex-col bg-bg-surface rounded-2xl border border-bg-border overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between bg-emerald-950/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-300">
              Expedite / Completed
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            {completedTickets.length}
          </span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {completedTickets.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <CheckCircle className="w-8 h-8 opacity-40" />
              <p className="text-xs">No fulfilled tickets yet today</p>
            </div>
          ) : (
            completedTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                onUpdateStatus={onUpdateStatus}
                isUpdating={updatingTicketId === t.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
