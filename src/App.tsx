/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Zap, 
  Layers, 
  BarChart3, 
  ShoppingCart, 
  Truck, 
  Factory, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  Wand2,
  Settings,
  Activity,
  AlertCircle,
  Loader2,
  Mic,
  Send,
  Play,
  Pause,
  RefreshCcw
} from 'lucide-react';
import { generateArchitecture, getBOM, updateArchitecture } from './services/geminiService';
import { ChipArchitecture, BOMItem, OrchestrationOrder, AppSettings } from './types';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { ThermalHeatmap } from './components/ThermalHeatmap';
import { BOMTable } from './components/BOMTable';
import { RiskMap } from './components/RiskMap';
import { CarbonEstimator } from './components/CarbonEstimator';
import { OrchestrationStatus } from './components/OrchestrationStatus';
import { SettingsPanel } from './components/SettingsPanel';
import { AIAssistant } from './components/AIAssistant';
import { BenchpressList } from './components/BenchpressList';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STEPS = [
  { id: 1, title: 'Define', icon: Wand2, description: 'Describe your chip' },
  { id: 2, title: 'Architect', icon: Layers, description: 'AI Co-Pilot Design' },
  { id: 3, title: 'Simulate', icon: Activity, description: 'Digital Twin Analysis' },
  { id: 4, title: 'Supply', icon: ShoppingCart, description: 'BOM & Logistics' },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [constraints, setConstraints] = useState({
    power: 500,
    area: 10,
    node: '28nm',
    domain: 'IoT'
  });
  const [loading, setLoading] = useState(false);
  const [architecture, setArchitecture] = useState<ChipArchitecture | null>(null);
  const [bom, setBom] = useState<BOMItem[]>([]);
  const [orders, setOrders] = useState<OrchestrationOrder[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    simulatorMode: false,
    highContrast: false,
    uiScale: 1.0,
    complexity: 'beginner'
  });
  const [aiCommand, setAiCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const createOrchestrationOrder = async (type: string, payload: any) => {
    try {
      const res = await fetch('/api/orchestration/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      const order = await res.json();
      setOrders(prev => [order, ...prev]);
    } catch (e) {
      console.error("Orchestration error", e);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await createOrchestrationOrder("Design Generation", { prompt, constraints });
      const arch = await generateArchitecture(prompt, constraints);
      setArchitecture(arch);
      setCurrentStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!architecture) return;
    setLoading(true);
    await createOrchestrationOrder("Digital Twin Simulation", { architecture });
    
    // Ensure benchmarks exist for the Benchpress list
    if (!architecture.benchmarks || architecture.benchmarks.length === 0) {
      const mockBenchmarks = [
        { name: 'Compute Density', score: 92, unit: 'GFLOPS/mm²', status: 'OPTIMAL' as const },
        { name: 'Thermal Efficiency', score: 78, unit: '%', status: 'WARNING' as const },
        { name: 'Signal Integrity', score: 94, unit: 'dB', status: 'OPTIMAL' as const },
        { name: 'IO Bandwidth', score: 12.4, unit: 'Gbps', status: 'OPTIMAL' as const },
        { name: 'Power Leakage', score: 1.2, unit: 'mW', status: 'CRITICAL' as const }
      ];
      setArchitecture({ ...architecture, benchmarks: mockBenchmarks });
    }

    setTimeout(() => {
      setLoading(false);
      setCurrentStep(3);
    }, 1500);
  };

  const handleBOM = async () => {
    if (!architecture) return;
    setLoading(true);
    try {
      await createOrchestrationOrder("Procurement Orchestration", { architecture });
      const bomData = await getBOM(architecture);
      setBom(bomData);
      setCurrentStep(4);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateArchitecture = async (command: string) => {
    if (!architecture) return;
    setLoading(true);
    try {
      const updated = await updateArchitecture(architecture, command);
      setArchitecture(updated);
      setAiCommand('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Mock voice recognition start
      setTimeout(() => {
        setIsListening(false);
        setAiCommand("Reduce power consumption in the RF block");
      }, 2000);
    }
  };

  const powerData = architecture?.blocks.map(b => ({
    name: b.name,
    value: b.powerConsumption
  })) || [];

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

  return (
    <div 
      className={`min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30 transition-all duration-500 ${settings.highContrast ? 'contrast-125' : ''}`}
      style={{ fontSize: `${settings.uiScale * 100}%` }}
    >
      {/* AI Assistant (Open API Replacement) */}
      <AIAssistant />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onUpdate={setSettings} 
          onClose={() => setShowSettings(false)} 
          simulating={simulating}
          setSimulating={setSimulating}
          currentStep={currentStep}
        />
      )}

      {/* Simulator Mode Overlay */}
      {settings.simulatorMode && simulating && (
        <div className="fixed top-24 right-8 w-80 bg-zinc-950/90 border border-indigo-500/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 z-[60] animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-indigo-400">Live Simulator</h3>
                </div>
                <button onClick={() => setSimulating(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <RefreshCcw size={16} />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase mb-2">
                        <span>Signal Integrity</span>
                        <span className="text-indigo-400">94.2%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[94.2%]"></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase mb-2">
                        <span>Thermal Load</span>
                        <span className="text-amber-400">42°C</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[42%]"></div>
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Clock Freq</p>
                            <p className="text-lg font-bold">3.2 <span className="text-[10px] text-zinc-600">GHz</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Voltage</p>
                            <p className="text-lg font-bold">0.85 <span className="text-[10px] text-zinc-600">V</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">Pause</button>
                    <button className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">Reset</button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SiliconSentinel <span className="text-indigo-500">Pro</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Semiconductor Lifecycle Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Open API Connected</span>
             </div>
             <Settings 
               size={18} 
               className="text-zinc-500 cursor-pointer hover:text-white transition-colors" 
               onClick={() => setShowSettings(true)}
             />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Wizard & Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Progress Bar */}
          <div className="flex justify-between items-center bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-3 relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  currentStep >= step.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  <step.icon size={20} />
                </div>
                <div className="hidden md:block">
                  <p className={`text-xs font-bold ${currentStep >= step.id ? 'text-white' : 'text-zinc-500'}`}>{step.title}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">{step.description}</p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block w-8 h-[1px] bg-zinc-800 mx-2"></div>
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="min-h-[500px]"
            >
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6">
                    <h2 className="text-2xl font-bold">Describe Your Semiconductor Need</h2>
                    <p className="text-zinc-400 text-sm">Our AI Co-Pilot uses watsonx.ai to transform your natural language requirements into a full architecture blueprint.</p>
                    
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., I need a low-power BLE chip for a wearable heart rate monitor with integrated power management..."
                      className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono text-zinc-500">Target Node</label>
                        <select 
                          value={constraints.node}
                          onChange={(e) => setConstraints({...constraints, node: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm outline-none"
                        >
                          <option>28nm</option>
                          <option>14nm</option>
                          <option>7nm</option>
                          <option>5nm</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono text-zinc-500">Application Domain</label>
                        <select 
                          value={constraints.domain}
                          onChange={(e) => setConstraints({...constraints, domain: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm outline-none"
                        >
                          <option>IoT</option>
                          <option>Automotive</option>
                          <option>Consumer</option>
                          <option>Industrial</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerate}
                      disabled={!prompt || loading}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                      Generate Architecture
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && architecture && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold">{architecture.name}</h2>
                      <p className="text-zinc-400 text-sm">Architecture Blueprint Generated via AI Co-Pilot</p>
                    </div>
                    <div className="flex items-center gap-6">
                        {settings.simulatorMode && (
                          <button 
                            onClick={() => setSimulating(!simulating)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${simulating ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                          >
                            {simulating ? <Pause size={14} /> : <Play size={14} />}
                            {simulating ? 'Live Sim Active' : 'Start Live Sim'}
                          </button>
                        )}
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">Process Node</p>
                                <p className="text-sm font-bold text-indigo-400">{architecture.processNode}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">Est. Yield</p>
                                <p className="text-sm font-bold text-emerald-400">{architecture.estimatedYield}%</p>
                            </div>
                        </div>
                    </div>
                  </div>

                  <ArchitectureViewer 
                    architecture={architecture} 
                    complexity={settings.complexity} 
                    onUpdate={(updated) => setArchitecture(updated)}
                  />

                  {/* AI Co-Pilot Chat/Voice */}
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Cpu className="text-indigo-400" size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">AI Architecture Co-Pilot</h3>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Voice & Visual Assisted Editing</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={aiCommand}
                                onChange={(e) => setAiCommand(e.target.value)}
                                placeholder="Command AI (e.g., 'Add a second CPU core', 'Move GPU to the left')"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateArchitecture(aiCommand)}
                            />
                            <button 
                                onClick={toggleVoice}
                                className={`absolute right-2 top-1.5 p-2 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                            >
                                <Mic size={18} />
                            </button>
                        </div>
                        <button 
                            onClick={() => handleUpdateArchitecture(aiCommand)}
                            disabled={loading || !aiCommand.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            <span>Update</span>
                        </button>
                    </div>
                    
                    <div className="flex gap-4 text-[10px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500"></div> Voice Active</span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-indigo-500"></div> Visual Drag Enabled</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Total Power</p>
                        <p className="text-xl font-bold">{architecture.totalPower} <span className="text-xs text-zinc-500">mW</span></p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Total Area</p>
                        <p className="text-xl font-bold">{architecture.totalArea} <span className="text-xs text-zinc-500">mm²</span></p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                        <p className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Block Count</p>
                        <p className="text-xl font-bold">{architecture.blocks.length}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all">Back</button>
                    <button onClick={handleSimulate} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <Activity size={20} />}
                      Run Digital Twin Simulation
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && architecture && (
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold">Simulation Results</h2>
                      <p className="text-zinc-400 text-sm">Thermal & Power Analysis of {architecture.name}</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" size={16} />
                        <span className="text-xs font-bold text-emerald-500">SIMULATION PASSED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ThermalHeatmap architecture={architecture} />
                    <BenchpressList architecture={architecture} />
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setCurrentStep(2)} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all">Back</button>
                    <button onClick={handleBOM} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <ShoppingCart size={20} />}
                      Generate BOM & Supply Plan
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 4 && bom.length > 0 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-bold">Supply Chain Intelligence</h2>
                      <p className="text-zinc-400 text-sm">BOM & Manufacturing Plan for {architecture?.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all">Export CSV</button>
                        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-all">Place Order</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Truck className="text-emerald-500" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Avg Lead Time</p>
                            <p className="text-lg font-bold">2.4 Weeks</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <AlertCircle className="text-amber-500" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Risk Score</p>
                            <p className="text-lg font-bold">Low</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <Factory className="text-indigo-500" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Fab Ready</p>
                            <p className="text-lg font-bold">TSMC / 28nm</p>
                        </div>
                    </div>
                  </div>

                  <BOMTable items={bom} />

                  <div className="space-y-4">
                    <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Geopolitical Risk & Supplier Concentration</h3>
                    <RiskMap />
                  </div>

                  <CarbonEstimator 
                    dieArea={architecture?.totalArea || 10} 
                    volume={10000} 
                  />

                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="font-bold mb-4">Supplier Diversity & Resilience</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div className="w-[60%] h-full bg-indigo-500"></div>
                            <div className="w-[25%] h-full bg-emerald-500"></div>
                            <div className="w-[15%] h-full bg-amber-500"></div>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">85/100</span>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] text-zinc-500 uppercase">Digi-Key</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] text-zinc-500 uppercase">Mouser</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] text-zinc-500 uppercase">Avnet</span>
                        </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setCurrentStep(1)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all"
                  >
                    Start New Design
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Orchestration & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <OrchestrationStatus orders={orders} />
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-4">System Health</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">watsonx.ai Engine</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Digital Twin Core</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">ONLINE</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Digi-Key API</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">ONLINE</span>
                </div>
            </div>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Zap size={120} />
            </div>
            <h4 className="font-bold text-indigo-400 mb-2">Pro Tip</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
                Use natural language to specify power constraints. For example: "Optimize for ultra-low sleep current below 1uA."
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">© 2026 SiliconSentinel Pro · Powered by Open APIs & Gemini AI</p>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors">Documentation</a>
            <a href="#" className="text-zinc-500 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors">API Reference</a>
            <a href="#" className="text-zinc-500 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
