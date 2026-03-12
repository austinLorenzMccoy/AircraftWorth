"""
MLAT Calculator - Core TDOA multilateration logic

This module implements Time Difference of Arrival (TDOA) calculations
for aircraft position determination from multiple sensor readings.
"""
import time
from typing import List, Optional
from .models import SensorReading, AircraftPosition, MLATResult


class MLATCalculator:
    """
    Multilateration calculator using TDOA method
    
    Args:
        min_sensors: Minimum number of sensors required for calculation (default: 4)
        max_time_window_ns: Maximum time window for sensor readings in nanoseconds
        confidence_threshold: Minimum confidence score to accept result (0-100)
    
    Example:
        calculator = MLATCalculator(min_sensors=4)
        result = calculator.calculate_position(
            icao_address="ABC123",
            sensor_readings=[reading1, reading2, reading3, reading4]
        )
    """
    
    def __init__(
        self,
        min_sensors: int = 4,
        max_time_window_ns: int = 100_000_000,  # 100ms
        confidence_threshold: float = 70.0
    ):
        self.min_sensors = min_sensors
        self.max_time_window_ns = max_time_window_ns
        self.confidence_threshold = confidence_threshold
    
    def calculate_position(
        self,
        icao_address: str,
        sensor_readings: List[SensorReading]
    ) -> Optional[MLATResult]:
        """
        Calculate aircraft position from sensor readings using TDOA
        
        Args:
            icao_address: Aircraft ICAO address
            sensor_readings: List of sensor readings for this aircraft
            
        Returns:
            MLATResult with calculated position or None if insufficient data
        """
        start_time = time.time()
        errors = []
        
        # Validate sensor count
        if len(sensor_readings) < self.min_sensors:
            errors.append(f"Insufficient sensors: {len(sensor_readings)} < {self.min_sensors}")
            return MLATResult(
                position=None,
                sensor_readings=sensor_readings,
                errors=errors
            )
        
        # Filter readings within time window
        filtered_readings = self._filter_by_time_window(sensor_readings)
        if len(filtered_readings) < self.min_sensors:
            errors.append(f"Insufficient readings in time window: {len(filtered_readings)}")
            return MLATResult(
                position=None,
                sensor_readings=sensor_readings,
                errors=errors
            )
        
        # TODO: Implement actual TDOA calculation
        # For now, use centroid of sensor positions as placeholder
        position = self._calculate_centroid(filtered_readings, icao_address)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(filtered_readings)
        position.confidence_score = confidence
        position.sensor_count = len(filtered_readings)
        
        # Calculate GDOP (Geometric Dilution of Precision)
        gdop = self._calculate_gdop(filtered_readings)
        
        calc_time_ms = (time.time() - start_time) * 1000
        
        return MLATResult(
            position=position,
            sensor_readings=filtered_readings,
            gdop=gdop,
            calculation_time_ms=calc_time_ms,
            errors=errors if errors else None
        )
    
    def _filter_by_time_window(
        self,
        readings: List[SensorReading]
    ) -> List[SensorReading]:
        """Filter readings to those within the time window"""
        if not readings:
            return []
        
        # Find the most recent reading
        max_timestamp = max(r.timestamp_ns for r in readings)
        
        # Keep only readings within the time window
        return [
            r for r in readings
            if (max_timestamp - r.timestamp_ns) <= self.max_time_window_ns
        ]
    
    def _calculate_centroid(
        self,
        readings: List[SensorReading],
        icao_address: str
    ) -> AircraftPosition:
        """Calculate centroid of sensor positions (placeholder for TDOA)"""
        avg_lat = sum(r.latitude for r in readings) / len(readings)
        avg_lon = sum(r.longitude for r in readings) / len(readings)
        
        # Average altitude if available
        altitudes = [r.altitude_m for r in readings if r.altitude_m is not None]
        avg_alt_ft = (sum(altitudes) / len(altitudes) * 3.28084) if altitudes else None
        
        return AircraftPosition(
            icao_address=icao_address,
            latitude=avg_lat,
            longitude=avg_lon,
            altitude_ft=avg_alt_ft,
            calculation_method="CENTROID"  # Will be "TDOA" when implemented
        )
    
    def _calculate_confidence(self, readings: List[SensorReading]) -> float:
        """
        Calculate confidence score based on:
        - Number of sensors
        - Time synchronization
        - Geometric distribution
        """
        # Base score from sensor count
        sensor_score = min(100, (len(readings) / self.min_sensors) * 70)
        
        # Time sync score (lower variance = higher score)
        timestamps = [r.timestamp_ns for r in readings]
        time_variance = max(timestamps) - min(timestamps)
        time_score = max(0, 30 - (time_variance / 1_000_000))  # Penalty for >30ms spread
        
        return min(100, sensor_score + time_score)
    
    def _calculate_gdop(self, readings: List[SensorReading]) -> float:
        """
        Calculate Geometric Dilution of Precision
        Lower GDOP = better geometry = more accurate position
        """
        # Simplified GDOP calculation based on sensor spread
        # TODO: Implement proper GDOP calculation
        if len(readings) < 4:
            return 999.0  # Poor geometry
        
        # Calculate variance in sensor positions
        lats = [r.latitude for r in readings]
        lons = [r.longitude for r in readings]
        
        lat_variance = max(lats) - min(lats)
        lon_variance = max(lons) - min(lons)
        
        # Better spread = lower GDOP
        spread = lat_variance + lon_variance
        if spread < 0.01:  # Sensors too close
            return 50.0
        elif spread > 1.0:  # Good spread
            return 2.0
        else:
            return 10.0
