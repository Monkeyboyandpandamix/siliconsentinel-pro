import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ChipArchitecture } from '../types';

interface Props {
  architecture: ChipArchitecture;
  complexity?: 'beginner' | 'advanced';
  onUpdate?: (updated: ChipArchitecture) => void;
}

export const ArchitectureViewer: React.FC<Props> = ({ architecture, complexity = 'advanced', onUpdate }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showWiring, setShowWiring] = React.useState(true);

  useEffect(() => {
    if (!svgRef.current || !architecture) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const padding = 30;
    const innerWidth = width - padding * 4;
    const innerHeight = height - padding * 4;
    const offset = padding * 2;
    
    // Draw Background Grid
    const gridSize = 20;
    const gridGroup = svg.append("g").attr("class", "grid");
    for (let x = 0; x <= width; x += gridSize) {
      gridGroup.append("line")
        .attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", height)
        .attr("stroke", "#18181b").attr("stroke-width", 0.5);
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridGroup.append("line")
        .attr("x1", 0).attr("y1", y).attr("x2", width).attr("y2", y)
        .attr("stroke", "#18181b").attr("stroke-width", 0.5);
    }

    // Draw Substrate Texture
    svg.append("rect")
      .attr("width", width - padding * 2)
      .attr("height", height - padding * 2)
      .attr("x", padding)
      .attr("y", padding)
      .attr("fill", "url(#substrate-pattern)")
      .attr("opacity", 0.3);

    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
      .attr("id", "substrate-pattern")
      .attr("width", 4)
      .attr("height", 4)
      .attr("patternUnits", "userSpaceOnUse");
    
    pattern.append("circle")
      .attr("cx", 1)
      .attr("cy", 1)
      .attr("r", 0.5)
      .attr("fill", "#27272a");

    // Memory Texture
    const memoryPattern = defs.append("pattern")
      .attr("id", "memory-pattern")
      .attr("width", 4)
      .attr("height", 4)
      .attr("patternUnits", "userSpaceOnUse");
    memoryPattern.append("line").attr("x1", 0).attr("y1", 2).attr("x2", 4).attr("y2", 2).attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-width", 0.5);
    memoryPattern.append("line").attr("x1", 2).attr("y1", 0).attr("x2", 2).attr("y2", 4).attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-width", 0.5);

    // CPU Texture
    const cpuPattern = defs.append("pattern")
      .attr("id", "cpu-pattern")
      .attr("width", 6)
      .attr("height", 6)
      .attr("patternUnits", "userSpaceOnUse");
    cpuPattern.append("rect").attr("width", 3).attr("height", 3).attr("fill", "rgba(255,255,255,0.03)");

    // Draw Chip Border
    svg.append("rect")
      .attr("width", width - padding * 2)
      .attr("height", height - padding * 2)
      .attr("x", padding)
      .attr("y", padding)
      .attr("fill", "#09090b")
      .attr("stroke", "#3f3f46")
      .attr("stroke-width", 2)
      .attr("rx", 12);

    // Draw Power Rails (VDD/GND Rings)
    if (complexity === 'advanced') {
      svg.append("rect")
        .attr("width", width - padding * 2 - 20)
        .attr("height", height - padding * 2 - 20)
        .attr("x", padding + 10)
        .attr("y", padding + 10)
        .attr("fill", "none")
        .attr("stroke", "rgba(239, 68, 68, 0.1)") // VDD Red
        .attr("stroke-width", 1)
        .attr("rx", 6);
      
      svg.append("rect")
        .attr("width", width - padding * 2 - 24)
        .attr("height", height - padding * 2 - 24)
        .attr("x", padding + 12)
        .attr("y", padding + 12)
        .attr("fill", "none")
        .attr("stroke", "rgba(59, 130, 246, 0.1)") // GND Blue
        .attr("stroke-width", 1)
        .attr("rx", 5);
    }

    // Draw Internal Guard Ring
    svg.append("rect")
      .attr("width", width - padding * 2 - 10)
      .attr("height", height - padding * 2 - 10)
      .attr("x", padding + 5)
      .attr("y", padding + 5)
      .attr("fill", "none")
      .attr("stroke", "#27272a")
      .attr("stroke-width", 1)
      .attr("rx", 8);

    // Scale Bar
    const scaleBarWidth = 50;
    svg.append("line")
      .attr("x1", width - padding - scaleBarWidth - 10)
      .attr("y1", height - padding - 10)
      .attr("x2", width - padding - 10)
      .attr("y2", height - padding - 10)
      .attr("stroke", "#3f3f46")
      .attr("stroke-width", 1);
    svg.append("text")
      .text("500μm")
      .attr("x", width - padding - scaleBarWidth/2 - 10)
      .attr("y", height - padding - 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#3f3f46")
      .attr("font-size", "6px")
      .attr("font-family", "monospace");

    // Manufacturing Marks
    const marks = [
      { x: padding + 15, y: padding + 15, text: "SILICON_SENTINEL_V1.0" },
      { x: width - padding - 15, y: height - padding - 15, text: "FAB_TSMC_5NM" },
      { x: padding + 15, y: height - padding - 15, text: "© 2026" }
    ];
    marks.forEach(m => {
      svg.append("text")
        .text(m.text)
        .attr("x", m.x)
        .attr("y", m.y)
        .attr("text-anchor", m.x > width/2 ? "end" : "start")
        .attr("fill", "#27272a")
        .attr("font-size", "5px")
        .attr("font-family", "monospace");
    });

    // Draw Pins with Labels
    const pinCount = 12;
    const pinLabels = ['VDD', 'GND', 'SDA', 'SCL', 'GPIO0', 'GPIO1', 'RX', 'TX', 'MISO', 'MOSI', 'SCK', 'CS'];
    
    for (let i = 0; i < pinCount; i++) {
      const xPos = padding + 40 + i * (width - (padding + 40) * 2) / (pinCount - 1);
      const yPos = padding + 40 + i * (height - (padding + 40) * 2) / (pinCount - 1);

      // Top
      svg.append("rect").attr("width", 6).attr("height", 12).attr("x", xPos - 3).attr("y", padding - 6).attr("fill", "#71717a").attr("rx", 1);
      if (complexity === 'advanced') {
        svg.append("text").text(pinLabels[i % pinLabels.length]).attr("x", xPos).attr("y", padding - 10).attr("text-anchor", "middle").attr("fill", "#52525b").attr("font-size", "6px").attr("font-family", "monospace");
      }
      
      // Bottom
      svg.append("rect").attr("width", 6).attr("height", 12).attr("x", xPos - 3).attr("y", height - padding - 6).attr("fill", "#71717a").attr("rx", 1);
      if (complexity === 'advanced') {
        svg.append("text").text(pinLabels[(i + 3) % pinLabels.length]).attr("x", xPos).attr("y", height - padding + 12).attr("text-anchor", "middle").attr("fill", "#52525b").attr("font-size", "6px").attr("font-family", "monospace");
      }

      // Left
      svg.append("rect").attr("width", 12).attr("height", 6).attr("x", padding - 6).attr("y", yPos - 3).attr("fill", "#71717a").attr("rx", 1);
      if (complexity === 'advanced') {
        svg.append("text").text(pinLabels[(i + 6) % pinLabels.length]).attr("x", padding - 10).attr("y", yPos + 2).attr("text-anchor", "end").attr("fill", "#52525b").attr("font-size", "6px").attr("font-family", "monospace");
      }

      // Right
      svg.append("rect").attr("width", 12).attr("height", 6).attr("x", width - padding - 6).attr("y", yPos - 3).attr("fill", "#71717a").attr("rx", 1);
      if (complexity === 'advanced') {
        svg.append("text").text(pinLabels[(i + 9) % pinLabels.length]).attr("x", width - padding + 10).attr("y", yPos + 2).attr("text-anchor", "start").attr("fill", "#52525b").attr("font-size", "6px").attr("font-family", "monospace");
      }
    }

    const blocks = architecture.blocks;

    const drawConnections = () => {
      svg.selectAll(".trace").remove();
      if (!showWiring) return;

      const links: any[] = [];
      blocks.forEach(block => {
        block.connections.forEach(targetId => {
          const target = blocks.find(b => b.id === targetId);
          if (target) {
            const x1 = (block.x / 100) * innerWidth + offset + ((block.width / 100) * innerWidth) / 2;
            const y1 = (block.y / 100) * innerHeight + offset + ((block.height / 100) * innerHeight) / 2;
            const x2 = (target.x / 100) * innerWidth + offset + ((target.width / 100) * innerWidth) / 2;
            const y2 = (target.y / 100) * innerHeight + offset + ((target.height / 100) * innerHeight) / 2;
            
            // Orthogonal routing with multiple segments
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            
            links.push(`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`);

            // Add vias at corners
            const viaGroup = svg.append("g").attr("class", "trace");
            viaGroup.append("circle").attr("cx", midX).attr("cy", y1).attr("r", 3).attr("fill", "#6366f1").attr("opacity", 0.8);
            viaGroup.append("circle").attr("cx", midX).attr("cy", y2).attr("r", 3).attr("fill", "#6366f1").attr("opacity", 0.8);

            // Add Bus Labels
            if (complexity === 'advanced') {
              svg.append("text")
                .text("BUS_INT")
                .attr("x", midX + 2)
                .attr("y", midY)
                .attr("fill", "rgba(99, 102, 241, 0.4)")
                .attr("font-size", "5px")
                .attr("font-family", "monospace")
                .attr("class", "trace");
            }
          }
        });
      });

      svg.append("g")
        .attr("class", "trace")
        .selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("d", d => d)
        .attr("fill", "none")
        .attr("stroke", "rgba(99, 102, 241, 0.8)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("class", "animate-pulse");
    };

    drawConnections();

    // Draw blocks
    const blockGroups = svg.append("g")
      .selectAll("g")
      .data(blocks)
      .enter().append("g")
      .attr("transform", d => `translate(${(d.x / 100) * innerWidth + offset}, ${(d.y / 100) * innerHeight + offset})`);

    // Drag behavior
    const drag = d3.drag<any, any>()
      .on("drag", (event, d) => {
        d.x = Math.max(0, Math.min(100 - d.width, (event.x - offset) / innerWidth * 100));
        d.y = Math.max(0, Math.min(100 - d.height, (event.y - offset) / innerHeight * 100));
        d3.select(event.sourceEvent.target.parentNode).attr("transform", `translate(${(d.x / 100) * innerWidth + offset}, ${(d.y / 100) * innerHeight + offset})`);
        
        // Update coordinate labels
        d3.select(event.sourceEvent.target.parentNode).selectAll(".coord-label")
          .text(`POS X:${d.x.toFixed(1)} Y:${d.y.toFixed(1)}`);
        
        drawConnections();
      })
      .on("end", () => {
        if (onUpdate) onUpdate({ ...architecture, blocks: [...blocks] });
      });

    // Resize behavior
    const resize = d3.drag<any, any>()
      .on("drag", (event, d) => {
        const newWidth = Math.max(5, Math.min(100 - d.x, (event.x) / innerWidth * 100));
        const newHeight = Math.max(5, Math.min(100 - d.y, (event.y) / innerHeight * 100));
        d.width = newWidth;
        d.height = newHeight;
        
        const group = d3.select(event.sourceEvent.target.parentNode);
        group.selectAll("rect.block-rect")
          .attr("width", (d.width / 100) * innerWidth)
          .attr("height", (d.height / 100) * innerHeight);
        
        group.select(".resize-handle")
          .attr("x", (d.width / 100) * innerWidth - 8)
          .attr("y", (d.height / 100) * innerHeight - 8);
        
        group.selectAll("text.block-name")
          .attr("x", ((d.width / 100) * innerWidth) / 2)
          .attr("y", ((d.height / 100) * innerHeight) / 2);
        
        group.selectAll(".coord-label")
          .attr("x", ((d.width / 100) * innerWidth) / 2)
          .attr("y", ((d.height / 100) * innerHeight) / 2 + 12);

        drawConnections();
      })
      .on("end", () => {
        if (onUpdate) onUpdate({ ...architecture, blocks: [...blocks] });
      });

    blockGroups.append("rect")
      .attr("class", "block-rect")
      .attr("width", d => (d.width / 100) * innerWidth)
      .attr("height", d => (d.height / 100) * innerHeight)
      .attr("rx", 6)
      .attr("fill", (d: any) => {
        switch(d.type) {
          case 'cpu': return 'url(#cpu-pattern)';
          case 'memory': return 'url(#memory-pattern)';
          default: return 'none';
        }
      })
      .style("cursor", "move")
      .call(drag);

    blockGroups.append("rect")
      .attr("class", "block-rect")
      .attr("width", d => (d.width / 100) * innerWidth)
      .attr("height", d => (d.height / 100) * innerHeight)
      .attr("rx", 6)
      .attr("fill", (d: any) => {
        switch(d.type) {
          case 'cpu': return '#ef4444';
          case 'memory': return '#3b82f6';
          case 'io': return '#10b981';
          case 'power': return '#f59e0b';
          default: return '#6366f1';
        }
      })
      .attr("fill-opacity", 0.2)
      .attr("stroke", d => {
        switch(d.type) {
          case 'cpu': return '#f87171';
          case 'memory': return '#60a5fa';
          case 'io': return '#34d399';
          case 'power': return '#fbbf24';
          default: return '#818cf8';
        }
      })
      .attr("stroke-width", 2)
      .style("cursor", "move")
      .call(drag);

    // Resize Handle
    if (complexity === 'advanced') {
      blockGroups.append("rect")
        .attr("class", "resize-handle")
        .attr("width", 8)
        .attr("height", 8)
        .attr("x", d => (d.width / 100) * innerWidth - 8)
        .attr("y", d => (d.height / 100) * innerHeight - 8)
        .attr("fill", "rgba(255,255,255,0.2)")
        .attr("rx", 2)
        .style("cursor", "nwse-resize")
        .call(resize);
    }

    // Internal block details (sub-grid) - only for advanced
    if (complexity === 'advanced') {
      blockGroups.append("path")
        .attr("d", d => {
          const w = (d.width / 100) * innerWidth;
          const h = (d.height / 100) * innerHeight;
          return `M 0 ${h/2} L ${w} ${h/2} M ${w/2} 0 L ${w/2} ${h}`;
        })
        .attr("stroke", "rgba(255,255,255,0.05)")
        .attr("stroke-width", 0.5)
        .attr("pointer-events", "none");
    }

    blockGroups.append("text")
      .attr("class", "block-name")
      .text((d: any) => d.name)
      .attr("x", d => ((d.width / 100) * innerWidth) / 2)
      .attr("y", d => ((d.height / 100) * innerHeight) / 2)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "white")
      .attr("font-size", complexity === 'beginner' ? "10px" : "8px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none");

    blockGroups.append("text")
      .attr("class", "coord-label")
      .text((d: any) => `POS X:${d.x.toFixed(1)} Y:${d.y.toFixed(1)}`)
      .attr("x", d => ((d.width / 100) * innerWidth) / 2)
      .attr("y", d => ((d.height / 100) * innerHeight) / 2 + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.6)")
      .attr("font-size", "6px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none");

  }, [architecture, complexity, showWiring]);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-zinc-100 font-bold text-sm">Architecture Blueprint</h3>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Physical Floorplan & Routing</p>
        </div>
        <div className="flex gap-3 items-center">
            <button 
                onClick={() => setShowWiring(!showWiring)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${showWiring ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
            >
                {showWiring ? 'Wiring: ON' : 'Wiring: OFF'}
            </button>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono"><div className="w-2 h-2 bg-red-500/40 border border-red-500/60 rounded-sm"></div> CPU</span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono"><div className="w-2 h-2 bg-blue-500/40 border border-blue-500/60 rounded-sm"></div> MEM</span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono"><div className="w-2 h-2 bg-emerald-500/40 border border-emerald-500/60 rounded-sm"></div> I/O</span>
        </div>
      </div>
      <svg ref={svgRef} width="100%" height="400" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" className="drop-shadow-2xl" />
    </div>
  );
};
