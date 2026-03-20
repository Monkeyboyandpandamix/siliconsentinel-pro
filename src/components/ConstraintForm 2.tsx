import React from 'react';

interface Constraints {
  max_power_mw: string;
  max_area_mm2: string;
  max_temp_c: string;
  budget_per_unit: string;
  target_volume: string;
}

interface Props {
  constraints: Constraints;
  onChange: (c: Constraints) => void;
}

const FIELDS = [
  { key: 'max_power_mw', label: 'Max Power (mW)', placeholder: 'e.g. 500' },
  { key: 'max_area_mm2', label: 'Max Area (mm²)', placeholder: 'e.g. 10' },
  { key: 'max_temp_c', label: 'Max Temp (°C)', placeholder: '85' },
  { key: 'budget_per_unit', label: 'Budget/Unit ($)', placeholder: 'e.g. 3.50' },
  { key: 'target_volume', label: 'Volume (units)', placeholder: '10000' },
] as const;

export function ConstraintForm({ constraints, onChange }: Props) {
  return (
    <div>
      <h3 className="text-xs uppercase font-mono text-zinc-500 mb-2">Design Constraints</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={`constraint-${f.key}`} className="block text-[10px] text-zinc-600 font-mono mb-1">{f.label}</label>
            <input
              id={`constraint-${f.key}`}
              type="number"
              value={constraints[f.key]}
              onChange={(e) => onChange({ ...constraints, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
