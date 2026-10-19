from ..schemas.agent import (
    ForecastRequest,
    ForecastResponse,
    InventoryEvalRequest,
    InventoryEvalResponse,
)
from .gemini_service import GeminiService


class AgentService:
    """Core domain logic for KitchenPulse AI forecasting and inventory evaluation."""

    @staticmethod
    async def generate_prep_forecast(payload: ForecastRequest) -> ForecastResponse:
        """
        Generate prep sheet forecasting based on organization historical waste and prep patterns
        using Google Gemini 3.8 Flash SDK integration with structured outputs.
        """
        return await GeminiService.generate_prep_forecast(payload)

    @staticmethod
    async def evaluate_inventory(payload: InventoryEvalRequest) -> InventoryEvalResponse:
        """
        Evaluate stock shortfalls against safety thresholds and recommend supplier orders
        using Google Gemini 3.8 Flash SDK integration with structured outputs.
        """
        return await GeminiService.evaluate_inventory(payload)
