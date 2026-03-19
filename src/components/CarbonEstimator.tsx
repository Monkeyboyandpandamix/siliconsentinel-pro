import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Leaf, Info, Globe, Zap, Truck } from 'lucide-react';

interface CarbonMetrics {
  label: string;
  co2PerWafer: number;
  co2PerChip: number;
  totalCo2: number;
}

export const CarbonEstimator: React.FC<{ dieArea: number; volume: number }> = ({ dieArea, volume }) => {
  const [fabLocation, setFabLocation] = useState('Taiwan');
  const [processNode, setProcessNode] = useState('28nm');
  const [energySource, setEnergySource] = useState('Grid');
  const [shippingDistance, setShippingDistance] = useState(5000);

  const calculateCarbon = (node: string, loc: string, energy: string, dist: number) => {
    // Constants
    const WAFER_AREA = 70685; // 300mm wafer in mm2
    const CHIP_EFFICIENCY = 0.85;
    
    // Base CO2e per 300mm wafer (kg)
    const baseNodeCo2: Record<string, number> = {
      '28nm': 500,
      '14nm': 850,
      '7nm': 1300,
      '5nm': 1800
    };

    // Location Grid Intensity Multiplier
    const locMultiplier: Record<string, number> = {
      'Taiwan': 1.15,
      'USA': 0.95,
      'Germany': 0.75,
      'China': 1.25
    };

    // Energy Source Multiplier
    const energyMultiplier: Record<string, number> = {
      'Grid': 1.0,
      'Mixed': 0.5,
      'Renewable': 0.1
    };

    const chipsPerWafer = Math.floor((WAFER_AREA / dieArea) * CHIP_EFFICIENCY);
    const waferCo2 = (baseNodeCo2[node] || 500) * (locMultiplier[loc] || 1) * (energyMultiplier[energy] || 1);
    const manufacturingCo2PerChip = waferCo2 / chipsPerWafer;
    const shippingCo2PerChip = dist * 0.0005; // 0.5g per km
    
    const co2PerChip = manufacturingCo2PerChip + shippingCo2PerChip;
    
    return {
      co2PerWafer: waferCo2,
      co2PerChip: co2PerChip,
      totalCo2: co2PerChip * volume
    };
  };

  const currentMetrics = useMemo(() => 
    calculateCarbon(processNode, fabLocation, energySource, shippingDistance),
    [processNode, fabLocation, energySource, shippingDistance, dieArea, volume]
  );

  const comparisonData = useMemo(() => [
    { name: 'Current Config', co2: currentMetrics.co2PerChip, fill: '#6366f1' },
    { name: 'Renewable Opt', co2: calculateCarbon(processNode, fabLocation, 'Renewable', shippingDistance).co2PerChip, fill: '#10b981' },
    { name: 'Local Fab Opt', co2: calculateCarbon(processNode, 'Germany', energySource, 500).co2PerChip, fill: '#3b82f6' },
  ], [currentMetrics, processNode, fabLocation, energySource, shippingDistance]);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
          <Leaf className="text-emerald-500" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Carbon Footprint Estimator</h3>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Environmental Impact Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1">
                <Globe size={10} /> Fab Location
              </label>
              <select 
                value={fabLocation}
                onChange={(e) => setFabLocation(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs outline-none"
              >
                <option>Taiwan</option>
                <option>USA</option>
                <option>Germany</option>
                <option>China</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1">
                <Zap size={10} /> Energy Source
              </label>
              <select 
                value={energySource}
                onChange={(e) => setEnergySource(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs outline-none"
              >
                <option>Grid</option>
                <option>Mixed</option>
                <option>Renewable</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono text-zinc-500 flex items-center gap-1">
              <Truck size={10} /> Shipping Distance (km)
            </label>
            <input 
              type="range"
              min="100"
              max="20000"
              step="100"
              value={shippingDistance}
              onChange={(e) => setShippingDistance(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>100km</span>
              <span className="text-indigo-400 font-bold">{shippingDistance}km</span>
              <span>20,000km</span>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">CO2e per Wafer</span>
              <span className="text-sm font-bold">{currentMetrics.co2PerWafer.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">CO2e per Chip</span>
              <span className="text-sm font-bold text-emerald-400">{currentMetrics.co2PerChip.toFixed(3)} kg</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold">Total Run Impact</span>
              <span className="text-lg font-bold text-indigo-400">{(currentMetrics.totalCo2 / 1000).toFixed(2)} Tonnes</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-full min-h-[250px] flex flex-col">
          <h4 className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4 text-center">CO2e Comparison (kg per chip)</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                />
                <Bar dataKey="co2" radius={[0, 4, 4, 0]} barSize={20}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex gap-3">
            <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Calculations factor in Scope 2 emissions from grid intensity and Scope 3 from logistics. Switching to renewable energy reduces manufacturing footprint by up to 90%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
