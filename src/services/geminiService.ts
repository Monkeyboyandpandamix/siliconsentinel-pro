import { BOMItem, ChipArchitecture } from '../types';
import { getBenchmarkSummary } from './manufacturingInsights';

type Constraints = {
  power?: number;
  area?: number;
  node?: string;
  domain?: string;
};

const BLOCK_LIBRARY: Array<ChipArchitecture['blocks'][number]> = [
  {
    id: 'cpu-cluster',
    name: 'CPU Cluster',
    type: 'cpu',
    powerConsumption: 165,
    area: 2.8,
    connections: ['l2-cache', 'io-hub', 'power-grid'],
    x: 10,
    y: 16,
    width: 24,
    height: 24,
  },
  {
    id: 'l2-cache',
    name: 'L2 Cache',
    type: 'memory',
    powerConsumption: 58,
    area: 1.8,
    connections: ['cpu-cluster', 'npu-array', 'io-hub'],
    x: 38,
    y: 16,
    width: 18,
    height: 18,
  },
  {
    id: 'npu-array',
    name: 'NPU Array',
    type: 'analog',
    powerConsumption: 92,
    area: 1.6,
    connections: ['l2-cache', 'rf-front-end', 'io-hub'],
    x: 60,
    y: 15,
    width: 18,
    height: 22,
  },
  {
    id: 'rf-front-end',
    name: 'RF Front End',
    type: 'rf',
    powerConsumption: 74,
    area: 1.1,
    connections: ['npu-array', 'io-hub', 'power-grid'],
    x: 72,
    y: 48,
    width: 16,
    height: 18,
  },
  {
    id: 'io-hub',
    name: 'IO Hub',
    type: 'io',
    powerConsumption: 49,
    area: 1.3,
    connections: ['cpu-cluster', 'l2-cache', 'rf-front-end', 'power-grid'],
    x: 34,
    y: 52,
    width: 22,
    height: 18,
  },
  {
    id: 'power-grid',
    name: 'Power Management',
    type: 'power',
    powerConsumption: 35,
    area: 0.9,
    connections: ['cpu-cluster', 'rf-front-end', 'io-hub'],
    x: 10,
    y: 56,
    width: 18,
    height: 16,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function derivePromptLabel(prompt: string, domain: string) {
  const normalized = prompt.trim();
  if (!normalized) {
    return `${domain} Reference SoC`;
  }

  const label = normalized
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return label || `${domain} Reference SoC`;
}

function scaleBlocks(constraints: Constraints, prompt: string) {
  const powerBudget = clamp(Number(constraints.power ?? 500), 180, 1200);
  const areaBudget = clamp(Number(constraints.area ?? 10), 4, 40);
  const domain = (constraints.domain || 'IoT').toLowerCase();
  const promptLower = prompt.toLowerCase();

  const powerScale = powerBudget / 500;
  const areaScale = areaBudget / 10;
  const aiBoost = promptLower.includes('ai') || promptLower.includes('ml') || promptLower.includes('inference') ? 1.2 : 1;
  const rfBoost = promptLower.includes('wireless') || promptLower.includes('rf') || domain.includes('5g') ? 1.15 : 1;
  const ioBoost = domain.includes('edge') || domain.includes('automotive') ? 1.1 : 1;

  return BLOCK_LIBRARY.map((block) => {
    let blockPowerScale = powerScale;
    let blockAreaScale = areaScale;

    if (block.id === 'npu-array') {
      blockPowerScale *= aiBoost;
      blockAreaScale *= aiBoost;
    }
    if (block.id === 'rf-front-end') {
      blockPowerScale *= rfBoost;
      blockAreaScale *= rfBoost;
    }
    if (block.id === 'io-hub') {
      blockPowerScale *= ioBoost;
      blockAreaScale *= ioBoost;
    }

    return {
      ...block,
      powerConsumption: round(block.powerConsumption * blockPowerScale, 1),
      area: round(block.area * blockAreaScale, 2),
    };
  });
}

function benchmarkStatus(score: number) {
  if (score >= 85) {
    return 'OPTIMAL' as const;
  }
  if (score >= 65) {
    return 'WARNING' as const;
  }
  return 'CRITICAL' as const;
}

type Benchmark = ChipArchitecture['benchmarks'][number];

function buildBenchmarks(architecture: ChipArchitecture) {
  const totalPower = architecture.totalPower;
  const totalArea = architecture.totalArea;
  const computeBlock = architecture.blocks.find((block) => block.id === 'npu-array');
  const ioBlock = architecture.blocks.find((block) => block.id === 'io-hub');
  const rfBlock = architecture.blocks.find((block) => block.id === 'rf-front-end');

  const computeDensity = round(((computeBlock?.powerConsumption ?? 90) * 1.9) / Math.max(totalArea, 1), 1);
  const thermalEfficiency = round(clamp(100 - totalPower / 8, 35, 97), 1);
  const signalIntegrity = round(clamp(88 + ((rfBlock?.area ?? 1) - 1) * 6 - totalArea / 5, 60, 98), 1);
  const ioBandwidth = round(clamp((ioBlock?.powerConsumption ?? 50) / 4.2, 6, 28), 1);
  const powerLeakage = round(clamp(totalPower / 320, 0.6, 4.8), 2);

  const benchmarks: Benchmark[] = [
    {
      name: 'Compute Density',
      score: computeDensity,
      unit: 'GFLOPS/mm²',
      status: benchmarkStatus(clamp(computeDensity, 0, 100)),
      target: '>= 15 GFLOPS/mm²',
      category: 'performance',
      trend: computeDensity > 16 ? 'UP' : 'STABLE',
      delta: round(computeDensity - 15, 1),
      note: 'Measures useful AI throughput per mm² of active die area.',
    },
    {
      name: 'Thermal Efficiency',
      score: thermalEfficiency,
      unit: '%',
      status: benchmarkStatus(thermalEfficiency),
      target: '>= 82%',
      category: 'thermal',
      trend: thermalEfficiency < 72 ? 'DOWN' : 'STABLE',
      delta: round(thermalEfficiency - 82, 1),
      note: 'Indicates how much thermal headroom remains during peak operation.',
    },
    {
      name: 'Signal Integrity',
      score: signalIntegrity,
      unit: 'dB',
      status: benchmarkStatus(signalIntegrity),
      target: '>= 85 dB',
      category: 'signal',
      trend: signalIntegrity > 88 ? 'UP' : 'STABLE',
      delta: round(signalIntegrity - 85, 1),
      note: 'Captures routing quality and RF/IO margin across the floorplan.',
    },
    {
      name: 'IO Bandwidth',
      score: ioBandwidth,
      unit: 'Gbps',
      status: benchmarkStatus(clamp(ioBandwidth * 4, 0, 100)),
      target: '>= 12 Gbps',
      category: 'performance',
      trend: ioBandwidth >= 12 ? 'UP' : 'DOWN',
      delta: round(ioBandwidth - 12, 1),
      note: 'Estimates sustainable off-die data movement under manufacturing limits.',
    },
    {
      name: 'Power Leakage',
      score: powerLeakage,
      unit: 'mW',
      status: powerLeakage <= 1.4 ? 'OPTIMAL' : powerLeakage <= 2.5 ? 'WARNING' : 'CRITICAL',
      target: '<= 1.4 mW',
      category: 'yield',
      trend: powerLeakage > 2 ? 'DOWN' : 'STABLE',
      delta: round(1.4 - powerLeakage, 2),
      note: 'Lower leakage improves standby current, heat, and yield guardband.',
    },
    {
      name: 'Predicted Yield Stability',
      score: round(architecture.estimatedYield, 1),
      unit: '%',
      status: benchmarkStatus(clamp(architecture.estimatedYield, 0, 100)),
      target: '>= 84%',
      category: 'yield',
      trend: architecture.estimatedYield >= 84 ? 'UP' : 'DOWN',
      delta: round(architecture.estimatedYield - 84, 1),
      note: 'Expected lot-to-lot yield stability based on area and power density.',
    },
    {
      name: 'Supply Resilience',
      score: round(clamp(95 - totalArea * 1.7 - totalPower / 18, 42, 96), 1),
      unit: 'index',
      status: benchmarkStatus(clamp(95 - totalArea * 1.7 - totalPower / 18, 0, 100)),
      target: '>= 78 index',
      category: 'supply',
      trend: totalArea < 12 ? 'UP' : 'STABLE',
      delta: round(clamp(95 - totalArea * 1.7 - totalPower / 18, 42, 96) - 78, 1),
      note: 'Higher score means fewer constrained packaging and sourcing paths.',
    },
    {
      name: 'Fab Carbon Intensity',
      score: round(clamp(totalArea * 2.4 + totalPower / 20, 6, 48), 1),
      unit: 'kg/wafer',
      status: totalArea * 2.4 + totalPower / 20 < 18 ? 'OPTIMAL' : totalArea * 2.4 + totalPower / 20 < 28 ? 'WARNING' : 'CRITICAL',
      target: '<= 18 kg/wafer',
      category: 'sustainability',
      trend: totalPower > 430 ? 'DOWN' : 'STABLE',
      delta: round(18 - (totalArea * 2.4 + totalPower / 20), 1),
      note: 'Operational footprint proxy for tool energy demand and process complexity.',
    },
  ];

  return benchmarks;
}

function recalculateArchitecture(architecture: ChipArchitecture): ChipArchitecture {
  const totalPower = round(
    architecture.blocks.reduce((sum, block) => sum + block.powerConsumption, 0),
    1,
  );
  const totalArea = round(
    architecture.blocks.reduce((sum, block) => sum + block.area, 0),
    2,
  );
  const estimatedYield = round(clamp(96 - totalArea * 1.1 - totalPower / 35, 62, 97), 1);
  const benchmarks = buildBenchmarks({
    ...architecture,
    totalPower,
    totalArea,
    estimatedYield,
    benchmarks: architecture.benchmarks,
  });

  return {
    ...architecture,
    totalPower,
    totalArea,
    estimatedYield,
    benchmarks,
    benchmarkSummary: getBenchmarkSummary({
      ...architecture,
      totalPower,
      totalArea,
      estimatedYield,
      benchmarks,
    }),
  };
}

function adjustBlock(block: ChipArchitecture['blocks'][number], powerFactor: number, areaFactor = powerFactor) {
  return {
    ...block,
    powerConsumption: round(block.powerConsumption * powerFactor, 1),
    area: round(block.area * areaFactor, 2),
  };
}

export async function generateArchitecture(prompt: string, constraints: Constraints): Promise<ChipArchitecture> {
  const domain = constraints.domain || 'IoT';
  const architecture: ChipArchitecture = {
    name: derivePromptLabel(prompt, domain),
    processNode: constraints.node || '28nm',
    blocks: scaleBlocks(constraints, prompt),
    benchmarkSummary: undefined,
    estimatedYield: 0,
    totalPower: 0,
    totalArea: 0,
    benchmarks: [],
  };

  return recalculateArchitecture(architecture);
}

export async function updateArchitecture(currentArch: ChipArchitecture, command: string): Promise<ChipArchitecture> {
  const normalized = command.toLowerCase();
  let updatedBlocks = currentArch.blocks.map((block) => ({ ...block }));

  if (normalized.includes('reduce') && normalized.includes('power')) {
    updatedBlocks = updatedBlocks.map((block) =>
      normalized.includes(block.type) || normalized.includes(block.name.toLowerCase())
        ? adjustBlock(block, 0.88, 0.97)
        : block,
    );
  } else if (normalized.includes('increase') && normalized.includes('bandwidth')) {
    updatedBlocks = updatedBlocks.map((block) =>
      block.type === 'io' ? adjustBlock(block, 1.12, 1.08) : block,
    );
  } else if (normalized.includes('thermal')) {
    updatedBlocks = updatedBlocks.map((block) =>
      block.type === 'power' || block.type === 'rf' ? adjustBlock(block, 0.92, 1.04) : block,
    );
  } else if (normalized.includes('memory') || normalized.includes('cache')) {
    updatedBlocks = updatedBlocks.map((block) =>
      block.type === 'memory' ? adjustBlock(block, 1.08, 1.12) : block,
    );
  } else {
    updatedBlocks = updatedBlocks.map((block) =>
      block.type === 'cpu' || block.type === 'analog' ? adjustBlock(block, 1.04, 1.03) : block,
    );
  }

  return recalculateArchitecture({
    ...currentArch,
    blocks: updatedBlocks,
  });
}

export async function getBOM(architecture: ChipArchitecture): Promise<BOMItem[]> {
  const totalPower = architecture.totalPower;
  const baseQuantity = Math.max(1, Math.round(architecture.totalArea / 4));

  return [
    {
      id: 'bom-substrate',
      partNumber: `SUB-${architecture.processNode.replace(/[^0-9a-z]/gi, '').toUpperCase()}-FCBGA`,
      description: `${architecture.processNode} flip-chip package substrate`,
      quantity: baseQuantity,
      unitPrice: round(42 + architecture.totalArea * 2.8),
      availability: 'In Stock',
      leadTime: '2 weeks',
    },
    {
      id: 'bom-pmic',
      partNumber: 'PMIC-AX7420',
      description: 'Multi-rail power management IC',
      quantity: 1,
      unitPrice: round(18 + totalPower / 40),
      availability: totalPower > 650 ? 'Limited' : 'In Stock',
      leadTime: totalPower > 650 ? '5 weeks' : '2 weeks',
    },
    {
      id: 'bom-memory',
      partNumber: architecture.blocks.some((block) => block.type === 'memory') ? 'HBM3-MD128' : 'LPDDR5X-64',
      description: 'High-speed memory stack and controller support',
      quantity: architecture.blocks.some((block) => block.type === 'memory') ? 2 : 1,
      unitPrice: architecture.blocks.some((block) => block.type === 'memory') ? 68 : 24,
      availability: 'Limited',
      leadTime: '6 weeks',
    },
    {
      id: 'bom-rf',
      partNumber: architecture.blocks.some((block) => block.type === 'rf') ? 'RFFE-28GHZ-01' : 'IO-BRIDGE-001',
      description: architecture.blocks.some((block) => block.type === 'rf')
        ? 'RF front-end module and shielding kit'
        : 'General-purpose high-speed IO bridge',
      quantity: 1,
      unitPrice: architecture.blocks.some((block) => block.type === 'rf') ? 34 : 16,
      availability: architecture.blocks.some((block) => block.type === 'rf') ? 'Limited' : 'In Stock',
      leadTime: architecture.blocks.some((block) => block.type === 'rf') ? '4 weeks' : '10 days',
    },
    {
      id: 'bom-thermal',
      partNumber: 'THM-VC-220',
      description: 'Vapor chamber and TIM thermal assembly',
      quantity: 1,
      unitPrice: round(12 + totalPower / 55),
      availability: totalPower > 800 ? 'Backorder' : 'In Stock',
      leadTime: totalPower > 800 ? '8 weeks' : '12 days',
    },
  ];
}
