import React from 'react';
import { OrchestrationOrder } from '../types';
import { Activity, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  orders: OrchestrationOrder[];
}

export const OrchestrationStatus: React.FC<Props> = ({ orders }) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-indigo-500" />
        <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Open Supply Chain Orchestration Log</h3>
      </div>
      <div className="space-y-3">
        {orders.length === 0 && (
            <div className="text-zinc-600 text-[10px] font-mono italic">No active orchestration workflows...</div>
        )}
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between p-2 rounded bg-zinc-950/50 border border-zinc-800/50">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono">{order.id}</span>
              <span className="text-xs text-zinc-300 font-medium">{order.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date(order.timestamp).toLocaleTimeString()}
              </span>
              {order.status === 'PROCESSING' ? (
                <Loader2 size={14} className="text-indigo-500 animate-spin" />
              ) : (
                <CheckCircle2 size={14} className="text-emerald-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
