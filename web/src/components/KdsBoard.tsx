import React, { useState } from 'react';
import { Ticket, TicketStatus } from '../types/index.js';
import { TicketCard } from './TicketCard.js';
import { Layers, Flame, CheckCircle, Inbox, LayoutGrid } from 'lucide-react';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [mobileColumnFilter, setMobileColumnFilter] = useState<'ALL' | 'QUEUE' | 'FIRING' | 'COMPLETED'>('ALL');

  const queueTickets = tickets.filter((t) => t.status === 'QUEUE');
  const firingTickets = tickets.filter((t) => t.status === 'FIRING');
  const completedTickets = tickets
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
    .slice(0, 15);

  const showQueue = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'QUEUE';
  const showFiring = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'FIRING';
  const showCompleted = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'COMPLETED';

  return (
    <div className="space-y-4">
      {/* Mobile/Tablet Column Selector Tabs (hidden on large desktop) */}
      <div className="flex md:hidden items-center justify-between p-1.5 rounded-2xl glass-panel border border-white/10 gap-1 overflow-x-auto">
        <Button
          variant={mobileColumnFilter === 'ALL' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileColumnFilter('ALL')}
          className="flex-1 min-w-[70px]"
        >
          <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
          <span>All</span>
          <span className="ml-1 text-[10px] opacity-75">({tickets.length})</span>
        </Button>

        <Button
          variant={mobileColumnFilter === 'QUEUE' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileColumnFilter('QUEUE')}
          className={`flex-1 min-w-[85px] ${mobileColumnFilter === 'QUEUE' ? 'bg-sky-500/25 text-sky-300 border-sky-400/40 hover:bg-sky-500/30' : ''}`}
        >
          <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
          <span>Queue</span>
          <Badge variant="default" className="ml-1.5 px-1.5 py-0 text-[10px]">
            {queueTickets.length}
          </Badge>
        </Button>

        <Button
          variant={mobileColumnFilter === 'FIRING' ? 'warning' : 'ghost'}
          size="sm"
          onClick={() => setMobileColumnFilter('FIRING')}
          className="flex-1 min-w-[85px]"
        >
          <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          <span>Firing</span>
          <Badge variant="warning" className="ml-1.5 px-1.5 py-0 text-[10px]">
            {firingTickets.length}
          </Badge>
        </Button>

        <Button
          variant={mobileColumnFilter === 'COMPLETED' ? 'success' : 'ghost'}
          size="sm"
          onClick={() => setMobileColumnFilter('COMPLETED')}
          className="flex-1 min-w-[85px]"
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          <span>Done</span>
          <Badge variant="success" className="ml-1.5 px-1.5 py-0 text-[10px]">
            {completedTickets.length}
          </Badge>
        </Button>
      </div>

      {/* Main KDS Columns Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-5 md:h-[calc(100vh-14rem)] min-h-[500px]">
          {/* Column 1: QUEUE */}
          {showQueue && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col glass-panel rounded-2xl border border-sky-500/20 overflow-hidden shadow-glass transition-all h-full"
            >
              <div className="p-4 border-b border-sky-500/20 flex items-center justify-between bg-sky-950/30 backdrop-blur-xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-sky-200">
                      Queue / Pending
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Incoming Orders</span>
                  </div>
                </div>
                <Badge variant="default" className="text-xs font-mono shadow-sm">
                  {queueTickets.length}
                </Badge>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {queueTickets.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Inbox className="w-8 h-8 opacity-30 text-sky-400" />
                    <p className="text-xs text-slate-400">No pending tickets in queue</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {queueTickets.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <TicketCard
                          ticket={t}
                          onUpdateStatus={onUpdateStatus}
                          isUpdating={updatingTicketId === t.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}

          {/* Column 2: FIRING */}
          {showFiring && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col glass-panel rounded-2xl border border-amber-500/30 overflow-hidden shadow-glass ring-1 ring-amber-500/25 transition-all h-full"
            >
              <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-amber-950/30 backdrop-blur-xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-glow-amber">
                    <Flame className="w-4 h-4 fill-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                      Firing / Cooking
                    </h3>
                    <span className="text-[10px] text-amber-200/70 font-mono">Active on Line</span>
                  </div>
                </div>
                <Badge variant="warning" className="text-xs font-mono shadow-sm animate-pulse">
                  {firingTickets.length}
                </Badge>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {firingTickets.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Flame className="w-8 h-8 opacity-30 text-amber-500" />
                    <p className="text-xs text-slate-400">No tickets actively firing</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {firingTickets.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <TicketCard
                          ticket={t}
                          onUpdateStatus={onUpdateStatus}
                          isUpdating={updatingTicketId === t.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}

          {/* Column 3: COMPLETED / EXPEDITE */}
          {showCompleted && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden shadow-glass transition-all h-full"
            >
              <div className="p-4 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/20 backdrop-blur-xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                      Expedite / Done
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Ready for Service</span>
                  </div>
                </div>
                <Badge variant="success" className="text-xs font-mono shadow-sm">
                  {completedTickets.length}
                </Badge>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {completedTickets.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <CheckCircle className="w-8 h-8 opacity-30 text-emerald-500" />
                    <p className="text-xs text-slate-400">No fulfilled tickets yet today</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {completedTickets.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <TicketCard
                          ticket={t}
                          onUpdateStatus={onUpdateStatus}
                          isUpdating={updatingTicketId === t.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
