import asyncio
from app.routers.health import health_check
from app.routers.agent import generate_forecast, evaluate_inventory
from app.schemas.agent import (
    ForecastRequest,
    InventoryEvalRequest,
    GeminiForecastOutput,
    GeminiInventoryOutput,
    ForecastItem,
    RecommendedAction,
)
from app.services.gemini_service import GeminiService, get_gemini_client
from app.config import settings


async def main():
    print("=" * 60)
    print(" KitchenPulse AI Microservice — Gemini SDK Test Suite")
    print("=" * 60)

    # 1. Health check
    print("\n[1/5] Testing /health endpoint...")
    h = await health_check()
    assert h["status"] == "ok"
    assert h["service"] == "kitchenpulse-ai-agent"
    print("  -> Health check PASSED:", h)

    # 2. Pydantic Structured Schema Validation
    print("\n[2/5] Testing Gemini Structured Output Schemas...")
    forecast_schema = GeminiForecastOutput.model_json_schema()
    assert "properties" in forecast_schema
    assert "items" in forecast_schema["properties"]
    assert "overall_summary" in forecast_schema["properties"]
    print("  -> GeminiForecastOutput JSON Schema successfully generated:")
    print(f"     Required keys: {forecast_schema.get('required')}")

    inv_schema = GeminiInventoryOutput.model_json_schema()
    assert "properties" in inv_schema
    assert "critical_count" in inv_schema["properties"]
    assert "recommended_orders" in inv_schema["properties"]
    print("  -> GeminiInventoryOutput JSON Schema successfully generated:")
    print(f"     Required keys: {inv_schema.get('required')}")

    # 3. Model & SDK Configuration Verification
    print("\n[3/5] Verifying Model & Google GenAI SDK Configuration...")
    print(f"  -> Target Gemini Model: {settings.gemini_model} (Substituted for legacy gemini-1.5 per SDK spec)")
    client = get_gemini_client()
    print(f"  -> GenAI Client Active: {'Yes (Live API Key)' if client else 'No (Offline / Deterministic Fallback Mode)'}")

    # 4. Prep Sheet Forecast Generation with Structured Output
    print("\n[4/5] Testing /agent/forecast (AI Prep Sheet)...")
    forecast_req = ForecastRequest(
        organization_id="11111111-1111-1111-1111-111111111111",
        day_of_week="Friday",
    )
    f = await generate_forecast(forecast_req)
    assert len(f.items) > 0
    assert f.ai_model == "gemini-3.8-flash"
    assert f.structured_output_enforced is True
    print(f"  -> Prep forecast generated successfully for: {f.target_day}")
    print(f"  -> Total items recommended: {len(f.items)}")
    for item in f.items:
        assert isinstance(item, ForecastItem)
        print(f"     * [{item.station}] {item.menu_item_name}: {item.recommended_portions} portions (Conf: {item.confidence_score:.2f})")
    print(f"  -> Overall Summary: {f.overall_summary}")

    # 5. Inventory Shortfall Evaluation with Structured Output
    print("\n[5/5] Testing /agent/inventory-eval (Pantry Shortfall Audit)...")
    inv_req = InventoryEvalRequest(
        organization_id="11111111-1111-1111-1111-111111111111",
    )
    inv = await evaluate_inventory(inv_req)
    assert len(inv.recommended_orders) > 0
    assert inv.ai_model == "gemini-3.8-flash"
    assert inv.structured_output_enforced is True
    print(f"  -> Inventory evaluation passed. Critical shortfalls: {inv.critical_count}")
    for order in inv.recommended_orders:
        assert isinstance(order, RecommendedAction)
        print(f"     * {order.ingredient_name}: Stock {order.current_stock} / Safe {order.safety_threshold} -> Order {order.suggested_order_qty} ({order.urgency})")

    print("\n" + "=" * 60)
    print(" ALL FASTAPI + GEMINI STRUCTURED OUTPUT TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
