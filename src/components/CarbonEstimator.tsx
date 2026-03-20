import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CarbonFootprint } from '../types';

interface Props {
  designId: number;
}

export const CarbonEstimator: React.FC<Props> = ({ designId }) => {
  const [data, setData] = useState<CarbonFootprint | null>(null);

  useEffect(() => {
    api.estimateCarbon(designId, { volume: 10000 })
      .then(d => setData(d as CarbonFootprint))
      .catch(() => {});
  }, [designId]);

  if (!data) return null;

  const breakdown = data.breakdown;
  const total = data.total_co2e_kg;
  const segments = [
    { label: 'Fabrication', value: breakdown.fabrication_kg, color: 'bg-indigo-500' },
    { label: 'Process Gases', value: breakdown.process_gases_kg, color: 'bg-purple-500' },
    { label: 'Packaging', value: breakdown.packaging_kg, color: 'bg-emerald-500' },
    { label: 'Testing', value: breakdown.testing_kg, color: 'bg-amber-500' },
    { label: 'Shipping', value: breakdown.shipping_kg, color: 'bg-cyan-500' },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Carbon Footprint</h3>
      <div className="text-center mb-3">
        <p className="text-2xl font-bold text-zinc-200">{total.toFixed(0)} <span className="text-xs text-zinc-500">kg CO₂e</span></p>
        <p className="text-xs text-zinc-500">{data.volume.toLocaleString()} units · {data.wafers_needed} wafers</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">Per chip: {data.co2e_per_chip_kg.toFixed(4)} kg · Fab: {data.fab_country} ({data.carbon_intensity_label})</p>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex mb-2">
        {segments.map(s => (
          <div key={s.label} className={`h-full ${s.color}`} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value.toFixed(1)} kg`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${s.color} inline-block`} />
            <span className="text-zinc-500">{s.label}</span>
            <span className="text-zinc-400 ml-auto font-mono">{s.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
