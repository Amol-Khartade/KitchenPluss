from datetime import datetime, timezone
from typing import List
from ..schemas.agent import (
    ForecastRequest,
    ForecastResponse,
    ForecastItem,
    InventoryEvalRequest,
    InventoryEvalResponse,
    RecommendedAction,
)
from ..config import settings


class AgentService:
    """Core domain logic for KitchenPulse AI forecasting and inventory evaluation."""

    @staticmethod
    async def generate_prep_forecast(payload: ForecastRequest) -> ForecastResponse:
        """
        Generate prep sheet forecasting based on organization historical waste and prep patterns.
        Can be extended with Google Gemini API calls via settings.gemini_api_key.
        """
        target_day = payload.day_of_week or "Friday"

        # Mock sample recommendations that mimic KitchenPulse KDS station recommendations
        items: List[ForecastItem] = [
            ForecastItem(
                recipe_id="4f315bc2-a1d8-45fc-ab9b-0e3d6b6ebafd",
                menu_item_name="Grilled Chicken Breast",
                station="Grill",
                recommended_portions=45,
                historical_avg_waste=2.5,
                confidence_score=0.92,
                reasoning=f"High Friday dinner volume anticipated. Historical prep data for {target_day} indicates a 40-50 portion consumption with minimal waste.",
            ),
            ForecastItem(
                recipe_id="79dbfa11-4045-4277-bf30-804192b1d7d0",
                menu_item_name="Truffle Mushroom Risotto",
                station="Sauté",
                recommended_portions=30,
                historical_avg_waste=1.2,
                confidence_score=0.88,
                reasoning=f"Steady demand curve on {target_day} evenings. Maintain par level to prevent arborio rice wastage.",
            ),
        ]

        return ForecastResponse(
            organization_id=payload.organization_id,
            target_day=target_day,
            generated_at=datetime.now(timezone.utc),
            items=items,
            overall_summary=f"Forecast complete for {target_day}. Estimated portion counts calibrated to reduce food scrap below 4%.",
        )

    @staticmethod
    async def evaluate_inventory(payload: InventoryEvalRequest) -> InventoryEvalResponse:
        """
        Evaluate stock shortfalls against safety thresholds and recommend supplier orders.
        """
        # Baseline mock action for testing
        recommended_orders: List[RecommendedAction] = [
            RecommendedAction(
                ingredient_id="72057cc4-4771-435d-a948-1b55fdae3875",
                ingredient_name="Beef Tenderloin",
                current_stock=4.0,
                safety_threshold=5.0,
                deficit=1.0,
                suggested_order_qty=10.0,
                urgency="URGENT",
            )
        ]

        return InventoryEvalResponse(
            organization_id=payload.organization_id,
            evaluated_at=datetime.now(timezone.utc),
            critical_count=len(recommended_orders),
            recommended_orders=recommended_orders,
        )
