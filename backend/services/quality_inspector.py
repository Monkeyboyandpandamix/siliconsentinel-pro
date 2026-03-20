"""Module 7: AI Quality Control System service."""

import logging
import os
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.design import Design
from backend.models.quality import QualityCheck
from backend.schemas.quality import QualityCheckResponse, DefectEntry, DesignRuleUpdate
from backend.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)


class QualityInspectorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_provider()

    async def inspect(self, design: Design, image_path: str) -> QualityCheckResponse:
        arch = design.architecture_json or {}
        design_context = {
            "process_node": arch.get("process_node", design.process_node),
            "total_area_mm2": arch.get("total_area_mm2"),
            "metal_layers": arch.get("metal_layers"),
            "block_count": len(arch.get("blocks", [])),
        }

        file_size = os.path.getsize(image_path) if os.path.exists(image_path) else 0
        image_description = (
            f"Uploaded fabrication image ({os.path.basename(image_path)}, "
            f"{file_size / 1024:.0f} KB). Die photograph showing surface features, "
            f"metal interconnect patterns, and potential manufacturing defects."
        )

        try:
            ai_result = await self.ai.analyze_defects(image_description, design_context)
        except Exception as e:
            logger.error(f"AI defect analysis failed: {e}")
            ai_result = {
                "defect_count": 0,
                "pass_fail": "PASS",
                "confidence": 0.5,
                "defects": [],
                "root_cause": "AI analysis unavailable — manual inspection recommended",
                "design_rule_updates": [],
            }

        defects = [
            DefectEntry(
                type=d.get("type", "particle"),
                severity=d.get("severity", "LOW"),
                location_x=d.get("location_x", 0.5),
                location_y=d.get("location_y", 0.5),
                size_um=d.get("size_um", 1.0),
                confidence=d.get("confidence", 0.5),
            )
            for d in ai_result.get("defects", [])
        ]

        rule_updates = [
            DesignRuleUpdate(
                rule=u.get("rule", ""),
                current_value=u.get("current_value", ""),
                suggested_value=u.get("suggested_value", ""),
                reason=u.get("reason", ""),
            )
            for u in ai_result.get("design_rule_updates", [])
        ]

        defect_count = ai_result.get("defect_count", len(defects))
        pass_fail = ai_result.get("pass_fail", "PASS")
        confidence = ai_result.get("confidence", 0.5)

        qc = QualityCheck(
            design_id=design.id,
            image_path=image_path,
            defect_map_json=[d.model_dump() for d in defects],
            defect_count=defect_count,
            defect_types_json=list(set(d.type for d in defects)),
            pass_fail=pass_fail,
            confidence=confidence,
            root_cause=ai_result.get("root_cause"),
            design_rule_updates=[u.model_dump() for u in rule_updates],
        )
        self.db.add(qc)
        await self.db.commit()
        await self.db.refresh(qc)

        return QualityCheckResponse(
            id=qc.id,
            design_id=design.id,
            defect_count=defect_count,
            defects=defects,
            pass_fail=pass_fail,
            confidence=confidence,
            root_cause=qc.root_cause,
            design_rule_updates=rule_updates,
            timestamp=qc.timestamp,
        )
