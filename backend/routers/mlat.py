from fastapi import APIRouter, HTTPException

from models import (
    MLATProcessRequest,
    MLATProcessResponse,
    ModeSIngestRequest,
    ModeSIngestResponse,
)
from services.mlat_pipeline import MLATPipelineService


router = APIRouter()
pipeline = MLATPipelineService()


@router.post("/ingest", response_model=ModeSIngestResponse)
async def ingest_mode_s(request: ModeSIngestRequest):
    try:
        count = await pipeline.ingest_messages(request.messages)
        return ModeSIngestResponse(ingested=count)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to ingest Mode-S messages: {exc}")


@router.post("/process", response_model=MLATProcessResponse)
async def process_mlat(request: MLATProcessRequest):
    try:
        return await pipeline.process_mlat(request)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"MLAT processing failed: {exc}")


@router.get("/health")
async def mlat_health():
    return pipeline.health()
