from fastapi import APIRouter, HTTPException
from models import LogEvaluationRequest, LogEvaluationResponse, MintTokenRequest, MintTokenResponse
from services.hedera_service import HederaService

router = APIRouter()
hedera_service = HederaService()

@router.post("/log-evaluation", response_model=LogEvaluationResponse)
async def log_evaluation(request: LogEvaluationRequest):
    try:
        sequence_number = await hedera_service.log_evaluation(request.model_dump())
        return LogEvaluationResponse(sequenceNumber=sequence_number)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to log evaluation")

@router.post("/mint-skill-token", response_model=MintTokenResponse)
async def mint_skill_token(request: MintTokenRequest):
    try:
        token_id = await hedera_service.mint_skill_token(request.userId, request.skillWorth)
        return MintTokenResponse(tokenId=token_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to mint token")
