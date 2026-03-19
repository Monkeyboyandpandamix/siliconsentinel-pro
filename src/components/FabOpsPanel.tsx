import React from 'react';
import { Activity, AlertTriangle, Gauge, Wrench } from 'lucide-react';
import { ChipArchitecture } from '../types';
import { getFabOpsMetrics } from '../services/manufacturingInsights';

export const FabOpsPanel: React.FC<{ architecture: ChipArchitecture }> = ({ architecture }) => {
  const metrics = getFabOpsMetrics(architecture);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <Wrench className="text-cyan-400" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Predictive Maintenance Control</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Fab ops, tool health, downtime forecasting</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Tool Health</p>
          <p className="text-2xl font-bold text-emerald-400">{metrics.toolHealth}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Bottleneck Utilization</p>
          <p className="text-2xl font-bold text-amber-400">{metrics.bottleneckUtilization}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Downtime Risk</p>
          <p className="text-2xl font-bold text-red-400">{metrics.downtimeRisk}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">PM Window</p>
          <p className="text-2xl font-bold text-cyan-300">{metrics.maintenanceWindowHours}h</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-zinc-300">
        <div className="flex items-center gap-2 mb-2 text-cyan-300">
          <Gauge size={16} />
          <span className="font-semibold">Recommended action</span>
        </div>
        <p>{metrics.recommendedAction}</p>
      </div>

      <div className="space-y-3">
        {metrics.alerts.map((alert) => (
          <div key={alert.tool} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div>
              <p className="text-xs font-bold text-zinc-100">{alert.tool}</p>
              <p className="text-xs text-zinc-400">{alert.signal}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-amber-400">
                <AlertTriangle size={12} />
                {alert.severity}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">{alert.eta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
