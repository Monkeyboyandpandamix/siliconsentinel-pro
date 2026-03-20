import React from 'react';
import type { PredictionsResponse } from '../types';

interface Props {
  predictions: PredictionsResponse;
}

export function YieldForecast({ predictions }: Props) {
  const { yield: yieldData, defect_zones, delay_forecast, shortage_risks } = predictions;

  const yieldColorClass = yieldData.yield_pct >= 80 ? 'text-emerald-400' : yieldData.yield_pct >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Yield gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl text-center">
          <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Estimated Yield ({yieldData.yield_model})</p>
          <p className={`text-4xl font-bold ${yieldColorClass}`}>{yieldData.yield_pct.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500 mt-1">{yieldData.confidence_interval} confidence</p>
          <p className="text-[10px] text-zinc-600 mt-1">Range: {yieldData.yield_low_pct}% – {yieldData.yield_high_pct}%</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Wafer Economics</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Dies/Wafer</span><span className="font-mono">{yieldData.dies_per_wafer}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Good Dies</span><span className="font-mono text-emerald-400">{yieldData.good_dies_per_wafer}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Wafer Cost</span><span className="font-mono">${yieldData.fab_cost_per_wafer.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Cost/Good Die</span><span className="font-mono font-bold">${yieldData.fab_cost_per_good_die.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Delay Forecast</p>
          <p className="text-2xl font-bold">{delay_forecast.estimated_total_weeks} weeks</p>
          <RiskLabel level={delay_forecast.risk_level} />
          {delay_forecast.critical_items.length > 0 && (
            <p className="text-[10px] text-zinc-600 mt-1">{delay_forecast.critical_items.length} critical lead-time items</p>
          )}
        </div>
      </div>

      {/* Defect zone risk */}
      {defect_zones.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Defect Zone Risk Map</h3>
          <div className="space-y-2">
            {defect_zones.map((z, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <RiskLabel level={z.risk_level} />
                <div className="flex-1">
                  <span className="text-zinc-200 font-medium">{z.block_name}</span>
                  <span className="text-zinc-600 ml-2">Score: {z.risk_score}/100</span>
                  {z.risk_factors.length > 0 && (
                    <ul className="text-xs text-zinc-500 mt-0.5 list-disc list-inside">
                      {z.risk_factors.map((f, fi) => <li key={fi}>{f}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortage risks */}
      {shortage_risks.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Component Shortage Risks</h3>
          <div className="space-y-2">
            {shortage_risks.map((r, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <RiskLabel level={r.risk_level} />
                <div className="flex-1">
                  <span className="text-zinc-200 font-medium">{r.part_number}</span>
                  <span className="text-zinc-500 ml-2 text-xs">{r.description}</span>
                  <ul className="text-xs text-zinc-500 mt-0.5 list-disc list-inside">
                    {r.risk_factors.map((f, fi) => <li key={fi}>{f}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskLabel({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-400',
    MEDIUM: 'bg-amber-500/20 text-amber-400',
    HIGH: 'bg-orange-500/20 text-orange-400',
    CRITICAL: 'bg-red-500/20 text-red-400',
    WARNING: 'bg-amber-500/20 text-amber-400',
    OK: 'bg-emerald-500/20 text-emerald-400',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${colors[level] || colors.MEDIUM}`}>{level}</span>;
}
