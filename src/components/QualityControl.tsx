import React, { useRef, useState } from 'react';
import { Upload, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import type { QualityCheckResponse } from '../types';

interface Props {
  onUpload: (file: File) => void;
  result: QualityCheckResponse | null;
  loading: boolean;
}

export function QualityControl({ onUpload, result, loading }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`bg-zinc-900/50 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 hover:border-zinc-600'
        }`}
        onClick={() => fileRef.current?.click()}
        role="button"
        aria-label="Upload chip image for quality inspection"
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-indigo-400" size={32} />
            <p className="text-sm text-zinc-400">Analyzing image for defects...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-zinc-600" size={32} />
            <p className="text-sm text-zinc-400">Drop a fabricated chip image here, or click to browse</p>
            <p className="text-[10px] text-zinc-600">Supports JPEG, PNG — die photograph or SEM image</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict */}
          <div className={`p-5 rounded-xl border text-center ${
            result.pass_fail === 'PASS'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {result.pass_fail === 'PASS' ? <ShieldCheck className="text-emerald-400" size={24} /> : <AlertTriangle className="text-red-400" size={24} />}
              <span className={`text-2xl font-bold ${result.pass_fail === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.pass_fail}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              {result.defect_count} defect{result.defect_count !== 1 ? 's' : ''} detected — Confidence: {(result.confidence * 100).toFixed(0)}%
            </p>
          </div>

          {/* Defect list */}
          {result.defects.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
              <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Defect Classification</h3>
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="text-[10px] text-zinc-500 uppercase font-mono">
                    <th className="text-left pb-2" scope="col">Type</th>
                    <th className="text-left pb-2" scope="col">Severity</th>
                    <th className="text-right pb-2" scope="col">Size (µm)</th>
                    <th className="text-right pb-2" scope="col">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {result.defects.map((d, i) => (
                    <tr key={i} className="border-t border-zinc-800/50">
                      <td className="py-1.5 text-zinc-200">{d.type}</td>
                      <td className="py-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          d.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                          d.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          d.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-zinc-700/50 text-zinc-400'
                        }`}>{d.severity}</span>
                      </td>
                      <td className="py-1.5 text-right text-zinc-400 font-mono">{d.size_um.toFixed(1)}</td>
                      <td className="py-1.5 text-right text-zinc-400 font-mono">{(d.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Root cause */}
          {result.root_cause && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
              <h3 className="text-xs uppercase font-mono text-zinc-400 mb-2">Root Cause Hypothesis</h3>
              <p className="text-sm text-zinc-300">{result.root_cause}</p>
            </div>
          )}

          {/* Design rule updates */}
          {result.design_rule_updates.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
              <h3 className="text-xs uppercase font-mono text-zinc-400 mb-3">Suggested Design Rule Updates</h3>
              <div className="space-y-2">
                {result.design_rule_updates.map((u, i) => (
                  <div key={i} className="text-sm border-l-2 border-indigo-500/50 pl-3">
                    <p className="text-zinc-200 font-medium">{u.rule}</p>
                    <p className="text-xs text-zinc-500">
                      {u.current_value} → <span className="text-indigo-400">{u.suggested_value}</span>
                    </p>
                    <p className="text-xs text-zinc-600">{u.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
