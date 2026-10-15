from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ForecastRequest(BaseModel):
    """Input payload for prep forecasting."""
    organization_id: str = Field(..., description="UUID of the organization / hotel client")
    target_date: Optional[str] = Field(None, description="ISO date (YYYY-MM-DD), defaults to tomorrow")
    day_of_week: Optional[str] = Field(None, description="Day of week override, e.g. 'Monday'")


class ForecastItem(BaseModel):
    """Individual menu item prep recommendation."""
    recipe_id: str
    menu_item_name: str
    station: str
    recommended_portions: int
    historical_avg_waste: float
    confidence_score: float = Field(ge=0.0, le=1.0)
    reasoning: str


class ForecastResponse(BaseModel):
    """Response containing AI prep sheet suggestions."""
    organization_id: str
    target_day: str
    generated_at: datetime
    items: List[ForecastItem]
    overall_summary: str


class InventoryEvalRequest(BaseModel):
    """Input payload for inventory shortfall evaluation."""
    organization_id: str
    ingredient_ids: Optional[List[str]] = None


class RecommendedAction(BaseModel):
    """Recommended purchase or stock action."""
    ingredient_id: str
    ingredient_name: str
    current_stock: float
    safety_threshold: float
    deficit: float
    suggested_order_qty: float
    urgency: str  # NORMAL, URGENT, CRITICAL


class InventoryEvalResponse(BaseModel):
    """Evaluation result for pantry stock."""
    organization_id: str
    evaluated_at: datetime
    critical_count: int
    recommended_orders: List[RecommendedAction]
