import json


def get_defect_analysis_prompt(image_description: str, design_context: dict) -> str:
    return f"""You are a semiconductor quality control engineer analyzing a fabricated chip for defects.

IMAGE DESCRIPTION:
{image_description}

DESIGN CONTEXT:
Process node: {design_context.get('process_node', 'unknown')}
Die area: {design_context.get('total_area_mm2', 'unknown')} mm²
Metal layers: {design_context.get('metal_layers', 'unknown')}
Block count: {design_context.get('block_count', 'unknown')}

Based on the image analysis, generate a defect report. Consider common semiconductor
defect types:
- Voids: Missing material in metal lines or vias (caused by electromigration or CMP issues)
- Shorts: Unintended connections between metal lines (caused by lithography defocus)
- Particles: Foreign material contamination on die surface
- Cracks: Mechanical stress fractures in silicon or passivation
- Contamination: Chemical residue affecting device performance

Return ONLY valid JSON:
{{
  "defect_count": <total defects found>,
  "pass_fail": "<PASS|FAIL>",
  "confidence": <0.0-1.0>,
  "defects": [
    {{
      "type": "<void|short|particle|crack|contamination>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "location_x": <0.0-1.0 normalized>,
      "location_y": <0.0-1.0 normalized>,
      "size_um": <defect size in micrometers>,
      "confidence": <detection confidence 0.0-1.0>
    }}
  ],
  "root_cause": "<plain English explanation of likely root cause>",
  "design_rule_updates": [
    {{
      "rule": "<DRC rule name>",
      "current_value": "<current spec>",
      "suggested_value": "<recommended change>",
      "reason": "<why this change prevents recurrence>"
    }}
  ]
}}"""
