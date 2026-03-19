import React from 'react';
import { X, Moon, Sun, Monitor, Layers, User } from 'lucide-react';
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onClose: () => void;
  simulating: boolean;
  setSimulating: (simulating: boolean) => void;
  currentStep: number;
}

export const SettingsPanel: React.FC<Props> = ({ 
  settings, 
  onUpdate, 
  onClose,
  simulating,
  setSimulating,
  currentStep
}) => {
  const handleToggleSimulator = () => {
    const nextMode = !settings.simulatorMode;
    onUpdate({ ...settings, simulatorMode: nextMode });
    
    // If we are in the Architect step, also toggle the simulation state
    if (currentStep === 2) {
      setSimulating(nextMode);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Monitor size={20} className="text-indigo-500" />
            Platform Settings
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Simulator Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Simulator Mode</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Advanced Real-time Analysis</p>
            </div>
            <button 
              onClick={handleToggleSimulator}
              className={`w-12 h-6 rounded-full transition-all relative ${settings.simulatorMode ? 'bg-indigo-600' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.simulatorMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Accessibility: High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">High Contrast Mode</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Enhanced Visibility</p>
            </div>
            <button 
              onClick={() => onUpdate({ ...settings, highContrast: !settings.highContrast })}
              className={`w-12 h-6 rounded-full transition-all relative ${settings.highContrast ? 'bg-indigo-600' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.highContrast ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* UI Scale */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold">Interface Scale</p>
              <span className="text-xs font-mono text-indigo-500">{settings.uiScale * 100}%</span>
            </div>
            <input 
              type="range" 
              min="0.8" 
              max="1.2" 
              step="0.1" 
              value={settings.uiScale}
              onChange={(e) => onUpdate({ ...settings, uiScale: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Complexity Level */}
          <div className="space-y-3">
            <p className="text-sm font-bold">Interface Complexity</p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button 
                onClick={() => onUpdate({ ...settings, complexity: 'beginner' })}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${settings.complexity === 'beginner' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <User size={14} />
                Beginner
              </button>
              <button 
                onClick={() => onUpdate({ ...settings, complexity: 'advanced' })}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${settings.complexity === 'advanced' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Layers size={14} />
                Advanced
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-950/50 border-t border-zinc-800">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
