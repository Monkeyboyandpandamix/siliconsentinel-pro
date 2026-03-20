/**
 * PhysicalLayoutViewer — VLSI-style pin-to-pin physical layout canvas.
 *
 * Visual fidelity:
 *  • Perimeter I/O pad ring (cyan squares, numbered)
 *  • Area-proportional block placement with type-specific aspect ratios
 *  • Standard-cell row hatching inside each block
 *  • Three-layer orthogonal routing: M1 (horizontal/red), M2 (vertical/green),
 *    M3 (horizontal/yellow) with via markers at layer transitions
 *  • VDD (red) / VSS (blue) power rail stripes
 *  • Full zoom + pan
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { ArchitectureBlueprint, BlockSpec } from '../types';

// Colours re-used from ArchitectureViewer for consistent component identity
const BLUEPRINT_COLORS: Record<string, string> = {
  cpu: '#f87171', memory: '#60a5fa', io: '#34d399',
  power: '#fbbf24', rf: '#a78bfa', analog: '#f472b6',
  dsp: '#22d3ee', accelerator: '#fb923c',
};

// ── Canvas constants ─────────────────────────────────────────────────────────
const CW = 960;
const CH = 620;
const PAD_ZONE   = 48;   // width of I/O pad ring from die edge
const CORE_X     = PAD_ZONE + 10;
const CORE_Y     = PAD_ZONE + 10;
const CORE_W     = CW - (PAD_ZONE + 10) * 2;
const CORE_H     = CH - (PAD_ZONE + 10) * 2;
const PAD_SZ     = 7;    // pad square size (px)
const PAD_GAP    = 13;   // pad center-to-center
const ROW_H      = 5;    // standard cell row pitch (px)
const VIA_R      = 2.2;  // via dot radius (px)

// Metal layer colors — match industry conventions
const M1_COLOR   = '#ff3a3a';  // horizontal
const M2_COLOR   = '#3dff4a';  // vertical
const M3_COLOR   = '#ffe040';  // horizontal
const VDD_COLOR  = '#ff2222';
const VSS_COLOR  = '#2244ff';
const PAD_COLOR  = '#00d8ff';
const BLOCK_STROKE = '#00bcd4';

// Block aspect ratios (width / height) matching real hardware shapes
const BLOCK_ASPECT: Record<string, number> = {
  cpu:         1.05,  // roughly square
  memory:      0.42,  // tall SRAM column
  io:          3.80,  // wide strip
  power:       1.60,  // wide PMIC
  rf:          1.15,
  analog:      0.85,
  dsp:         1.70,
  accelerator: 1.35,
};

const BLOCK_FILL: Record<string, string> = {
  cpu:         '#0d1f30',
  memory:      '#0d1a2a',
  io:          '#0a1f18',
  power:       '#1f1a08',
  rf:          '#1a0f28',
  analog:      '#1f0f18',
  dsp:         '#0a1a28',
  accelerator: '#1a0f0a',
};

const BLOCK_LABEL_COLOR: Record<string, string> = {
  cpu:         '#60c8ff',
  memory:      '#60aaff',
  io:          '#60ffb0',
  power:       '#ffcc60',
  rf:          '#c080ff',
  analog:      '#ff80c0',
  dsp:         '#40e0ff',
  accelerator: '#ff9060',
};

interface PBlock {
  id: string;
  name: string;
  type: string;
  area_mm2: number;
  power_mw: number;
  connections: string[];
  px: number;   // placed x (core-relative)
  py: number;
  pw: number;
  ph: number;
}

interface Pin {
  blockId: string;
  x: number;   // absolute canvas coords
  y: number;
  edge: 'left' | 'right' | 'top' | 'bottom';
  netId: string;  // connection target id
}

// ── Layout engine ─────────────────────────────────────────────────────────────

function placeBlocks(blocks: BlockSpec[]): PBlock[] {
  if (!blocks.length) return [];

  const totalArea = blocks.reduce((s, b) => s + b.area_mm2, 0);
  const coreArea  = CORE_W * CORE_H * 0.70;  // 70% utilization
  const scale     = Math.sqrt(coreArea / totalArea);

  // Compute target dimensions for each block
  const sized = blocks.map(b => {
    const aspect = BLOCK_ASPECT[b.type] ?? 1.0;
    const area   = b.area_mm2 * scale * scale;
    const pw     = Math.max(55, Math.sqrt(area * aspect));
    const ph     = Math.max(36, pw / aspect);
    return { ...b, px: 0, py: 0, pw, ph };
  });

  // Sort: IO blocks first (→ edges), then by area descending
  const sorted = [...sized].sort((a, b) => {
    if (a.type === 'io' && b.type !== 'io') return -1;
    if (b.type === 'io' && a.type !== 'io') return  1;
    return b.area_mm2 - a.area_mm2;
  });

  // Simple row-based placement (left-to-right, wrap)
  let curX = 0, curY = 0, rowH = 0;
  const GAP = 14;

  for (const b of sorted) {
    if (curX + b.pw > CORE_W && curX > 0) {
      curX = 0;
      curY += rowH + GAP;
      rowH = 0;
    }
    b.px = curX;
    b.py = curY;
    curX += b.pw + GAP;
    rowH = Math.max(rowH, b.ph);
  }

  // Scale vertically if overflow
  const usedH = curY + rowH;
  if (usedH > CORE_H) {
    const shrink = CORE_H / usedH;
    for (const b of sorted) {
      b.py *= shrink;
      b.ph *= shrink;
    }
  }

  // Center horizontally each row
  const rows: PBlock[][] = [];
  let cur: PBlock[] = [];
  let lastY = sorted[0]?.py ?? 0;
  for (const b of sorted) {
    if (Math.abs(b.py - lastY) > 2) {
      rows.push(cur);
      cur = [];
      lastY = b.py;
    }
    cur.push(b);
  }
  if (cur.length) rows.push(cur);

  for (const row of rows) {
    const rowW = row.reduce((s, b) => s + b.pw, 0) + GAP * (row.length - 1);
    const xOff = (CORE_W - rowW) / 2;
    let rx = xOff;
    for (const b of row) {
      b.px = rx;
      rx += b.pw + GAP;
    }
  }

  return sorted;
}

// Determine which edge of block A faces block B
function facingEdge(a: PBlock, b: PBlock): 'left' | 'right' | 'top' | 'bottom' {
  const acx = a.px + a.pw / 2, acy = a.py + a.ph / 2;
  const bcx = b.px + b.pw / 2, bcy = b.py + b.ph / 2;
  const dx = bcx - acx, dy = bcy - acy;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function pinXY(b: PBlock, edge: 'left' | 'right' | 'top' | 'bottom', idx: number, total: number): [number, number] {
  const frac = (idx + 1) / (total + 1);
  const absX = CORE_X + b.px, absY = CORE_Y + b.py;
  switch (edge) {
    case 'left':   return [absX,            absY + b.ph * frac];
    case 'right':  return [absX + b.pw,     absY + b.ph * frac];
    case 'top':    return [absX + b.pw * frac, absY];
    case 'bottom': return [absX + b.pw * frac, absY + b.ph];
  }
}

// Generate an L-Z-L three-segment Manhattan route between two pins
function routePins(
  ax: number, ay: number, aEdge: 'left' | 'right' | 'top' | 'bottom',
  bx: number, by: number, bEdge: 'left' | 'right' | 'top' | 'bottom',
): {
  segs: { x1: number; y1: number; x2: number; y2: number; layer: number }[];
  vias: { x: number; y: number }[];
} {
  const segs: { x1: number; y1: number; x2: number; y2: number; layer: number }[] = [];
  const vias: { x: number; y: number }[] = [];

  // Stub distance from block edge before entering routing grid
  const STUB = 10;
  let sx = ax, sy = ay;
  if (aEdge === 'right')  sx = ax + STUB;
  if (aEdge === 'left')   sx = ax - STUB;
  if (aEdge === 'bottom') sy = ay + STUB;
  if (aEdge === 'top')    sy = ay - STUB;

  let ex = bx, ey = by;
  if (bEdge === 'left')   ex = bx - STUB;
  if (bEdge === 'right')  ex = bx + STUB;
  if (bEdge === 'top')    ey = by - STUB;
  if (bEdge === 'bottom') ey = by + STUB;

  // M1 stub out of source (horizontal preferred)
  const horizExit = aEdge === 'left' || aEdge === 'right';
  if (horizExit) {
    // M1: horizontal exit stub
    segs.push({ x1: ax, y1: ay, x2: sx, y2: sy, layer: 1 });
    // M2: vertical trunk
    segs.push({ x1: sx, y1: sy, x2: sx, y2: ey, layer: 2 });
    vias.push({ x: sx, y: sy });
    // M3: horizontal enter to target
    segs.push({ x1: sx, y1: ey, x2: ex, y2: ey, layer: 3 });
    vias.push({ x: sx, y: ey });
    // M2 entry stub
    segs.push({ x1: ex, y1: ey, x2: bx, y2: by, layer: 2 });
    vias.push({ x: ex, y: ey });
  } else {
    // Vertical exit
    segs.push({ x1: ax, y1: ay, x2: sx, y2: sy, layer: 2 });
    segs.push({ x1: sx, y1: sy, x2: ex, y2: sy, layer: 1 });
    vias.push({ x: sx, y: sy });
    segs.push({ x1: ex, y1: sy, x2: ex, y2: ey, layer: 2 });
    vias.push({ x: ex, y: sy });
    segs.push({ x1: ex, y1: ey, x2: bx, y2: by, layer: 1 });
    vias.push({ x: ex, y: ey });
  }

  return { segs, vias };
}

function layerColor(l: number) {
  if (l === 1) return M1_COLOR;
  if (l === 2) return M2_COLOR;
  return M3_COLOR;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  architecture: ArchitectureBlueprint;
}

export const PhysicalLayoutViewer: React.FC<Props> = ({ architecture }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [showRouting, setShowRouting] = useState(true);
  const [showPowerRails, setShowPowerRails] = useState(true);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockSpec | null>(null);
  const selectedBlockRef = useRef<BlockSpec | null>(null);
  selectedBlockRef.current = selectedBlock;

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const fitView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(0, 0).scale(0.95));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !architecture?.blocks?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const blocks  = placeBlocks(architecture.blocks);
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    // ── Defs ──────────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    // Standard-cell row pattern for block fill
    const pat = defs.append('pattern')
      .attr('id', 'sc-rows').attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 80).attr('height', ROW_H);
    pat.append('rect').attr('width', 80).attr('height', ROW_H).attr('fill', 'none');
    pat.append('line')
      .attr('x1', 0).attr('y1', ROW_H - 1).attr('x2', 80).attr('y2', ROW_H - 1)
      .attr('stroke', '#1a3040').attr('stroke-width', 0.7);

    // N-well stripe pattern
    const nwPat = defs.append('pattern')
      .attr('id', 'nwell').attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 80).attr('height', ROW_H * 2);
    nwPat.append('rect').attr('width', 80).attr('height', ROW_H).attr('fill', '#0f1f0a').attr('fill-opacity', 0.4);

    // Glow filter
    const glow = defs.append('filter').attr('id', 'pad-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 2).attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Via marker
    defs.append('marker').attr('id', 'via-mark').attr('viewBox', '-3 -3 6 6')
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .append('circle').attr('r', 1.5).attr('fill', '#ffffff').attr('opacity', 0.9);

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const zg = svg.append('g').attr('class', 'zoom-root');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 8])
      .on('zoom', e => zg.attr('transform', e.transform));
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // ── Silicon substrate background ──────────────────────────────────────────
    zg.append('rect').attr('width', CW).attr('height', CH).attr('fill', '#030406');

    // Die boundary (outer)
    zg.append('rect')
      .attr('x', 2).attr('y', 2).attr('width', CW - 4).attr('height', CH - 4)
      .attr('fill', '#100c04').attr('stroke', '#604000').attr('stroke-width', 2);

    // I/O pad ring background
    zg.append('rect')
      .attr('x', 2).attr('y', 2).attr('width', CW - 4).attr('height', CH - 4)
      .attr('fill', 'none')
      .attr('stroke', '#2a1f0a').attr('stroke-width', PAD_ZONE * 2);

    // Core area
    zg.append('rect')
      .attr('x', CORE_X - 4).attr('y', CORE_Y - 4)
      .attr('width', CORE_W + 8).attr('height', CORE_H + 8)
      .attr('fill', '#08101a').attr('stroke', '#1a3040').attr('stroke-width', 1.5);

    // ── Power rails (VDD / VSS horizontal stripes) ────────────────────────────
    if (showPowerRails) {
      const railG = zg.append('g').attr('class', 'power-rails');
      const RAIL_PITCH = Math.max(60, CORE_H / Math.max(architecture.metal_layers, 4));
      for (let ry = CORE_Y + RAIL_PITCH / 2; ry < CORE_Y + CORE_H; ry += RAIL_PITCH) {
        const isVDD = Math.round(ry / RAIL_PITCH) % 2 === 0;
        railG.append('line')
          .attr('x1', CORE_X).attr('y1', ry).attr('x2', CORE_X + CORE_W).attr('y2', ry)
          .attr('stroke', isVDD ? VDD_COLOR : VSS_COLOR)
          .attr('stroke-width', 1.5).attr('stroke-opacity', 0.18)
          .attr('stroke-dasharray', isVDD ? '0' : '4,6');
        railG.append('text')
          .attr('x', CORE_X + 4).attr('y', ry - 2)
          .attr('fill', isVDD ? VDD_COLOR : VSS_COLOR)
          .attr('font-size', '7px').attr('font-family', 'monospace')
          .attr('opacity', 0.45)
          .text(isVDD ? 'VDD' : 'VSS');
      }
    }

    // ── I/O Pad ring ─────────────────────────────────────────────────────────
    const padG = zg.append('g').attr('class', 'pad-ring');
    const padCenterY = PAD_ZONE / 2;
    const padCenterX = PAD_ZONE / 2;

    type PadInfo = { x: number; y: number; rot: number; idx: number; label: string };
    const allPads: PadInfo[] = [];

    // Top / Bottom pads
    const topCount  = Math.floor((CW - PAD_ZONE * 2) / PAD_GAP);
    const sideCount = Math.floor((CH - PAD_ZONE * 2) / PAD_GAP);

    // Assign I/O signal names from blocks that have IO type connections
    const sigNames = ['CLK', 'RSTn', 'SDA', 'SCL', 'TX', 'RX', 'VREF', 'IRQ', 'CS',
      'MOSI', 'MISO', 'SCK', 'EN', 'INT', 'PWM', 'ADC0', 'ADC1', 'DAC',
      'GPIO0', 'GPIO1', 'GPIO2', 'GPIO3', 'JTAG_TDI', 'JTAG_TDO', 'JTAG_TCK',
      'VDD', 'VSS', 'GND', 'AVDD', 'AVSS'];

    let padIdx = 0;
    for (let i = 0; i < topCount; i++) {
      const x = PAD_ZONE + i * PAD_GAP + PAD_GAP / 2;
      allPads.push({ x, y: padCenterY, rot: 0, idx: padIdx, label: sigNames[padIdx % sigNames.length] });
      padIdx++;
    }
    for (let i = 0; i < topCount; i++) {
      const x = PAD_ZONE + i * PAD_GAP + PAD_GAP / 2;
      allPads.push({ x, y: CH - padCenterY, rot: 180, idx: padIdx, label: sigNames[padIdx % sigNames.length] });
      padIdx++;
    }
    for (let i = 0; i < sideCount; i++) {
      const y = PAD_ZONE + i * PAD_GAP + PAD_GAP / 2;
      allPads.push({ x: padCenterX, y, rot: 270, idx: padIdx, label: sigNames[padIdx % sigNames.length] });
      padIdx++;
    }
    for (let i = 0; i < sideCount; i++) {
      const y = PAD_ZONE + i * PAD_GAP + PAD_GAP / 2;
      allPads.push({ x: CW - padCenterX, y, rot: 90, idx: padIdx, label: sigNames[padIdx % sigNames.length] });
      padIdx++;
    }

    // Draw corner squares
    [[2, 2], [CW - PAD_ZONE, 2], [2, CH - PAD_ZONE], [CW - PAD_ZONE, CH - PAD_ZONE]].forEach(([cx, cy]) => {
      padG.append('rect')
        .attr('x', cx).attr('y', cy)
        .attr('width', PAD_ZONE - 2).attr('height', PAD_ZONE - 2)
        .attr('fill', '#1a2830').attr('stroke', BLOCK_STROKE).attr('stroke-width', 0.8).attr('rx', 2);
    });

    // Draw pads
    allPads.forEach(p => {
      padG.append('rect')
        .attr('x', p.x - PAD_SZ / 2).attr('y', p.y - PAD_SZ / 2)
        .attr('width', PAD_SZ).attr('height', PAD_SZ)
        .attr('fill', PAD_COLOR).attr('fill-opacity', 0.85)
        .attr('stroke', '#ffffff').attr('stroke-width', 0.4)
        .attr('rx', 1)
        .attr('filter', 'url(#pad-glow)');

      // Tiny bond wire from pad to core edge
      const bondTargetX = p.x < CW / 2 ? CORE_X : CORE_X + CORE_W;
      const bondTargetY = p.y < CH / 2 ? CORE_Y : CORE_Y + CORE_H;
      const isVert = Math.abs(p.y - CH / 2) > Math.abs(p.x - CW / 2);
      padG.append('line')
        .attr('x1', p.x).attr('y1', p.y)
        .attr('x2', isVert ? p.x : bondTargetX)
        .attr('y2', isVert ? bondTargetY : p.y)
        .attr('stroke', '#c8a060').attr('stroke-width', 0.5).attr('stroke-opacity', 0.6);

      // Signal label
      padG.append('text')
        .attr('transform', `translate(${p.x},${p.y}) rotate(${p.rot === 0 ? -90 : p.rot === 180 ? 90 : p.rot === 270 ? 0 : 0})`)
        .attr('text-anchor', 'middle')
        .attr('dy', p.rot === 270 ? -PAD_SZ : p.rot === 90 ? PAD_SZ + 6 : p.rot === 0 ? -PAD_SZ - 1 : PAD_SZ + 6)
        .attr('fill', PAD_COLOR).attr('font-size', '5px')
        .attr('font-family', 'monospace').attr('opacity', 0.8)
        .attr('pointer-events', 'none')
        .text(p.label);
    });

    // ── Routing ───────────────────────────────────────────────────────────────
    const routeG = zg.append('g').attr('class', 'routing');
    const viaG   = zg.append('g').attr('class', 'vias');

    // Build full connection list (needed for count label below)
    const connections: { src: PBlock; dst: PBlock }[] = [];
    blocks.forEach(src => {
      src.connections.forEach(dstId => {
        const dst = blockMap.get(dstId);
        if (!dst) return;
        connections.push({ src, dst });
      });
    });

    if (showRouting) {
      // Build edge→pin count for each block connection
      const edgeCounts: Map<string, Map<string, number>> = new Map();
      blocks.forEach(b => {
        const ec = new Map<string, number>();
        edgeCounts.set(b.id, ec);
      });

      // Assign routing layers round-robin
      connections.forEach(({ src, dst }) => {
        const srcEdge = facingEdge(src, dst);
        const dstEdge = facingEdge(dst, src);

        // Count pins on each edge for offset
        edgeCounts.get(src.id)!.set(srcEdge, (edgeCounts.get(src.id)!.get(srcEdge) ?? 0) + 1);
        edgeCounts.get(dst.id)!.set(dstEdge, (edgeCounts.get(dst.id)!.get(dstEdge) ?? 0) + 1);
        const srcPinIdx = edgeCounts.get(src.id)!.get(srcEdge)! - 1;
        const dstPinIdx = edgeCounts.get(dst.id)!.get(dstEdge)! - 1;
        const srcTotal  = src.connections.filter(c => blockMap.get(c) && facingEdge(src, blockMap.get(c)!) === srcEdge).length;
        const dstTotal  = dst.connections.filter(c => blockMap.get(c) && facingEdge(dst, blockMap.get(c)!) === dstEdge).length || 1;

        const [ax, ay] = pinXY(src, srcEdge, srcPinIdx, Math.max(srcTotal, 1));
        const [bx, by] = pinXY(dst, dstEdge, dstPinIdx, dstTotal);

        const { segs, vias } = routePins(ax, ay, srcEdge, bx, by, dstEdge);

        // Draw route segments
        segs.forEach(s => {
          routeG.append('line')
            .attr('x1', s.x1).attr('y1', s.y1).attr('x2', s.x2).attr('y2', s.y2)
            .attr('stroke', layerColor(s.layer))
            .attr('stroke-width', s.layer === 2 ? 1.0 : 0.8)
            .attr('stroke-opacity', 0.75)
            .attr('stroke-linecap', 'round')
            .attr('class', `route-${src.id}-${dst.id}`);
        });

        // Draw vias
        vias.forEach(v => {
          viaG.append('circle')
            .attr('cx', v.x).attr('cy', v.y).attr('r', VIA_R)
            .attr('fill', '#ffffff').attr('fill-opacity', 0.9)
            .attr('stroke', '#aaaaaa').attr('stroke-width', 0.3);
        });

        // Source pin marker
        routeG.append('rect')
          .attr('x', ax - 2.5).attr('y', ay - 2.5).attr('width', 5).attr('height', 5)
          .attr('fill', layerColor(1)).attr('fill-opacity', 0.9).attr('rx', 0.5);

        // Destination pin marker
        routeG.append('rect')
          .attr('x', bx - 2.5).attr('y', by - 2.5).attr('width', 5).attr('height', 5)
          .attr('fill', layerColor(3)).attr('fill-opacity', 0.9).attr('rx', 0.5);
      });
    }

    // ── Blocks ────────────────────────────────────────────────────────────────
    const blockG = zg.append('g').attr('class', 'phy-blocks');

    blocks.forEach(b => {
      const absX = CORE_X + b.px, absY = CORE_Y + b.py;
      const fill = BLOCK_FILL[b.type] ?? '#0d1a2a';
      const labelColor = BLOCK_LABEL_COLOR[b.type] ?? '#60c8ff';

      const g = blockG.append('g')
        .attr('class', `phy-block phy-${b.id}`)
        .style('cursor', 'default');

      // Block body
      g.append('rect')
        .attr('x', absX).attr('y', absY)
        .attr('width', b.pw).attr('height', b.ph)
        .attr('fill', fill).attr('stroke', BLOCK_STROKE)
        .attr('stroke-width', 1.2).attr('rx', 2);

      // Standard-cell row hatching
      g.append('rect')
        .attr('x', absX).attr('y', absY)
        .attr('width', b.pw).attr('height', b.ph)
        .attr('fill', 'url(#sc-rows)').attr('rx', 2);

      // N-well band (top third of block)
      g.append('rect')
        .attr('x', absX + 1).attr('y', absY + 1)
        .attr('width', b.pw - 2).attr('height', b.ph * 0.35)
        .attr('fill', 'url(#nwell)').attr('rx', 2);

      // Top type stripe
      g.append('rect')
        .attr('x', absX).attr('y', absY)
        .attr('width', b.pw).attr('height', 8)
        .attr('fill', labelColor).attr('fill-opacity', 0.22).attr('rx', 2);

      // Block name label
      g.append('text')
        .attr('x', absX + b.pw / 2).attr('y', absY + b.ph / 2 - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor).attr('fill-opacity', 0.9)
        .attr('font-size', `${Math.max(7, Math.min(11, b.ph / 5))}px`)
        .attr('font-family', 'monospace').attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .each(function () {
          const el = d3.select(this);
          let txt = b.name;
          el.text(txt);
          const node = el.node() as SVGTextElement | null;
          if (node) {
            while (txt.length > 3 && node.getComputedTextLength() > b.pw - 10) {
              txt = txt.slice(0, -1);
              el.text(txt + '…');
            }
          }
        });

      // Type badge
      g.append('text')
        .attr('x', absX + b.pw / 2).attr('y', absY + b.ph / 2 + 9)
        .attr('text-anchor', 'middle')
        .attr('fill', labelColor).attr('fill-opacity', 0.6)
        .attr('font-size', '6.5px').attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text(b.type.toUpperCase());

      // Area/power metrics (small, bottom)
      if (b.ph > 50) {
        g.append('text')
          .attr('x', absX + b.pw / 2).attr('y', absY + b.ph - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', '#4a6a80').attr('font-size', '5.5px').attr('font-family', 'monospace')
          .attr('pointer-events', 'none')
          .text(`${b.area_mm2.toFixed(2)}mm² · ${b.power_mw.toFixed(0)}mW`);
      }

      // Hover + click handlers
      g.on('mouseenter', function () {
        setHoveredBlock(b.id);
        d3.select(this).select('rect:first-child')
          .attr('stroke', '#00ffff').attr('stroke-width', 2.5);
        // Highlight connected routes
        routeG.selectAll('line')
          .attr('stroke-opacity', function (this: SVGLineElement) {
            const cls = this.getAttribute('class') ?? '';
            return cls.includes(b.id) ? 1.0 : 0.15;
          })
          .attr('stroke-width', function (this: SVGLineElement) {
            const cls = this.getAttribute('class') ?? '';
            return cls.includes(b.id) ? 1.8 : 0.6;
          });
        // Dim unconnected blocks
        blockG.selectAll<SVGGElement, unknown>('.phy-block')
          .filter(function () {
            const cls = (this as SVGGElement).getAttribute('class') ?? '';
            return !cls.includes(b.id) &&
              !b.connections.some(c => cls.includes(c));
          })
          .attr('opacity', 0.3);
      })
      .on('mouseleave', function () {
        setHoveredBlock(null);
        // Keep selected block highlighted if it matches
        const isSel = selectedBlockRef.current?.id === b.id;
        d3.select(this).select('rect:first-child')
          .attr('stroke', isSel ? (BLUEPRINT_COLORS[b.type] ?? BLOCK_STROKE) : BLOCK_STROKE)
          .attr('stroke-width', isSel ? 2.0 : 1.2);
        routeG.selectAll('line')
          .attr('stroke-opacity', 0.75).attr('stroke-width', function (this: SVGLineElement) {
            const cls = this.getAttribute('class') ?? '';
            return cls.includes('route') ? (this.getAttribute('stroke') === M2_COLOR ? 1.0 : 0.8) : 0.8;
          });
        blockG.selectAll('.phy-block').attr('opacity', 1);
      })
      .on('click', function () {
        // Toggle selection
        const currentSel = selectedBlockRef.current;
        const origBlock = architecture.blocks.find(x => x.id === b.id) ?? null;
        setSelectedBlock(currentSel?.id === b.id ? null : origBlock);
        // Visual feedback: highlight selected block border with blueprint colour
        blockG.selectAll<SVGGElement, unknown>('.phy-block').each(function () {
          const cls = (this as SVGGElement).getAttribute('class') ?? '';
          const isThis = cls.includes(b.id);
          if (currentSel?.id !== b.id && isThis) {
            d3.select(this).select('rect:first-child')
              .attr('stroke', BLUEPRINT_COLORS[b.type] ?? BLOCK_STROKE).attr('stroke-width', 2.2);
          } else if (currentSel?.id === b.id && isThis) {
            d3.select(this).select('rect:first-child')
              .attr('stroke', BLOCK_STROKE).attr('stroke-width', 1.2);
          }
        });
      })
      .style('cursor', 'pointer');
    });

    // ── Process metadata overlay ───────────────────────────────────────────────
    zg.append('text')
      .attr('x', CORE_X).attr('y', CORE_Y - 8)
      .attr('fill', '#304050').attr('font-size', '7.5px').attr('font-family', 'monospace')
      .text(`${architecture.process_node} · ${architecture.metal_layers}-metal · ${architecture.substrate} · ${architecture.interconnect}`);

    zg.append('text')
      .attr('x', CORE_X + CORE_W).attr('y', CORE_Y - 8)
      .attr('text-anchor', 'end')
      .attr('fill', '#304050').attr('font-size', '7.5px').attr('font-family', 'monospace')
      .text(`${blocks.length} blocks · ${connections.length ?? 0} nets`);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [architecture, showRouting, showPowerRails]);

  return (
    <div className="rounded-xl border border-zinc-700 overflow-hidden bg-zinc-950">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80">
        <div>
          <h3 className="text-xs font-bold text-cyan-300 font-mono tracking-widest uppercase">Physical Layout · Pin-to-Pin</h3>
          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
            M1 <span style={{ color: M1_COLOR }}>━━</span> horizontal &nbsp;
            M2 <span style={{ color: M2_COLOR }}>━━</span> vertical &nbsp;
            M3 <span style={{ color: M3_COLOR }}>━━</span> horizontal &nbsp;
            <span className="text-white/40">● via</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowRouting(v => !v)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${showRouting ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
            Routing {showRouting ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setShowPowerRails(v => !v)}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${showPowerRails ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
            VDD/VSS {showPowerRails ? 'ON' : 'OFF'}
          </button>
          <button onClick={fitView}
            className="px-2 py-1 rounded text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">
            Fit
          </button>
          <button onClick={resetZoom}
            className="px-2 py-1 rounded text-[10px] font-bold border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">
            1:1
          </button>
        </div>
      </div>

      {/* Layer legend */}
      <div className="flex gap-4 px-4 py-1.5 border-b border-zinc-800/50 bg-black/30 text-[9px] font-mono flex-wrap">
        <span style={{ color: PAD_COLOR }}>■ I/O Pad ring</span>
        <span style={{ color: M1_COLOR }}>━ M1 (horizontal)</span>
        <span style={{ color: M2_COLOR }}>┃ M2 (vertical)</span>
        <span style={{ color: M3_COLOR }}>━ M3 (horizontal)</span>
        <span className="text-white/50">● Via</span>
        <span style={{ color: VDD_COLOR }}>━ VDD rail</span>
        <span style={{ color: VSS_COLOR }}>┄ VSS rail</span>
        <span className="text-zinc-600 ml-auto">Scroll=zoom · hover=nets · click=details</span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="560"
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-black"
        style={{ touchAction: 'none', fontFamily: 'monospace' }}
        role="img"
        aria-label="Physical layout — pin-to-pin VLSI view"
      />

      {/* Hover status bar (only when no block is selected) */}
      {hoveredBlock && !selectedBlock && (() => {
        const b = architecture.blocks.find(x => x.id === hoveredBlock);
        if (!b) return null;
        return (
          <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/70 flex items-center gap-4 text-[10px] font-mono">
            <span style={{ color: BLOCK_LABEL_COLOR[b.type] ?? '#60c8ff' }} className="font-bold">{b.name}</span>
            <span className="text-zinc-500">{b.type.toUpperCase()}</span>
            <span className="text-zinc-400">{b.area_mm2.toFixed(3)} mm²</span>
            <span className="text-zinc-400">{b.power_mw.toFixed(0)} mW</span>
            {b.voltage_domain && <span className="text-amber-400/70">{b.voltage_domain}</span>}
            <span className="text-zinc-600 ml-auto text-[9px]">Click to inspect</span>
          </div>
        );
      })()}

      {/* Selected block detail panel — identical fields to Blueprint */}
      {selectedBlock && (
        <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/90">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-3 h-3 rounded-sm inline-block flex-shrink-0 border"
                  style={{
                    backgroundColor: BLUEPRINT_COLORS[selectedBlock.type] + '33',
                    borderColor: BLUEPRINT_COLORS[selectedBlock.type] ?? '#60c8ff',
                  }}
                />
                <span className="text-zinc-100 font-bold text-sm font-mono">{selectedBlock.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase"
                  style={{
                    color: BLOCK_LABEL_COLOR[selectedBlock.type] ?? '#60c8ff',
                    borderColor: (BLUEPRINT_COLORS[selectedBlock.type] ?? '#60c8ff') + '50',
                    backgroundColor: (BLUEPRINT_COLORS[selectedBlock.type] ?? '#60c8ff') + '18',
                  }}
                >
                  {selectedBlock.type}
                </span>
                {selectedBlock.voltage_domain && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                    {selectedBlock.voltage_domain}
                  </span>
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
            <button
              onClick={() => setSelectedBlock(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors flex-shrink-0"
            >✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2.5">
            <PhyMetricPill label="Power" value={selectedBlock.power_mw >= 1000 ? `${(selectedBlock.power_mw / 1000).toFixed(2)} W` : `${selectedBlock.power_mw.toFixed(1)} mW`} />
            <PhyMetricPill label="Area" value={`${selectedBlock.area_mm2.toFixed(3)} mm²`} />
            {selectedBlock.clock_mhz && <PhyMetricPill label="Clock" value={`${selectedBlock.clock_mhz.toLocaleString()} MHz`} />}
            <PhyMetricPill label="Connections" value={`${selectedBlock.connections.length} net${selectedBlock.connections.length !== 1 ? 's' : ''}`} />
            <PhyMetricPill label="Power Density" value={`${(selectedBlock.power_mw / Math.max(selectedBlock.area_mm2, 0.01)).toFixed(0)} mW/mm²`} />
          </div>
        </div>
      )}
    </div>
  );
};

function PhyMetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg px-3 py-1.5 border border-zinc-700/50">
      <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{label}</div>
      <div className="text-zinc-200 text-sm font-mono font-semibold">{value}</div>
    </div>
  );
}
