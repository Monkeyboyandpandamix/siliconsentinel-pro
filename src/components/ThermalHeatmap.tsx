import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ThermalMapData, BlockSpec } from '../types';

interface Props {
  thermal: ThermalMapData;
  blocks: BlockSpec[];
}

// Map a temperature (tMin..tMax) to an RGB color using a perceptually clear
// cool-to-hot palette: deep blue → cyan → green → yellow → orange → red
function tempToRGB(norm: number): [number, number, number] {
  // Five-stop gradient
  const stops: [number, [number, number, number]][] = [
    [0.00, [20, 40, 120]],
    [0.25, [20, 140, 200]],
    [0.50, [30, 180, 80]],
    [0.70, [230, 200, 20]],
    [0.85, [240, 100, 20]],
    [1.00, [220, 20, 20]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (norm >= stops[i][0] && norm <= stops[i + 1][0]) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const t = (norm - lo[0]) / Math.max(hi[0] - lo[0], 0.001);
  return [
    Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * t),
    Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * t),
    Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * t),
  ];
}

// Map physics coordinates to canvas pixels.
// The backend thermal model (`compute_thermal_map`) treats block {x,y,width,height}
// as 0–100 "die-normalized" units (it divides by 100 internally).
// Therefore the frontend must use the same 0–100 coordinate system so the
// block overlays align with the heat grid cells.
function mapBlocksToCanvas(
  blocks: BlockSpec[],
  canvasW: number,
  canvasH: number,
  pad: number,
): Array<{ bx: number; by: number; bw: number; bh: number; block: BlockSpec }> {
  if (!blocks.length) return [];

  const innerW = canvasW - pad * 2;
  const innerH = canvasH - pad * 2;
  const n = blocks.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  const areas = blocks.map(b => b.area_mm2 ?? 0);
  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  const areaRange = Math.max(maxArea - minArea, 1e-9);

  return blocks.map((block, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const rawW = block.width ?? 12;
    const rawH = block.height ?? 12;
    const aspect = rawW / Math.max(rawH, 1e-6);

    const area_mm2 = block.area_mm2 ?? 0;
    const areaFrac = 0.45 + 0.55 * ((area_mm2 - minArea) / areaRange);

    const maxBlockW = cellW * 0.95;
    const maxBlockH = cellH * 0.95;

    let bw = Math.max(cellW * 0.05, Math.min(maxBlockW, areaFrac * maxBlockW));
    let bh = bw / Math.max(aspect, 1e-6);
    if (bh > maxBlockH) {
      bh = maxBlockH;
      bw = bh * aspect;
    }

    const bx = pad + col * cellW + (cellW - bw) / 2;
    const by = pad + row * cellH + (cellH - bh) / 2;

    // Safety clamps for rendering.
    return {
      bx,
      by,
      bw: Math.max(bw, 30),
      bh: Math.max(bh, 20),
      block,
    };
  });
}

export const ThermalHeatmap: React.FC<Props> = ({ thermal, blocks }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; temp: number } | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      const el = containerRef.current;
      if (!el) return;
      setSize({ width: Math.max(el.clientWidth, 300), height: Math.max(el.clientHeight, 220) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width: w, height: h } = size;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 36;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 0.5;
    for (let x = pad; x <= w - pad; x += 20) { ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke(); }
    for (let y = pad; y <= h - pad; y += 20) { ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }

    const grid = Array.isArray(thermal.grid) ? thermal.grid : [];
    const res = grid.length;
    // Use raw grid values for min/max (backend min/max are rounded to 0.1°C),
    // otherwise we often compress the dynamic range and everything looks uniform.
    let tMin = thermal.min_temp_c;
    let tMax = thermal.max_temp_c;
    if (res > 0 && Array.isArray(grid[0]) && grid[0].length > 0) {
      let rawMin = Number.POSITIVE_INFINITY;
      let rawMax = Number.NEGATIVE_INFINITY;
      for (let r = 0; r < res; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const v = grid[r][c];
          if (typeof v !== 'number' || Number.isNaN(v)) continue;
          if (v < rawMin) rawMin = v;
          if (v > rawMax) rawMax = v;
        }
      }
      if (Number.isFinite(rawMin) && Number.isFinite(rawMax) && rawMax > rawMin) {
        tMin = rawMin;
        tMax = rawMax;
      }
    }
    const tRange = Math.max(tMax - tMin, 1e-6);
    const gamma = 0.65; // boosts contrast for small deltas

    if (res > 0) {
      const cols = grid[0]?.length || res;
      const cellW = (w - pad * 2) / cols;
      const cellH = (h - pad * 2) / res;

      // Draw heatmap grid with smooth interpolation
      for (let row = 0; row < res; row++) {
        for (let col = 0; col < (grid[row]?.length || cols); col++) {
          const t = grid[row]?.[col] ?? tMin;
          const normRaw = Math.min(1, Math.max(0, (t - tMin) / tRange));
          const norm = Math.pow(normRaw, gamma);
          const [r, g, b] = tempToRGB(norm);
          ctx.fillStyle = `rgba(${r},${g},${b},0.72)`;
          ctx.fillRect(pad + col * cellW - 0.5, pad + row * cellH - 0.5, cellW + 1, cellH + 1);
        }
      }
    }

    // Chip die border
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    // Block overlays
    const mappedBlocks = mapBlocksToCanvas(blocks, w, h, pad);
    mappedBlocks.forEach(({ bx, by, bw, bh, block }) => {
      const isHovered = hoveredZone === block.id;
      const zone = thermal.zones.find(z => z.block_id === block.id);
      const zoneHotColor = zone
        ? (() => {
          const normRaw = Math.min(1, Math.max(0, (zone.temperature_c - tMin) / Math.max(tRange, 1e-6)));
          const norm = Math.pow(normRaw, gamma);
          const [r, g, b] = tempToRGB(norm);
          return `rgb(${r},${g},${b})`;
        })()
        : '#6366f1';
      const zoneColor = zone
        ? zone.status === 'CRITICAL'
          ? '#ef4444'
          : zone.status === 'WARNING'
            ? '#f59e0b'
            : zoneHotColor
        : zoneHotColor;

      // Semi-transparent interior tint so heat "fills" the block footprint.
      if (zone) {
        ctx.fillStyle =
          zone.status === 'CRITICAL'
            ? 'rgba(239,68,68,0.18)'
            : zone.status === 'WARNING'
              ? 'rgba(245,158,11,0.16)'
              : (() => {
                const normRaw = Math.min(1, Math.max(0, (zone.temperature_c - tMin) / Math.max(tRange, 1e-6)));
                const norm = Math.pow(normRaw, gamma);
                const [r, g, b] = tempToRGB(norm);
                return `rgba(${r},${g},${b},0.12)`;
              })();
        ctx.beginPath();
        ctx.roundRect?.(bx, by, bw, bh, 4);
        ctx.fill();
      }

      // Block outline
      ctx.strokeStyle = isHovered ? zoneColor : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isHovered ? 2.5 : 1;
      ctx.setLineDash(isHovered ? [] : [4, 3]);
      ctx.beginPath();
      ctx.roundRect?.(bx, by, bw, bh, 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Block name label
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const lblW = Math.min(bw - 4, 90);
      const lblH = 14;
      ctx.fillRect(bx + 2, by + 2, lblW, lblH);

      ctx.fillStyle = isHovered ? zoneColor : 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${isHovered ? 8 : 7}px monospace`;
      ctx.fillText(block.name.length > 12 ? block.name.slice(0, 12) + '…' : block.name, bx + 5, by + 12);

      // Temperature badge (if zone data)
      if (zone) {
        const tempStr = `${zone.temperature_c.toFixed(0)}°C`;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = zone.status === 'CRITICAL'
          ? '#ef4444'
          : zone.status === 'WARNING'
            ? '#f59e0b'
            : zoneHotColor;
        ctx.fillText(tempStr, bx + bw / 2, by + bh / 2 + 4);
        ctx.textAlign = 'start';

        // Status tag
        if (zone.status !== 'SAFE') {
          const tagW = zone.status === 'CRITICAL' ? 46 : 50;
          ctx.fillStyle = zone.status === 'CRITICAL' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)';
          ctx.fillRect(bx + bw / 2 - tagW / 2, by + bh - 16, tagW, 12);
          ctx.fillStyle = zone.status === 'CRITICAL' ? '#f87171' : '#fbbf24';
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(zone.status, bx + bw / 2, by + bh - 7);
          ctx.textAlign = 'start';
        }
      }
    });

    // Temperature axis labels (right side)
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const norm = i / labelCount;
      const temp = tMin + norm * tRange;
      const y = h - pad - norm * (h - pad * 2);
      const [r, g, b] = tempToRGB(Math.pow(norm, gamma));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.font = '8px monospace';
      ctx.fillText(`${temp.toFixed(0)}°`, w - pad + 4, y + 3);

      // Tick line
      ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    // Colorbar (right edge)
    const barX = w - pad + 16;
    const barH = h - pad * 2;
    const barGrad = ctx.createLinearGradient(0, h - pad, 0, pad);
    const barStops: [number, [number, number, number]][] = [[0, [20,40,120]],[0.25,[20,140,200]],[0.5,[30,180,80]],[0.7,[230,200,20]],[0.85,[240,100,20]],[1,[220,20,20]]];
    barStops.forEach(([stop, [r, g, b]]) => barGrad.addColorStop(stop, `rgb(${r},${g},${b})`));
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, pad, 8, barH);
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, pad, 8, barH);

  }, [thermal, blocks, size, hoveredZone]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !thermal.grid?.length) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = size.width / rect.width;
    const scaleY = size.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const pad = 36;
    const res = thermal.grid.length;
    const cols = thermal.grid[0]?.length || res;
    const innerW = size.width - pad * 2;
    const innerH = size.height - pad * 2;

    if (mx < pad || mx > size.width - pad || my < pad || my > size.height - pad) {
      setTooltip(null);
      return;
    }

    const col = Math.floor(((mx - pad) / innerW) * cols);
    const row = Math.floor(((my - pad) / innerH) * res);
    const temp = thermal.grid[Math.min(row, res - 1)]?.[Math.min(col, cols - 1)];
    if (temp !== undefined) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, temp });
    }
  }, [thermal, size]);

  const criticalCount = thermal.zones.filter(z => z.status === 'CRITICAL').length;
  const warningCount = thermal.zones.filter(z => z.status === 'WARNING').length;

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/60">
        <div>
          <h3 className="text-zinc-100 font-bold text-sm">Thermal Behavior Map</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Hover over the map to read temperature · Hover zone rows to highlight blocks
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-zinc-500">Ambient: {thermal.ambient_temp_c}°C</span>
          <span className="text-zinc-300">Max: <span className="text-red-400 font-bold">{thermal.max_temp_c.toFixed(1)}°C</span></span>
          {criticalCount > 0 && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/30">{criticalCount} CRITICAL</span>}
          {warningCount > 0 && <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-500/30">{warningCount} WARNING</span>}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ height: '340px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          role="img"
          aria-label="Thermal heatmap showing temperature distribution across chip die"
        />
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <span className="text-zinc-400">Temp: </span>
            <span className={`font-bold ${tooltip.temp > thermal.max_temp_c * 0.9 ? 'text-red-400' : tooltip.temp > thermal.max_temp_c * 0.7 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {tooltip.temp.toFixed(1)}°C
            </span>
          </div>
        )}
      </div>

      {/* Zone table */}
      {thermal.zones.length > 0 && (
        <div className="border-t border-zinc-800/60 p-3">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2">Block Temperature Zones</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {thermal.zones.map(z => {
              const tRangeZones = Math.max(thermal.max_temp_c - thermal.min_temp_c, 1e-6);
              const norm = Math.min(1, Math.max(0, (z.temperature_c - thermal.min_temp_c) / tRangeZones));
              const [r, g, b] = tempToRGB(norm);
              const safeColor = `rgb(${r},${g},${b})`;

              return (
                <div
                  key={z.block_id}
                  className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    hoveredZone === z.block_id ? 'bg-zinc-700/50 ring-1 ring-zinc-600' : 'bg-zinc-800/40 hover:bg-zinc-800/70'
                  }`}
                  onMouseEnter={() => setHoveredZone(z.block_id)}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      z.status === 'CRITICAL'
                        ? 'bg-red-500 ring-2 ring-red-500/30'
                        : z.status === 'WARNING'
                          ? 'bg-amber-500'
                          : ''
                    }`}
                    style={z.status === 'SAFE' ? { backgroundColor: safeColor } : undefined}
                  />
                  <span className="text-zinc-300 truncate flex-1 font-mono text-[10px]">{z.block_name}</span>
                  <span className="text-zinc-200 font-mono font-bold text-[10px] ml-auto">{z.temperature_c.toFixed(0)}°C</span>
                  <span className={`text-[9px] font-bold px-1 rounded ${
                    z.status === 'CRITICAL'
                      ? 'text-red-400 bg-red-500/10'
                      : z.status === 'WARNING'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-emerald-400'
                  }`}>{z.status}</span>
                </div>
              );
            })}
          </div>

          {/* Thermal gradient legend */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[9px] text-zinc-600 font-mono">{thermal.min_temp_c.toFixed(0)}°C</span>
            <div className="flex-1 h-2 rounded"
              style={{ background: 'linear-gradient(to right, rgb(20,40,120), rgb(20,140,200), rgb(30,180,80), rgb(230,200,20), rgb(240,100,20), rgb(220,20,20))' }} />
            <span className="text-[9px] text-zinc-600 font-mono">{thermal.max_temp_c.toFixed(0)}°C</span>
          </div>
          <div className="flex justify-between text-[8px] text-zinc-700 font-mono mt-0.5 px-6">
            <span>Cool</span><span>Warm</span><span>Hot</span>
          </div>
        </div>
      )}
    </div>
  );
};
