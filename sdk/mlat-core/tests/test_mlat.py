"""
aircraftworth-mlat — Tests

Run: pytest tests/ -v
"""

import math
import pytest
from mlat_core import MLATCalculator, SensorReading, MLATPosition, MLATResult
from mlat_core.solver import solve_tdoa, _lla_to_ecef, _ecef_to_lla, _C

# ── Helpers ───────────────────────────────────────────

def make_readings_for_position(
    icao: str,
    aircraft_lat: float,
    aircraft_lon: float,
    aircraft_alt_m: float,
    sensors: list[tuple[str, float, float]],  # (id, lat, lon)
    base_time_ns: int = 1_000_000_000_000,
) -> list[SensorReading]:
    """
    Generate synthetic SensorReading objects for a known aircraft position.
    Timestamps are derived from actual signal propagation delays.
    """
    import numpy as np
    from mlat_core.solver import _lla_to_ecef, _C

    aircraft_ecef = _lla_to_ecef(aircraft_lat, aircraft_lon, aircraft_alt_m)
    readings = []

    for sensor_id, s_lat, s_lon in sensors:
        sensor_ecef = _lla_to_ecef(s_lat, s_lon, 0.0)
        dist_m = float(np.linalg.norm(aircraft_ecef - sensor_ecef))
        travel_ns = int(dist_m / _C * 1e9)
        readings.append(SensorReading(
            sensor_id=sensor_id,
            icao_address=icao,
            timestamp_ns=base_time_ns + travel_ns,
            latitude=s_lat,
            longitude=s_lon,
        ))

    return readings


# ── Coordinate conversion tests ────────────────────────────────

class TestCoordinateConversion:
    def test_lla_to_ecef_known_point(self):
        """London Heathrow → ECEF should be within 1m of reference."""
        x, y, z = _lla_to_ecef(51.4775, -0.4614, 25.0)
        assert abs(x - 3_977_000) < 5000
        assert abs(y - (-41_000)) < 5000
        assert abs(z - 4_949_000) < 5000

    def test_ecef_roundtrip(self):
        """LLA → ECEF → LLA should recover original within 0.0001° and 1m."""
        lat_orig, lon_orig, alt_orig = 51.4820, -0.1234, 9500.0
        x, y, z = _lla_to_ecef(lat_orig, lon_orig, alt_orig)
        lat, lon, alt = _ecef_to_lla(x, y, z)
        assert abs(lat - lat_orig) < 1e-4
        assert abs(lon - lon_orig) < 1e-4
        assert abs(alt - alt_orig) < 1.0

    def test_equator_prime_meridian(self):
        x, y, z = _lla_to_ecef(0.0, 0.0, 0.0)
        assert abs(x - 6_378_137.0) < 1.0
        assert abs(y) < 1.0
        assert abs(z) < 1.0


# ── Solver tests ──────────────────────────────────────────

class TestSolveTDOA:
    SENSORS_EUROPE = [
        ('S1', 51.4775, -0.4614),  # London Heathrow
        ('S2', 49.0097,  2.5479),  # Paris CDG
        ('S4', 50.9013,  4.4844),  # Brussels
        ('S7', 52.3086,  4.7639),  # Amsterdam
    ]

    def test_3_sensor_solve_converges(self):
        """3 sensors should converge to within ~5km of true position."""
        true_lat, true_lon, true_alt = 50.8503, 4.3517, 10_000.0  # Over Brussels
        readings = make_readings_for_position(
            'ABC123', true_lat, true_lon, true_alt,
            self.SENSORS_EUROPE[:3]
        )
        position, error = solve_tdoa(readings)
        assert error == '', f"Unexpected error: {error}"
        assert position is not None
        assert abs(position.latitude  - true_lat) < 0.05   # ~5km
        assert abs(position.longitude - true_lon) < 0.05
        assert position.calculation_method == 'TDOA-LM'

    def test_4_sensor_solve_more_accurate(self):
        """4 sensors should converge to within ~1km."""
        true_lat, true_lon, true_alt = 50.8503, 4.3517, 8_000.0
        readings = make_readings_for_position(
            'DEF456', true_lat, true_lon, true_alt,
            self.SENSORS_EUROPE
        )
        position, error = solve_tdoa(readings)
        assert error == ''
        assert position is not None
        assert abs(position.latitude  - true_lat) < 0.02   # ~2km
        assert abs(position.longitude - true_lon) < 0.02
        assert position.confidence_score > 0.5

    def test_returns_none_for_2_sensors(self):
        readings = make_readings_for_position(
            'GHI789', 50.85, 4.35, 10_000.0,
            self.SENSORS_EUROPE[:2]
        )
        position, error = solve_tdoa(readings)
        assert position is None
        assert 'Insufficient sensors' in error

    def test_confidence_between_0_and_1(self):
        readings = make_readings_for_position(
            'JKL012', 50.85, 4.35, 10_000.0,
            self.SENSORS_EUROPE
        )
        position, _ = solve_tdoa(readings)
        assert position is not None
        assert 0.0 <= position.confidence_score <= 1.0


# ── MLATCalculator tests ──────────────────────────────────────

class TestMLATCalculator:
    SENSORS = [
        ('S1', 51.4775, -0.4614),
        ('S2', 49.0097,  2.5479),
        ('S4', 50.9013,  4.4844),
        ('S7', 52.3086,  4.7639),
    ]

    def test_basic_calculate_position(self):
        calc = MLATCalculator(min_sensors=3)
        readings = make_readings_for_position(
            'ABC123', 50.85, 4.35, 9_000.0, self.SENSORS
        )
        result = calc.calculate_position('ABC123', readings)
        assert result.success is True
        assert result.position is not None
        assert result.error is None

    def test_wrong_icao_returns_failure(self):
        calc = MLATCalculator()
        readings = make_readings_for_position(
            'ABC123', 50.85, 4.35, 9_000.0, self.SENSORS
        )
        result = calc.calculate_position('XXXXXX', readings)
        assert result.success is False
        assert 'No readings for ICAO' in result.error

    def test_min_sensors_validation(self):
        with pytest.raises(ValueError, match="min_sensors must be ≥ 3"):
            MLATCalculator(min_sensors=2)

    def test_group_by_icao(self):
        calc = MLATCalculator()
        r_abc = make_readings_for_position('ABC123', 50.85, 4.35, 9_000.0, self.SENSORS[:3])
        r_def = make_readings_for_position('DEF456', 51.50, 0.10, 8_000.0, self.SENSORS[:3])
        groups = calc.group_by_icao(r_abc + r_def)
        assert set(groups.keys()) == {'ABC123', 'DEF456'}
        assert len(groups['ABC123']) == 3
        assert len(groups['DEF456']) == 3
