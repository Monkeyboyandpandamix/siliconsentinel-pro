import React from 'react';
import type { SimulationResponse } from '../types';

interface Props {
  simulation: SimulationResponse;
}

export function SimulationResults({ simulation }: Props) {
  const { thermal, signal, power, timing } = simulation;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Max Temperature"
          value={`${thermal.max_temp_c.toFixed(1)}°C`}
          sub={`${thermal.hotspot_count} hotspot${thermal.hotspot_count !== 1 ? 's' : ''}`}
          status={thermal.hotspot_count > 0 ? 'warning' : 'ok'}
        />
        <MetricCard
          label="Total Power"
          value={`${power.total_power_mw.toFixed(1)} mW`}
          sub={`${power.power_efficiency_pct.toFixed(0)}% efficiency`}
          status={power.power_efficiency_pct < 60 ? 'warning' : 'ok'}
        />
        <MetricCard
          label="Critical Path"
          value={`${timing.critical_path_delay_ns.toFixed(2)} ns`}
          sub={`Max ${timing.max_clock_mhz.toFixed(0)} MHz`}
          status={timing.timing_met ? 'ok' : 'critical'}
        />
        <MetricCard
          label="Signal Integrity"
          value={`${signal.worst_integrity_score.toFixed(1)}/100`}
          sub={`${signal.timing_violations} violations`}
          status={signal.timing_violations > 0 ? 'warning' : 'ok'}
        />
      </div>

      {/* Power breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Power Breakdown by Block</h3>
        <div className="space-y-2">
          {power.blocks.map(b => (
            <div key={b.block_id} className="flex items-center gap-3 text-xs">
              <span className="w-28 text-zinc-300 truncate font-medium">{b.block_name}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${(b.dynamic_power_mw / power.total_power_mw) * 100}%` }}
                  title={`Dynamic: ${b.dynamic_power_mw.toFixed(2)} mW`}
                />
                <div
                  className="h-full bg-amber-500/60"
                  style={{ width: `${(b.static_power_mw / power.total_power_mw) * 100}%` }}
                  title={`Static: ${b.static_power_mw.toFixed(2)} mW`}
                />
              </div>
              <span className="w-20 text-right text-zinc-400">{b.total_power_mw.toFixed(2)} mW</span>
              <span className="w-12 text-right text-zinc-600">{b.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-zinc-600 font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Dynamic</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/60 inline-block" /> Static (Leakage)</span>
        </div>
      </div>

      {/* Signal paths */}
      {signal.paths.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">
            Signal Paths ({signal.paths.length} total, {signal.paths.filter(p => p.is_critical).length} critical)
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {signal.paths.slice(0, 15).map((p, i) => (
              <div key={i} className={`flex items-center gap-3 text-xs px-2 py-1 rounded ${p.is_critical ? 'bg-red-500/10' : ''}`}>
                <span className="w-32 text-zinc-400">{p.from_block} → {p.to_block}</span>
                <span className="w-20 text-zinc-300">{p.delay_ps.toFixed(1)} ps</span>
                <span className={`w-16 ${p.integrity_score > 80 ? 'text-emerald-400' : p.integrity_score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {p.integrity_score.toFixed(0)}/100
                </span>
                <span className={`text-[10px] font-bold ${p.crosstalk_risk === 'HIGH' ? 'text-red-400' : p.crosstalk_risk === 'MEDIUM' ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {p.crosstalk_risk}
                </span>
                {p.is_critical && <span className="text-[10px] font-bold text-red-400 border border-red-500/30 px-1 rounded">CRITICAL</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Timing Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-[10px] text-zinc-500 font-mono">Setup Slack</span>
            <p className={`font-bold ${timing.setup_slack_ns >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {timing.setup_slack_ns >= 0 ? '+' : ''}{timing.setup_slack_ns.toFixed(3)} ns
            </p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-mono">Hold Slack</span>
            <p className={`font-bold ${timing.hold_slack_ns >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {timing.hold_slack_ns >= 0 ? '+' : ''}{timing.hold_slack_ns.toFixed(3)} ns
            </p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-mono">Max Clock</span>
            <p className="font-bold text-zinc-200">{timing.max_clock_mhz.toFixed(0)} MHz</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-mono">Timing Met</span>
            <p className={`font-bold ${timing.timing_met ? 'text-emerald-400' : 'text-red-400'}`}>
              {timing.timing_met ? 'YES' : 'NO'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, status }: { label: string; value: string; sub: string; status: 'ok' | 'warning' | 'critical' }) {
  const border = status === 'critical' ? 'border-red-500/30' : status === 'warning' ? 'border-amber-500/30' : 'border-zinc-800';
  return (
    <div className={`bg-zinc-900/50 border ${border} p-3 rounded-xl`}>
      <p className="text-[10px] text-zinc-500 font-mono uppercase">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
