from fastapi import APIRouter, HTTPException
from models import EvaluationRequest, EvaluationResponse
from services.groq_service import GroqService
from services.evaluation_store import save_evaluation
import datetime

router = APIRouter()
groq_service = GroqService()

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_profile(request: EvaluationRequest):
    try:
        profile = request.profile
        skill_evaluation = await groq_service.evaluate_skills(profile.skills)
        confidence_score = await groq_service.calculate_confidence(profile)
        career_trajectory = await groq_service.simulate_career(profile)

        response = EvaluationResponse(
            skillEvaluation=skill_evaluation,
            confidenceScore=confidence_score,
            careerTrajectory=career_trajectory,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
        save_evaluation(request.userId or "anonymous", response)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid profile data or evaluation failed")
