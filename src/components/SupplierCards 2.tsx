import React from 'react';
import type { FabRecommendation } from '../types';

interface Props {
  fabs: FabRecommendation[];
}

export function SupplierCards({ fabs }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase font-mono text-zinc-400">Fab Recommendations (ranked by overall score)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fabs.map((fab, i) => (
          <div key={i} className={`bg-zinc-900/50 border rounded-xl p-4 ${i === 0 ? 'border-indigo-500/40' : 'border-zinc-800'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-sm">{fab.name}</h4>
                <p className="text-xs text-zinc-500">{fab.location}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-indigo-400">{fab.overall_score}</span>
                <span className="text-[10px] text-zinc-600 block">/100</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <ScoreBar label="Capability" score={fab.capability_match} />
              <ScoreBar label="Cost" score={fab.cost_score} />
              <ScoreBar label="Risk" score={fab.risk_score} />
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {fab.process_nodes.map(n => (
                <span key={n} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">{n}</span>
              ))}
            </div>

            <div className="flex justify-between text-xs text-zinc-500">
              <span>{fab.capacity_status}</span>
              <span>${fab.estimated_cost_per_wafer.toLocaleString()}/wafer</span>
              <span>{fab.lead_time_weeks}w lead</span>
            </div>

            {fab.strengths.length > 0 && (
              <ul className="text-[10px] text-zinc-600 mt-2 list-disc list-inside">
                {fab.strengths.slice(0, 2).map((s, si) => <li key={si}>{s}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-600 font-mono mb-0.5">{label}</div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-[10px] text-zinc-500 font-mono text-right">{score}</div>
    </div>
  );
}
