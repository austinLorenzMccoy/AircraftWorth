"""
Data models for MLAT calculations
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class SensorReading:
    """Represents a Mode-S signal reading from a single sensor"""
    sensor_id: str
    icao_address: str
    timestamp_ns: int
    latitude: float
    longitude: float
    altitude_m: Optional[float] = None
    raw_message: Optional[str] = None


@dataclass
class AircraftPosition:
    """Calculated aircraft position from MLAT"""
    icao_address: str
    latitude: float
    longitude: float
    altitude_ft: Optional[float] = None
    confidence_score: Optional[float] = None
    sensor_count: int = 0
    calculation_method: str = "TDOA"


@dataclass
class MLATResult:
    """Complete MLAT calculation result with metadata"""
    position: AircraftPosition
    sensor_readings: list[SensorReading]
    gdop: Optional[float] = None
    calculation_time_ms: Optional[float] = None
    errors: list[str] = None
