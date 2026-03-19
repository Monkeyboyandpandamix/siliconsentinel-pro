import React from 'react';
import { BOMItem } from '../types';
import { Package, Truck, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  items: BOMItem[];
}

export const BOMTable: React.FC<Props> = ({ items }) => {
  const totalCost = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="p-4 border-bottom border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Bill of Materials (BOM)</h3>
        <div className="text-emerald-400 font-mono text-sm">
          Total: ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50">
              <th className="p-3 text-zinc-500 font-medium">Part Number</th>
              <th className="p-3 text-zinc-500 font-medium">Description</th>
              <th className="p-3 text-zinc-500 font-medium">Qty</th>
              <th className="p-3 text-zinc-500 font-medium">Unit Price</th>
              <th className="p-3 text-zinc-500 font-medium">Status</th>
              <th className="p-3 text-zinc-500 font-medium">Lead Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-3 text-zinc-300">{item.partNumber}</td>
                <td className="p-3 text-zinc-400">{item.description}</td>
                <td className="p-3 text-zinc-300">{item.quantity}</td>
                <td className="p-3 text-zinc-300">${item.unitPrice.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`flex items-center gap-1.5 ${
                    item.availability === 'In Stock' ? 'text-emerald-500' : 
                    item.availability === 'Limited' ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {item.availability === 'In Stock' ? <CheckCircle2 size={12} /> : 
                     item.availability === 'Limited' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {item.availability}
                  </span>
                </td>
                <td className="p-3 text-zinc-500">{item.leadTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
