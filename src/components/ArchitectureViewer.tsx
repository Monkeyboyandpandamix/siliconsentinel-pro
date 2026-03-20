import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { ArchitectureBlueprint, BlockSpec } from '../types';
import { PhysicalLayoutViewer } from './PhysicalLayoutViewer';

interface Props {
  architecture: ArchitectureBlueprint;
}

const BLOCK_COLORS: Record<string, { fill: string; stroke: string; glow: string; text: string }> = {
  cpu:         { fill: '#ef4444', stroke: '#f87171', glow: 'rgba(239,68,68,0.3)',   text: '#fca5a5' },
  memory:      { fill: '#3b82f6', stroke: '#60a5fa', glow: 'rgba(59,130,246,0.3)',  text: '#93c5fd' },
  io:          { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16,185,129,0.3)',  text: '#6ee7b7' },
  power:       { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245,158,11,0.3)',  text: '#fcd34d' },
  rf:          { fill: '#8b5cf6', stroke: '#a78bfa', glow: 'rgba(139,92,246,0.3)',  text: '#c4b5fd' },
  analog:      { fill: '#ec4899', stroke: '#f472b6', glow: 'rgba(236,72,153,0.3)',  text: '#f9a8d4' },
  dsp:         { fill: '#06b6d4', stroke: '#22d3ee', glow: 'rgba(6,182,212,0.3)',   text: '#67e8f9' },
  accelerator: { fill: '#f97316', stroke: '#fb923c', glow: 'rgba(249,115,22,0.3)',  text: '#fdba74' },
};

function getColor(type: string) {
  return BLOCK_COLORS[type] || BLOCK_COLORS.cpu;
}

const MIN_BLOCK_W = 90;
const MIN_BLOCK_H = 58;
const CANVAS_W = 920;
const CANVAS_H = 580;
const CHIP_PAD = 52;

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
    const areaFrac = 0.45 + 0.55 * ((b.area_mm2 - minArea) / areaRange);
    const maxBlockW = innerW / Math.ceil(Math.sqrt(blocks.length));
    const maxBlockH = innerH / Math.ceil(Math.sqrt(blocks.length));
    const w = Math.max(MIN_BLOCK_W, Math.min(maxBlockW - 12, areaFrac * maxBlockW));
    const h = Math.max(MIN_BLOCK_H, Math.min(maxBlockH - 12, areaFrac * maxBlockH));
    return { ...b, lw: w, lh: h, lx: 0, ly: 0 };
  });

  gridLayout(scaled);
  return scaled;
}

function gridLayout(blocks: LayoutBlock[]) {
  const cols = Math.ceil(Math.sqrt(blocks.length));
  const rows = Math.ceil(blocks.length / cols);
  const cellW = (CANVAS_W - CHIP_PAD * 2) / cols;
  const cellH = (CANVAS_H - CHIP_PAD * 2) / rows;

  blocks.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    b.lw = Math.min(b.lw, cellW - 18);
    b.lh = Math.min(b.lh, cellH - 18);
    b.lx = CHIP_PAD + col * cellW + (cellW - b.lw) / 2;
    b.ly = CHIP_PAD + row * cellH + (cellH - b.lh) / 2;
  });
}

function clampToChip(b: LayoutBlock) {
  b.lx = Math.max(CHIP_PAD + 4, Math.min(CANVAS_W - CHIP_PAD - 4 - b.lw, b.lx));
  b.ly = Math.max(CHIP_PAD + 4, Math.min(CANVAS_H - CHIP_PAD - 4 - b.lh, b.ly));
}

// Draw an L-shaped manhattan wire between two blocks
function wirePathBetween(a: LayoutBlock, b: LayoutBlock): string {
  // Exit from right or bottom of source, enter left or top of target
  const ax = a.lx + a.lw / 2;
  const ay = a.ly + a.lh / 2;
  const bx = b.lx + b.lw / 2;
  const by = b.ly + b.lh / 2;

  // Use a stepped path with rounded corners
  const dx = bx - ax;
  const dy = by - ay;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Mostly horizontal: exit right/left of source
    const exitX = dx > 0 ? a.lx + a.lw : a.lx;
    const enterX = dx > 0 ? b.lx : b.lx + b.lw;
    const midX = (exitX + enterX) / 2;
    return `M ${exitX} ${ay} C ${midX} ${ay} ${midX} ${by} ${enterX} ${by}`;
  } else {
    // Mostly vertical: exit top/bottom of source
    const exitY = dy > 0 ? a.ly + a.lh : a.ly;
    const enterY = dy > 0 ? b.ly : b.ly + b.lh;
    const midY = (exitY + enterY) / 2;
    return `M ${ax} ${exitY} C ${ax} ${midY} ${bx} ${midY} ${bx} ${enterY}`;
  }
}

export const ArchitectureViewer: React.FC<Props> = ({ architecture }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewMode, setViewMode] = useState<'blueprint' | 'physical'>('blueprint');
  const [showWiring, setShowWiring] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<LayoutBlock | null>(null);
  const layoutRef = useRef<LayoutBlock[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const wiringGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const showWiringRef = useRef(showWiring);
  showWiringRef.current = showWiring;

  const redrawWires = useCallback(() => {
    const wg = wiringGroupRef.current;
    const layout = layoutRef.current;
    if (!wg) return;
    wg.selectAll('*').remove();
    if (!showWiringRef.current) return;

    const blockMap = new Map<string, LayoutBlock>(layout.map(b => [b.id, b] as [string, LayoutBlock]));

    layout.forEach(block => {
      block.connections.forEach(targetId => {
        const target = blockMap.get(targetId);
        if (!target) return;

        const path = wirePathBetween(block, target);
        const c = getColor(block.type);

        // Shadow wire
        wg.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#000')
          .attr('stroke-width', 4)
          .attr('stroke-opacity', 0.25)
          .attr('stroke-linecap', 'round');

        // Main wire
        wg.append('path')
          .attr('class', `wire wire-from-${block.id} wire-to-${targetId}`)
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', c.stroke)
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0.65)
          .attr('stroke-linecap', 'round')
          .attr('marker-end', `url(#arrow-${block.type})`);

        // Label at midpoint
        const ax = block.lx + block.lw / 2;
        const ay = block.ly + block.lh / 2;
        const bx = target.lx + target.lw / 2;
        const by = target.ly + target.lh / 2;
        const lx = (ax + bx) / 2;
        const ly = (ay + by) / 2 - 5;
        const busLabel = `${block.type.toUpperCase()}→${target.type.toUpperCase()}`;

        wg.append('rect')
          .attr('x', lx - 18).attr('y', ly - 7)
          .attr('width', 36).attr('height', 11)
          .attr('rx', 3)
          .attr('fill', '#09090b')
          .attr('opacity', 0.7);

        wg.append('text')
          .attr('x', lx).attr('y', ly + 1)
          .attr('text-anchor', 'middle')
          .attr('font-size', '6px')
          .attr('font-family', 'monospace')
          .attr('fill', c.text)
          .attr('opacity', 0.8)
          .attr('pointer-events', 'none')
          .text(busLabel);
      });
    });
  }, []);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition().duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const fitToView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !layoutRef.current.length) return;
    const blocks = layoutRef.current;
    const xMin = Math.min(...blocks.map(b => b.lx)) - 24;
    const yMin = Math.min(...blocks.map(b => b.ly)) - 24;
    const xMax = Math.max(...blocks.map(b => b.lx + b.lw)) + 24;
    const yMax = Math.max(...blocks.map(b => b.ly + b.lh)) + 24;
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

    // ── Defs ───────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    defs.append('filter').attr('id', 'block-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%')
      .append('feDropShadow')
      .attr('dx', 0).attr('dy', 3).attr('stdDeviation', 5)
      .attr('flood-color', 'rgba(0,0,0,0.6)');

    defs.append('filter').attr('id', 'glow-filter')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      .append('feGaussianBlur').attr('stdDeviation', 7).attr('result', 'coloredBlur');

    // Arrowhead markers per block type
    Object.entries(BLOCK_COLORS).forEach(([type, c]) => {
      const marker = defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 0 8 8')
        .attr('refX', 7).attr('refY', 4)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto-start-reverse');
      marker.append('path')
        .attr('d', 'M 0 0 L 8 4 L 0 8 z')
        .attr('fill', c.stroke)
        .attr('opacity', 0.75);
    });

    // ── Zoom ───────────────────────────────────────────────────────────────
    const zoomGroup = svg.append('g').attr('class', 'zoom-container');
    zoomGroupRef.current = zoomGroup;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 5])
      .filter((event) => {
        // Prevent zoom from interfering with block drag
        if (event.type === 'mousedown' && event.target) {
          const el = event.target as Element;
          if (el.closest('.block')) return false;
        }
        return true;
      })
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // ── Background grid ────────────────────────────────────────────────────
    const gridG = zoomGroup.append('g').attr('class', 'grid');
    for (let x = 0; x <= CANVAS_W; x += 24) {
      gridG.append('line')
        .attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', CANVAS_H)
        .attr('stroke', '#131316').attr('stroke-width', 0.5);
    }
    for (let y = 0; y <= CANVAS_H; y += 24) {
      gridG.append('line')
        .attr('x1', 0).attr('y1', y).attr('x2', CANVAS_W).attr('y2', y)
        .attr('stroke', '#131316').attr('stroke-width', 0.5);
    }

    // ── Chip die outline ───────────────────────────────────────────────────
    zoomGroup.append('rect')
      .attr('x', CHIP_PAD - 12).attr('y', CHIP_PAD - 12)
      .attr('width', CANVAS_W - (CHIP_PAD - 12) * 2)
      .attr('height', CANVAS_H - (CHIP_PAD - 12) * 2)
      .attr('fill', '#0a0a0f')
      .attr('stroke', '#27272a').attr('stroke-width', 2.5).attr('rx', 8);

    // Bond pads
    const padG = zoomGroup.append('g');
    const padSize = 5;
    const ringX = CHIP_PAD - 6, ringY = CHIP_PAD - 6;
    const ringW = CANVAS_W - (CHIP_PAD - 6) * 2;
    const ringH = CANVAS_H - (CHIP_PAD - 6) * 2;
    const padCols = 28;
    for (let i = 0; i < padCols; i++) {
      const pxFrac = (i + 0.5) / padCols;
      [[ringX + pxFrac * ringW - padSize / 2, ringY - padSize],
       [ringX + pxFrac * ringW - padSize / 2, ringY + ringH]].forEach(([px, py]) => {
        padG.append('rect').attr('x', px).attr('y', py)
          .attr('width', padSize).attr('height', padSize)
          .attr('fill', '#3f3f46').attr('rx', 1);
      });
    }
    const padRows = Math.round(padCols * ringH / ringW);
    for (let i = 0; i < padRows; i++) {
      const pyFrac = (i + 0.5) / padRows;
      [[ringX - padSize, ringY + pyFrac * ringH - padSize / 2],
       [ringX + ringW, ringY + pyFrac * ringH - padSize / 2]].forEach(([px, py]) => {
        padG.append('rect').attr('x', px).attr('y', py)
          .attr('width', padSize).attr('height', padSize)
          .attr('fill', '#3f3f46').attr('rx', 1);
      });
    }

    // Process node label
    zoomGroup.append('text')
      .text(`${architecture.process_node} · ${architecture.metal_layers}M · ${architecture.substrate} · ${architecture.interconnect}`)
      .attr('x', CHIP_PAD - 10).attr('y', CHIP_PAD - 17)
      .attr('fill', '#52525b').attr('font-size', '8.5px').attr('font-family', 'monospace');

    // ── Wiring layer (drawn below blocks) ──────────────────────────────────
    const wiringGroup = zoomGroup.append('g').attr('class', 'wiring');
    wiringGroupRef.current = wiringGroup;
    redrawWires();

    // ── Blocks ─────────────────────────────────────────────────────────────
    const blocksGroup = zoomGroup.append('g').attr('class', 'blocks');

    // Drag handler — uses delta (dx/dy) divided by zoom scale for accuracy
    const drag = d3.drag<SVGGElement, LayoutBlock>()
      .on('start', function (_event, d) {
        d3.select(this).raise();
        setSelectedBlock(d);
      })
      .on('drag', function (event, d) {
        // Get current zoom transform to scale deltas correctly
        const k = svgRef.current ? d3.zoomTransform(svgRef.current).k : 1;
        d.lx += event.dx / k;
        d.ly += event.dy / k;
        clampToChip(d);
        d3.select(this).attr('transform', `translate(${d.lx}, ${d.ly})`);
        redrawWires();
      })
      .on('end', function (_event, d) {
        setSelectedBlock({ ...d });
      });

    const blockG = blocksGroup.selectAll<SVGGElement, LayoutBlock>('g.block')
      .data(layout, (d: LayoutBlock) => d.id)
      .enter().append('g')
      .attr('class', 'block')
      .attr('transform', d => `translate(${d.lx}, ${d.ly})`)
      .style('cursor', 'grab')
      .call(drag as unknown as (s: d3.Selection<SVGGElement, LayoutBlock, SVGGElement, unknown>) => void);

    // Glow underlay
    blockG.append('rect')
      .attr('class', 'block-glow')
      .attr('x', -6).attr('y', -6)
      .attr('width', d => d.lw + 12).attr('height', d => d.lh + 12)
      .attr('rx', 10)
      .attr('fill', d => getColor(d.type).glow)
      .attr('filter', 'url(#glow-filter)')
      .attr('opacity', 0);

    // Main block body
    blockG.append('rect')
      .attr('class', 'block-rect')
      .attr('width', d => d.lw).attr('height', d => d.lh)
      .attr('rx', 7)
      .attr('fill', d => getColor(d.type).fill)
      .attr('fill-opacity', 0.13)
      .attr('stroke', d => getColor(d.type).stroke)
      .attr('stroke-width', 1.8)
      .attr('filter', 'url(#block-shadow)');

    // Type accent stripe
    blockG.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', 4).attr('height', d => d.lh)
      .attr('rx', 3)
      .attr('fill', d => getColor(d.type).fill)
      .attr('fill-opacity', 0.7);

    // Type badge (top-right)
    blockG.append('rect')
      .attr('x', d => d.lw - 32).attr('y', 4)
      .attr('width', 28).attr('height', 12)
      .attr('rx', 4)
      .attr('fill', d => getColor(d.type).fill)
      .attr('fill-opacity', 0.25);

    blockG.append('text')
      .attr('x', d => d.lw - 18).attr('y', 13)
      .attr('text-anchor', 'middle')
      .attr('fill', d => getColor(d.type).text)
      .attr('font-size', '7px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .text(d => d.type.toUpperCase());

    // Block name
    blockG.append('text')
      .attr('class', 'block-label')
      .attr('x', d => d.lw / 2)
      .attr('y', d => d.lh / 2 - 9)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-family', "'JetBrains Mono', 'Fira Code', monospace")
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .each(function (d) {
        const el = d3.select(this);
        const maxW = d.lw - 20;
        let txt = d.name;
        el.text(txt);
        const node = el.node();
        if (node) {
          while (txt.length > 3 && node.getComputedTextLength() > maxW) {
            txt = txt.slice(0, -1);
            el.text(txt + '…');
          }
        }
      });

    // Power metric
    blockG.append('text')
      .attr('x', d => d.lw / 2).attr('y', d => d.lh / 2 + 7)
      .attr('text-anchor', 'middle')
      .attr('fill', d => getColor(d.type).text)
      .attr('fill-opacity', 0.75)
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none')
      .text(d => {
        const p = d.power_mw;
        return p >= 1000 ? `${(p / 1000).toFixed(1)} W` : `${p.toFixed(0)} mW`;
      });

    // Area metric
    blockG.append('text')
      .attr('x', d => d.lw / 2).attr('y', d => d.lh / 2 + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.35)')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none')
      .text(d => `${d.area_mm2.toFixed(2)} mm²`);

    // ── Hover ──────────────────────────────────────────────────────────────
    blockG
      .on('mouseenter', function (_e, d) {
        d3.select(this).select('.block-glow')
          .transition().duration(120).attr('opacity', 1);
        d3.select(this).select('.block-rect')
          .transition().duration(120).attr('fill-opacity', 0.25).attr('stroke-width', 2.5);

        // Highlight connected wires
        wiringGroupRef.current?.selectAll('path.wire')
          .attr('stroke-opacity', (_, __, nodes) => {
            const el = nodes[__] as Element;
            const cls = el.getAttribute('class') || '';
            return cls.includes(`wire-from-${d.id}`) || cls.includes(`wire-to-${d.id}`) ? 1 : 0.1;
          })
          .attr('stroke-width', (_, __, nodes) => {
            const el = nodes[__] as Element;
            const cls = el.getAttribute('class') || '';
            return cls.includes(`wire-from-${d.id}`) || cls.includes(`wire-to-${d.id}`) ? 3 : 1.5;
          });

        // Dim non-connected blocks
        blockG.filter((b: LayoutBlock) =>
          b.id !== d.id && !d.connections.includes(b.id) && !b.connections.includes(d.id)
        ).transition().duration(120).attr('opacity', 0.25);
      })
      .on('mouseleave', function () {
        d3.select(this).select('.block-glow').transition().duration(200).attr('opacity', 0);
        d3.select(this).select('.block-rect')
          .transition().duration(200).attr('fill-opacity', 0.13).attr('stroke-width', 1.8);

        wiringGroupRef.current?.selectAll('path.wire')
          .attr('stroke-opacity', 0.65).attr('stroke-width', 2);

        blockG.transition().duration(200).attr('opacity', 1);
      })
      .on('click', function (_e, d) {
        setSelectedBlock(prev => prev?.id === d.id ? null : { ...d });
      });

    // Entrance animation
    blockG.attr('opacity', 0)
      .transition().duration(350)
      .delay((_d: LayoutBlock, i: number) => i * 50)
      .attr('opacity', 1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [architecture]);

  // Redraw wires when showWiring changes without full re-render
  useEffect(() => {
    redrawWires();
  }, [showWiring, redrawWires]);

  const blockTypes: string[] = Array.from(new Set<string>(architecture.blocks.map(b => String(b.type))));

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* View mode tab bar */}
      <div className="flex items-stretch border-b border-zinc-800 bg-zinc-900/90">
        <button
          onClick={() => setViewMode('blueprint')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            viewMode === 'blueprint'
              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.7"/>
            <rect x="8" y="1" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.7"/>
            <rect x="1" y="7" width="5" height="6" rx="1" fill="currentColor" fillOpacity="0.7"/>
            <rect x="8" y="7" width="5" height="6" rx="1" fill="currentColor" fillOpacity="0.7"/>
          </svg>
          Blueprint
        </button>
        <button
          onClick={() => setViewMode('physical')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            viewMode === 'physical'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="0.5" y="0.5" width="13" height="13" rx="1" stroke="currentColor" strokeOpacity="0.6"/>
            <rect x="2" y="2" width="10" height="10" rx="0.5" fill="currentColor" fillOpacity="0.08"/>
            <line x1="3" y1="4" x2="11" y2="4" stroke="#ff3a3a" strokeWidth="0.8"/>
            <line x1="7" y1="2" x2="7" y2="12" stroke="#3dff4a" strokeWidth="0.8"/>
            <line x1="3" y1="9" x2="11" y2="9" stroke="#ffe040" strokeWidth="0.8"/>
          </svg>
          Physical Layout
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono">PIN→PIN</span>
        </button>

        {/* Blueprint controls (only show in blueprint mode) */}
        {viewMode === 'blueprint' && (
          <div className="flex gap-2 items-center ml-auto px-3">
            <button
              onClick={() => setShowWiring(v => !v)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${showWiring ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
            >
              {showWiring ? '⟵ Wiring ON' : '⟵ Wiring OFF'}
            </button>
            <button onClick={fitToView} className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
              Fit
            </button>
            <button onClick={resetZoom} className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Physical Layout mode */}
      {viewMode === 'physical' && (
        <PhysicalLayoutViewer architecture={architecture} />
      )}

      {/* Blueprint mode */}
      {viewMode === 'blueprint' && (<>
      {/* Legend */}
      <div className="flex gap-3 px-4 py-2 border-b border-zinc-800/40 bg-zinc-950/40 flex-wrap">
        {blockTypes.map(t => (
          <span key={t} className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
            <span className="w-2.5 h-2.5 rounded-sm inline-block border"
              style={{ backgroundColor: getColor(t).fill, borderColor: getColor(t).stroke, opacity: 0.85 }} />
            {t}
          </span>
        ))}
        {showWiring && (
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono ml-auto">
            Curved lines = data buses · arrows show flow direction
          </span>
        )}
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Chip architecture floorplan — interactive drag"
        className="bg-zinc-950"
        style={{ touchAction: 'none' }}
      />

      {/* Selected block detail */}
      {selectedBlock && (
        <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/80">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: getColor(selectedBlock.type).fill }} />
                <span className="text-zinc-100 font-bold text-sm font-mono">{selectedBlock.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase"
                  style={{ color: getColor(selectedBlock.type).text, borderColor: getColor(selectedBlock.type).stroke + '50', backgroundColor: getColor(selectedBlock.type).fill + '20' }}>
                  {selectedBlock.type}
                </span>
                {selectedBlock.voltage_domain && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">{selectedBlock.voltage_domain}</span>
                )}
              </div>
              {selectedBlock.description && (
                <p className="text-zinc-500 text-xs mt-1">{selectedBlock.description}</p>
              )}
              {selectedBlock.reference_component && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] uppercase font-mono text-zinc-600">IP / Component:</span>
                  <span className="text-[11px] font-mono text-cyan-400">{selectedBlock.reference_component}</span>
                </div>
              )}
              {selectedBlock.cell_library && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] uppercase font-mono text-zinc-600">Cell Library:</span>
                  <span className="text-[10px] font-mono text-zinc-500">{selectedBlock.cell_library}</span>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedBlock(null)} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors flex-shrink-0">✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2.5">
            <MetricPill label="Power" value={selectedBlock.power_mw >= 1000 ? `${(selectedBlock.power_mw / 1000).toFixed(2)} W` : `${selectedBlock.power_mw.toFixed(1)} mW`} />
            <MetricPill label="Area" value={`${selectedBlock.area_mm2.toFixed(3)} mm²`} />
            {selectedBlock.clock_mhz && <MetricPill label="Clock" value={`${selectedBlock.clock_mhz.toLocaleString()} MHz`} />}
            <MetricPill label="Connections" value={`${selectedBlock.connections.length} link${selectedBlock.connections.length !== 1 ? 's' : ''}`} />
            <MetricPill label="Power Density" value={`${(selectedBlock.power_mw / Math.max(selectedBlock.area_mm2, 0.01)).toFixed(0)} mW/mm²`} />
          </div>
        </div>
      )}
      </>)}
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
