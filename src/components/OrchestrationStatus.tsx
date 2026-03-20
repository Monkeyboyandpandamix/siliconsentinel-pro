import React from 'react';
import { Activity, CheckCircle2, Loader2, XCircle } from 'lucide-react';

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
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-indigo-500" />
        <h3 className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Pipeline Status</h3>
      </div>
      <div className="space-y-1.5">
        {PIPELINE_STAGES.map(s => {
          const completed = currentStep > s.step;
          const active = currentStep === s.step;

          return (
            <div key={s.stage} className={`flex items-center justify-between p-1.5 rounded text-xs ${active ? 'bg-indigo-500/10 border border-indigo-500/20' : ''}`}>
              <div className="flex items-center gap-2">
                {completed ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : active ? (
                  <Loader2 size={12} className="text-indigo-400 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-zinc-700" />
                )}
                <span className={completed ? 'text-zinc-400' : active ? 'text-indigo-400 font-medium' : 'text-zinc-600'}>{s.label}</span>
              </div>
              {completed && <span className="text-[10px] text-emerald-500 font-mono">DONE</span>}
              {active && <span className="text-[10px] text-indigo-400 font-mono">ACTIVE</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
