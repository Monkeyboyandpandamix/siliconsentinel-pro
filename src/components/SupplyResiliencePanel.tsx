import React from 'react';
import { AlertTriangle, PackageSearch, ShieldCheck, Truck } from 'lucide-react';
import { BOMItem, ChipArchitecture } from '../types';
import { getSupplyResilienceMetrics } from '../services/manufacturingInsights';

export const SupplyResiliencePanel: React.FC<{ architecture: ChipArchitecture; bom: BOMItem[] }> = ({ architecture, bom }) => {
  const metrics = getSupplyResilienceMetrics(architecture, bom);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <PackageSearch className="text-emerald-400" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Supply Resilience Planner</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Allocation, concentration risk, alternate-source actions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Resilience Score</p>
          <p className="text-2xl font-bold text-emerald-400">{metrics.resilienceScore}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Concentration Risk</p>
          <p className="text-2xl font-bold text-amber-400">{metrics.concentrationRisk}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Avg Lead Time</p>
          <p className="text-2xl font-bold text-cyan-300">{metrics.avgLeadTimeWeeks}<span className="text-xs text-zinc-500 ml-1">weeks</span></p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-zinc-500 font-mono uppercase">Shortage Watchlist</span>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            <Truck size={12} />
            {metrics.shortageRiskLabel} exposure
          </span>
        </div>
        <div className="space-y-3">
          {metrics.watchlist.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <ShieldCheck size={14} />
              No constrained parts detected in the current sourcing plan.
            </div>
          ) : (
            metrics.watchlist.map((item) => (
              <div key={item.partNumber} className="rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-100">{item.partNumber}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-amber-400">
                    <AlertTriangle size={12} />
                    {item.issue}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">{item.action}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
