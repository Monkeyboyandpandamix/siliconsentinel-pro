export interface BlockSpec {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'io' | 'power' | 'rf' | 'analog' | 'dsp' | 'accelerator';
  power_mw: number;
  area_mm2: number;
  x: number;
  y: number;
  width: number;
  height: number;
  connections: string[];
  clock_mhz?: number | null;
  description?: string | null;
}

export interface ArchitectureBlueprint {
  name: string;
  process_node: string;
  total_power_mw: number;
  total_area_mm2: number;
  blocks: BlockSpec[];
  metal_layers: number;
  substrate: string;
  gate_oxide: string;
  interconnect: string;
}

export interface ConstraintSatisfaction {
  power: number;
  area: number;
  performance: number;
  thermal: number;
  cost: number;
  overall: number;
}

export interface MaterialRecommendation {
  substrate: string;
  gate_oxide: string;
  metal_layers: number;
  interconnect_material: string;
  doping_type: string;
  passivation: string;
  justification: string;
}

export interface DesignResponse {
  id: number;
  nl_input: string;
  architecture: ArchitectureBlueprint | null;
  materials: MaterialRecommendation | null;
  constraint_satisfaction: ConstraintSatisfaction | null;
  process_node: string | null;
  target_domain: string | null;
  status: string;
  created_at: string;
}

// Simulation types
export interface ThermalZone {
  block_id: string;
  block_name: string;
  temperature_c: number;
  power_density_w_mm2: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface ThermalMapData {
  grid: number[][];
  grid_resolution: number;
  max_temp_c: number;
  min_temp_c: number;
  ambient_temp_c: number;
  zones: ThermalZone[];
  hotspot_count: number;
}

export interface SignalPath {
  from_block: string;
  to_block: string;
  delay_ps: number;
  integrity_score: number;
  is_critical: boolean;
  crosstalk_risk: string;
}

export interface SignalData {
  paths: SignalPath[];
  critical_path_delay_ps: number;
  worst_integrity_score: number;
  timing_violations: number;
}

export interface PowerBreakdown {
  block_id: string;
  block_name: string;
  dynamic_power_mw: number;
  static_power_mw: number;
  total_power_mw: number;
  percentage: number;
}

export interface PowerData {
  blocks: PowerBreakdown[];
  total_dynamic_mw: number;
  total_static_mw: number;
  total_power_mw: number;
  power_efficiency_pct: number;
}

export interface TimingData {
  critical_path_blocks: string[];
  critical_path_delay_ns: number;
  max_clock_mhz: number;
  setup_slack_ns: number;
  hold_slack_ns: number;
  timing_met: boolean;
}

export interface Bottleneck {
  category: string;
  severity: string;
  detail: string;
}

export interface SimulationResponse {
  id: number;
  design_id: number;
  thermal: ThermalMapData;
  signal: SignalData;
  power: PowerData;
  timing: TimingData;
  overall_score: number;
  pass_fail: 'PASS' | 'WARNING' | 'FAIL';
  bottlenecks: Bottleneck[];
  timestamp: string;
}

// Optimization types
export interface PPCAScores {
  power: number;
  performance: number;
  cost: number;
  area: number;
}

export interface OptimizationMetrics {
  total_power_mw: number;
  total_area_mm2: number;
  critical_path_delay_ns: number;
  max_temperature_c: number;
  estimated_yield_pct: number;
  estimated_cost_per_unit: number;
}

export interface OptimizationResponse {
  id: number;
  design_id: number;
  iteration: number;
  metrics_before: OptimizationMetrics;
  metrics_after: OptimizationMetrics;
  improvement_pct: number;
  ppca_before: PPCAScores;
  ppca_after: PPCAScores;
  changes_summary: string[];
  optimized_architecture: ArchitectureBlueprint | null;
  timestamp: string;
}

// BOM types
export interface AlternatePart {
  part_number: string;
  description: string;
  unit_price: number;
  lead_time_days: number;
  savings_pct: number;
}

export interface BOMEntryResponse {
  id: number;
  part_number: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_time_days: number | null;
  availability: string;
  supplier: string | null;
  alternates: AlternatePart[];
}

export interface CostBreakdown {
  bom_cost: number;
  fab_cost_per_wafer: number;
  dies_per_wafer: number;
  fab_cost_per_die: number;
  packaging_cost: number;
  test_cost: number;
  overhead_pct: number;
  total_per_unit: number;
}

export interface CostScenario {
  name: string;
  description: string;
  total_per_unit: number;
  bom_cost: number;
  tradeoffs: string;
}

export interface BOMResponse {
  design_id: number;
  entries: BOMEntryResponse[];
  total_bom_cost: number;
  cost_breakdown: CostBreakdown;
  scenarios: CostScenario[];
  lead_time_critical_path: { part_number: string; description: string; lead_time_days: number; availability: string; is_critical: boolean }[];
  supplier_diversity_score: number;
  supplier_diversity_risk: string;
}

// Prediction types
export interface DefectZone {
  block_id: string;
  block_name: string;
  risk_level: string;
  risk_score: number;
  risk_factors: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YieldPrediction {
  yield_pct: number;
  yield_low_pct: number;
  yield_high_pct: number;
  yield_model: string;
  defect_density_per_cm2: number;
  die_area_mm2: number;
  dies_per_wafer: number;
  good_dies_per_wafer: number;
  fab_cost_per_wafer: number;
  fab_cost_per_good_die: number;
  confidence_interval: string;
}

export interface PredictionsResponse {
  yield: YieldPrediction;
  defect_zones: DefectZone[];
  delay_forecast: {
    estimated_total_weeks: number;
    risk_level: string;
    risk_score: number;
    critical_items: { part_number: string; description: string; lead_time_days: number; availability: string }[];
  };
  shortage_risks: { part_number: string; description: string; supplier: string; risk_level: string; risk_score: number; risk_factors: string[] }[];
}

// Supply chain types
export interface FabRecommendation {
  name: string;
  location: string;
  country: string;
  process_nodes: string[];
  capacity_status: string;
  estimated_cost_per_wafer: number;
  lead_time_weeks: number;
  capability_match: number;
  cost_score: number;
  risk_score: number;
  overall_score: number;
  strengths: string[];
  risk_factors: string[];
}

export interface SupplyChainResponse {
  fab_recommendations: FabRecommendation[];
  geopolitical_risks: { region: string; risk_level: string; factors: string[]; mitigation: string }[];
  diversification_plan: { primary_fab: string; secondary_fab: string; rationale: string };
  supplier_analysis: { suppliers: { name: string; component_count: number; share_pct: number; categories: string[] }[]; concentration_risk: string; total_suppliers: number };
}

// QC types
export interface DefectEntry {
  type: string;
  severity: string;
  location_x: number;
  location_y: number;
  size_um: number;
  confidence: number;
}

export interface QualityCheckResponse {
  id: number;
  design_id: number;
  defect_count: number;
  defects: DefectEntry[];
  pass_fail: string;
  confidence: number;
  root_cause: string | null;
  design_rule_updates: { rule: string; current_value: string; suggested_value: string; reason: string }[];
  timestamp: string;
}

// Orchestration
export interface OrchestrationOrder {
  id: number;
  design_id: number;
  stage: string;
  status: string;
  agent_type: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PipelineStatus {
  design_id: number;
  orders: OrchestrationOrder[];
  current_stage: string | null;
  overall_status: string;
  progress_pct: number;
}

// Carbon
export interface CarbonFootprint {
  total_co2e_kg: number;
  co2e_per_chip_kg: number;
  co2e_per_wafer_kg: number;
  total_energy_kwh: number;
  breakdown: {
    fabrication_kg: number;
    process_gases_kg: number;
    packaging_kg: number;
    testing_kg: number;
    shipping_kg: number;
  };
  fab_country: string;
  carbon_intensity_kwh: number;
  carbon_intensity_label: string;
  carbon_intensity_live: boolean;
  renewable_pct: number | null;
  wafers_needed: number;
  volume: number;
  energy_per_wafer_kwh: number;
  equivalents: {
    trees_absorb_1yr: number;
    car_miles_driven: number;
    smartphone_charges: number;
    home_electricity_days: number;
    bulb_60w_hours: number;
    led_9w_hours: number;
    flights_nyc_london: number;
    coal_burned_kg: number;
  };
}

// Manufacturability
export interface ManufacturabilityScore {
  overall_score: number;
  verdict: string;
  label: string;
  components: Record<string, { score: number; weight: string }>;
  top_factors: string[];
}

// Accessibility
export interface AccessibilityPrefs {
  color_mode: string;
  tts_enabled: boolean;
  tts_speed: number;
  tts_voice: string;
  font_size: string;
  motion_reduced: boolean;
}
