import React from 'react';
import { AlertCircle, FlaskConical, TrendingDown } from 'lucide-react';
import { ChipArchitecture } from '../types';
import { getProcessControlMetrics } from '../services/manufacturingInsights';

export const ProcessControlPanel: React.FC<{ architecture: ChipArchitecture }> = ({ architecture }) => {
  const metrics = getProcessControlMetrics(architecture);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
          <FlaskConical className="text-fuchsia-400" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Process Excursion Intelligence</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">SPC, drift detection, yield loss attribution</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">CPK</p>
          <p className="text-2xl font-bold text-emerald-400">{metrics.cpk}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Excursion Risk</p>
          <p className="text-2xl font-bold text-amber-400">{metrics.excursionRisk}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Wafers At Risk</p>
          <p className="text-2xl font-bold text-red-400">{metrics.wafersAtRisk}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-zinc-500 font-mono uppercase">Loss Attribution</span>
          <span className="text-xs text-zinc-400">Scrap exposure {metrics.scrapExposure}%</span>
        </div>
        <div className="space-y-3">
          {metrics.rootCauses.map((cause) => (
            <div key={cause.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">{cause.name}</span>
                <span className="text-zinc-500">{cause.contribution}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${cause.contribution}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm text-zinc-300">
        <div className="flex items-center gap-2 mb-2 text-fuchsia-300">
          <TrendingDown size={16} />
          <span className="font-semibold">Root-cause priority</span>
        </div>
        <p>Overlay drift and RF mismatch are the dominant loss drivers. Tighten control limits on lithography and re-run RF calibration before the next production window.</p>
      </div>
    </div>
  );
};
