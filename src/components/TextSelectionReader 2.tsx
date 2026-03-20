import React, { useEffect, useRef, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import type { AccessibilityPrefs } from '../types';

interface Props {
  prefs: AccessibilityPrefs;
}

interface BubbleState {
  text: string;
  x: number;
  y: number;
}

const WATSON_TTS_URL = '/api/accessibility/tts/speak';

async function speakWatson(
  text: string,
  voice: string,
  speed: number,
): Promise<boolean> {
  try {
    const resp = await fetch(WATSON_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 2000), voice, speed }),
    });
    if (!resp.ok) return false;
    const blob = await resp.blob();
    if (blob.size < 100) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

function speakBrowser(text: string, speed: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.slice(0, 2000));
  utt.rate = speed;
  window.speechSynthesis.speak(utt);
}

export function TextSelectionReader({ prefs }: Props) {
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingRef = useRef(false);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';
      if (!text || text.length < 3) {
        setBubble(null);
        return;
      }
      const rect = selection?.getRangeAt(0).getBoundingClientRect();
      if (!rect) return;

      const x = Math.min(rect.left + rect.width / 2, window.innerWidth - 140);
      const y = rect.top + window.scrollY - 48;

      setBubble({ text, x, y: Math.max(y, 8) });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setBubble(null), 5000);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBubble(null);
        window.speechSynthesis?.cancel();
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleRead = async () => {
    if (!bubble || readingRef.current) return;
    readingRef.current = true;
    setBubble(null);
    if (timerRef.current) clearTimeout(timerRef.current);

    const ok = await speakWatson(bubble.text, prefs.tts_voice, prefs.tts_speed);
    if (!ok) {
      speakBrowser(bubble.text, prefs.tts_speed);
    }
    readingRef.current = false;
  };

  const handleDismiss = () => {
    setBubble(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (!bubble) return null;

  return (
    <div
      role="dialog"
      aria-label="Read aloud selected text"
      style={{
        position: 'absolute',
        left: bubble.x,
        top: bubble.y,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
      className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 shadow-xl shadow-black/50 select-none"
    >
      <button
        onClick={handleRead}
        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors pr-1 border-r border-zinc-700"
        aria-label="Read selected text aloud"
      >
        <Volume2 size={13} />
        Read Aloud
      </button>
      <button
        onClick={handleDismiss}
        className="text-zinc-600 hover:text-zinc-400 transition-colors pl-1"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
