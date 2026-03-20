import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CarbonFootprint } from '../types';

interface Props {
  designId: number;
}

interface EqRow {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}

function fmtNum(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export const CarbonEstimator: React.FC<Props> = ({ designId }) => {
  const [data, setData] = useState<CarbonFootprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.estimateCarbon(designId, { volume: 10000 })
      .then(d => setData(d as CarbonFootprint))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [designId]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/3 mb-3" />
        <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
        <div className="h-2 bg-zinc-800 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  const { breakdown, equivalents: eq } = data;
  const total = data.total_co2e_kg;

  const segments = [
    { label: 'Fabrication',    value: breakdown.fabrication_kg,   color: 'bg-indigo-500' },
    { label: 'Process Gases',  value: breakdown.process_gases_kg,  color: 'bg-purple-500' },
    { label: 'Packaging',      value: breakdown.packaging_kg,      color: 'bg-emerald-500' },
    { label: 'Testing',        value: breakdown.testing_kg,        color: 'bg-amber-500' },
    { label: 'Shipping',       value: breakdown.shipping_kg,       color: 'bg-cyan-500' },
  ];

  const intensityColor =
    data.carbon_intensity_label === 'LOW'    ? 'text-emerald-400' :
    data.carbon_intensity_label === 'MEDIUM' ? 'text-amber-400'   : 'text-red-400';

  const eqRows: EqRow[] = [
    {
      icon: '🌳',
      label: 'Trees needed',
      value: fmtNum(eq.trees_absorb_1yr, 1),
      sub:   'trees absorbing CO₂ for 1 full year',
      color: 'border-emerald-500/30 bg-emerald-500/5',
    },
    {
      icon: '💡',
      label: '60 W bulb runtime',
      value: fmtNum(eq.bulb_60w_hours),
      sub:   `hours — or ${fmtNum(eq.led_9w_hours)} hours on a 9 W LED`,
      color: 'border-amber-500/30 bg-amber-500/5',
    },
    {
      icon: '🚗',
      label: 'Car miles driven',
      value: fmtNum(eq.car_miles_driven),
      sub:   'miles in an average passenger car (EPA: 404 g CO₂/mile)',
      color: 'border-zinc-600/40 bg-zinc-800/30',
    },
    {
      icon: '📱',
      label: 'Smartphone charges',
      value: fmtNum(eq.smartphone_charges),
      sub:   'full charges of an average phone (11.4 Wh each)',
      color: 'border-blue-500/30 bg-blue-500/5',
    },
    {
      icon: '🏠',
      label: 'Home electricity',
      value: fmtNum(eq.home_electricity_days, 1),
      sub:   'days powering a typical US home (28.9 kWh/day — EIA 2022)',
      color: 'border-violet-500/30 bg-violet-500/5',
    },
    {
      icon: '✈️',
      label: 'NYC → London flights',
      value: eq.flights_nyc_london < 1
        ? `1 flight = ${fmtNum(1 / eq.flights_nyc_london, 0)}× your run`
        : fmtNum(eq.flights_nyc_london, 2),
      sub:   'economy class per ICAO Carbon Calculator (585 kg CO₂/passenger)',
      color: 'border-sky-500/30 bg-sky-500/5',
    },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs uppercase font-mono text-zinc-400 tracking-widest">Carbon Footprint</h3>
          <div className="flex items-center gap-2">
            {data.carbon_intensity_live && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/30 text-emerald-400">
                LIVE GRID DATA
              </span>
            )}
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              data.carbon_intensity_label === 'LOW'    ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' :
              data.carbon_intensity_label === 'MEDIUM' ? 'bg-amber-900/30 border-amber-500/30 text-amber-400' :
                                                         'bg-red-900/30 border-red-500/30 text-red-400'
            }`}>
              {data.carbon_intensity_label} INTENSITY
            </span>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <p className="text-2xl font-bold text-zinc-100 leading-none">
              {fmtNum(total, 1)}
              <span className="text-sm text-zinc-500 ml-1.5 font-normal">kg CO₂e</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {data.volume.toLocaleString()} units · {data.wafers_needed} wafers · {fmtNum(data.total_energy_kwh)} kWh total
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-mono text-zinc-300">{data.co2e_per_chip_kg.toFixed(4)} <span className="text-zinc-600">kg/chip</span></p>
            <p className={`text-[10px] font-mono ${intensityColor}`}>
              {data.fab_country} · {(data.carbon_intensity_kwh * 1000).toFixed(0)} g CO₂/kWh
              {data.carbon_intensity_live && <span className="text-zinc-500"> (live)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="px-4 pt-3">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex mb-2">
          {segments.map(s => (
            <div
              key={s.label}
              className={`h-full ${s.color} transition-all`}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value.toFixed(1)} kg`}
            />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1 text-[9px] mb-3">
          {segments.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s.color} inline-block`} />
              <span className="text-zinc-600 text-center leading-tight">{s.label}</span>
              <span className="text-zinc-400 font-mono">{s.value.toFixed(0)} kg</span>
            </div>
          ))}
        </div>

        {/* Renewable pct from World Bank */}
        {data.renewable_pct !== null && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40">
            <span className="text-xs">⚡</span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-zinc-400">Renewable energy mix · {data.fab_country}</span>
                <span className="text-[10px] font-mono text-emerald-400">{data.renewable_pct.toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(data.renewable_pct, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] text-zinc-600 font-mono">World Bank</span>
          </div>
        )}
      </div>

      {/* Real-world equivalents */}
      <div className="px-4 pb-4">
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-2">
          What does this equal in real life?
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {eqRows.map(row => (
            <div
              key={row.label}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${row.color}`}
            >
              <span className="text-lg leading-none flex-shrink-0" role="img">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 font-mono">{row.label}</p>
                <p className="text-[9px] text-zinc-600 leading-tight truncate">{row.sub}</p>
              </div>
              <span className="text-sm font-bold text-zinc-200 font-mono flex-shrink-0">{row.value}</span>
            </div>
          ))}
        </div>

        <p className="text-[8px] text-zinc-700 mt-2 text-center">
          Sources: EPA Greenhouse Gas Equivalencies (2024) · IEA · ICAO Carbon Calculator · EIA 2022 ·
          {data.carbon_intensity_live ? ' Electricity Maps live grid · ' : ' IEA grid intensity · '}
          World Bank Open Data
        </p>
      </div>
    </div>
  );
};
