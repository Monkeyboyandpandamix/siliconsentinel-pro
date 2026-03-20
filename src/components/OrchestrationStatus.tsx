import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { PipelineStatus } from '../types';

interface Props {
  designId: number;
  currentStep: number;
}

const PIPELINE_STAGES = [
  { stage: 'DESIGN', label: 'Design Generation', step: 1 },
  { stage: 'SIMULATION', label: 'Digital Twin Simulation', step: 3 },
  { stage: 'OPTIMIZATION', label: 'Design Optimization', step: 4 },
  { stage: 'BOM', label: 'BOM Procurement', step: 5 },
  { stage: 'SUPPLY_CHAIN', label: 'Supply Chain Analysis', step: 6 },
  { stage: 'FORECAST', label: 'Manufacturing Forecast', step: 7 },
  { stage: 'QC', label: 'Quality Inspection', step: 8 },
];

export const OrchestrationStatus: React.FC<Props> = ({ designId, currentStep }) => {
  const [status, setStatus] = useState<PipelineStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const result = await api.getPipelineStatus(designId) as PipelineStatus;
        if (!cancelled) {
          setStatus(result);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
        }
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(loadStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [designId, currentStep]);

  const fallbackProgress = useMemo(() => {
    const completedCount = Math.max(0, currentStep - 1);
    return Math.round((completedCount / PIPELINE_STAGES.length) * 100);
  }, [currentStep]);

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-indigo-500" />
        <h3 className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Pipeline Status</h3>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-500">
          <span>{status?.overall_status || 'LOCAL STATUS'}</span>
          <span>{(status?.progress_pct ?? fallbackProgress).toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${status?.progress_pct ?? fallbackProgress}%` }} />
        </div>
      </div>
      <div className="space-y-1.5">
        {PIPELINE_STAGES.map(s => {
          const order = status?.orders.find((item) => item.stage === s.stage);
          const completed = order?.status === 'COMPLETED' || (!order && currentStep > s.step);
          const failed = order?.status === 'FAILED';
          const active = order?.status === 'PROCESSING' || (!order && currentStep === s.step);

          return (
            <div key={s.stage} className={`flex items-center justify-between p-1.5 rounded text-xs ${active ? 'bg-indigo-500/10 border border-indigo-500/20' : ''}`}>
              <div className="flex items-center gap-2">
                {completed ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : failed ? (
                  <AlertCircle size={12} className="text-red-400" />
                ) : active ? (
                  <Loader2 size={12} className="text-indigo-400 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-zinc-700" />
                )}
                <span className={completed ? 'text-zinc-400' : active ? 'text-indigo-400 font-medium' : 'text-zinc-600'}>{s.label}</span>
              </div>
              {completed && <span className="text-[10px] text-emerald-500 font-mono">DONE</span>}
              {failed && <span className="text-[10px] text-red-400 font-mono">FAILED</span>}
              {active && <span className="text-[10px] text-indigo-400 font-mono">ACTIVE</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
