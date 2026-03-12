from fastapi import APIRouter

from services.evaluation_store import (
    compute_reputation_score,
    get_recent_timestamp,
    list_evaluations,
    SEED_USER_ID,
)

router = APIRouter()


@router.get("/{user_id}")
async def get_evaluations(user_id: str):
    evaluations = list_evaluations(user_id)
    source_user = user_id

    # Provide seeded demo data when the requested user has no history yet
    if not evaluations and user_id != SEED_USER_ID:
        evaluations = list_evaluations(SEED_USER_ID)
        source_user = SEED_USER_ID

    reputation = compute_reputation_score(evaluations)

    return {
        "userId": user_id,
        "evaluations": evaluations,
        "reputation": reputation,
        "lastUpdated": get_recent_timestamp(source_user),
        "source": source_user,
    }
