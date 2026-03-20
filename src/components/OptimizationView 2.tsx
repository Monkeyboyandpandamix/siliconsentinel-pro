import React from 'react';
import type { OptimizationResponse } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface Props {
  optimization: OptimizationResponse;
}

export function OptimizationView({ optimization }: Props) {
  const { metrics_before: before, metrics_after: after, ppca_before, ppca_after, changes_summary } = optimization;

  const radarData = [
    { subject: 'Power', before: ppca_before.power, after: ppca_after.power },
    { subject: 'Performance', before: ppca_before.performance, after: ppca_after.performance },
    { subject: 'Cost', before: ppca_before.cost, after: ppca_after.cost },
    { subject: 'Area', before: ppca_before.area, after: ppca_after.area },
  ];

  const deltas = [
    { label: 'Power', before: before.total_power_mw, after: after.total_power_mw, unit: 'mW', lowerBetter: true },
    { label: 'Area', before: before.total_area_mm2, after: after.total_area_mm2, unit: 'mm²', lowerBetter: true },
    { label: 'Yield', before: before.estimated_yield_pct, after: after.estimated_yield_pct, unit: '%', lowerBetter: false },
    { label: 'Cost/Unit', before: before.estimated_cost_per_unit, after: after.estimated_cost_per_unit, unit: '$', lowerBetter: true },
  ];

  return (
    <div className="space-y-4">
      {/* Before / After comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-500 mb-3">Before Optimization</h3>
          <div className="space-y-2 text-sm">
            {deltas.map(d => (
              <div key={d.label} className="flex justify-between">
                <span className="text-zinc-400">{d.label}</span>
                <span className="text-zinc-300 font-mono">{d.before.toFixed(2)} {d.unit}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-indigo-500/30 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-indigo-400 mb-3">After Optimization</h3>
          <div className="space-y-2 text-sm">
            {deltas.map(d => {
              const delta = d.after - d.before;
              const pct = d.before !== 0 ? (delta / d.before * 100) : 0;
              const improved = d.lowerBetter ? delta < 0 : delta > 0;
              return (
                <div key={d.label} className="flex justify-between items-center">
                  <span className="text-zinc-400">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-mono font-medium">{d.after.toFixed(2)} {d.unit}</span>
                    <span className={`text-[10px] font-bold ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PPCA Radar */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-xs uppercase font-mono text-zinc-400 mb-2">PPCA Tradeoff (Power / Performance / Cost / Area)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#999', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#666', fontSize: 9 }} />
              <Radar name="Before" dataKey="before" stroke="#666" fill="#666" fillOpacity={0.15} />
              <Radar name="After" dataKey="after" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-zinc-500 font-mono justify-center">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" /> Before</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> After</span>
        </div>
      </div>

      {/* Changes */}
      {changes_summary.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Optimization Changes</h3>
          <ol className="space-y-1.5 text-sm text-zinc-300 list-decimal list-inside">
            {changes_summary.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
