from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyticsEvent(BaseModel):
    user_id: str
    event_type: str  # view, click, quiz_start, quiz_complete, chat, recommendation_interaction
    resource_id: Optional[str] = None
    topic: Optional[str] = None
    metadata: Dict[str, Any] = {}
    timestamp: datetime = datetime.utcnow()


class AnalyticsSummary(BaseModel):
    user_id: str
    total_events: int
    time_spent_minutes: int
    topics_touched: List[str]
    last_event_at: datetime


@router.post("/events")
async def ingest_event(event: AnalyticsEvent):
    """Ingest a single analytics event. TODO: persist to DB or queue."""
    return {
        "message": "Event captured",
        "received_at": datetime.utcnow(),
        "event": event,
    }


@router.get("/summary/{user_id}", response_model=AnalyticsSummary)
async def analytics_summary(user_id: str):
    """Return a lightweight analytics summary for dashboards."""
    # TODO: Aggregate from analytics store
    now = datetime.utcnow()
    return AnalyticsSummary(
        user_id=user_id,
        total_events=128,
        time_spent_minutes=540,
        topics_touched=["Arrays", "Trees", "DP"],
        last_event_at=now,
    )
