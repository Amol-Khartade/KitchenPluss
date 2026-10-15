import asyncio
from app.routers.health import health_check
from app.routers.agent import generate_forecast, evaluate_inventory
from app.schemas.agent import ForecastRequest, InventoryEvalRequest


async def main():
    print("Testing /health...")
    h = await health_check()
    assert h["status"] == "ok"
    assert h["service"] == "kitchenpulse-ai-agent"
    print(" -> Health check passed:", h)

    print("\nTesting /api/v1/agent/forecast...")
    f = await generate_forecast(
        ForecastRequest(
            organization_id="11111111-1111-1111-1111-111111111111",
            day_of_week="Friday",
        )
    )
    assert len(f.items) > 0
    print(f" -> Forecast passed: {len(f.items)} items generated.")
    print(f" -> Summary: {f.overall_summary}")

    print("\nTesting /api/v1/agent/inventory-eval...")
    inv = await evaluate_inventory(
        InventoryEvalRequest(
            organization_id="11111111-1111-1111-1111-111111111111",
        )
    )
    assert len(inv.recommended_orders) > 0
    print(f" -> Inventory evaluation passed: {len(inv.recommended_orders)} recommended orders.")
    print(f" -> First item: {inv.recommended_orders[0].ingredient_name} ({inv.recommended_orders[0].urgency})")

    print("\nALL FASTAPI ROUTE HANDLERS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
