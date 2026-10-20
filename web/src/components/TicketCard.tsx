import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '../types/index.js';
import { Clock, Flame, CheckCircle, Ban, ChefHat } from 'lucide-react';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';

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
  let timerBadgeVariant: 'default' | 'destructive' | 'warning' | 'success' | 'outline' | 'secondary' | 'glass' = 'glass';
  if (!ticket.completed_at) {
    if (elapsedMinutes >= 12) {
      timerBadgeVariant = 'destructive';
    } else if (elapsedMinutes >= 6) {
      timerBadgeVariant = 'warning';
    } else {
      timerBadgeVariant = 'success';
    }
  }

  const shortId = ticket.id.slice(0, 8);

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 p-3.5 sm:p-4 flex flex-col justify-between shadow-neu-raised-sm hover:shadow-neu-raised ${
        ticket.status === 'FIRING'
          ? 'bg-neu-card border-amber-500/50 shadow-glow-amber ring-1 ring-amber-500/30'
          : ticket.status === 'COMPLETED'
          ? 'bg-neu-sunken/80 border-emerald-500/30 opacity-90 shadow-neu-inset-sm'
          : 'bg-neu-card border-neu-border'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Badge variant="glass" className="font-mono px-1.5 sm:px-2.5 text-[10px] sm:text-xs">
              #{shortId}
            </Badge>
            <Badge variant="glass" className="px-1.5 sm:px-2.5 text-[10px] sm:text-xs">
              Table {ticket.table_number || 1}
            </Badge>
          </div>

          {/* Dynamic Timer */}
          <Badge
            variant={timerBadgeVariant}
            className={`font-mono px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold ${
              timerBadgeVariant === 'destructive' ? 'animate-pulse' : ''
            }`}
          >
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            <span className="tabular-numbers">T+ {elapsedDisplay}</span>
          </Badge>
        </div>

        {/* Recipe Title & Station */}
        <div className="mb-3">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
            {ticket.recipe_name}
          </h4>
          <div className="flex items-center space-x-2 mt-1.5">
            <Badge variant="default" className="px-1.5 sm:px-2.5 text-[10px] sm:text-[11px] font-semibold">
              <ChefHat className="w-3 h-3 text-sky-500 mr-1" />
              <span>{ticket.station}</span>
            </Badge>
          </div>
        </div>

        {/* Notes */}
        {ticket.notes && (
          <div className="mb-3 text-[10px] sm:text-xs bg-amber-500/10 p-2 sm:p-2.5 rounded-xl text-amber-800 dark:text-amber-200 border border-amber-500/30">
            <span className="font-bold text-amber-600 dark:text-amber-400">Note: </span>
            {ticket.notes}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 sm:pt-3 border-t border-neu-borderSubtle mt-2">
        {ticket.status === 'QUEUE' && (
          <Button
            variant="warning"
            size="default"
            onClick={() => onUpdateStatus(ticket.id, 'FIRING')}
            disabled={isUpdating}
            className="w-full text-slate-950 font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 uppercase tracking-wider shadow-sm"
          >
            <Flame className="w-4 h-4 mr-1.5 fill-slate-950" />
            <span>Fire Ticket</span>
          </Button>
        )}

        {ticket.status === 'FIRING' && (
          <div className="flex items-center space-x-2">
            <Button
              variant="success"
              onClick={() => onUpdateStatus(ticket.id, 'COMPLETED')}
              disabled={isUpdating}
              className="flex-1 text-slate-950 font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 uppercase tracking-wider shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              <span>Mark Done</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdateStatus(ticket.id, 'CANCELLED')}
              disabled={isUpdating}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              title="Cancel Ticket"
              aria-label="Cancel Ticket"
            >
              <Ban className="w-4 h-4" />
            </Button>
          </div>
        )}

        {ticket.status === 'COMPLETED' && (
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold py-1">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] sm:text-xs">Fulfilled & BOM Deducted</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {ticket.completed_at ? new Date(ticket.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        )}

        {ticket.status === 'CANCELLED' && (
          <div className="text-center py-1 text-xs text-rose-600 dark:text-rose-400 font-bold">
            Cancelled
          </div>
        )}
      </div>
    </div>
  );
};
