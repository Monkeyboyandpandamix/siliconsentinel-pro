import React, { useState } from 'react';
import { Eye, Volume2, VolumeX, Type, Minimize2, Maximize2 } from 'lucide-react';
import type { AccessibilityPrefs } from '../types';

const COLOR_MODES = [
  { id: 'default', label: 'Default (Colorblind-Safe)' },
  { id: 'high_contrast', label: 'High Contrast' },
  { id: 'pattern_color', label: 'Pattern + Color' },
  { id: 'grayscale', label: 'Grayscale' },
];

const FONT_SIZES = [
  { id: 'standard', label: 'Standard' },
  { id: 'large', label: 'Large' },
  { id: 'extra_large', label: 'Extra Large' },
];

interface Props {
  prefs: AccessibilityPrefs;
  onChange: (prefs: AccessibilityPrefs) => void;
}

export function AccessibilityToolbar({ prefs, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<AccessibilityPrefs>) => {
    onChange({ ...prefs, ...patch });
  };

  return (
    <div className="bg-zinc-950 border-b border-zinc-800" role="toolbar" aria-label="Accessibility controls">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 h-9">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-widest transition-colors"
          aria-expanded={expanded}
          aria-label="Toggle accessibility toolbar"
        >
          <Eye size={12} />
          Accessibility
          <span className="text-zinc-600">{expanded ? '▲' : '▼'}</span>
        </button>

        {!expanded && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => update({ tts_enabled: !prefs.tts_enabled })}
              className={`p-1 rounded ${prefs.tts_enabled ? 'text-indigo-400' : 'text-zinc-600'}`}
              aria-label={prefs.tts_enabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
            >
              {prefs.tts_enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
            <span className="text-[10px] text-zinc-600 font-mono">{prefs.color_mode}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto px-6 pb-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Color Mode</label>
            <select
              value={prefs.color_mode}
              onChange={(e) => update({ color_mode: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 text-xs outline-none"
              aria-label="Color mode"
            >
              {COLOR_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Font Size</label>
            <select
              value={prefs.font_size}
              onChange={(e) => update({ font_size: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 text-xs outline-none"
              aria-label="Font size"
            >
              {FONT_SIZES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">TTS</label>
            <button
              onClick={() => update({ tts_enabled: !prefs.tts_enabled })}
              className={`w-full p-1.5 rounded-md text-xs font-medium border ${prefs.tts_enabled ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
            >
              {prefs.tts_enabled ? 'TTS ON' : 'TTS OFF'}
            </button>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">TTS Speed</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={prefs.tts_speed}
              onChange={(e) => update({ tts_speed: parseFloat(e.target.value) })}
              className="w-full"
              aria-label={`TTS speed: ${prefs.tts_speed}x`}
              disabled={!prefs.tts_enabled}
            />
            <span className="text-[10px] text-zinc-600 font-mono">{prefs.tts_speed}x</span>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Motion</label>
            <button
              onClick={() => update({ motion_reduced: !prefs.motion_reduced })}
              className={`w-full p-1.5 rounded-md text-xs font-medium border ${prefs.motion_reduced ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
            >
              {prefs.motion_reduced ? 'Reduced' : 'Normal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
