import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu, Layers, Activity, ShoppingCart, Truck,
  Factory, ShieldCheck, ChevronRight, ChevronLeft,
  Wand2, BarChart3, AlertCircle, Loader2, TrendingUp, Mic, MicOff
} from 'lucide-react';
import { api } from './services/api';
import type {
  DesignResponse, SimulationResponse, OptimizationResponse,
  BOMResponse, SupplyChainResponse, PredictionsResponse,
  QualityCheckResponse, AccessibilityPrefs, ArchitectureBlueprint,
} from './types';

import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { ThermalHeatmap } from './components/ThermalHeatmap';
import { BOMTable } from './components/BOMTable';
import { RiskMap } from './components/RiskMap';
import { CarbonEstimator } from './components/CarbonEstimator';
import { OrchestrationStatus } from './components/OrchestrationStatus';
import { OptimizationView } from './components/OptimizationView';
import { YieldForecast } from './components/YieldForecast';
import { QualityControl } from './components/QualityControl';
import { ManufacturabilityScore } from './components/ManufacturabilityScore';
import { SupplierCards } from './components/SupplierCards';
import { ConstraintForm } from './components/ConstraintForm';
import { SimulationResults } from './components/SimulationResults';
import { ChatPanel } from './components/ChatPanel';
import { TextSelectionReader } from './components/TextSelectionReader';

const STEPS = [
  { id: 1, title: 'Describe', icon: Wand2, description: 'Describe Your Chip' },
  { id: 2, title: 'Architect', icon: Layers, description: 'Architecture Review' },
  { id: 3, title: 'Simulate', icon: Activity, description: 'Digital Twin' },
  { id: 4, title: 'Optimize', icon: TrendingUp, description: 'AI Optimization' },
  { id: 5, title: 'BOM', icon: ShoppingCart, description: 'BOM & Cost' },
  { id: 6, title: 'Supply', icon: Truck, description: 'Supply Chain' },
  { id: 7, title: 'Forecast', icon: BarChart3, description: 'Mfg Forecast' },
  { id: 8, title: 'Quality', icon: ShieldCheck, description: 'QC & Feedback' },
];

const PROCESS_NODES = ['3nm', '5nm', '7nm', '10nm', '14nm', '22nm', '28nm', '40nm', '65nm', '90nm', '130nm', '180nm', '350nm'];
const DOMAINS = ['IoT', 'Automotive', 'Consumer', 'Industrial', 'Wearable', 'AI/HPC', 'Data Center', 'Aerospace', 'Medical'];

// ─── App-level STT (Web Speech API) for Step 1 textarea ──────────────────────
function useDescriptionMic(onResult: (t: string) => void) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }

    const r: any = new SpeechRec();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onstart = () => setRecording(true);
    r.onend = () => setRecording(false);
    r.onresult = (e: any) => {
      const t = e?.results?.[0]?.[0]?.transcript || '';
      if (t) onResult(t);
    };
    recRef.current = r;
    r.start();
  }, [recording, onResult]);

  return { recording, toggle };
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 inputs
  const [prompt, setPrompt] = useState('');
  const [processNode, setProcessNode] = useState('28nm');
  const [domain, setDomain] = useState('IoT');
  const [constraints, setConstraints] = useState({
    max_power_mw: '',
    max_area_mm2: '',
    max_temp_c: '85',
    budget_per_unit: '',
    target_volume: '10000',
  });

  // Data from backend
  const [design, setDesign] = useState<DesignResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null);
  const [bom, setBom] = useState<BOMResponse | null>(null);
  const [supplyChain, setSupplyChain] = useState<SupplyChainResponse | null>(null);
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [qualityCheck, setQualityCheck] = useState<QualityCheckResponse | null>(null);

  // System health (live from backend)
  const [health, setHealth] = useState<Record<string, string>>({
    backend: '...',
    gemini: '...',
    watson_orchestrate: '...',
    watson_tts: '...',
    simulation_core: '...',
    component_catalog: '...',
    supply_chain_db: '...',
    live_component_pricing: '...',
  });

  useEffect(() => {
    const fetchHealth = () => {
      fetch('/api/health/detailed')
        .then((r) => r.json())
        .then((d) => setHealth(d))
        .catch(() => {
          setHealth({
            backend: 'UNAVAILABLE',
            gemini: 'UNAVAILABLE',
            watson_orchestrate: 'UNAVAILABLE',
            watson_tts: 'UNAVAILABLE',
            simulation_core: 'UNAVAILABLE',
            component_catalog: 'UNAVAILABLE',
            supply_chain_db: 'UNAVAILABLE',
            live_component_pricing: 'UNAVAILABLE',
          });
        });
    };
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  // Step 1 voice input
  const { recording: descMicRecording, toggle: toggleDescMic } = useDescriptionMic(
    useCallback((t: string) => setPrompt((p) => p ? `${p} ${t}` : t), [])
  );

  // Accessibility
  const [a11y, setA11y] = useState<AccessibilityPrefs>({
    color_mode: 'default',
    tts_enabled: false,
    tts_speed: 1.0,
    tts_voice: 'female',
    font_size: 'standard',
    motion_reduced: false,
  });

  const fontScale = { standard: 1, large: 1.15, extra_large: 1.3 }[a11y.font_size] || 1;

  useEffect(() => {
    api.getAccessibilityPrefs()
      .then((prefs) => setA11y(prefs as AccessibilityPrefs))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.updateAccessibilityPrefs('default', a11y).catch(() => {});
  }, [a11y]);

  // Apply font scaling to the HTML root so Tailwind's rem-based text classes scale correctly
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [fontScale]);

  const handleError = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
    setError(msg);
    setTimeout(() => setError(null), 8000);
  }, []);

  const handleCoPilotApply = useCallback(async (instruction: string): Promise<string> => {
    // Decide what to regenerate: architecture-level changes or module-level updates.
    const lower = instruction.toLowerCase();

    const wantsArch =
      /(add|change|modify|update|remove|replace)\b/.test(lower);

    const regenerate = wantsArch || !design;

    const wantsSimulation =
      regenerate ||
      currentStep >= 3 ||
      !!simulation ||
      /(simulate|simulation|thermal|temperature|hot|power|junction|heat)/.test(lower);

    const wantsOptimization =
      currentStep >= 4 ||
      !!optimization ||
      /(optimi|improv|performance|efficien|power|thermal|cooler)/.test(lower);

    const wantsBom = currentStep >= 5 || !!bom || /(bom|bill of materials|components? (cost|price))/i.test(lower);
    const wantsSupply = currentStep >= 6 || !!supplyChain || /(supply chain|fab|foundry|supplier)/.test(lower);
    const wantsForecast = currentStep >= 7 || !!predictions || /(yield|forecast|mfg forecast|manufacturing)/.test(lower);

    // If the user is requesting architectural changes, update the existing design
    // in-place (so the new blocks show up on every page) and then rerun the pipeline
    // modules we already have in state.
    if (wantsArch || !design) {
      const ran: string[] = [];

      let activeDesign: DesignResponse;
      if (!design) {
        const combinedNlInput = instruction;

        const constraintData: Record<string, unknown> = {};
        if (constraints.max_power_mw) constraintData.max_power_mw = parseFloat(constraints.max_power_mw);
        if (constraints.max_area_mm2) constraintData.max_area_mm2 = parseFloat(constraints.max_area_mm2);
        if (constraints.max_temp_c) constraintData.max_temp_c = parseFloat(constraints.max_temp_c);
        if (constraints.budget_per_unit) constraintData.budget_per_unit = parseFloat(constraints.budget_per_unit);
        if (constraints.target_volume) constraintData.target_volume = parseInt(constraints.target_volume, 10);
        constraintData.process_node = processNode;
        constraintData.application_domain = domain;

        const budget_ceiling = constraints.budget_per_unit ? parseFloat(constraints.budget_per_unit) : undefined;

        activeDesign = (await api.createDesign({
          nl_input: combinedNlInput,
          constraints: constraintData,
          process_node: processNode,
          target_domain: domain,
          budget_ceiling,
        })) as DesignResponse;
      } else {
        activeDesign = (await api.applyInstruction(design.id, { instruction })) as DesignResponse;
      }

      setDesign(activeDesign);

      // Re-run ONLY what matters for the current intent.
      // The deterministic part for "add sensor" is architecture + simulation.
      // We avoid forcing AI-dependent modules unless the user is already in/asking for them.

      if (wantsSimulation) {
        try {
          const sim = (await api.runSimulation(activeDesign.id, { ambient_temp_c: 25, workload_profile: 'typical' })) as SimulationResponse;
          setSimulation(sim);
          ran.push('Simulation');
        } catch {
          // If simulation fails, still keep the architecture update visible.
        }
      }

      if (wantsOptimization) {
        try {
          const focus =
            /(area|smaller|compact)/.test(lower) ? 'area' :
            /(performance|faster|latency|clock)/.test(lower) ? 'performance' :
            /(power|thermal|cool|hot|efficien)/.test(lower) ? 'power' :
            'balanced';

          const opt = (await api.optimizeDesign(activeDesign.id, { focus })) as OptimizationResponse;
          setOptimization(opt);
          if (opt.optimized_architecture) {
            setDesign((prev) =>
              prev ? { ...prev, architecture: opt.optimized_architecture as ArchitectureBlueprint } : prev,
            );
          }
          ran.push('Optimization');

          // Keep thermal aligned with optimized blocks (best-effort).
          try {
            const simAfterOpt = (await api.runSimulation(activeDesign.id, { ambient_temp_c: 25, workload_profile: 'typical' })) as SimulationResponse;
            setSimulation(simAfterOpt);
            ran.push('Simulation');
          } catch {
            // no-op
          }
        } catch {
          // If optimization fails, still keep architecture + whatever modules succeeded.
        }
      }

      if (wantsBom) {
        try {
          const vol = parseInt(constraints.target_volume || '10000', 10);
          const nextBom = (await api.generateBOM(activeDesign.id, { volume: vol })) as BOMResponse;
          setBom(nextBom);
          ran.push('BOM');
        } catch {
          // no-op
        }
      }

      if (wantsSupply) {
        try {
          const nextSupply = (await api.getSupplyChain(activeDesign.id)) as SupplyChainResponse;
          setSupplyChain(nextSupply);
          ran.push('Supply Chain');
        } catch {
          // no-op
        }
      }

      if (wantsForecast) {
        try {
          const nextPredictions = (await api.getPredictions(activeDesign.id)) as PredictionsResponse;
          setPredictions(nextPredictions);
          ran.push('Forecast');
        } catch {
          // no-op
        }
      }

      return ran.length ? `Applied: ${ran.join(' + ')}` : 'Applied your requested changes.';
    }

    // Otherwise, treat it as a module-level change: rerun simulation/optimization as needed.
    if (!design) return 'No design available to apply changes.';

    const ran: string[] = [];

    if (wantsOptimization) {
      const focus =
        /(area|smaller|compact)/.test(lower) ? 'area' :
        /(performance|faster|latency|clock)/.test(lower) ? 'performance' :
        /(power|thermal|cool|hot|efficien)/.test(lower) ? 'power' :
        'balanced';

      const opt = (await api.optimizeDesign(design.id, { focus })) as OptimizationResponse;
      setOptimization(opt);
      if (opt.optimized_architecture) {
        setDesign((prev) =>
          prev ? { ...prev, architecture: opt.optimized_architecture as ArchitectureBlueprint } : prev,
        );
      }
      ran.push('Optimization');
    }

    if (wantsSimulation) {
      const sim = (await api.runSimulation(design.id, { ambient_temp_c: 25, workload_profile: 'typical' })) as SimulationResponse;
      setSimulation(sim);
      ran.push('Simulation');
    }

    if (wantsBom) {
      const vol = parseInt(constraints.target_volume || '10000', 10);
      const nextBom = (await api.generateBOM(design.id, { volume: vol })) as BOMResponse;
      setBom(nextBom);
      ran.push('BOM');
    }

    if (wantsSupply) {
      const nextSupply = (await api.getSupplyChain(design.id)) as SupplyChainResponse;
      setSupplyChain(nextSupply);
      ran.push('Supply Chain');
    }

    if (wantsForecast) {
      const nextPredictions = (await api.getPredictions(design.id)) as PredictionsResponse;
      setPredictions(nextPredictions);
      ran.push('Forecast');
    }
    return ran.length ? `Applied: ${ran.join(' + ')}` : 'Applied your requested changes.';
  }, [bom, constraints, currentStep, design, optimization, predictions, processNode, simulation, supplyChain, domain]);

  // Step 1: Generate architecture
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const constraintData: Record<string, unknown> = {};
      if (constraints.max_power_mw) constraintData.max_power_mw = parseFloat(constraints.max_power_mw);
      if (constraints.max_area_mm2) constraintData.max_area_mm2 = parseFloat(constraints.max_area_mm2);
      if (constraints.max_temp_c) constraintData.max_temp_c = parseFloat(constraints.max_temp_c);
      if (constraints.budget_per_unit) constraintData.budget_per_unit = parseFloat(constraints.budget_per_unit);
      if (constraints.target_volume) constraintData.target_volume = parseInt(constraints.target_volume);
      constraintData.process_node = processNode;
      constraintData.application_domain = domain;

      const result = await api.createDesign({
        nl_input: prompt,
        constraints: constraintData,
        process_node: processNode,
        target_domain: domain,
        budget_ceiling: constraints.budget_per_unit ? parseFloat(constraints.budget_per_unit) : undefined,
      }) as DesignResponse;
      setDesign(result);
      setCurrentStep(2);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> 3: Simulate
  const handleSimulate = async () => {
    if (!design) return;
    setLoading(true);
    try {
      const result = await api.runSimulation(design.id, {
        ambient_temp_c: 25,
        workload_profile: 'typical',
      }) as SimulationResponse;
      setSimulation(result);
      setCurrentStep(3);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> 4: Optimize
  const handleOptimize = async () => {
    if (!design) return;
    setLoading(true);
    try {
      const result = await api.optimizeDesign(design.id, { focus: 'balanced' }) as OptimizationResponse;
      setOptimization(result);
      if (result.optimized_architecture) {
        setDesign(prev => prev ? { ...prev, architecture: result.optimized_architecture as ArchitectureBlueprint } : prev);
      }
      setCurrentStep(4);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> 5: BOM
  const handleBOM = async () => {
    if (!design) return;
    setLoading(true);
    try {
      const vol = parseInt(constraints.target_volume || '10000');
      const result = await api.generateBOM(design.id, { volume: vol }) as BOMResponse;
      setBom(result);
      setCurrentStep(5);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 5 -> 6: Supply Chain
  const handleSupplyChain = async () => {
    if (!design) return;
    setLoading(true);
    try {
      const result = await api.getSupplyChain(design.id) as SupplyChainResponse;
      setSupplyChain(result);
      setCurrentStep(6);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 6 -> 7: Predictions
  const handlePredictions = async () => {
    if (!design) return;
    setLoading(true);
    try {
      const result = await api.getPredictions(design.id) as PredictionsResponse;
      setPredictions(result);
      setCurrentStep(7);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  // Step 7 -> 8: (just navigate, QC is optional upload)
  const handleQCStep = () => {
    setCurrentStep(8);
  };

  const handleQCUpload = async (file: File) => {
    if (!design) return;
    setLoading(true);
    try {
      const result = await api.runQualityCheck(design.id, file) as QualityCheckResponse;
      setQualityCheck(result);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewDesign = () => {
    setCurrentStep(1);
    setDesign(null);
    setSimulation(null);
    setOptimization(null);
    setBom(null);
    setSupplyChain(null);
    setPredictions(null);
    setQualityCheck(null);
    setPrompt('');
    setError(null);
  };

  const arch = design?.architecture;

  const colorModeFilter: Record<string, string> = {
    default:      '',
    high_contrast:'contrast(1.5)',
    pattern_color:'',
    grayscale:    'grayscale(1)',
    warm_amber:   'sepia(0.6) brightness(1.05)',
    cool_blue:    'hue-rotate(200deg) saturate(0.8)',
    dark_sepia:   'sepia(0.8) contrast(1.15) brightness(0.9)',
    neon:         'saturate(2) contrast(1.15)',
    night:        'brightness(0.6) saturate(0.5)',
    deuteranopia: 'hue-rotate(45deg) saturate(1.4)',
    tritanopia:   'hue-rotate(330deg) saturate(1.3)',
  };
  const filterStyle = colorModeFilter[a11y.color_mode] ?? '';

  return (
    <div
      data-color-mode={a11y.color_mode}
      className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30 transition-all duration-300"
      style={{ filter: filterStyle || undefined }}
    >
      {/* Accessibility Toolbar */}
      <AccessibilityToolbar prefs={a11y} onChange={setA11y} />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center" aria-hidden="true">
              <Cpu className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">SiliconSentinel <span className="text-indigo-400">Pro</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Semiconductor Lifecycle Platform v2</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {design && (
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 font-mono">
                Design #{design.id} — {design.status}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-500/30 px-6 py-3 text-sm text-red-300 flex items-center gap-2" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Wizard + Content */}
        <div className="lg:col-span-9 space-y-6">

          {/* Progress Stepper */}
          <nav className="flex items-center gap-1 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/50 overflow-x-auto" aria-label="Design pipeline steps">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => {
                    if (step.id <= currentStep) setCurrentStep(step.id);
                  }}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    currentStep === step.id
                      ? 'bg-indigo-600 text-white'
                      : currentStep > step.id
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer'
                        : 'text-zinc-600 cursor-not-allowed'
                  }`}
                  aria-current={currentStep === step.id ? 'step' : undefined}
                  aria-label={`Step ${step.id}: ${step.description}`}
                >
                  <step.icon size={14} />
                  <span className="hidden md:inline">{step.title}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={12} className="text-zinc-700 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={a11y.motion_reduced ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={a11y.motion_reduced ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: a11y.motion_reduced ? 0 : 0.25 }}
              className="min-h-[450px]"
            >

              {/* STEP 1: Describe Your Chip */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-5">
                    <div>
                      <h2 className="text-xl font-bold">Describe Your Chip</h2>
                      <p className="text-zinc-400 text-sm mt-1">Provide a natural language description and design constraints. The AI Co-Pilot will generate a complete architecture.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="nl-input" className="text-xs uppercase font-mono text-zinc-500">Chip Description</label>
                        <button
                          type="button"
                          onClick={toggleDescMic}
                          title={descMicRecording ? 'Stop voice input' : 'Dictate chip description'}
                          aria-label={descMicRecording ? 'Stop recording' : 'Start voice input'}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                            descMicRecording
                              ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                          }`}
                        >
                          {descMicRecording
                            ? <><MicOff size={10} /> Stop</>
                            : <><Mic size={10} /> Speak</>
                          }
                        </button>
                      </div>
                      <textarea
                        id="nl-input"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={descMicRecording ? '🔴 Listening… describe your chip' : 'e.g., I need a low-power BLE chip for a wearable heart rate monitor with integrated power management and 64KB SRAM...'}
                        className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none text-sm"
                        aria-required="true"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="process-node" className="block text-xs uppercase font-mono text-zinc-500 mb-1">Process Node</label>
                        <select id="process-node" value={processNode} onChange={(e) => setProcessNode(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm outline-none">
                          {PROCESS_NODES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="domain" className="block text-xs uppercase font-mono text-zinc-500 mb-1">Application Domain</label>
                        <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm outline-none">
                          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <ConstraintForm constraints={constraints} onChange={setConstraints} />

                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || loading}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm"
                      aria-label="Generate chip architecture"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                      Generate Architecture
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Architecture Review */}
              {currentStep === 2 && arch && (
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">{arch.name}</h2>
                      <p className="text-zinc-400 text-sm">Architecture generated by AI Co-Pilot — {arch.process_node}</p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase">Process Node</p>
                        <p className="text-sm font-bold text-indigo-400">{arch.process_node}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase">Metal Layers</p>
                        <p className="text-sm font-bold text-zinc-300">{arch.metal_layers}</p>
                      </div>
                    </div>
                  </div>

                  <ArchitectureViewer architecture={arch} />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Total Power" value={`${arch.total_power_mw.toFixed(1)} mW`} />
                    <Stat label="Die Area" value={`${arch.total_area_mm2.toFixed(2)} mm²`} />
                    <Stat label="Blocks" value={String(arch.blocks.length)} />
                    <Stat label="Interconnect" value={arch.interconnect.split(' ')[0]} />
                  </div>

                  {design?.materials && (
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-2">Material Stack</h3>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div><span className="text-zinc-500">Substrate:</span> <span className="text-zinc-200">{design.materials.substrate}</span></div>
                        <div><span className="text-zinc-500">Gate Oxide:</span> <span className="text-zinc-200">{design.materials.gate_oxide}</span></div>
                        <div><span className="text-zinc-500">Passivation:</span> <span className="text-zinc-200">{design.materials.passivation}</span></div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">{design.materials.justification}</p>
                    </div>
                  )}

                  {design?.constraint_satisfaction && (
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Constraint Satisfaction</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {Object.entries(design.constraint_satisfaction).map(([key, val]) => {
                        const numVal = val as number;
                        return (
                          <div key={key} className="text-center">
                            <div className={`text-lg font-bold ${numVal >= 80 ? 'text-emerald-400' : numVal >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                              {numVal.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase font-mono">{key}</div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  <StepNav
                    onBack={() => setCurrentStep(1)}
                    onNext={handleSimulate}
                    nextLabel="Run Digital Twin Simulation"
                    nextIcon={<Activity size={16} />}
                    loading={loading}
                  />
                </div>
              )}

              {/* STEP 3: Simulate & Visualize */}
              {currentStep === 3 && simulation && arch && (
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">Simulation Results</h2>
                      <p className="text-zinc-400 text-sm">Digital twin analysis — thermal, signal, power, timing</p>
                    </div>
                    <PassFailBadge status={simulation.pass_fail} score={simulation.overall_score} />
                  </div>

                  <SimulationResults simulation={simulation} processNode={arch.process_node} domain={domain} totalAreaMm2={arch.total_area_mm2} />
                  <ThermalHeatmap thermal={simulation.thermal} blocks={arch.blocks} />

                  {simulation.bottlenecks.length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Bottlenecks Identified</h3>
                      <div className="space-y-2">
                        {simulation.bottlenecks.map((b, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {b.severity}
                            </span>
                            <div>
                              <span className="text-zinc-300 font-medium">{b.category}:</span>{' '}
                              <span className="text-zinc-400">{b.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <StepNav
                    onBack={() => setCurrentStep(2)}
                    onNext={handleOptimize}
                    nextLabel="Optimize Design"
                    nextIcon={<TrendingUp size={16} />}
                    loading={loading}
                  />
                </div>
              )}

              {/* STEP 4: Optimize Design */}
              {currentStep === 4 && optimization && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Optimization Results</h2>
                    <p className="text-zinc-400 text-sm">
                      Iteration #{optimization.iteration} — {optimization.improvement_pct >= 0 ? '+' : ''}{optimization.improvement_pct.toFixed(1)}% overall improvement
                    </p>
                  </div>

                  <OptimizationView optimization={optimization} />

                  <StepNav
                    onBack={() => setCurrentStep(3)}
                    onNext={handleBOM}
                    nextLabel="Generate BOM & Cost Analysis"
                    nextIcon={<ShoppingCart size={16} />}
                    loading={loading}
                  />
                </div>
              )}

              {/* STEP 5: BOM & Cost */}
              {currentStep === 5 && bom && (
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">Bill of Materials & Cost Analysis</h2>
                      <p className="text-zinc-400 text-sm">{bom.entries.length} components — ${bom.cost_breakdown.total_per_unit.toFixed(2)}/unit</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase">Supplier Diversity</p>
                      <p className={`text-sm font-bold ${bom.supplier_diversity_risk === 'LOW' ? 'text-emerald-400' : bom.supplier_diversity_risk === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}`}>
                        {bom.supplier_diversity_score.toFixed(0)}% — {bom.supplier_diversity_risk} Risk
                      </p>
                    </div>
                  </div>

                  <BOMTable bom={bom} />

                  <StepNav
                    onBack={() => setCurrentStep(4)}
                    onNext={handleSupplyChain}
                    nextLabel="Analyze Supply Chain"
                    nextIcon={<Truck size={16} />}
                    loading={loading}
                  />
                </div>
              )}

              {/* STEP 6: Supply Chain */}
              {currentStep === 6 && supplyChain && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Supply Chain Intelligence</h2>
                    <p className="text-zinc-400 text-sm">Fab matching, supplier risk, geopolitical analysis</p>
                  </div>

                  <SupplierCards fabs={supplyChain.fab_recommendations} />
                  <RiskMap data={supplyChain} />

                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                    <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Diversification Plan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase">Primary Fab</p>
                        <p className="text-sm font-bold">{supplyChain.diversification_plan.primary_fab}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase">Secondary Fab</p>
                        <p className="text-sm font-bold">{supplyChain.diversification_plan.secondary_fab}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{supplyChain.diversification_plan.rationale}</p>
                  </div>

                  {supplyChain.geopolitical_risks.length > 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                      <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Geopolitical Risk Assessment</h3>
                      <div className="space-y-3">
                        {supplyChain.geopolitical_risks.map((r, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <RiskBadge level={r.risk_level} />
                            <div className="text-sm">
                              <span className="font-medium text-zinc-200">{r.region}</span>
                              <ul className="text-zinc-500 text-xs mt-1 list-disc list-inside">
                                {r.factors.map((f, fi) => <li key={fi}>{f}</li>)}
                              </ul>
                              <p className="text-xs text-indigo-400 mt-1">{r.mitigation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <StepNav
                    onBack={() => setCurrentStep(5)}
                    onNext={handlePredictions}
                    nextLabel="Manufacturing Forecast"
                    nextIcon={<BarChart3 size={16} />}
                    loading={loading}
                  />
                </div>
              )}

              {/* STEP 7: Manufacturing Forecast */}
              {currentStep === 7 && predictions && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Manufacturing Forecast</h2>
                    <p className="text-zinc-400 text-sm">Yield prediction, defect zones, delay analysis, shortage risks</p>
                  </div>

                  <YieldForecast predictions={predictions} />

                  {design && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ManufacturabilityScore designId={design.id} />
                      <CarbonEstimator designId={design.id} />
                    </div>
                  )}

                  <StepNav
                    onBack={() => setCurrentStep(6)}
                    onNext={handleQCStep}
                    nextLabel="Quality Control"
                    nextIcon={<ShieldCheck size={16} />}
                    loading={false}
                  />
                </div>
              )}

              {/* STEP 8: Quality Control */}
              {currentStep === 8 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Quality Control & Feedback</h2>
                    <p className="text-zinc-400 text-sm">Upload fabricated chip images for AI-powered defect detection</p>
                  </div>

                  <QualityControl
                    onUpload={handleQCUpload}
                    result={qualityCheck}
                    loading={loading}
                  />

                  <div className="flex gap-3">
                    <button onClick={() => setCurrentStep(7)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button onClick={handleNewDesign} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-sm transition-all">
                      Start New Design
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Chat + Status Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* AI Chat — takes available height */}
          <div className="flex-1 min-h-[360px]">
            <ChatPanel
              design={design}
              simulation={simulation}
              optimization={optimization}
              bom={bom}
              supplyChain={supplyChain}
              predictions={predictions}
              onApplyInstruction={handleCoPilotApply}
            />
          </div>

          {design && <OrchestrationStatus designId={design.id} currentStep={currentStep} />}

          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest mb-3">System Health</h3>
            <div className="space-y-2.5">
              <HealthRow label="Backend API" status={health.backend} />
              <HealthRow label="AI Engine (gemini)" status={health.gemini} />
              <HealthRow label="IBM watsonx Orchestrate" status={health.watson_orchestrate} />
              <HealthRow label="IBM Watson Text-to-Speech" status={health.watson_tts} />
              <HealthRow label="Simulation Core" status={health.simulation_core} />
              <HealthRow label="Component Catalog" status={health.component_catalog} />
              <HealthRow label="Supply Chain DB" status={health.supply_chain_db} />
              <HealthRow label="Live Component Pricing" status={health.live_component_pricing ?? 'NO KEY'} />
            </div>
          </div>

          {arch && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
              <h3 className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest mb-3">Design Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Chip</span><span className="text-zinc-200 font-medium">{arch.name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Node</span><span className="text-zinc-200">{arch.process_node}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Power</span><span className="text-zinc-200">{arch.total_power_mw.toFixed(1)} mW</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Area</span><span className="text-zinc-200">{arch.total_area_mm2.toFixed(2)} mm²</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Blocks</span><span className="text-zinc-200">{arch.blocks.length}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Substrate</span><span className="text-zinc-200">{arch.substrate}</span></div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
            SiliconSentinel Pro v2.0 · IBM watsonx Orchestrate Ready · Powered by Gemini AI + Physics-Based Simulation
          </p>
        </div>
      </footer>

      {/* Text-selection read aloud bubble — global */}
      <TextSelectionReader prefs={a11y} />
    </div>
  );
}

// Shared UI components

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
      <p className="text-[10px] text-zinc-500 font-mono uppercase">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}

function PassFailBadge({ status, score }: { status: string; score: number }) {
  const classes = status === 'PASS'
    ? {
        container: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-400',
      }
    : status === 'WARNING'
      ? {
          container: 'bg-amber-500/10 border-amber-500/30',
          text: 'text-amber-400',
        }
      : {
          container: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-400',
        };
  return (
    <div className={`px-3 py-1.5 border rounded-lg flex items-center gap-2 ${classes.container}`}>
      <ShieldCheck className={classes.text} size={14} />
      <span className={`text-xs font-bold ${classes.text}`}>{status} — {score.toFixed(0)}/100</span>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-400',
    MEDIUM: 'bg-amber-500/20 text-amber-400',
    HIGH: 'bg-orange-500/20 text-orange-400',
    CRITICAL: 'bg-red-500/20 text-red-400',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[level] || colors.MEDIUM}`}>{level}</span>;
}

function HealthRow({ label, status }: { label: string; status: string }) {
  const cls =
    status === 'ONLINE' || status === 'MOUSER_ONLY'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : status === 'NO KEY' || status === 'NO AGENT ID'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : status === '...'
          ? 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30 animate-pulse'
          : status.startsWith('ERROR') || status === 'AUTH ERROR' || status === 'UNAVAILABLE'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30';
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>
    </div>
  );
}

function StepNav({ onBack, onNext, nextLabel, nextIcon, loading }: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextIcon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button onClick={onBack} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
        <ChevronLeft size={16} /> Back
      </button>
      <button onClick={onNext} disabled={loading}
        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all">
        {loading ? <Loader2 className="animate-spin" size={16} /> : nextIcon}
        {nextLabel}
      </button>
    </div>
  );
}
