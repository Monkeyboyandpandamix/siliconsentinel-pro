export interface ChipArchitecture {
  name: string;
  benchmarkSummary?: {
    passRate: number;
    readiness: 'READY' | 'WATCH' | 'BLOCKED';
    topConcern: string;
  };
  blocks: {
    id: string;
    name: string;
    type: 'cpu' | 'memory' | 'io' | 'power' | 'rf' | 'analog';
    powerConsumption: number; // in mW
    area: number; // in mm2
    connections: string[]; // IDs of other blocks
    x: number; // 0-100 relative
    y: number; // 0-100 relative
    width: number; // 0-100 relative
    height: number; // 0-100 relative
  }[];
  processNode: string;
  estimatedYield: number;
  totalPower: number;
  totalArea: number;
  benchmarks: BenchmarkMetric[];
}

export interface BenchmarkMetric {
  name: string;
  score: number;
  unit: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  target: string;
  category: 'performance' | 'thermal' | 'yield' | 'signal' | 'supply' | 'sustainability';
  trend: 'UP' | 'DOWN' | 'STABLE';
  delta: number;
  note: string;
}

export interface SimulationResult {
  thermalData: { x: number; y: number; temp: number }[];
  powerBreakdown: { name: string; value: number }[];
  signalIntegrityScore: number;
  pass: boolean;
}

export interface BOMItem {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  availability: 'In Stock' | 'Limited' | 'Backorder';
  leadTime: string;
}

export interface OrchestrationOrder {
  id: string;
  type: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
}

export interface AppSettings {
  simulatorMode: boolean;
  highContrast: boolean;
  uiScale: number;
  complexity: 'beginner' | 'advanced';
}
