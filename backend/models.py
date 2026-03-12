from pydantic import BaseModel, Field
from typing import List, Optional

class Profile(BaseModel):
    name: str
    skills: List[str]
    experience: str
    portfolio: Optional[str] = None

class SkillEvaluation(BaseModel):
    skill: str
    level: str  # beginner, intermediate, advanced, expert
    score: int

class EvaluationRequest(BaseModel):
    profile: Profile
    userId: Optional[str] = None

class EvaluationResponse(BaseModel):
    skillEvaluation: List[SkillEvaluation]
    confidenceScore: int
    careerTrajectory: str
    timestamp: str


class SensorLocation(BaseModel):
    latitude: float
    longitude: float
    altitudeMeters: Optional[float] = None


class SensorMetadata(BaseModel):
    sensorId: str
    hederaAccountId: Optional[str] = None
    name: Optional[str] = None
    location: SensorLocation
    lastHeartbeat: Optional[str] = None


class ModeSMessage(BaseModel):
    sensorId: str = Field(..., description="Unique ID of the receiving sensor")
    icaoAddress: str = Field(..., description="Hex ICAO/Mode-S address of the aircraft")
    rawMessage: str = Field(..., description="Raw Mode-S payload in hex")
    timestampNs: int = Field(..., description="Timestamp recorded by the sensor in nanoseconds")
    sensorLocation: SensorLocation


class AircraftPosition(BaseModel):
    id: Optional[str] = None
    icaoAddress: str
    latitude: float
    longitude: float
    altitudeFt: Optional[int] = None
    confidenceScore: float
    sensorCount: int
    calculationMethod: Optional[str] = "TDOA"
    hederaSequenceNumber: Optional[int] = None
    flightTrackTokenId: Optional[str] = None
    calculatedAt: Optional[str] = None


class MLATProcessRequest(BaseModel):
    icaoAddress: str
    messages: Optional[List[ModeSMessage]] = None
    timeWindowMs: int = 2000


class MLATProcessResponse(BaseModel):
    success: bool
    message: str
    position: Optional[AircraftPosition] = None
    storedMessageCount: int = 0
    hederaSequenceNumber: Optional[int] = None


class ModeSIngestRequest(BaseModel):
    messages: List[ModeSMessage]


class ModeSIngestResponse(BaseModel):
    ingested: int

class LogEvaluationRequest(BaseModel):
    evaluationId: str
    userId: str
    evaluationData: EvaluationResponse

class MintTokenRequest(BaseModel):
    userId: str
    skillWorth: int

class MintTokenResponse(BaseModel):
    tokenId: str

class LogEvaluationResponse(BaseModel):
    sequenceNumber: int
