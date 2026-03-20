import json


def get_supply_chain_prompt(architecture: dict, bom: list[dict]) -> str:
    return f"""You are a semiconductor supply chain analyst.

CHIP ARCHITECTURE:
Process node: {architecture.get('process_node', 'unknown')}
Total area: {architecture.get('total_area_mm2', 'unknown')} mm²

BOM SUMMARY:
{json.dumps(bom[:10], indent=2)}
(Total {len(bom)} components)

Analyze the supply chain risks and provide recommendations. Consider:
- Foundry capability matching for the target process node
- Geopolitical risks by supplier/fab country
- Single-source dependencies
- Lead time risks
- Current semiconductor market conditions

Return ONLY valid JSON:
{{
  "supplier_recommendations": [
    {{
      "name": "<supplier/fab name>",
      "type": "<Foundry|OSAT|Component>",
      "country": "<country>",
      "capability_match": <0-100>,
      "cost_score": <0-100>,
      "risk_score": <0-100 where 100 is lowest risk>,
      "overall_score": <0-100>,
      "rationale": "<why this supplier>"
    }}
  ],
  "fab_recommendations": [
    {{
      "name": "<fab name>",
      "location": "<city, country>",
      "process_nodes": ["<supported nodes>"],
      "capacity_status": "<Available|Constrained|Full>",
      "estimated_cost_per_wafer": <USD>,
      "lead_time_weeks": <weeks>,
      "risk_factors": ["<specific risks>"]
    }}
  ],
  "geopolitical_risks": [
    {{
      "region": "<region/country>",
      "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
      "factors": ["<specific risk factors>"],
      "mitigation": "<recommended mitigation>"
    }}
  ],
  "diversification_plan": {{
    "primary_fab": "<recommended primary>",
    "secondary_fab": "<backup option>",
    "rationale": "<why this split>"
  }}
}}"""
