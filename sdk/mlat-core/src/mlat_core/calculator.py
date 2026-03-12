"""
aircraftworth-mlat — MLATCalculator

High-level API over TDOA solver.
Handles grouping, quality gates, and time windowing.
"""

from __future__ import annotations

import logging
from typing import Optional

from . import SensorReading, MLATResult
from .solver import solve_tdoa

logger = logging.getLogger(__name__)

class MLATCalculator:
    """
    High-level MLAT calculation engine.

    Handles:
    - Minimum sensor enforcement
    - Time drift quality gates
    - Time window filtering
    - Calling TDOA solver
    - Returning structured MLATResult

    Example::

        from mlat_core import MLATCalculator, SensorReading

        calc = MLATCalculator(min_sensors=3, confidence_threshold=0.70)

        result = calc.calculate_position(
            icao_address='ABC123',
            sensor_readings=[
                SensorReading('S1', 'ABC123', 1_000_000_000, 51.4820, -0.4523),
                SensorReading('S2', 'ABC123', 1_000_000_034, 49.0097,  2.5479),
                SensorReading('S4', 'ABC123', 1_000_000_081, 50.9013, 4.4844),
            ]
        )

        if result.success:
            print(f"Aircraft at {result.position.latitude}, {result.position.longitude}")
            print(f"Confidence: {result.position.confidence_score:.0%}")
    """

    def __init__(
        self,
        min_sensors: int = 3,
        time_window_ms: float = 1500.0,
        max_time_drift_ns: int = 200,
        confidence_threshold: float = 0.0,
        initial_altitude_m: float = 10_000.0,
    ):
        """
        Parameters:
            min_sensors:          Minimum sensors required to attempt a solve (default 3)
            time_window_ms:       Only consider readings within this time window (default 1500ms)
            max_time_drift_ns:    Reject readings with internal drift exceeding this value (default 200ns)
            confidence_threshold: Return failure if confidence below this (default 0.0 = always return)
            initial_altitude_m:   Initial altitude guess for solver (default 10,000m)
        """
        if min_sensors < 3:
            raise ValueError("min_sensors must be ≥ 3 for TDOA to be solvable")

        self.min_sensors        = min_sensors
        self.time_window_ms     = time_window_ms
        self.max_time_drift_ns  = max_time_drift_ns
        self.confidence_threshold = confidence_threshold
        self.initial_altitude_m = initial_altitude_m

    def calculate_position(
        self,
        icao_address: str,
        sensor_readings: list[SensorReading],
    ) -> MLATResult:
        """
        Calculate aircraft position from a set of sensor readings.

        Parameters:
            icao_address:    ICAO hex address (used for filtering + output)
            sensor_readings: List of SensorReading from different sensors

        Returns:
            MLATResult — always returned, check .success before using .position
        """
        # Filter to matching ICAO
        readings = [r for r in sensor_readings if r.icao_address == icao_address]

        if not readings:
            return MLATResult(
                position=None,
                success=False,
                error=f"No readings for ICAO {icao_address}",
                readings_used=[],
                readings_dropped=[],
            )

        # Deduplicate sensors — keep earliest reading per sensor
        seen_sensors: dict[str, SensorReading] = {}
        for r in sorted(readings, key=lambda x: x.timestamp_ns):
            if r.sensor_id not in seen_sensors:
                seen_sensors[r.sensor_id] = r

        readings = list(seen_sensors.values())

        # Apply time window — drop readings outside window of earliest
        readings_sorted = sorted(readings, key=lambda r: r.timestamp_ns)
        earliest_ns = readings_sorted[0].timestamp_ns
        window_ns = int(self.time_window_ms * 1_000_000)

        in_window  = [r for r in readings_sorted if (r.timestamp_ns - earliest_ns) <= window_ns]
        dropped    = [r for r in readings_sorted if (r.timestamp_ns - earliest_ns) > window_ns]

        if len(in_window) < self.min_sensors:
            return MLATResult(
                position=None,
                success=False,
                error=(
                    f"Only {len(in_window)} sensors in {self.time_window_ms}ms window "
                    f"(need ≥{self.min_sensors}). "
                    f"{len(dropped)} readings dropped as out-of-window."
                ),
                readings_used=in_window,
                readings_dropped=dropped,
            )

        # Apply time drift quality gate
        # Note: drift check looks at spread relative to what TDOA expects
        # Simple check: reject if any two readings from sensors in same region
        # have implausibly small time difference (likely clock error)
        clean_readings, drifted = self._apply_drift_gate(in_window)

        if len(clean_readings) < self.min_sensors:
            return MLATResult(
                position=None,
                success=False,
                error=(
                    f"Too many readings rejected by drift gate "
                    f"({len(drifted)} dropped, {len(clean_readings)} remaining, need ≥{self.min_sensors})"
                ),
                readings_used=clean_readings,
                readings_dropped=dropped + drifted,
            )

        # Run TDOA solver
        position, error_msg = solve_tdoa(
            readings=clean_readings,
            initial_altitude_m=self.initial_altitude_m,
        )

        if position is None:
            return MLATResult(
                position=None,
                success=False,
                error=error_msg,
                readings_used=clean_readings,
                readings_dropped=dropped + drifted,
            )

        # Apply confidence threshold
        if position.confidence_score < self.confidence_threshold:
            return MLATResult(
                position=None,
                success=False,
                error=(
                    f"Confidence {position.confidence_score:.2f} below threshold "
                    f"{self.confidence_threshold:.2f}"
                ),
                readings_used=clean_readings,
                readings_dropped=dropped + drifted,
            )

        return MLATResult(
            position=position,
            success=True,
            error=None,
            readings_used=clean_readings,
            readings_dropped=dropped + drifted,
        )

    def _apply_drift_gate(
        self,
        readings: list[SensorReading],
    ) -> tuple[list[SensorReading], list[SensorReading]]:
        """
        Remove readings where sensor's clock drift is suspiciously large.

        Strategy: compute median timestamp, flag sensors whose deviation
        exceeds max_time_drift_ns relative to expected signal travel time.

        For now: basic outlier detection — remove any reading whose timestamp
        deviation from median exceeds a multiple of max_time_drift_ns.
        A full implementation would cross-check against sensor locations.
        """
        if len(readings) <= 3:
            # Not enough to do meaningful outlier detection — pass all through
            return readings, []

        timestamps = [r.timestamp_ns for r in readings]
        median_ts = sorted(timestamps)[len(timestamps) // 2]

        # Threshold: 10× stated drift tolerance to catch gross outliers only
        # (tight drift checking requires knowing inter-sensor distances)
        threshold_ns = self.max_time_drift_ns * 10

        clean   = [r for r in readings if abs(r.timestamp_ns - median_ts) <= threshold_ns * 1000]
        drifted = [r for r in readings if abs(r.timestamp_ns - median_ts) > threshold_ns * 1000]

        # If drift gate is too aggressive, don't apply it
        if len(clean) < self.min_sensors:
            return readings, []

        return clean, drifted

    def group_by_icao(
        self,
        readings: list[SensorReading],
    ) -> dict[str, list[SensorReading]]:
        """
        Group a flat list of readings by ICAO address.
        Useful for processing a batch of Mode-S messages.

        Example::

            groups = calc.group_by_icao(all_readings)
            results = [calc.calculate_position(icao, r) for icao, r in groups.items()]
        """
        groups: dict[str, list[SensorReading]] = {}
        for r in readings:
            groups.setdefault(r.icao_address, []).append(r)
        return groups
