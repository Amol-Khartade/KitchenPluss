from fastapi import APIRouter, HTTPException, status
from ..schemas.agent import (
    ForecastRequest,
    ForecastResponse,
    InventoryEvalRequest,
    InventoryEvalResponse,
)
from ..services.agent_service import AgentService

router = APIRouter(prefix="/agent", tags=["AI Agent"])


@router.post(
    "/forecast",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Prep Recommendations",
)
async def generate_forecast(payload: ForecastRequest):
    """
    Generate target day kitchen prep sheet recommendations based on historical
    waste logs and recipe portioning models.
    """
    try:
        return await AgentService.generate_prep_forecast(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate prep forecast: {str(exc)}",
        ) from exc


@router.post(
    "/inventory-eval",
    response_model=InventoryEvalResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Inventory Deficits",
)
async def evaluate_inventory(payload: InventoryEvalRequest):
    """
    Evaluate stock shortfalls against minimum thresholds and recommend supplier purchase orders.
    """
    try:
        return await AgentService.evaluate_inventory(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate inventory: {str(exc)}",
        ) from exc
