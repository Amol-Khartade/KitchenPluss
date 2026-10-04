import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '../types/index.js';
import { Clock, Flame, CheckCircle, Ban, ChefHat } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  isUpdating?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onUpdateStatus,
  isUpdating = false,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const [elapsedDisplay, setElapsedDisplay] = useState<string>('00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(ticket.created_at).getTime();
      const end = ticket.completed_at ? new Date(ticket.completed_at).getTime() : Date.now();
      const diffSecs = Math.max(0, Math.floor((end - start) / 1000));

      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setElapsedMinutes(mins);
      setElapsedDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateTimer();
    if (!ticket.completed_at) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [ticket.created_at, ticket.completed_at]);

  // Color code based on elapsed wait time
  let timerBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  if (!ticket.completed_at) {
    if (elapsedMinutes >= 12) {
      timerBadgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse';
    } else if (elapsedMinutes >= 6) {
      timerBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
    } else {
      timerBadgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
    }
  }

  const shortId = ticket.id.slice(0, 8);

  return (
    <div className={`rounded-xl border transition-all duration-200 bg-bg-card p-4 flex flex-col justify-between shadow-lg ${
      ticket.status === 'FIRING'
        ? 'border-amber-500/50 shadow-amber-950/20 ring-1 ring-amber-500/30'
        : ticket.status === 'COMPLETED'
        ? 'border-emerald-600/40 opacity-75'
        : 'border-bg-border hover:border-slate-600'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-slate-400 bg-bg-surface px-2 py-0.5 rounded border border-bg-border">
              #{shortId}
            </span>
            <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">
              Table {ticket.table_number || 1}
            </span>
          </div>

          {/* Dynamic Timer */}
          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${timerBadgeColor}`}>
            <Clock className="w-3 h-3" />
            <span className="tabular-numbers">T+ {elapsedDisplay}</span>
          </div>
        </div>

        {/* Recipe Title & Station */}
        <div className="mb-3">
          <h4 className="text-base font-bold text-white tracking-tight leading-snug">
            {ticket.recipe_name}
          </h4>
          <div className="flex items-center space-x-2 mt-1">
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/50">
              <ChefHat className="w-3 h-3" />
              <span>{ticket.station}</span>
            </span>
          </div>
        </div>

        {/* Notes */}
        {ticket.notes && (
          <div className="mb-3 text-xs bg-bg-surface/80 p-2 rounded-lg text-amber-200 border border-amber-900/30">
            <span className="font-semibold text-amber-400">Note: </span>
            {ticket.notes}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-bg-border/60 mt-2">
        {ticket.status === 'QUEUE' && (
          <button
            onClick={() => onUpdateStatus(ticket.id, 'FIRING')}
            disabled={isUpdating}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-950/40 transition-all disabled:opacity-50"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>Fire Ticket</span>
          </button>
        )}

        {ticket.status === 'FIRING' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateStatus(ticket.id, 'COMPLETED')}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark Done</span>
            </button>
            <button
              onClick={() => onUpdateStatus(ticket.id, 'CANCELLED')}
              disabled={isUpdating}
              className="p-2 rounded-lg bg-bg-surface hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-bg-border hover:border-rose-800/60 transition-colors"
              title="Cancel Ticket"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        )}

        {ticket.status === 'COMPLETED' && (
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium py-1">
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fulfilled & Deducted</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {ticket.completed_at ? new Date(ticket.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        )}

        {ticket.status === 'CANCELLED' && (
          <div className="text-center py-1 text-xs text-rose-400 font-medium">
            Cancelled
          </div>
        )}
      </div>
    </div>
  );
};
