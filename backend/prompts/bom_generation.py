import json


def get_bom_prompt(architecture: dict, domain: str) -> str:
    return f"""You are a semiconductor procurement engineer generating a Bill of Materials.

CHIP ARCHITECTURE:
{json.dumps(architecture, indent=2)}

APPLICATION DOMAIN: {domain or "General"}

Generate a realistic BOM for manufacturing this chip. Include:
- Passive components (decoupling caps, resistors for biasing)
- ESD protection diodes
- Crystal oscillator / reference clock
- Voltage regulators / PMIC components
- Test/debug connectors
- Package substrate
- Any domain-specific components (e.g., antenna for RF, sensor interface ICs)

Use realistic part numbers that follow standard conventions (e.g., GRM series for Murata MLCCs,
CGA series for TDK caps). Prices should reflect real market ranges for 10k+ volume orders.

Return ONLY valid JSON:
{{
  "entries": [
    {{
      "part_number": "<realistic part number>",
      "description": "<component description>",
      "category": "<Passive|Active|Connector|Crystal|Package|ESD|PMIC|Test>",
      "quantity": <number needed per unit>,
      "unit_price": <USD, realistic for volume>,
      "lead_time_days": <typical lead time>,
      "availability": "<In Stock|Limited|Backorder>",
      "supplier": "<Murata|TDK|Texas Instruments|ON Semi|Microchip|etc>",
      "alternate": {{
        "part_number": "<alternate part>",
        "unit_price": <price>,
        "lead_time_days": <days>,
        "savings_pct": <percentage savings vs primary>
      }}
    }}
  ]
}}"""
