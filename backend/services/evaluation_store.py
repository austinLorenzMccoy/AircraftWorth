from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from models import EvaluationResponse, SkillEvaluation

# Simple in-memory store used for demo environments / tests
# In production this would be backed by a database or Hedera logs
_evaluations: Dict[str, List[dict]] = {}

# Seed data to make the dashboard feel alive during demos
SEED_USER_ID = "agent-demo"
_seed_evaluation = [
    {
        "skillEvaluation": [
            {"skill": "Smart Contracts", "level": "expert", "score": 95},
            {"skill": "AI Alignment", "level": "advanced", "score": 88},
            {"skill": "Product Strategy", "level": "advanced", "score": 92},
        ],
        "confidenceScore": 93,
        "careerTrajectory": "Leading multi-agent security council across Hedera ecosystems.",
        "timestamp": "2026-02-10T09:00:00Z",
    }
]

def _ensure_seed_data() -> None:
    if SEED_USER_ID not in _evaluations:
        _evaluations[SEED_USER_ID] = list(_seed_evaluation)

_ensure_seed_data()


def reset_store(include_seed: bool = True) -> None:
    """Utility for tests to reset the in-memory store."""
    _evaluations.clear()
    if include_seed:
        _ensure_seed_data()


def save_evaluation(user_id: str, evaluation: EvaluationResponse) -> None:
    """Persist the latest evaluation result for a user in memory."""
    if not user_id:
        user_id = "anonymous"

    evaluations = _evaluations.setdefault(user_id, [])
    evaluations.insert(0, evaluation.model_dump())

    # Keep the latest 25 evaluations to avoid unbounded growth during demos
    if len(evaluations) > 25:
        del evaluations[25:]


def list_evaluations(user_id: str) -> List[dict]:
    return _evaluations.get(user_id, [])


def compute_reputation_score(evaluations: List[dict]) -> int:
    """Derive a lightweight trust metric from stored evaluations."""
    if not evaluations:
        return 0

    total_score = 0
    total_items = 0
    for evaluation in evaluations:
        for skill in evaluation.get("skillEvaluation", []):
            total_score += skill.get("score", 0)
            total_items += 1

    if total_items == 0:
        return 0

    return round(total_score / total_items)


def get_recent_timestamp(user_id: str) -> str:
    evaluations = list_evaluations(user_id)
    if evaluations:
        return evaluations[0].get("timestamp", datetime.now(timezone.utc).isoformat())
    return datetime.now(timezone.utc).isoformat()
