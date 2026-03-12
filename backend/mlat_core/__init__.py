"""
MLAT Core - Time Difference of Arrival (TDOA) Multilateration Engine

This module provides the core MLAT calculation logic for aircraft position
determination using Mode-S ADS-B signals from multiple sensors.

Key Features:
- TDOA-based position calculation
- Confidence scoring
- Sensor selection and filtering
- Geometric dilution of precision (GDOP) estimation

Future SDK Usage:
    from mlat_core import MLATCalculator
    
    calculator = MLATCalculator(min_sensors=4)
    position = calculator.calculate_position(
        icao_address="ABC123",
        sensor_readings=[...]
    )
"""

from .calculator import MLATCalculator
from .models import SensorReading, AircraftPosition, MLATResult

__all__ = ['MLATCalculator', 'SensorReading', 'AircraftPosition', 'MLATResult']
