import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '../types/index.js';
import { Clock, Flame, CheckCircle, Ban, ChefHat } from 'lucide-react';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import { motion } from 'framer-motion';

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
    <div className={`rounded-2xl border transition-all duration-300 p-3 sm:p-4 flex flex-col justify-between backdrop-blur-xl shadow-glass ${
      ticket.status === 'FIRING'
        ? 'bg-slate-900/80 border-amber-500/50 shadow-glow-amber ring-1 ring-amber-500/30'
        : ticket.status === 'COMPLETED'
        ? 'bg-slate-950/60 border-emerald-500/30 opacity-80'
        : 'bg-slate-900/65 border-white/10 hover:border-white/25 hover:bg-slate-900/80'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Badge variant="glass" className="font-mono shadow-sm px-1.5 sm:px-2.5 text-[10px] sm:text-xs">
              #{shortId}
            </Badge>
            <Badge variant="glass" className="px-1.5 sm:px-2.5 text-[10px] sm:text-xs">
              Table {ticket.table_number || 1}
            </Badge>
          </div>

          {/* Dynamic Timer */}
          <Badge
            variant={timerBadgeVariant}
            className={`font-mono px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-xs ${timerBadgeVariant === 'destructive' ? 'animate-pulse' : ''}`}
          >
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            <span className="tabular-numbers">T+ {elapsedDisplay}</span>
          </Badge>
        </div>

        {/* Recipe Title & Station */}
        <div className="mb-3">
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug drop-shadow-sm line-clamp-2">
            {ticket.recipe_name}
          </h4>
          <div className="flex items-center space-x-2 mt-1.5">
            <Badge variant="default" className="bg-sky-950/60 border-sky-500/30 text-sky-300 px-1.5 sm:px-2.5 text-[10px] sm:text-[11px]">
              <ChefHat className="w-3 h-3 text-sky-400 mr-1" />
              <span>{ticket.station}</span>
            </Badge>
          </div>
        </div>

        {/* Notes */}
        {ticket.notes && (
          <div className="mb-3 text-[10px] sm:text-xs bg-amber-950/30 p-2 sm:p-2.5 rounded-xl text-amber-200 border border-amber-500/30 backdrop-blur-md">
            <span className="font-bold text-amber-400">Note: </span>
            {ticket.notes}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 sm:pt-3 border-t border-white/10 mt-2">
        {ticket.status === 'QUEUE' && (
          <Button
            variant="warning"
            size="default"
            onClick={() => onUpdateStatus(ticket.id, 'FIRING')}
            disabled={isUpdating}
            className="w-full text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 uppercase tracking-wider"
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
              className="flex-1 text-slate-950 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 uppercase tracking-wider"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              <span>Mark Done</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdateStatus(ticket.id, 'CANCELLED')}
              disabled={isUpdating}
              className="bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/40"
              title="Cancel Ticket"
            >
              <Ban className="w-4 h-4" />
            </Button>
          </div>
        )}

        {ticket.status === 'COMPLETED' && (
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold py-1">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] sm:text-xs">Fulfilled & Deducted</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
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
