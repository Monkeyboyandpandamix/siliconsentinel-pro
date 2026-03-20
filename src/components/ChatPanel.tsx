import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Mic, MicOff, AlertCircle } from 'lucide-react';
import type {
  DesignResponse, SimulationResponse, OptimizationResponse,
  BOMResponse, SupplyChainResponse, PredictionsResponse,
} from '../types';

interface ChatPanelProps {
  design: DesignResponse | null;
  simulation: SimulationResponse | null;
  optimization: OptimizationResponse | null;
  bom: BOMResponse | null;
  supplyChain: SupplyChainResponse | null;
  predictions: PredictionsResponse | null;
  onApplyInstruction?: (instruction: string) => Promise<string | void>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

function buildContext(
  design: DesignResponse | null,
  simulation: SimulationResponse | null,
  optimization: OptimizationResponse | null,
  bom: BOMResponse | null,
  supplyChain: SupplyChainResponse | null,
  predictions: PredictionsResponse | null,
) {
  const ctx: Record<string, unknown> = {};

  if (design?.architecture) {
    const arch = design.architecture;
    ctx.architecture = {
      name: arch.name,
      process_node: arch.process_node,
      total_power_mw: arch.total_power_mw,
      total_area_mm2: arch.total_area_mm2,
      metal_layers: arch.metal_layers,
      blocks: arch.blocks.map((b) => ({
        name: b.name,
        type: b.type,
        power_mw: b.power_mw,
        area_mm2: b.area_mm2,
        connections: b.connections,
      })),
    };
  }

  if (simulation) {
    ctx.simulation = {
      overall_score: simulation.overall_score,
      pass_fail: simulation.pass_fail,
      thermal_zones: simulation.thermal.zones.map((z) => ({
        block: z.block_name,
        temp_c: z.temperature_c,
        status: z.status,
      })),
      total_power_mw: simulation.power.total_power_mw,
      dynamic_power_mw: simulation.power.total_dynamic_mw,
      static_power_mw: simulation.power.total_static_mw,
      power_efficiency_pct: simulation.power.power_efficiency_pct,
      max_clock_mhz: simulation.timing.max_clock_mhz,
      critical_path_delay_ns: simulation.timing.critical_path_delay_ns,
      timing_met: simulation.timing.timing_met,
      setup_slack_ns: simulation.timing.setup_slack_ns,
      worst_integrity_score: simulation.signal.worst_integrity_score,
    };
  }

  if (optimization) {
    ctx.optimization = {
      iteration: optimization.iteration,
      improvement_pct: optimization.improvement_pct,
      ppca_before: optimization.ppca_before,
      ppca_after: optimization.ppca_after,
      changes_summary: optimization.changes_summary,
      metrics_before: optimization.metrics_before,
      metrics_after: optimization.metrics_after,
    };
  }

  if (bom) {
    ctx.bom = {
      component_count: bom.entries.length,
      total_bom_cost: bom.total_bom_cost,
      cost_per_unit: bom.cost_breakdown.total_per_unit,
      long_lead_parts: bom.lead_time_critical_path
        .filter((p) => p.lead_time_days > 60)
        .map((p) => ({
          part_number: p.part_number,
          description: p.description,
          lead_time_days: p.lead_time_days,
          availability: p.availability,
        })),
    };
  }

  if (supplyChain) {
    ctx.supply_chain = {
      fab_recommendations: supplyChain.fab_recommendations.slice(0, 3).map((f) => ({
        name: f.name,
        location: f.location,
        overall_score: f.overall_score,
        risk_score: f.risk_score,
        cost_per_wafer: f.estimated_cost_per_wafer,
      })),
      geo_risks: supplyChain.geopolitical_risks.map((g) => ({
        region: g.region,
        risk_level: g.risk_level,
        factors: g.factors.join(', '),
      })),
    };
  }

  if (predictions) {
    ctx.yield = {
      yield_pct: predictions.yield.yield_pct,
      yield_low_pct: predictions.yield.yield_low_pct,
      yield_high_pct: predictions.yield.yield_high_pct,
      defect_density_per_cm2: predictions.yield.defect_density_per_cm2,
      good_dies_per_wafer: predictions.yield.good_dies_per_wafer,
    };
    ctx.defect_zones = predictions.defect_zones.map((dz) => ({
      block_name: dz.block_name,
      risk_level: dz.risk_level,
      risk_score: dz.risk_score,
    }));
  }

  return ctx;
}

const QUICK_QUESTIONS_NO_DESIGN = [
  'What can you help me with?',
  'How does the chip design workflow work?',
  'What process nodes are supported?',
];

const QUICK_QUESTIONS_WITH_DESIGN = [
  'What are the thermal hotspots?',
  'How can I reduce power?',
  'Explain the yield prediction',
];

// ─── Speech-to-text hook ──────────────────────────────────────────────────────

function useSpeechToText(onTranscript: (text: string) => void) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(null);

    // ── Try browser Web Speech API first (works without a server key) ──────
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition: any = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setRecordingState('recording');
      recognition.onend = () => setRecordingState('idle');
      recognition.onerror = (e) => {
        setRecordingState('idle');
        if (e.error === 'not-allowed') {
          setMicError('Microphone access denied');
        } else if (e.error !== 'no-speech') {
          setMicError(`STT error: ${e.error}`);
        }
      };
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript) onTranscript(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
      return;
    }

    // ── Fallback: MediaRecorder → Watson STT backend ───────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecordingState('processing');
        stream.getTracks().forEach((t) => t.stop());

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const formData = new FormData();
          formData.append('audio', blob, 'audio.webm');

          const resp = await fetch('/api/orchestration/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.transcript) {
              onTranscript(data.transcript);
            }
          }
        } catch (err) {
          setMicError('Transcription failed');
        } finally {
          setRecordingState('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');
    } catch (err: any) {
      setMicError(err?.message?.includes('Permission') ? 'Microphone access denied' : 'Mic unavailable');
      setRecordingState('idle');
    }
  }, [onTranscript]);

  const toggle = useCallback(() => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  return { recordingState, micError, toggle, setMicError };
}

// ─── ChatPanel component ──────────────────────────────────────────────────────

export function ChatPanel({
  design,
  simulation,
  optimization,
  bom,
  supplyChain,
  predictions,
  onApplyInstruction,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasDesign = !!design?.architecture;
  const quickQuestions = hasDesign ? QUICK_QUESTIONS_WITH_DESIGN : QUICK_QUESTIONS_NO_DESIGN;

  const appendTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const { recordingState, micError, toggle: toggleMic, setMicError } = useSpeechToText(appendTranscript);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const wantsApply =
        !!onApplyInstruction &&
        /(add|change|modify|update|remove|replace)\b/i.test(text) &&
        /(design|architecture|blocks|process|constraint|simulation|thermal|temperature|power|optimi|bom|supply|yield|forecast|hot|hotspot|cpu|memory|io|rf|analog|sensor|sensors|dsp|accelerator|stuff|\bit\b|\bthis\b|changes?)/i.test(text);

      if (wantsApply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Applying requested changes across the relevant modules…',
            source: 'ai_co_pilot_action',
          },
        ]);
        const summary = await onApplyInstruction(text);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content:
              summary && summary.trim()
                ? summary.trim()
                : 'Applied your requested changes across the relevant modules.',
            source: 'ai_co_pilot_action',
          },
        ]);
        return;
      }

      const ctx = buildContext(design, simulation, optimization, bom, supplyChain, predictions);
      const resp = await fetch('/api/orchestration/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: ctx,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, source: data.source },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${msg}. Please try again.`,
          source: 'error',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const micLabel =
    recordingState === 'recording'
      ? 'Stop recording'
      : recordingState === 'processing'
      ? 'Processing…'
      : 'Start voice input';

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Bot size={14} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">AI Design Co-Pilot</p>
          <p className="text-[10px] text-zinc-500 truncate">IBM watsonx Orchestrate</p>
        </div>
        {/* Mic status indicator in header */}
        {recordingState === 'recording' && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] text-red-400 font-mono uppercase">REC</span>
          </div>
        )}
        {recordingState === 'processing' && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
            <Loader2 size={9} className="text-amber-400 animate-spin" />
            <span className="text-[9px] text-amber-400 font-mono uppercase">STT</span>
          </div>
        )}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasDesign ? 'bg-emerald-400' : 'bg-amber-400/60'}`} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <MessageSquare size={28} className="text-zinc-700" />
            <div>
              <p className="text-xs font-medium text-zinc-400">
                {hasDesign ? 'Ask about your chip design' : 'Ask me anything about chip design'}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                {hasDesign
                  ? 'Full chip context sent automatically with every message'
                  : 'Generate an architecture to unlock full design analysis'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700/50"
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-zinc-700 mt-1">
              Tap <Mic size={9} className="inline" /> to speak your question
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-indigo-600/30 border border-indigo-500/30'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              {msg.role === 'user'
                ? <User size={10} className="text-indigo-400" />
                : <Bot size={10} className="text-zinc-400" />}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/20 text-zinc-200'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
              }`}
            >
              {msg.content}
              {msg.source && msg.source !== 'error' && (
                <p className="text-[9px] text-zinc-600 mt-1 capitalize">
                  {msg.source.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 flex-row">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-zinc-800 border border-zinc-700">
              <Bot size={10} className="text-zinc-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <Loader2 size={12} className="text-zinc-500 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic error banner */}
      {micError && (
        <div className="mx-3 mb-1 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-1.5">
          <AlertCircle size={10} className="text-red-400 flex-shrink-0" />
          <p className="text-[10px] text-red-400 flex-1">{micError}</p>
          <button onClick={() => setMicError(null)} className="text-[9px] text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Input row */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
        <div className="flex gap-2 items-end">
          {/* Mic button — left corner of input row */}
          <button
            onClick={toggleMic}
            disabled={loading || recordingState === 'processing'}
            aria-label={micLabel}
            title={micLabel}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              recordingState === 'recording'
                ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : recordingState === 'processing'
                ? 'bg-amber-600/60'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            {recordingState === 'recording'
              ? <MicOff size={13} className="text-white" />
              : recordingState === 'processing'
              ? <Loader2 size={13} className="text-amber-300 animate-spin" />
              : <Mic size={13} className="text-zinc-300" />
            }
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              recordingState === 'recording'
                ? '🔴 Listening… speak now'
                : hasDesign
                ? 'Ask about your chip design…'
                : 'Ask about chip design, processes, trade-offs…'
            }
            disabled={loading}
            rows={1}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ maxHeight: '80px', overflowY: 'auto' }}
          />

          {/* Send button — right corner */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={13} className="text-white" />
          </button>
        </div>
        <p className="text-[9px] text-zinc-600 mt-1.5 text-center">
          {hasDesign
            ? 'Full chip context sent automatically. Say "add" or "change" to apply updates across modules.'
            : 'Generate a design to unlock full context analysis'}
        </p>
      </div>
    </div>
  );
}
