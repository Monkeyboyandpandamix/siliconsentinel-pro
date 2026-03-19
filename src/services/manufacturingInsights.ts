import { BOMItem, ChipArchitecture } from '../types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function statusFromRisk(value: number) {
  if (value >= 75) {
    return 'High';
  }
  if (value >= 45) {
    return 'Moderate';
  }
  return 'Low';
}

export function getBenchmarkSummary(architecture: ChipArchitecture) {
  const total = architecture.benchmarks.length || 1;
  const optimal = architecture.benchmarks.filter((item) => item.status === 'OPTIMAL').length;
  const critical = architecture.benchmarks.find((item) => item.status === 'CRITICAL');

  return {
    passRate: round((optimal / total) * 100, 0),
    readiness: critical ? 'WATCH' : architecture.estimatedYield >= 82 ? 'READY' : 'WATCH',
    topConcern: critical?.name || architecture.benchmarks.find((item) => item.status === 'WARNING')?.name || 'No major constraints flagged',
  } as const;
}

export function getFabOpsMetrics(architecture: ChipArchitecture) {
  const toolHealth = clamp(92 - architecture.totalPower / 18, 61, 97);
  const downtimeRisk = clamp(architecture.totalPower / 9 + architecture.totalArea * 1.6, 18, 92);
  const maintenanceWindowHours = clamp(28 - architecture.totalPower / 40, 6, 26);
  const bottleneckUtilization = clamp(68 + architecture.totalArea * 1.9, 52, 96);

  return {
    toolHealth: round(toolHealth),
    downtimeRisk: round(downtimeRisk),
    maintenanceWindowHours: round(maintenanceWindowHours),
    bottleneckUtilization: round(bottleneckUtilization),
    recommendedAction:
      downtimeRisk > 65
        ? 'Pull preventive maintenance forward on etch and RF calibration tools.'
        : 'Keep standard PM cadence and monitor chamber drift for the next 2 lots.',
    alerts: [
      {
        tool: 'ETCH-04',
        signal: 'Chamber pressure drift',
        severity: downtimeRisk > 65 ? 'High' : 'Moderate',
        eta: downtimeRisk > 65 ? 'Within 18 hours' : 'Within 3 days',
      },
      {
        tool: 'CMP-02',
        signal: 'Pad wear acceleration',
        severity: bottleneckUtilization > 80 ? 'Moderate' : 'Low',
        eta: 'Next maintenance cycle',
      },
      {
        tool: 'LITHO-07',
        signal: 'Overlay variance',
        severity: architecture.estimatedYield < 80 ? 'High' : 'Moderate',
        eta: '2 shift horizon',
      },
    ],
  };
}

export function getProcessControlMetrics(architecture: ChipArchitecture) {
  const cpk = round(clamp(1.72 - architecture.totalArea / 40, 1.01, 1.78), 2);
  const excursionRisk = clamp(architecture.totalPower / 7 + (100 - architecture.estimatedYield), 16, 94);
  const scrapExposure = round(clamp((100 - architecture.estimatedYield) * 0.42, 3.5, 18.5), 1);

  return {
    cpk,
    excursionRisk: round(excursionRisk),
    scrapExposure,
    wafersAtRisk: Math.round(clamp(excursionRisk / 3.4, 5, 28)),
    rootCauses: [
      { name: 'Overlay drift', contribution: 34 },
      { name: 'RF impedance mismatch', contribution: 27 },
      { name: 'CMP thickness variation', contribution: 21 },
      { name: 'Probe card instability', contribution: 18 },
    ],
  };
}

export function getDigitalTwinMetrics(architecture: ChipArchitecture) {
  const throughput = round(clamp(38 - architecture.totalArea / 3.5, 11, 42), 1);
  const cycleTime = round(clamp(92 + architecture.totalArea * 2.4, 68, 188), 1);
  const queueRisk = round(clamp(architecture.totalPower / 8 + architecture.totalArea * 1.1, 15, 89), 0);
  const lineBalance = round(clamp(91 - architecture.totalArea * 0.9, 58, 95), 0);

  return {
    throughput,
    cycleTime,
    queueRisk,
    lineBalance,
    scenarioNotes: [
      '12-hour etch outage extends cycle time by 14.6%.',
      'Adding a parallel test cell recovers 3.2 wafers/hour.',
      'Shifting high-mix lots to night dispatch reduces queue risk by 9 points.',
    ],
  };
}

export function getSupplyResilienceMetrics(architecture: ChipArchitecture, bom: BOMItem[]) {
  const limitedCount = bom.filter((item) => item.availability !== 'In Stock').length;
  const avgLeadTimeWeeks =
    bom.reduce((sum, item) => {
      const match = item.leadTime.match(/(\d+(\.\d+)?)/);
      return sum + Number(match?.[1] || 2);
    }, 0) / Math.max(bom.length, 1);
  const concentrationRisk = clamp(limitedCount * 18 + architecture.totalArea * 1.8, 18, 91);

  return {
    resilienceScore: round(clamp(92 - concentrationRisk / 1.4, 34, 96), 0),
    concentrationRisk: round(concentrationRisk, 0),
    avgLeadTimeWeeks: round(avgLeadTimeWeeks, 1),
    shortageRiskLabel: statusFromRisk(concentrationRisk),
    watchlist: bom
      .filter((item) => item.availability !== 'In Stock')
      .map((item) => ({
        partNumber: item.partNumber,
        issue: item.availability === 'Backorder' ? 'Backorder exposure' : 'Allocation pressure',
        action: item.availability === 'Backorder' ? 'Qualify alternate supplier and increase buffer stock.' : 'Split award and secure expedite capacity.',
      })),
  };
}
