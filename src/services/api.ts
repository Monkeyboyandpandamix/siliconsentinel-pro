const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; version: string; ai_provider: string }>('/health'),

  // Designs (Module 1)
  createDesign: (data: {
    nl_input: string;
    constraints?: Record<string, unknown>;
    process_node?: string;
    target_domain?: string;
    budget_ceiling?: number;
  }) => request('/designs', { method: 'POST', body: JSON.stringify(data) }),

  getDesign: (id: number) => request(`/designs/${id}`),
  applyInstruction: (designId: number, data: { instruction: string }) =>
    request(`/designs/${designId}/apply-instruction`, { method: 'POST', body: JSON.stringify(data) }),
  listDesigns: () => request('/designs'),

  // Simulation (Module 2)
  runSimulation: (designId: number, data: {
    clock_mhz?: number;
    voltage_v?: number;
    ambient_temp_c?: number;
    workload_profile?: string;
  } = {}) => request(`/designs/${designId}/simulate`, { method: 'POST', body: JSON.stringify(data) }),

  // Optimization (Module 3)
  optimizeDesign: (designId: number, data: { focus?: string } = {}) =>
    request(`/designs/${designId}/optimize`, { method: 'POST', body: JSON.stringify(data) }),

  // Predictions (Module 4)
  getPredictions: (designId: number) => request(`/designs/${designId}/predictions`),

  // BOM (Module 5)
  generateBOM: (designId: number, data: { volume?: number; budget_target?: number } = {}) =>
    request(`/designs/${designId}/bom`, { method: 'POST', body: JSON.stringify(data) }),

  // Supply Chain (Module 6)
  getSupplyChain: (designId: number) => request(`/designs/${designId}/supply-chain`),

  // Quality (Module 7)
  runQualityCheck: async (designId: number, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const res = await fetch(`${API_BASE}/designs/${designId}/quality-check`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `API error ${res.status}`);
    }
    return res.json();
  },

  // Extended (Module 8)
  estimateCarbon: (designId: number, data: {
    volume?: number;
    fab_country?: string;
    assembly_country?: string;
    shipping_distance_km?: number;
  } = {}) => request(`/designs/${designId}/carbon`, { method: 'POST', body: JSON.stringify(data) }),

  getManufacturability: (designId: number) => request(`/designs/${designId}/manufacturability`),

  compareDesigns: (designIds: number[]) =>
    request('/designs/compare', { method: 'POST', body: JSON.stringify({ design_ids: designIds }) }),

  // Orchestration
  getPipelineStatus: (designId: number) => request(`/orchestration/${designId}/status`),
  getOrders: (designId: number) => request(`/orchestration/${designId}/orders`),

  // Accessibility
  getAccessibilityPrefs: (userId: string = 'default') => request(`/accessibility/${userId}`),
  updateAccessibilityPrefs: (userId: string = 'default', prefs: Record<string, unknown>) =>
    request(`/accessibility/${userId}`, { method: 'PUT', body: JSON.stringify(prefs) }),
};
