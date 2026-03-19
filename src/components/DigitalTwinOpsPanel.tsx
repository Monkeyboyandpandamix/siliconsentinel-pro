import React from 'react';
import { BarChart3, Clock3, Factory, GitBranch } from 'lucide-react';
import { ChipArchitecture } from '../types';
import { getDigitalTwinMetrics } from '../services/manufacturingInsights';

export const DigitalTwinOpsPanel: React.FC<{ architecture: ChipArchitecture }> = ({ architecture }) => {
  const twin = getDigitalTwinMetrics(architecture);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Factory className="text-indigo-400" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Fab Digital Twin Simulation</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Throughput, cycle time, bottleneck what-if analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Throughput</p>
          <p className="text-xl font-bold">{twin.throughput}<span className="text-xs text-zinc-500 ml-1">wph</span></p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Cycle Time</p>
          <p className="text-xl font-bold">{twin.cycleTime}<span className="text-xs text-zinc-500 ml-1">hrs</span></p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Queue Risk</p>
          <p className="text-xl font-bold text-amber-400">{twin.queueRisk}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Line Balance</p>
          <p className="text-xl font-bold text-emerald-400">{twin.lineBalance}%</p>
        </div>
      </div>

      <div className="grid gap-3">
        {twin.scenarioNotes.map((note, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
            {index === 0 ? <Clock3 size={16} className="text-amber-400 shrink-0" /> : index === 1 ? <BarChart3 size={16} className="text-emerald-400 shrink-0" /> : <GitBranch size={16} className="text-indigo-400 shrink-0" />}
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
