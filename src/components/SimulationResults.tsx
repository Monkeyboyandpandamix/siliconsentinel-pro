import React from 'react';
import type { SimulationResponse } from '../types';

interface Props {
  simulation: SimulationResponse;
  processNode?: string;
  domain?: string;
  totalAreaMm2?: number;
}

// Industry-typical values by process node (approximate medians from published literature)
const NODE_BENCHMARKS: Record<string, {
  typical_power_density_mw_per_mm2: number;
  typical_max_clock_mhz: number;
  typical_leakage_pct: number;
  max_temp_c: number;
  description: string;
}> = {
  '5nm':  { typical_power_density_mw_per_mm2: 100, typical_max_clock_mhz: 4000, typical_leakage_pct: 35, max_temp_c: 95,  description: 'HPC/Mobile SoC (e.g. Apple M-series, Qualcomm SD8)' },
  '7nm':  { typical_power_density_mw_per_mm2: 70,  typical_max_clock_mhz: 3000, typical_leakage_pct: 28, max_temp_c: 100, description: 'GPU/CPU flagship (e.g. AMD Zen2, Kirin 9000)' },
  '14nm': { typical_power_density_mw_per_mm2: 40,  typical_max_clock_mhz: 1800, typical_leakage_pct: 22, max_temp_c: 105, description: 'Mainstream CPU/GPU (e.g. Intel Skylake, NXP i.MX8)' },
  '28nm': { typical_power_density_mw_per_mm2: 22,  typical_max_clock_mhz: 900,  typical_leakage_pct: 15, max_temp_c: 110, description: 'Industrial SoC / Zynq / STM32MP1 class' },
  '65nm': { typical_power_density_mw_per_mm2: 10,  typical_max_clock_mhz: 400,  typical_leakage_pct: 8,  max_temp_c: 115, description: 'MCU / Power IC / FPGA (e.g. Cyclone V, STM32F4)' },
  '180nm':{ typical_power_density_mw_per_mm2: 4,   typical_max_clock_mhz: 120,  typical_leakage_pct: 3,  max_temp_c: 125, description: 'Automotive MCU / analog mixed-signal (e.g. Renesas RL78)' },
};

function getBenchmark(processNode?: string) {
  if (!processNode) return null;
  const key = Object.keys(NODE_BENCHMARKS).find(k => processNode.includes(k));
  return key ? { node: key, ...NODE_BENCHMARKS[key] } : null;
}

function BenchmarkBar({
  label, myValue, benchValue, unit, lowerIsBetter = false
}: {
  label: string; myValue: number; benchValue: number; unit: string; lowerIsBetter?: boolean;
}) {
  const ratio = myValue / Math.max(benchValue, 0.001);
  const pct = Math.min(ratio * 50, 100); // Scale so 2× bench = 100%
  const benchPct = 50; // Benchmark sits at 50%
  const isBetter = lowerIsBetter ? ratio < 1 : ratio > 1;
  const barColor = isBetter ? 'bg-emerald-500' : ratio > 1.25 || ratio < 0.75 ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">
          <span className={isBetter ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
            {myValue.toFixed(1)} {unit}
          </span>
          <span className="text-zinc-600"> vs {benchValue} {unit} typical</span>
        </span>
      </div>
      <div className="relative h-3 bg-zinc-800 rounded-full overflow-visible">
        {/* Benchmark marker */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10" style={{ left: `${benchPct}%` }} title="Industry typical" />
        {/* My value bar */}
        <div className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[8px] text-zinc-700 font-mono">
        <span>0</span>
        <span className="ml-[46%]">▲ Typical</span>
        <span>2×</span>
      </div>
    </div>
  );
}

export function SimulationResults({ simulation, processNode, domain: _domain, totalAreaMm2 }: Props) {
  const { thermal, signal, power, timing } = simulation;
  const bench = getBenchmark(processNode);

  const powerDensity = totalAreaMm2 && totalAreaMm2 > 0 ? power.total_power_mw / totalAreaMm2 : null;
  const leakagePct = (power.total_static_mw / Math.max(power.total_power_mw, 1)) * 100;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Max Temperature"
          value={`${thermal.max_temp_c.toFixed(1)}°C`}
          sub={`${thermal.hotspot_count} hotspot${thermal.hotspot_count !== 1 ? 's' : ''}`}
          status={thermal.hotspot_count > 0 ? (thermal.hotspot_count > 2 ? 'critical' : 'warning') : 'ok'}
        />
        <MetricCard
          label="Total Power"
          value={`${power.total_power_mw >= 1000 ? (power.total_power_mw / 1000).toFixed(2) + ' W' : power.total_power_mw.toFixed(1) + ' mW'}`}
          sub={`${power.power_efficiency_pct.toFixed(0)}% efficiency`}
          status={power.power_efficiency_pct < 55 ? 'critical' : power.power_efficiency_pct < 70 ? 'warning' : 'ok'}
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
          sub={`${signal.timing_violations} violation${signal.timing_violations !== 1 ? 's' : ''}`}
          status={signal.timing_violations > 2 ? 'critical' : signal.timing_violations > 0 ? 'warning' : 'ok'}
        />
      </div>

      {/* Industry Benchmarks */}
      {bench && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xs uppercase font-mono text-zinc-400 tracking-wider">Industry Benchmarks — {bench.node} Process Node</h3>
              <p className="text-[10px] text-zinc-600 mt-0.5">Reference: {bench.description}</p>
            </div>
            <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full font-mono">
              ▲ = typical peer chip
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {powerDensity !== null && (
              <BenchmarkBar
                label="Power Density"
                myValue={powerDensity}
                benchValue={bench.typical_power_density_mw_per_mm2}
                unit="mW/mm²"
                lowerIsBetter
              />
            )}
            <BenchmarkBar
              label="Max Clock Frequency"
              myValue={timing.max_clock_mhz}
              benchValue={bench.typical_max_clock_mhz}
              unit="MHz"
              lowerIsBetter={false}
            />
            <BenchmarkBar
              label="Leakage / Static Power"
              myValue={leakagePct}
              benchValue={bench.typical_leakage_pct}
              unit="%"
              lowerIsBetter
            />
            <BenchmarkBar
              label="Junction Temperature"
              myValue={thermal.max_temp_c}
              benchValue={bench.max_temp_c}
              unit="°C"
              lowerIsBetter
            />
          </div>

          {/* Overall benchmark verdict */}
          <div className="mt-4 p-3 bg-zinc-950/60 rounded-lg border border-zinc-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                {
                  label: 'Power Density',
                  verdict: powerDensity !== null && powerDensity < bench.typical_power_density_mw_per_mm2 * 0.85 ? 'Excellent' : powerDensity !== null && powerDensity < bench.typical_power_density_mw_per_mm2 * 1.15 ? 'On-Par' : 'High',
                  good: powerDensity !== null && powerDensity < bench.typical_power_density_mw_per_mm2 * 1.15,
                },
                {
                  label: 'Clock Speed',
                  verdict: timing.max_clock_mhz > bench.typical_max_clock_mhz * 1.1 ? 'Above Avg' : timing.max_clock_mhz > bench.typical_max_clock_mhz * 0.85 ? 'On-Par' : 'Below Avg',
                  good: timing.max_clock_mhz > bench.typical_max_clock_mhz * 0.85,
                },
                {
                  label: 'Leakage',
                  verdict: leakagePct < bench.typical_leakage_pct * 0.85 ? 'Low ✓' : leakagePct < bench.typical_leakage_pct * 1.15 ? 'Typical' : 'High',
                  good: leakagePct < bench.typical_leakage_pct * 1.15,
                },
                {
                  label: 'Thermal',
                  verdict: thermal.max_temp_c < bench.max_temp_c * 0.75 ? 'Cool ✓' : thermal.max_temp_c < bench.max_temp_c * 0.9 ? 'Normal' : 'Hot',
                  good: thermal.max_temp_c < bench.max_temp_c * 0.9,
                },
              ].map(v => (
                <div key={v.label}>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase">{v.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${v.good ? 'text-emerald-400' : 'text-red-400'}`}>{v.verdict}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Power breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs uppercase font-mono text-zinc-400">Power by Block</h3>
          <div className="flex gap-3 text-[9px] text-zinc-600 font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Dynamic</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/60 inline-block" /> Static</span>
          </div>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {power.blocks.sort((a, b) => b.total_power_mw - a.total_power_mw).map(b => (
            <div key={b.block_id} className="flex items-center gap-3 text-xs">
              <span className="w-28 text-zinc-300 truncate font-medium font-mono">{b.block_name}</span>
              <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
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
              <span className="w-20 text-right text-zinc-400 font-mono">{b.total_power_mw.toFixed(1)} mW</span>
              <span className="w-10 text-right text-zinc-600 font-mono">{b.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-3 text-[10px] text-zinc-500 font-mono">
          <span>Dynamic: {power.total_dynamic_mw.toFixed(1)} mW ({((power.total_dynamic_mw / Math.max(power.total_power_mw, 1)) * 100).toFixed(0)}%)</span>
          <span>Static: {power.total_static_mw.toFixed(1)} mW ({leakagePct.toFixed(0)}%)</span>
          <span className="ml-auto">Efficiency: {power.power_efficiency_pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Signal paths */}
      {signal.paths.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">
            Signal Paths
            <span className="text-zinc-600 normal-case ml-1 font-sans">({signal.paths.length} total, {signal.paths.filter(p => p.is_critical).length} critical)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="text-[9px] text-zinc-600 font-mono uppercase border-b border-zinc-800">
                  <th className="text-left pb-1.5">Route</th>
                  <th className="text-right pb-1.5">Delay</th>
                  <th className="text-right pb-1.5">Integrity</th>
                  <th className="text-center pb-1.5">Crosstalk</th>
                  <th className="text-center pb-1.5">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {signal.paths.slice(0, 12).map((p, i) => (
                  <tr key={i} className={`text-xs ${p.is_critical ? 'bg-red-950/20' : ''} hover:bg-zinc-800/20`}>
                    <td className="py-1.5 text-zinc-400 font-mono">{p.from_block} → {p.to_block}</td>
                    <td className="py-1.5 text-right text-zinc-300 font-mono">{p.delay_ps.toFixed(0)} ps</td>
                    <td className="py-1.5 text-right">
                      <span className={`font-mono ${p.integrity_score > 80 ? 'text-emerald-400' : p.integrity_score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {p.integrity_score.toFixed(0)}/100
                      </span>
                    </td>
                    <td className="py-1.5 text-center">
                      <span className={`text-[9px] font-bold ${p.crosstalk_risk === 'HIGH' ? 'text-red-400' : p.crosstalk_risk === 'MEDIUM' ? 'text-amber-400' : 'text-zinc-600'}`}>
                        {p.crosstalk_risk}
                      </span>
                    </td>
                    <td className="py-1.5 text-center">
                      {p.is_critical && <span className="text-[9px] font-bold text-red-400 border border-red-500/30 px-1 py-0.5 rounded">CRIT</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timing */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Timing Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TimingCell label="Setup Slack" value={`${timing.setup_slack_ns >= 0 ? '+' : ''}${timing.setup_slack_ns.toFixed(3)} ns`} ok={timing.setup_slack_ns >= 0} />
          <TimingCell label="Hold Slack" value={`${timing.hold_slack_ns >= 0 ? '+' : ''}${timing.hold_slack_ns.toFixed(3)} ns`} ok={timing.hold_slack_ns >= 0} />
          <TimingCell label="Max Clock" value={`${timing.max_clock_mhz.toFixed(0)} MHz`} />
          <TimingCell label="Timing Met" value={timing.timing_met ? 'YES ✓' : 'NO ✗'} ok={timing.timing_met} />
        </div>
        {!timing.timing_met && (
          <div className="mt-3 px-3 py-2 bg-red-950/30 border border-red-500/20 rounded-lg text-[11px] text-red-300">
            ⚠ Timing closure failed — reduce critical path depth, add pipeline stages, or lower target clock.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, status }: { label: string; value: string; sub: string; status: 'ok' | 'warning' | 'critical' }) {
  const border = status === 'critical' ? 'border-red-500/30 bg-red-950/10' : status === 'warning' ? 'border-amber-500/30 bg-amber-950/10' : 'border-zinc-800';
  const valueColor = status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-zinc-100';
  return (
    <div className={`bg-zinc-900/50 border ${border} p-3 rounded-xl`}>
      <p className="text-[10px] text-zinc-500 font-mono uppercase">{label}</p>
      <p className={`text-base font-bold mt-0.5 font-mono ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}

function TimingCell({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? 'text-zinc-200' : ok ? 'text-emerald-400' : 'text-red-400';
  return (
    <div>
      <span className="text-[10px] text-zinc-500 font-mono uppercase">{label}</span>
      <p className={`font-bold font-mono mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
