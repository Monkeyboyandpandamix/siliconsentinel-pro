import React, { useEffect, useRef, useState } from 'react';
import type { ThermalMapData, BlockSpec } from '../types';

interface Props {
  thermal: ThermalMapData;
  blocks: BlockSpec[];
}

export const ThermalHeatmap: React.FC<Props> = ({ thermal, blocks }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 450 });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const updateSize = () => {
      setSize({
        width: Math.max(container.clientWidth, 320),
        height: Math.max(container.clientHeight, 240),
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = size.width;
    const cssHeight = size.height;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = cssWidth;
    const h = cssHeight;
    const pad = 40;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Chip border
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    const grid = Array.isArray(thermal.grid) ? thermal.grid : [];
    const res = grid.length;
    if (res === 0) return;

    const cellW = (w - pad * 2) / res;
    const cellH = (h - pad * 2) / res;

    const tMin = thermal.min_temp_c;
    const tMax = thermal.max_temp_c;
    const tRange = Math.max(tMax - tMin, 1);

    // Colorblind-safe sequential palette (white → blue → dark blue)
    for (let row = 0; row < res; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const t = grid[row][col];
        const norm = (t - tMin) / tRange;

        // Sequential: cool (dark blue) → warm (yellow/red)
        const r = Math.floor(norm * 255);
        const g = Math.floor(Math.max(0, (1 - Math.abs(norm - 0.5) * 2)) * 180);
        const b = Math.floor((1 - norm) * 200);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.fillRect(pad + col * cellW, pad + row * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Block outlines + text labels
    ctx.globalCompositeOperation = 'source-over';
    blocks.forEach(block => {
      const normalizedWidth = block.width || Math.max(6, Math.sqrt(block.area_mm2) * 8);
      const normalizedHeight = block.height || Math.max(6, Math.sqrt(block.area_mm2) * 8);
      const bx = (block.x / 100) * (w - pad * 2) + pad;
      const by = (block.y / 100) * (h - pad * 2) + pad;
      const bw = (normalizedWidth / 100) * (w - pad * 2);
      const bh = (normalizedHeight / 100) * (h - pad * 2);

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(block.name, bx + 3, by + 10);
    });

    // Zone temperature labels
    thermal.zones.forEach(zone => {
      const block = blocks.find(b => b.id === zone.block_id);
      if (!block) return;
      const bx = (block.x / 100) * (w - pad * 2) + pad;
      const by = (block.y / 100) * (h - pad * 2) + pad;
      const normalizedWidth = block.width || Math.max(6, Math.sqrt(block.area_mm2) * 8);
      const normalizedHeight = block.height || Math.max(6, Math.sqrt(block.area_mm2) * 8);
      const bw = (normalizedWidth / 100) * (w - pad * 2);
      const bh = (normalizedHeight / 100) * (h - pad * 2);

      ctx.fillStyle = zone.status === 'CRITICAL' ? '#ef4444' : zone.status === 'WARNING' ? '#f59e0b' : '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${zone.temperature_c.toFixed(0)}°C`, bx + bw / 2, by + bh / 2 + 3);
      ctx.textAlign = 'start';
    });
  }, [blocks, size.height, size.width, thermal]);

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase font-mono text-zinc-400">Thermal Behavior Map</h3>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
          <span>Ambient: {thermal.ambient_temp_c}°C</span>
          <span>Max: {thermal.max_temp_c.toFixed(1)}°C</span>
          {thermal.hotspot_count > 0 && <span className="text-red-400">{thermal.hotspot_count} hotspot{thermal.hotspot_count > 1 ? 's' : ''}</span>}
        </div>
      </div>
      <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-800">
        <canvas ref={canvasRef} className="w-full h-full" role="img" aria-label="Thermal heatmap of chip die" />
        <div className="absolute bottom-3 right-3 flex flex-col gap-0.5">
          <div className="w-24 h-2 rounded" style={{ background: 'linear-gradient(to right, #0000c8, #00b400, #ffc800, #ff0000)' }} />
          <div className="flex justify-between text-[8px] text-zinc-400 font-mono">
            <span>{thermal.min_temp_c.toFixed(0)}°C</span>
            <span>{thermal.max_temp_c.toFixed(0)}°C</span>
          </div>
        </div>
      </div>

      {/* Zone status table */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {thermal.zones.map(z => (
          <div key={z.block_id} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${z.status === 'CRITICAL' ? 'bg-red-500' : z.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-zinc-400 truncate">{z.block_name}</span>
            <span className="text-zinc-300 font-mono ml-auto">{z.temperature_c.toFixed(0)}°C</span>
            <span className={`text-[10px] font-bold ${z.status === 'CRITICAL' ? 'text-red-400' : z.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>{z.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
