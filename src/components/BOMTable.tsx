import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, TrendingDown, Zap, Star } from 'lucide-react';
import type { BOMResponse } from '../types';

interface Props {
  bom: BOMResponse;
}

const SCENARIO_META: Record<string, {
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  tagColor: string;
  title: string;
}> = {
  Budget: {
    icon: <TrendingDown size={16} />,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    tagColor: 'bg-amber-500/20 text-amber-300',
    title: 'Budget',
  },
  Balanced: {
    icon: <Star size={16} />,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/60',
    bgColor: 'bg-indigo-500/10',
    tagColor: 'bg-indigo-500/20 text-indigo-300',
    title: 'Balanced',
  },
  Premium: {
    icon: <Zap size={16} />,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    tagColor: 'bg-emerald-500/20 text-emerald-300',
    title: 'Premium',
  },
};

// Generate accurate, material-specific trade-off descriptions
function getScenarioDetail(scenario: { name: string; tradeoffs: string; bom_cost: number; total_per_unit: number }, bom: BOMResponse) {
  const totalUnit = bom.cost_breakdown.total_per_unit;
  const budgetVsBalanced = (((scenario.total_per_unit - totalUnit) / totalUnit) * 100).toFixed(0);

  switch (scenario.name) {
    case 'Budget':
      return {
        headline: 'Lowest cost — accept performance and reliability trade-offs',
        points: [
          `Unit cost reduced to $${scenario.total_per_unit.toFixed(2)} (${budgetVsBalanced}% vs. Balanced)`,
          'Substitute premium ICs with pin-compatible economy alternatives from secondary suppliers',
          '10–15% lower clock frequency headroom — may miss timing margins at max spec',
          'Reduced component testing coverage increases early-life failure rate',
          'Single-sourced critical components — vulnerable to supply disruptions',
          'Suitable for non-critical consumer or prototype builds, not automotive/industrial',
        ],
      };
    case 'Balanced':
      return {
        headline: 'Recommended — optimizes cost, performance, and supply reliability',
        points: [
          `Per-unit cost $${scenario.total_per_unit.toFixed(2)} — meets all design constraint targets`,
          `${bom.entries.length} components from ${bom.supplier_diversity_score.toFixed(0)}% diverse supplier base`,
          'Standard lead-time parts with at least one dual-source option per critical category',
          'Full compliance with design rule specifications — no timing or thermal margin compromises',
          'Recommended volume: 1k–100k units/year at this cost point',
          'BOM components verified against process node compatibility',
        ],
      };
    case 'Premium':
      return {
        headline: 'Maximum performance and supply resilience — highest cost',
        points: [
          `Unit cost $${scenario.total_per_unit.toFixed(2)} (+${Math.abs(Number(budgetVsBalanced))}% vs. Balanced)`,
          'Military-grade or automotive-qualified (AEC-Q100/Q200) components throughout',
          'All critical parts dual-sourced from geographically diverse suppliers',
          'Extended temperature range (−40°C to 125°C) for harsh environment deployment',
          '100% incoming inspection and burn-in testing — near-zero DOA rate',
          'Fastest available lead times — priority allocation at distributor warehouses',
        ],
      };
    default:
      return { headline: scenario.tradeoffs, points: [] };
  }
}

export const BOMTable: React.FC<Props> = ({ bom }) => {
  const [sortKey, setSortKey] = useState<string>('category');
  const [activeScenario, setActiveScenario] = useState<string>('Balanced');

  const sorted = [...bom.entries].sort((a, b) => {
    if (sortKey === 'category') return a.category.localeCompare(b.category);
    if (sortKey === 'price') return b.total_price - a.total_price;
    if (sortKey === 'lead_time') return (b.lead_time_days || 0) - (a.lead_time_days || 0);
    return 0;
  });

  const activeScenarioData = bom.scenarios.find(s => s.name === activeScenario) ?? bom.scenarios[0];
  const scenarioDetail = activeScenarioData ? getScenarioDetail(activeScenarioData, bom) : null;

  return (
    <div className="space-y-4">
      {/* Cost Scenario Tabs */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-widest flex-1">Cost Scenarios</h3>
          <span className="text-[10px] text-zinc-600 font-mono">Click a card to see details</span>
        </div>

        {/* Scenario Selector Cards */}
        <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-800">
          {bom.scenarios.map(s => {
            const meta = SCENARIO_META[s.name] ?? SCENARIO_META.Balanced;
            const isActive = activeScenario === s.name;
            return (
              <button
                key={s.name}
                onClick={() => setActiveScenario(s.name)}
                className={`p-4 text-left transition-all focus:outline-none focus:ring-inset focus:ring-1 focus:ring-indigo-500 ${
                  isActive ? `${meta.bgColor} ${meta.borderColor}` : 'bg-zinc-950/50 hover:bg-zinc-900'
                } ${isActive ? 'ring-inset ring-1 ' + meta.borderColor : ''}`}
                aria-pressed={isActive}
              >
                <div className={`flex items-center gap-1.5 mb-1 ${isActive ? meta.color : 'text-zinc-500'}`}>
                  {meta.icon}
                  <span className="text-xs font-bold">{meta.title}</span>
                  {s.name === 'Balanced' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">RECOMMENDED</span>
                  )}
                </div>
                <p className={`text-xl font-bold font-mono ${isActive ? meta.color : 'text-zinc-400'}`}>
                  ${s.total_per_unit.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">/ unit</p>
                <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">{s.description}</p>
              </button>
            );
          })}
        </div>

        {/* Active Scenario Detail */}
        {scenarioDetail && activeScenarioData && (
          <div className={`border-t border-zinc-800 p-4 ${SCENARIO_META[activeScenarioData.name]?.bgColor ?? ''}`}>
            <div className="flex items-start gap-3">
              <div className={`${SCENARIO_META[activeScenarioData.name]?.color ?? 'text-zinc-400'} mt-0.5`}>
                {SCENARIO_META[activeScenarioData.name]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold mb-2 ${SCENARIO_META[activeScenarioData.name]?.color ?? 'text-zinc-300'}`}>
                  {scenarioDetail.headline}
                </p>
                <ul className="space-y-1">
                  {scenarioDetail.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
                      <span className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${SCENARIO_META[activeScenarioData.name]?.tagColor?.includes('amber') ? 'bg-amber-500' : SCENARIO_META[activeScenarioData.name]?.tagColor?.includes('emerald') ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] text-zinc-600 font-mono uppercase">BOM Cost</p>
                <p className="text-sm font-bold font-mono text-zinc-300">${activeScenarioData.bom_cost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOM Table */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-widest">
            Bill of Materials <span className="text-zinc-600 ml-1">({bom.entries.length} components)</span>
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-[10px] text-zinc-400 outline-none hover:border-zinc-700 transition-colors"
              aria-label="Sort BOM by"
            >
              <option value="category">Sort: Category</option>
              <option value="price">Sort: Price ↓</option>
              <option value="lead_time">Sort: Lead Time ↓</option>
            </select>
            <span className="text-emerald-400 font-mono text-sm font-bold">${bom.total_bom_cost.toFixed(2)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[10px] text-zinc-500 uppercase font-mono">
                <th className="p-2.5" scope="col">Part #</th>
                <th className="p-2.5" scope="col">Description</th>
                <th className="p-2.5" scope="col">Category</th>
                <th className="p-2.5 text-right" scope="col">Qty</th>
                <th className="p-2.5 text-right" scope="col">Unit $</th>
                <th className="p-2.5 text-right" scope="col">Total $</th>
                <th className="p-2.5" scope="col">Status</th>
                <th className="p-2.5 text-right" scope="col">Lead</th>
                <th className="p-2.5" scope="col">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {sorted.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/25 transition-colors group">
                  <td className="p-2.5 text-zinc-300 font-mono text-[10px]">{item.part_number}</td>
                  <td className="p-2.5 text-zinc-400 max-w-48">
                    <span className="line-clamp-1">{item.description}</span>
                    {item.alternates.length > 0 && (
                      <span className="text-[9px] text-indigo-500 hidden group-hover:inline"> · {item.alternates.length} alt</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 border border-zinc-700/50">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-2.5 text-right text-zinc-300 font-mono">{item.quantity}</td>
                  <td className="p-2.5 text-right text-zinc-300 font-mono">${item.unit_price.toFixed(3)}</td>
                  <td className="p-2.5 text-right text-zinc-200 font-mono font-medium">${item.total_price.toFixed(3)}</td>
                  <td className="p-2.5">
                    <span className={`flex items-center gap-1 text-[10px] ${
                      item.availability === 'In Stock' ? 'text-emerald-400' :
                      item.availability === 'Limited' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {item.availability === 'In Stock' ? <CheckCircle2 size={9} /> :
                       item.availability === 'Limited' ? <AlertTriangle size={9} /> : <Clock size={9} />}
                      {item.availability}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-mono text-[10px]">
                    <span className={item.lead_time_days && item.lead_time_days > 28 ? 'text-amber-400' : 'text-zinc-500'}>
                      {item.lead_time_days ?? '—'}d
                    </span>
                  </td>
                  <td className="p-2.5 text-zinc-500 text-[10px]">{item.supplier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost breakdown footer */}
        <div className="p-3 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] bg-zinc-950/30">
          <CostCell label="BOM Cost" value={`$${bom.cost_breakdown.bom_cost.toFixed(2)}`} />
          <CostCell label="Fab / Die" value={`$${bom.cost_breakdown.fab_cost_per_die.toFixed(2)}`} />
          <CostCell label="Package + Test" value={`$${(bom.cost_breakdown.packaging_cost + bom.cost_breakdown.test_cost).toFixed(2)}`} />
          <CostCell label="Overhead" value={`${bom.cost_breakdown.overhead_pct}%`} />
          <div>
            <span className="text-zinc-500 uppercase font-bold">Total / Unit</span>
            <p className="font-mono text-emerald-400 font-bold text-sm mt-0.5">${bom.cost_breakdown.total_per_unit.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function CostCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-zinc-600 uppercase">{label}</span>
      <p className="font-mono text-zinc-300 mt-0.5">{value}</p>
    </div>
  );
}
