import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { BOMResponse } from '../types';

interface Props {
  bom: BOMResponse;
}

export const BOMTable: React.FC<Props> = ({ bom }) => {
  const [sortKey, setSortKey] = useState<string>('category');

  const sorted = [...bom.entries].sort((a, b) => {
    if (sortKey === 'category') return a.category.localeCompare(b.category);
    if (sortKey === 'price') return b.total_price - a.total_price;
    if (sortKey === 'lead_time') return (b.lead_time_days || 0) - (a.lead_time_days || 0);
    return 0;
  });

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-widest">Bill of Materials</h3>
        <div className="flex items-center gap-3">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-[10px] text-zinc-400 outline-none"
            aria-label="Sort BOM by"
          >
            <option value="category">Sort: Category</option>
            <option value="price">Sort: Price</option>
            <option value="lead_time">Sort: Lead Time</option>
          </select>
          <span className="text-emerald-400 font-mono text-sm">${bom.total_bom_cost.toFixed(2)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" role="table">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[10px] text-zinc-500 uppercase font-mono">
              <th className="p-2.5" scope="col">Part Number</th>
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
          <tbody className="divide-y divide-zinc-800/50">
            {sorted.map(item => (
              <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-2.5 text-zinc-300 font-mono">{item.part_number}</td>
                <td className="p-2.5 text-zinc-400 max-w-48 truncate">{item.description}</td>
                <td className="p-2.5"><span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{item.category}</span></td>
                <td className="p-2.5 text-right text-zinc-300">{item.quantity}</td>
                <td className="p-2.5 text-right text-zinc-300 font-mono">${item.unit_price.toFixed(3)}</td>
                <td className="p-2.5 text-right text-zinc-200 font-mono font-medium">${item.total_price.toFixed(3)}</td>
                <td className="p-2.5">
                  <span className={`flex items-center gap-1 ${
                    item.availability === 'In Stock' ? 'text-emerald-400' :
                    item.availability === 'Limited' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {item.availability === 'In Stock' ? <CheckCircle2 size={10} /> :
                     item.availability === 'Limited' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                    <span className="text-[10px]">{item.availability}</span>
                  </span>
                </td>
                <td className="p-2.5 text-right text-zinc-500 font-mono">{item.lead_time_days || '-'}d</td>
                <td className="p-2.5 text-zinc-500 text-[10px]">{item.supplier || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost breakdown summary */}
      <div className="p-3 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px]">
        <div>
          <span className="text-zinc-600 uppercase">BOM Cost</span>
          <p className="font-mono text-zinc-300">${bom.cost_breakdown.bom_cost.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-zinc-600 uppercase">Fab/Die</span>
          <p className="font-mono text-zinc-300">${bom.cost_breakdown.fab_cost_per_die.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-zinc-600 uppercase">Package + Test</span>
          <p className="font-mono text-zinc-300">${(bom.cost_breakdown.packaging_cost + bom.cost_breakdown.test_cost).toFixed(2)}</p>
        </div>
        <div>
          <span className="text-zinc-600 uppercase">Overhead</span>
          <p className="font-mono text-zinc-300">{bom.cost_breakdown.overhead_pct}%</p>
        </div>
        <div>
          <span className="text-zinc-600 uppercase font-bold">Total/Unit</span>
          <p className="font-mono text-emerald-400 font-bold">${bom.cost_breakdown.total_per_unit.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};
