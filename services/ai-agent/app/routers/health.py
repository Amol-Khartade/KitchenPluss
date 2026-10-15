from fastapi import APIRouter
from datetime import datetime, timezone
from .. import __version__
from ..config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Liveness probe returning operational state and version."""
    return {
        "status": "ok",
        "service": "kitchenpulse-ai-agent",
        "version": __version__,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
