"""
aircraftworth-mlat — Data models

All public-facing types live here.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

@dataclass(frozen=True)
class SensorReading:
    """
    A single Mode-S reception event from one sensor.

    Attributes:
        sensor_id:    Unique sensor identifier (e.g. "S1" or Hedera account ID)
        icao_address: 6-character hex ICAO address of aircraft
        timestamp_ns: GPS-synchronised reception timestamp in nanoseconds
        latitude:     Sensor latitude in decimal degrees
        longitude:    Sensor longitude in decimal degrees
        altitude_m:   Sensor altitude in metres (default 0 = ground level)
    """
    sensor_id:    str
    icao_address: str
    timestamp_ns: int
    latitude:     float
    longitude:    float
    altitude_m:   float = 0.0

@dataclass
class MLATPosition:
    """
    Aircraft position calculated by MLAT solver.

    Attributes:
        icao_address:      ICAO address of tracked aircraft
        latitude:          Calculated latitude in decimal degrees
        longitude:         Calculated longitude in decimal degrees
        altitude_m:        Estimated altitude in metres (None if 2D-only solve)
        confidence_score:  0.0–1.0 quality metric (higher = better geometry + lower residual)
        sensor_count:      Number of sensors that contributed to this solution
        sensor_ids:        List of contributing sensor IDs
        residual_error:    Optimiser residual (lower = better fit)
        gdop:              Geometric Dilution of Precision (lower = better sensor geometry)
        calculation_method: Algorithm used ("TDOA-LM" = Levenberg-Marquardt)
        timestamp_ns:      Reference timestamp (earliest sensor reading in group)
    """
    icao_address:       str
    latitude:           float
    longitude:          float
    altitude_m:         Optional[float]
    confidence_score:   float
    sensor_count:       int
    sensor_ids:         list[str]
    residual_error:     float
    gdop:               float
    calculation_method: str
    timestamp_ns:       int

@dataclass
class MLATResult:
    """
    Result object returned by MLATCalculator.calculate_position().

    Always returned — even on failure. Check `position is not None` before using it.

    Attributes:
        position:      Solved position, or None if solve failed
        success:       Whether a solution was found
        error:         Human-readable failure reason (None on success)
        readings_used: Sensor readings that were included in solve
        readings_dropped: Readings excluded due to quality gates
    """
    position:         Optional[MLATPosition]
    success:          bool
    error:            Optional[str]
    readings_used:    list[SensorReading]
    readings_dropped: list[SensorReading] = field(default_factory=list)

# Import calculator to expose it
from .calculator import MLATCalculator
from .solver import solve_tdoa
from .contracts import (
    AircraftWorthContracts,
    ContractAddresses,
    OfferingData,
    ReviewData,
    ReputationScore,
    create_offering_data,
    create_review_data
)

__version__ = "0.1.0"
__all__ = [
    # Core MLAT functionality
    "MLATCalculator",
    "solve_tdoa",
    
    # Contract integration
    "AircraftWorthContracts",
    "ContractAddresses",
    "OfferingData",
    "ReviewData",
    "ReputationScore",
    "create_offering_data",
    "create_review_data"
]
