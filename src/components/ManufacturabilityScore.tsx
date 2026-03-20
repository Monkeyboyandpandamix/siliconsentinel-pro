import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ManufacturabilityScore as MfgScore } from '../types';

interface Props {
  designId: number;
}

export function ManufacturabilityScore({ designId }: Props) {
  const [data, setData] = useState<MfgScore | null>(null);

  useEffect(() => {
    api.getManufacturability(designId)
      .then(d => setData(d as MfgScore))
      .catch(() => {});
  }, [designId]);

  if (!data) return null;

  const verdictColor = data.verdict === 'EXCELLENT' ? 'emerald' : data.verdict === 'GOOD' ? 'indigo' : data.verdict === 'FAIR' ? 'amber' : 'red';

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Manufacturability Score</h3>
      <div className="text-center mb-3">
        <p className={`text-3xl font-bold text-${verdictColor}-400`}>{data.overall_score.toFixed(0)}<span className="text-base text-zinc-500">/100</span></p>
        <p className={`text-sm font-bold text-${verdictColor}-400 mt-0.5`}>{data.label}</p>
      </div>
      <div className="space-y-1.5">
        {Object.entries(data.components).map(([key, val]) => {
          const comp = val as { score: number; weight: string };
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-36 text-zinc-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${comp.score >= 70 ? 'bg-emerald-500' : comp.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-zinc-400">{comp.score.toFixed(0)}</span>
              <span className="w-8 text-zinc-600 text-[10px]">{comp.weight}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
