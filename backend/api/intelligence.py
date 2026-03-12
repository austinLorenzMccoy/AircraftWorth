"""
backend/api/intelligence.py

Groq-powered intelligence layer for AircraftWorth.

Three endpoints: threat assessment, NL query, sensor diagnosis.
"""

from __future__ import annotations

import os, json, logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from groq import Groq

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])
logger = logging.getLogger(__name__)

# ── Groq client (singleton) ─────────────────────────────
_groq: Optional[Groq] = None

def get_groq() -> Groq:
    global _groq
    if _groq is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set")
        _groq = Groq(api_key=key)
    return _groq

FAST_MODEL = os.getenv("GROQ_MODEL_FAST", "llama-3.3-70b-versatile")

# ── Request / Response models ────────────────────────────
class TrackPoint(BaseModel):
    lat: float
    lon: float
    alt_ft: Optional[float] = None
    confidence: float
    timestamp_iso: str

class ThreatRequest(BaseModel):
    icao: str = Field(..., description="6-char hex ICAO")
    has_adsb: bool = Field(default=False)
    track: list[TrackPoint] = Field(..., min_length=1)
    sensor_count: int
    sector: Optional[str] = None  # e.g. "London TMA", optional

class ThreatResponse(BaseModel):
    icao: str
    threat_level: str  # "low" | "medium" | "high" | "critical"
    summary: str  # 1 sentence shown in popup
    detail: str  # 2-3 sentences for expanded panel
    tags: list[str]  # ["non-cooperative", "altitude-deviation", ...]
    confidence_in_assessment: float  # 0-1

class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question about flights")
    context_aircraft_count: int = 0

class QueryResponse(BaseModel):
    answer: str
    sql_hint: Optional[str] = None  # Supabase query if applicable
    aircraft_icaos: list[str] = []  # relevant ICAOs if mentioned

class SensorDiagRequest(BaseModel):
    sensor_id: str
    recent_errors: list[str]  # last N error/warn log lines
    timing_drift_ns: Optional[float] = None
    message_rate: Optional[float] = None  # msgs/sec
    expected_rate: Optional[float] = None

class SensorDiagResponse(BaseModel):
    sensor_id: str
    diagnosis: str  # plain English explanation
    severity: str  # "info" | "warning" | "critical"
    recommended_action: str

# ── ENDPOINT A: Ghost Flight Threat Assessment ───────────
@router.post("/analyse-track", response_model=ThreatResponse)
async def analyse_track(req: ThreatRequest, groq: Groq = Depends(get_groq)):
    """
    Analyse an aircraft track and return a threat assessment.
    Called automatically when a new aircraft appears on the MLAT map.
    Latency target: <300ms (Groq llama-3.3-70b-versatile).
    """
    track_summary = [
        f" - {pt.timestamp_iso}: lat={pt.lat:.4f} lon={pt.lon:.4f}"
        f" alt={pt.alt_ft:.0f}ft conf={pt.confidence:.0%}"
        for pt in req.track[-8:]  # last 8 positions
    ]
    
    prompt = f"""You are an aviation intelligence analyst.
Analyse this aircraft track and return ONLY valid JSON.
Aircraft: {req.icao}
ADS-B transponder: OFF if non-cooperative, ON otherwise
Sensors detecting it: {req.sensor_count}
Sector: {req.sector if req.sector else 'Unknown'}
Recent track (newest last):
{chr(10).join(track_summary)}

Return this exact JSON structure (no markdown, no explanation):
{{
"threat_level": "low|medium|high|critical",
"summary": "One sentence shown in aircraft popup",
"detail": "2-3 sentences with specifics about what is unusual",
"tags": ["list", "of", "relevant", "tags"],
"confidence_in_assessment": 0.0
}}

Tags from: non-cooperative, altitude-deviation, speed-anomaly, holding-pattern,
low-altitude, restricted-airspace, evasive-maneuver, normal-traffic, scheduled-route
"""
    
    try:
        resp = groq.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return ThreatResponse(icao=req.icao, **data)
    except Exception as e:
        logger.error(f"Groq threat analysis failed: {e}")
        # Graceful degradation - never break the map
        return ThreatResponse(
            icao=req.icao, 
            threat_level="unknown",
            summary="AI analysis temporarily unavailable.",
            detail="", 
            tags=[], 
            confidence_in_assessment=0.0,
        )

# ── ENDPOINT B: Natural Language Flight Query ────────────
@router.post("/query", response_model=QueryResponse)
async def nl_query(req: QueryRequest, groq: Groq = Depends(get_groq)):
    """
    Convert a natural language question into a structured answer.
    Example: "Which aircraft descended fastest in the last 10 minutes?"
    """
    prompt = f"""You are a flight data analyst with access to an aircraft tracking database.
The user asks: "{req.question}"
There are currently {req.context_aircraft_count} aircraft being tracked.

Database schema (Supabase/PostgreSQL):
aircraft_positions(icao_address, latitude, longitude, altitude_ft,
confidence_score, sensor_count, calculated_at, hedera_sequence_number)
sensors(id, sensor_id, latitude, longitude, is_active, trust_score)
mode_s_messages(icao_address, timestamp_ns, raw_message, sensor_id)

Return ONLY valid JSON:
{{
"answer": "Direct answer to the question in plain English",
"sql_hint": "SELECT ... (optional Supabase query if helpful, or null)",
"aircraft_icaos": ["list of ICAO codes mentioned, or empty array"]
}}
"""
    
    try:
        resp = groq.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, 
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return QueryResponse(**data)
    except Exception as e:
        logger.error(f"Groq query failed: {e}")
        return QueryResponse(
            answer="I'm having trouble processing that question right now.",
            sql_hint=None,
            aircraft_icaos=[]
        )

# ── ENDPOINT C: Sensor Anomaly Diagnosis ─────────────────
@router.post("/diagnose-sensor", response_model=SensorDiagResponse)
async def diagnose_sensor(req: SensorDiagRequest, groq: Groq = Depends(get_groq)):
    """
    Diagnose why a sensor is degraded. Reads error patterns from HCS logs.
    Called when a sensor status changes to "degraded" or "offline".
    """
    drift_info = f"GPS timing drift: {req.timing_drift_ns:.0f}ns (threshold: 200ns)" if req.timing_drift_ns else ""
    rate_info = f"Message rate: {req.message_rate:.1f}/s (expected: {req.expected_rate:.1f}/s)" if req.message_rate else ""
    
    prompt = f"""Diagnose this Neuron Mode-S sensor issue.
Sensor ID: {req.sensor_id}
{drift_info}
{rate_info}
Recent error log lines:
{chr(10).join(req.recent_errors[-5:])}

Return ONLY valid JSON:
{{
"diagnosis": "Plain English explanation of what is wrong",
"severity": "info|warning|critical",
"recommended_action": "Specific actionable step to fix it"
}}
"""
    
    try:
        resp = groq.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, 
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return SensorDiagResponse(sensor_id=req.sensor_id, **data)
    except Exception as e:
        logger.error(f"Groq sensor diagnosis failed: {e}")
        return SensorDiagResponse(
            sensor_id=req.sensor_id,
            diagnosis="Unable to diagnose sensor issue at this time.",
            severity="info",
            recommended_action="Check sensor connectivity and retry later."
        )
