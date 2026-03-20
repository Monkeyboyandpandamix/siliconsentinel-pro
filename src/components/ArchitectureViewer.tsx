import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { ArchitectureBlueprint, BlockSpec } from '../types';

interface Props {
  architecture: ArchitectureBlueprint;
}

const BLOCK_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  cpu:         { fill: '#ef4444', stroke: '#f87171', glow: 'rgba(239,68,68,0.25)' },
  memory:      { fill: '#3b82f6', stroke: '#60a5fa', glow: 'rgba(59,130,246,0.25)' },
  io:          { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16,185,129,0.25)' },
  power:       { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245,158,11,0.25)' },
  rf:          { fill: '#8b5cf6', stroke: '#a78bfa', glow: 'rgba(139,92,246,0.25)' },
  analog:      { fill: '#ec4899', stroke: '#f472b6', glow: 'rgba(236,72,153,0.25)' },
  dsp:         { fill: '#06b6d4', stroke: '#22d3ee', glow: 'rgba(6,182,212,0.25)' },
  accelerator: { fill: '#f97316', stroke: '#fb923c', glow: 'rgba(249,115,22,0.25)' },
};

function getColor(type: string) {
  return BLOCK_COLORS[type] || BLOCK_COLORS.cpu;
}

const MIN_BLOCK_W = 80;
const MIN_BLOCK_H = 50;
const CANVAS_W = 900;
const CANVAS_H = 600;
const CHIP_PAD = 50;

interface LayoutBlock extends BlockSpec {
  lx: number;
  ly: number;
  lw: number;
  lh: number;
}

function computeLayout(blocks: BlockSpec[]): LayoutBlock[] {
  if (!blocks.length) return [];

  const innerW = CANVAS_W - CHIP_PAD * 2;
  const innerH = CANVAS_H - CHIP_PAD * 2;

  const maxArea = Math.max(...blocks.map(b => b.area_mm2));
  const minArea = Math.min(...blocks.map(b => b.area_mm2));
  const areaRange = maxArea - minArea || 1;

  const scaled = blocks.map(b => {
    const areaFrac = 0.4 + 0.6 * ((b.area_mm2 - minArea) / areaRange);
    const maxBlockW = innerW / 3;
    const maxBlockH = innerH / 3;
    const w = Math.max(MIN_BLOCK_W, Math.min(maxBlockW, areaFrac * maxBlockW));
    const h = Math.max(MIN_BLOCK_H, Math.min(maxBlockH, areaFrac * maxBlockH));
    return { ...b, lw: w, lh: h, lx: 0, ly: 0 };
  });

  const aiPositionsUsable = hasReasonablePositions(blocks);

  if (aiPositionsUsable) {
    scaled.forEach(b => {
      b.lx = CHIP_PAD + (b.x / 100) * (innerW - b.lw);
      b.ly = CHIP_PAD + (b.y / 100) * (innerH - b.lh);
    });
    resolveOverlaps(scaled);
  } else {
    gridLayout(scaled);
  }

  return scaled;
}

function hasReasonablePositions(blocks: BlockSpec[]): boolean {
  if (blocks.length <= 1) return true;
  const positions = blocks.map(b => ({ x: b.x, y: b.y }));
  const xs = new Set(positions.map(p => Math.round(p.x / 5)));
  const ys = new Set(positions.map(p => Math.round(p.y / 5)));
  return xs.size >= Math.min(blocks.length, 2) || ys.size >= Math.min(blocks.length, 2);
}

function gridLayout(blocks: LayoutBlock[]) {
  const cols = Math.ceil(Math.sqrt(blocks.length));
  const rows = Math.ceil(blocks.length / cols);
  const cellW = (CANVAS_W - CHIP_PAD * 2) / cols;
  const cellH = (CANVAS_H - CHIP_PAD * 2) / rows;

  blocks.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    b.lw = Math.min(b.lw, cellW - 16);
    b.lh = Math.min(b.lh, cellH - 16);
    b.lx = CHIP_PAD + col * cellW + (cellW - b.lw) / 2;
    b.ly = CHIP_PAD + row * cellH + (cellH - b.lh) / 2;
  });
}

function resolveOverlaps(blocks: LayoutBlock[]) {
  const pad = 8;
  for (let iter = 0; iter < 50; iter++) {
    let moved = false;
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i], b = blocks[j];
        const overlapX = (a.lx + a.lw + pad) - b.lx;
        const overlapY = (a.ly + a.lh + pad) - b.ly;
        if (overlapX > 0 && (a.ly < b.ly + b.lh + pad && a.ly + a.lh + pad > b.ly)) {
          const overlapXR = (b.lx + b.lw + pad) - a.lx;
          const overlapYT = (a.ly + a.lh + pad) - b.ly;
          const overlapYB = (b.ly + b.lh + pad) - a.ly;
          if (overlapX > 0 && overlapXR > 0 && overlapYT > 0 && overlapYB > 0) {
            const shift = Math.min(overlapX, overlapXR, overlapYT, overlapYB);
            if (shift === overlapX || shift === overlapXR) {
              a.lx -= shift / 2;
              b.lx += shift / 2;
            } else {
              a.ly -= shift / 2;
              b.ly += shift / 2;
            }
            moved = true;
          }
        }
      }
    }
    if (!moved) break;
  }
  clampToChip(blocks);
}

function clampToChip(blocks: LayoutBlock[]) {
  const minX = CHIP_PAD + 6;
  const minY = CHIP_PAD + 6;
  const maxX = CANVAS_W - CHIP_PAD - 6;
  const maxY = CANVAS_H - CHIP_PAD - 6;
  blocks.forEach(b => {
    b.lx = Math.max(minX, Math.min(maxX - b.lw, b.lx));
    b.ly = Math.max(minY, Math.min(maxY - b.lh, b.ly));
  });
}

export const ArchitectureViewer: React.FC<Props> = ({ architecture }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [showWiring, setShowWiring] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<LayoutBlock | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const layoutRef = useRef<LayoutBlock[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition().duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const fitToView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !layoutRef.current.length) return;
    const blocks = layoutRef.current;
    const xMin = Math.min(...blocks.map(b => b.lx)) - 20;
    const yMin = Math.min(...blocks.map(b => b.ly)) - 20;
    const xMax = Math.max(...blocks.map(b => b.lx + b.lw)) + 20;
    const yMax = Math.max(...blocks.map(b => b.ly + b.lh)) + 20;
    const bw = xMax - xMin;
    const bh = yMax - yMin;
    const scale = Math.min(CANVAS_W / bw, CANVAS_H / bh, 1.5) * 0.9;
    const tx = (CANVAS_W - bw * scale) / 2 - xMin * scale;
    const ty = (CANVAS_H - bh * scale) / 2 - yMin * scale;
    d3.select(svgRef.current)
      .transition().duration(500)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !architecture?.blocks?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const layout = computeLayout(architecture.blocks);
    layoutRef.current = layout;
    const blockMap = new Map(layout.map(b => [b.id, b]));

    // Defs for filters and gradients
    const defs = svg.append('defs');

    defs.append('filter')
      .attr('id', 'block-shadow')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '140%')
      .append('feDropShadow')
      .attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4)
      .attr('flood-color', 'rgba(0,0,0,0.5)');

    defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
      .append('feGaussianBlur')
      .attr('stdDeviation', 6)
      .attr('result', 'coloredBlur');

    // Zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // Background grid
    const gridGroup = zoomGroup.append('g').attr('class', 'grid');
    for (let x = 0; x <= CANVAS_W; x += 20) {
      gridGroup.append('line')
        .attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', CANVAS_H)
        .attr('stroke', '#1a1a1f').attr('stroke-width', 0.5);
    }
    for (let y = 0; y <= CANVAS_H; y += 20) {
      gridGroup.append('line')
        .attr('x1', 0).attr('y1', y).attr('x2', CANVAS_W).attr('y2', y)
        .attr('stroke', '#1a1a1f').attr('stroke-width', 0.5);
    }

    // Chip die outline
    zoomGroup.append('rect')
      .attr('x', CHIP_PAD - 10).attr('y', CHIP_PAD - 10)
      .attr('width', CANVAS_W - (CHIP_PAD - 10) * 2)
      .attr('height', CANVAS_H - (CHIP_PAD - 10) * 2)
      .attr('fill', '#0a0a0f')
      .attr('stroke', '#27272a').attr('stroke-width', 2).attr('rx', 6);

    // Bond pad ring
    const padRing = zoomGroup.append('g').attr('class', 'pad-ring');
    const padCount = 24;
    const padSize = 6;
    const ringX = CHIP_PAD - 4;
    const ringY = CHIP_PAD - 4;
    const ringW = CANVAS_W - (CHIP_PAD - 4) * 2;
    const ringH = CANVAS_H - (CHIP_PAD - 4) * 2;
    for (let i = 0; i < padCount; i++) {
      // Top
      padRing.append('rect')
        .attr('x', ringX + (i + 0.5) * (ringW / padCount) - padSize / 2).attr('y', ringY - padSize)
        .attr('width', padSize).attr('height', padSize)
        .attr('fill', '#3f3f46').attr('rx', 1);
      // Bottom
      padRing.append('rect')
        .attr('x', ringX + (i + 0.5) * (ringW / padCount) - padSize / 2).attr('y', ringY + ringH)
        .attr('width', padSize).attr('height', padSize)
        .attr('fill', '#3f3f46').attr('rx', 1);
    }
    for (let i = 0; i < Math.floor(padCount * (ringH / ringW)); i++) {
      const vertCount = Math.floor(padCount * (ringH / ringW));
      // Left
      padRing.append('rect')
        .attr('x', ringX - padSize).attr('y', ringY + (i + 0.5) * (ringH / vertCount) - padSize / 2)
        .attr('width', padSize).attr('height', padSize)
        .attr('fill', '#3f3f46').attr('rx', 1);
      // Right
      padRing.append('rect')
        .attr('x', ringX + ringW).attr('y', ringY + (i + 0.5) * (ringH / vertCount) - padSize / 2)
        .attr('width', padSize).attr('height', padSize)
        .attr('fill', '#3f3f46').attr('rx', 1);
    }

    // Process label
    zoomGroup.append('text')
      .text(`${architecture.process_node} | ${architecture.metal_layers}M | ${architecture.substrate} | ${architecture.interconnect}`)
      .attr('x', CHIP_PAD).attr('y', CHIP_PAD - 16)
      .attr('fill', '#3f3f46').attr('font-size', '9px').attr('font-family', 'monospace');

    // Wiring layer
    const wiringGroup = zoomGroup.append('g').attr('class', 'wiring');

    function drawWires() {
      wiringGroup.selectAll('*').remove();
      if (!showWiring) return;

      layout.forEach(block => {
        block.connections.forEach(targetId => {
          const target = blockMap.get(targetId);
          if (!target) return;

          const x1 = block.lx + block.lw / 2;
          const y1 = block.ly + block.lh / 2;
          const x2 = target.lx + target.lw / 2;
          const y2 = target.ly + target.lh / 2;

          const isHighlighted = hoveredBlock === block.id || hoveredBlock === targetId;
          const opacity = hoveredBlock ? (isHighlighted ? 0.9 : 0.1) : 0.4;
          const width = isHighlighted ? 2.5 : 1.2;

          // Manhattan routing
          const midX = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

          wiringGroup.append('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', isHighlighted ? '#818cf8' : '#4f46e5')
            .attr('stroke-width', width)
            .attr('stroke-opacity', opacity)
            .attr('stroke-dasharray', isHighlighted ? 'none' : '6,3')
            .style('transition', 'stroke-opacity 0.15s, stroke-width 0.15s');

          // Junction dots
          [{ cx: midX, cy: y1 }, { cx: midX, cy: y2 }].forEach(pt => {
            wiringGroup.append('circle')
              .attr('cx', pt.cx).attr('cy', pt.cy).attr('r', isHighlighted ? 3 : 2)
              .attr('fill', '#6366f1').attr('opacity', opacity);
          });
        });
      });
    }

    drawWires();

    // Block groups
    const blocksGroup = zoomGroup.append('g').attr('class', 'blocks');

    const drag = d3.drag<SVGGElement, LayoutBlock>()
      .on('start', function (event, d) {
        d3.select(this).raise();
        d3.select(this).select('.block-rect')
          .attr('stroke-width', 3);
        setSelectedBlock(d);
      })
      .on('drag', function (event, d) {
        d.lx = Math.max(CHIP_PAD + 6, Math.min(CANVAS_W - CHIP_PAD - 6 - d.lw, event.x - d.lw / 2));
        d.ly = Math.max(CHIP_PAD + 6, Math.min(CANVAS_H - CHIP_PAD - 6 - d.lh, event.y - d.lh / 2));

        d3.select(this).attr('transform', `translate(${d.lx}, ${d.ly})`);
        drawWires();
      })
      .on('end', function (_event, d) {
        d3.select(this).select('.block-rect')
          .attr('stroke-width', 2);
        setSelectedBlock(d);
      });

    const blockG = blocksGroup.selectAll<SVGGElement, LayoutBlock>('g.block')
      .data(layout, (d: LayoutBlock) => d.id)
      .enter().append('g')
      .attr('class', 'block')
      .attr('transform', d => `translate(${d.lx}, ${d.ly})`)
      .style('cursor', 'grab')
      .call(drag as unknown as (selection: d3.Selection<SVGGElement, LayoutBlock, SVGGElement, unknown>) => void);

    // Glow underlay
    blockG.append('rect')
      .attr('class', 'block-glow')
      .attr('x', -4).attr('y', -4)
      .attr('width', d => d.lw + 8).attr('height', d => d.lh + 8)
      .attr('rx', 8)
      .attr('fill', d => getColor(d.type).glow)
      .attr('filter', 'url(#glow)')
      .attr('opacity', 0);

    // Block rectangle
    blockG.append('rect')
      .attr('class', 'block-rect')
      .attr('width', d => d.lw).attr('height', d => d.lh)
      .attr('rx', 6)
      .attr('fill', d => getColor(d.type).fill)
      .attr('fill-opacity', 0.12)
      .attr('stroke', d => getColor(d.type).stroke)
      .attr('stroke-width', 2)
      .attr('filter', 'url(#block-shadow)');

    // Type indicator stripe
    blockG.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', 4).attr('height', d => d.lh)
      .attr('rx', 2)
      .attr('fill', d => getColor(d.type).fill)
      .attr('fill-opacity', 0.6);

    // Block name
    blockG.append('text')
      .attr('class', 'block-label')
      .text(d => d.name)
      .attr('x', d => d.lw / 2)
      .attr('y', d => d.lh / 2 - 8)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'white').attr('font-size', '11px')
      .attr('font-family', "'JetBrains Mono', 'Fira Code', monospace")
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .each(function (d) {
        const textEl = d3.select(this);
        const maxWidth = d.lw - 16;
        let text = d.name;
        while (text.length > 3) {
          const node = textEl.node();
          if (node && node.getComputedTextLength() <= maxWidth) break;
          text = text.slice(0, -1);
          textEl.text(text + '...');
        }
      });

    // Block metrics
    blockG.append('text')
      .text(d => `${d.power_mw.toFixed(1)}mW`)
      .attr('x', d => d.lw / 2)
      .attr('y', d => d.lh / 2 + 6)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.5)').attr('font-size', '9px')
      .attr('font-family', "'JetBrains Mono', 'Fira Code', monospace")
      .attr('pointer-events', 'none');

    blockG.append('text')
      .text(d => `${d.area_mm2.toFixed(2)}mm²`)
      .attr('x', d => d.lw / 2)
      .attr('y', d => d.lh / 2 + 18)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.35)').attr('font-size', '8px')
      .attr('font-family', "'JetBrains Mono', 'Fira Code', monospace")
      .attr('pointer-events', 'none');

    // Hover interactions
    blockG
      .on('mouseenter', function (_event, d) {
        setHoveredBlock(d.id);

        d3.select(this).select('.block-glow')
          .transition().duration(150)
          .attr('opacity', 1);

        d3.select(this).select('.block-rect')
          .transition().duration(150)
          .attr('fill-opacity', 0.22)
          .attr('stroke-width', 2.5);

        // Dim non-connected blocks
        blockG.filter((b: LayoutBlock) => b.id !== d.id && !d.connections.includes(b.id) && !b.connections.includes(d.id))
          .transition().duration(150)
          .attr('opacity', 0.3);
      })
      .on('mouseleave', function () {
        setHoveredBlock(null);

        d3.select(this).select('.block-glow')
          .transition().duration(200)
          .attr('opacity', 0);

        d3.select(this).select('.block-rect')
          .transition().duration(200)
          .attr('fill-opacity', 0.12)
          .attr('stroke-width', 2);

        blockG.transition().duration(200).attr('opacity', 1);
      })
      .on('click', function (_event, d) {
        setSelectedBlock(prev => prev?.id === d.id ? null : d);
      });

    // Entrance animation
    blockG.attr('opacity', 0)
      .transition().duration(400)
      .delay((_d: LayoutBlock, i: number) => i * 60)
      .attr('opacity', 1);

  }, [architecture, showWiring, hoveredBlock]);

  const blockTypes = Array.from(new Set(architecture.blocks.map(b => b.type))) as string[];

  return (
    <div ref={containerRef} className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/80">
        <div>
          <h3 className="text-zinc-100 font-bold text-sm tracking-wide">Architecture Blueprint</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
            Physical Floorplan &amp; Routing — Drag blocks to rearrange, scroll to zoom
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowWiring(!showWiring)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${showWiring ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
          >
            {showWiring ? 'Wiring: ON' : 'Wiring: OFF'}
          </button>
          <button
            onClick={fitToView}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all"
          >
            Fit
          </button>
          <button
            onClick={resetZoom}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 border-b border-zinc-800/40 bg-zinc-950/40 flex-wrap">
        {blockTypes.map(t => (
          <span key={t} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block border"
              style={{
                backgroundColor: getColor(t).fill,
                borderColor: getColor(t).stroke,
                opacity: 0.8,
              }}
            />
            {t}
          </span>
        ))}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="520"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Chip architecture floorplan — interactive"
        className="bg-zinc-950"
        style={{ touchAction: 'none' }}
      />

      {/* Block Detail Panel */}
      {selectedBlock && (
        <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/80">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ backgroundColor: getColor(selectedBlock.type).fill }}
                />
                <span className="text-zinc-100 font-bold text-sm font-mono">{selectedBlock.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                  {selectedBlock.type}
                </span>
              </div>
              {selectedBlock.description && (
                <p className="text-zinc-500 text-xs mt-1 max-w-xl">{selectedBlock.description}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedBlock(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2.5">
            <MetricPill label="Power" value={`${selectedBlock.power_mw.toFixed(2)} mW`} />
            <MetricPill label="Area" value={`${selectedBlock.area_mm2.toFixed(3)} mm²`} />
            {selectedBlock.clock_mhz && <MetricPill label="Clock" value={`${selectedBlock.clock_mhz} MHz`} />}
            <MetricPill label="Connections" value={`${selectedBlock.connections.length} link${selectedBlock.connections.length !== 1 ? 's' : ''}`} />
          </div>
        </div>
      )}
    </div>
  );
};

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg px-3 py-1.5 border border-zinc-700/50">
      <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{label}</div>
      <div className="text-zinc-200 text-sm font-mono font-semibold">{value}</div>
    </div>
  );
}
