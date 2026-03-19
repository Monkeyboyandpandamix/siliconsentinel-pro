import React from 'react';
import { ChipArchitecture } from '../types';
import { Gauge, AlertTriangle, CheckCircle2, XCircle, Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Props {
  architecture: ChipArchitecture;
}

export const BenchpressList: React.FC<Props> = ({ architecture }) => {
  const benchmarks = architecture.benchmarks || [];
  const summary = architecture.benchmarkSummary;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'CRITICAL':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Activity size={16} className="text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP':
        return <TrendingUp size={12} className="text-emerald-400" />;
      case 'DOWN':
        return <TrendingDown size={12} className="text-red-400" />;
      default:
        return <Minus size={12} className="text-zinc-500" />;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Gauge size={20} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-zinc-100 font-bold text-sm">Benchpress List</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Performance Metrics & Benchmarks</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[9px] text-zinc-500 font-mono uppercase">Pass Rate</p>
            <p className="text-lg font-bold text-emerald-400">{summary.passRate}%</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[9px] text-zinc-500 font-mono uppercase">Readiness</p>
            <p className="text-lg font-bold text-indigo-400">{summary.readiness}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[9px] text-zinc-500 font-mono uppercase">Top Concern</p>
            <p className="text-xs font-semibold text-zinc-200">{summary.topConcern}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {benchmarks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-zinc-500 text-xs font-mono">No benchmark data available. Run simulation to generate metrics.</p>
          </div>
        ) : (
          benchmarks.map((benchmark, index) => (
            <div 
              key={index}
              className="group relative bg-zinc-950 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(benchmark.status)}
                  <span className="text-zinc-200 text-xs font-bold">{benchmark.name}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-tighter ${getStatusColor(benchmark.status)}`}>
                  {benchmark.status}
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-white tracking-tighter">
                  {benchmark.score.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {benchmark.unit}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-500 uppercase">{benchmark.category}</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  {getTrendIcon(benchmark.trend)}
                  Δ {benchmark.delta > 0 ? '+' : ''}{benchmark.delta}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 text-[10px] text-zinc-500">
                <span>Target {benchmark.target}</span>
                <span className="text-right">{benchmark.note}</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    benchmark.status === 'OPTIMAL' ? 'bg-emerald-500' : 
                    benchmark.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (benchmark.score / (benchmark.score > 100 ? 1000 : 100)) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
          <span>Ops Readiness Confidence</span>
          <span className="text-emerald-500">{summary?.passRate || 92}%</span>
        </div>
        <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${summary?.passRate || 92}%` }} />
        </div>
      </div>
    </div>
  );
};
