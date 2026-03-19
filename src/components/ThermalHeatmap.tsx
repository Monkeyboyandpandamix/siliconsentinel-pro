import React, { useEffect, useRef } from 'react';
import { ChipArchitecture } from '../types';

interface Props {
  architecture: ChipArchitecture;
}

export const ThermalHeatmap: React.FC<Props> = ({ architecture }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !architecture) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Draw Chip Border
    const padding = 40;
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

    // Draw Floorplan Background
    architecture.blocks.forEach(block => {
      const bx = (block.x / 100) * (width - padding * 2) + padding;
      const by = (block.y / 100) * (height - padding * 2) + padding;
      const bw = (block.width / 100) * (width - padding * 2);
      const bh = (block.height / 100) * (height - padding * 2);

      // Block Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      
      // Block Fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(bx, by, bw, bh);

      // Sub-grid for block
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.moveTo(bx + bw/2, by); ctx.lineTo(bx + bw/2, by + bh);
      ctx.moveTo(bx, by + bh/2); ctx.lineTo(bx + bw, by + bh/2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '7px monospace';
      ctx.fillText(block.name, bx + 4, by + 10);
    });

    // Generate heatmap points
    const points: { x: number; y: number; temp: number; radius: number }[] = architecture.blocks.map(block => ({
      x: (block.x / 100) * (width - padding * 2) + padding + ((block.width / 100) * (width - padding * 2)) / 2,
      y: (block.y / 100) * (height - padding * 2) + padding + ((block.height / 100) * (height - padding * 2)) / 2,
      temp: block.powerConsumption / 100,
      radius: (block.area * 2.5) + 50
    }));

    // Draw gradients for each point
    points.forEach(p => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      
      // Heat colors - more standard thermal palette
      const intensity = Math.min(p.temp, 1);
      gradient.addColorStop(0, `rgba(255, ${Math.floor(200 * (1 - intensity))}, 0, ${0.8 * intensity})`);
      gradient.addColorStop(0.5, `rgba(255, ${Math.floor(100 * (1 - intensity))}, 0, ${0.4 * intensity})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'lighter'; // Use lighter for additive heat
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw grid
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

  }, [architecture]);

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest text-center w-full">Digital Twin: Thermal Behavior Map</h3>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 shadow-2xl">
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-600 rounded"></div>
            </div>
            <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                <span>30°C</span>
                <span>85°C</span>
            </div>
        </div>
      </div>
    </div>
  );
};
