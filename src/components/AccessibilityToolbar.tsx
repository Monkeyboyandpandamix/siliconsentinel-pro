import React, { useState } from 'react';
import { Eye, Volume2, VolumeX } from 'lucide-react';
import type { AccessibilityPrefs } from '../types';

const COLOR_MODES = [
  { id: 'default',       label: 'Default (Colorblind-Safe)',  swatch: '#6366f1' },
  { id: 'high_contrast', label: 'High Contrast',              swatch: '#ffffff' },
  { id: 'pattern_color', label: 'Pattern + Color',            swatch: '#f59e0b' },
  { id: 'grayscale',     label: 'Grayscale',                  swatch: '#71717a' },
  { id: 'warm_amber',    label: 'Warm Amber',                 swatch: '#d97706' },
  { id: 'cool_blue',     label: 'Cool Blue',                  swatch: '#38bdf8' },
  { id: 'dark_sepia',    label: 'Dark Sepia',                 swatch: '#92400e' },
  { id: 'neon',          label: 'Neon / High Saturation',     swatch: '#a855f7' },
  { id: 'night',         label: 'Night / Dim',                swatch: '#1e293b' },
  { id: 'deuteranopia',  label: 'Deuteranopia Safe',          swatch: '#fb923c' },
  { id: 'tritanopia',    label: 'Tritanopia Safe',            swatch: '#f43f5e' },
];

const FONT_SIZES = [
  { id: 'standard',    label: 'Standard' },
  { id: 'large',       label: 'Large' },
  { id: 'extra_large', label: 'Extra Large' },
];

const TTS_VOICES = [
  { id: 'female',    label: 'Allison (Female, US)' },
  { id: 'male',      label: 'Henry (Male, US)' },
  { id: 'lisa',      label: 'Lisa (Female, US)' },
  { id: 'michael',   label: 'Michael (Male, US)' },
  { id: 'kevin',     label: 'Kevin (Male, US)' },
  { id: 'olivia',    label: 'Olivia (Female, UK)' },
  { id: 'charlotte', label: 'Charlotte (Female, UK)' },
];

interface Props {
  prefs: AccessibilityPrefs;
  onChange: (prefs: AccessibilityPrefs) => void;
}

export function AccessibilityToolbar({ prefs, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [testingTts, setTestingTts] = useState(false);

  const update = (patch: Partial<AccessibilityPrefs>) => {
    onChange({ ...prefs, ...patch });
  };

  const handleTestTts = async () => {
    if (testingTts) return;
    setTestingTts(true);
    try {
      const resp = await fetch('/api/accessibility/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Watson Neural Text-to-Speech is working correctly.',
          voice: prefs.tts_voice,
          speed: prefs.tts_speed,
        }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob.size > 100) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          audio.onended = () => URL.revokeObjectURL(url);
        }
      } else {
        const utt = new SpeechSynthesisUtterance('Text to speech is active.');
        utt.rate = prefs.tts_speed;
        window.speechSynthesis.speak(utt);
      }
    } catch {
      const utt = new SpeechSynthesisUtterance('Text to speech is active.');
      utt.rate = prefs.tts_speed;
      window.speechSynthesis.speak(utt);
    } finally {
      setTestingTts(false);
    }
  };

  const currentMode = COLOR_MODES.find(m => m.id === prefs.color_mode);

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
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full border border-zinc-700"
                style={{ backgroundColor: currentMode?.swatch ?? '#6366f1' }}
              />
              <span className="text-[10px] text-zinc-600 font-mono">{currentMode?.label ?? prefs.color_mode}</span>
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto px-6 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Color Mode */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Color Mode</label>
            <div className="grid grid-cols-2 gap-1">
              {COLOR_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => update({ color_mode: m.id })}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-colors ${
                    prefs.color_mode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                  aria-pressed={prefs.color_mode === m.id}
                  title={m.label}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.swatch }}
                  />
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Font Size</label>
            <div className="space-y-1">
              {FONT_SIZES.map(f => (
                <button
                  key={f.id}
                  onClick={() => update({ font_size: f.id })}
                  className={`w-full px-2 py-1 rounded-md text-[10px] border transition-colors ${
                    prefs.font_size === f.id
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* TTS Voice */}
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">TTS Voice</label>
            <select
              value={prefs.tts_voice}
              onChange={(e) => update({ tts_voice: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 text-[10px] text-zinc-300 outline-none focus:border-indigo-500/50"
              aria-label="TTS voice"
            >
              {TTS_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>

          {/* TTS Speed */}
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">
              TTS Speed — {prefs.tts_speed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={prefs.tts_speed}
              onChange={(e) => update({ tts_speed: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
              aria-label={`TTS speed: ${prefs.tts_speed}x`}
            />
            <div className="flex justify-between text-[9px] text-zinc-700 mt-0.5">
              <span>0.5×</span><span>2.0×</span>
            </div>
          </div>

          {/* TTS & Motion controls */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-mono uppercase block mb-1">Controls</label>
            <button
              onClick={() => update({ tts_enabled: !prefs.tts_enabled })}
              className={`w-full p-1.5 rounded-md text-[10px] font-medium border transition-colors ${
                prefs.tts_enabled
                  ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {prefs.tts_enabled ? '🔊 TTS ON' : '🔇 TTS OFF'}
            </button>
            <button
              onClick={handleTestTts}
              disabled={testingTts}
              className="w-full p-1.5 rounded-md text-[10px] font-medium border bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-indigo-500/40 hover:text-indigo-400 transition-colors disabled:opacity-40"
            >
              {testingTts ? 'Playing…' : '▶ Test Voice'}
            </button>
            <button
              onClick={() => update({ motion_reduced: !prefs.motion_reduced })}
              className={`w-full p-1.5 rounded-md text-[10px] font-medium border transition-colors ${
                prefs.motion_reduced
                  ? 'bg-amber-600/20 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {prefs.motion_reduced ? '⏸ Reduced Motion' : '▶ Normal Motion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
