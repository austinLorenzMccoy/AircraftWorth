"""
aircraftworth-mlat — TDOA Solver

Full Time Difference of Arrival solver using Levenberg-Marquardt optimisation.
NO centroid fallback. Either the solver converges or it returns a failure result.

Algorithm:
    1. Convert sensor lat/lon/alt → ECEF (Earth-Centred Earth-Fixed) coordinates
    2. Build TDOA observation equations using the earliest sensor as reference
    3. Solve via scipy.optimize.least_squares (Levenberg-Marquardt method)
    4. Convert solution back to WGS-84 lat/lon
    5. Score via residual error + GDOP
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np
from scipy.optimize import least_squares

from . import SensorReading, MLATPosition, MLATResult

# ── WGS-84 constants ─────────────────────────────────────────
_WGS84_A  = 6_378_137.0          # semi-major axis (m)
_WGS84_B  = 6_356_752.314245     # semi-minor axis (m)
_WGS84_E2 = 1 - (_WGS84_B / _WGS84_A) ** 2  # first eccentricity squared
_C        = 299_792_458.0        # speed of light (m/s)


# ── Coordinate helpers ────────────────────────────────────────

def _lla_to_ecef(lat_deg: float, lon_deg: float, alt_m: float = 0.0) -> np.ndarray:
    """Convert WGS-84 lat/lon/alt to ECEF XYZ in metres."""
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    N = _WGS84_A / math.sqrt(1 - _WGS84_E2 * math.sin(lat) ** 2)
    x = (N + alt_m) * math.cos(lat) * math.cos(lon)
    y = (N + alt_m) * math.cos(lat) * math.sin(lon)
    z = (N * (1 - _WGS84_E2) + alt_m) * math.sin(lat)
    return np.array([x, y, z])


def _ecef_to_lla(x: float, y: float, z: float) -> tuple[float, float, float]:
    """Convert ECEF XYZ to WGS-84 lat/lon/alt using Bowring's iterative method."""
    lon = math.atan2(y, x)
    p = math.sqrt(x ** 2 + y ** 2)

    # Initial estimate
    lat = math.atan2(z, p * (1 - _WGS84_E2))

    for _ in range(10):  # converges in 3–5 iterations
        N = _WGS84_A / math.sqrt(1 - _WGS84_E2 * math.sin(lat) ** 2)
        lat_new = math.atan2(z + _WGS84_E2 * N * math.sin(lat), p)
        if abs(lat_new - lat) < 1e-12:
            lat = lat_new
            break
        lat = lat_new

    N = _WGS84_A / math.sqrt(1 - _WGS84_E2 * math.sin(lat) ** 2)
    alt = p / math.cos(lat) - N

    return math.degrees(lat), math.degrees(lon), alt


# ── GDOP calculation ──────────────────────────────────────────

def _compute_gdop(
    aircraft_ecef: np.ndarray,
    sensor_positions: list[np.ndarray],
) -> float:
    """
    Geometric Dilution of Precision.
    Lower GDOP = better sensor geometry = more reliable position.
    GDOP < 2: excellent, 2–5: good, 5–10: fair, >10: poor.
    """
    n = len(sensor_positions)
    if n < 3:
        return float('inf')

    H = []
    for pos in sensor_positions:
        diff = aircraft_ecef - pos
        dist = np.linalg.norm(diff)
        if dist < 1e-6:
            continue
        H.append(diff / dist)

    H_arr = np.array(H)
    try:
        Q = np.linalg.inv(H_arr.T @ H_arr)
        return float(math.sqrt(abs(np.trace(Q))))
    except np.linalg.LinAlgError:
        return float('inf')


# ── Confidence scoring ────────────────────────────────────────

def _compute_confidence(
    residual: float,
    gdop: float,
    sensor_count: int,
    time_spread_ns: int,
) -> float:
    """
    Composite confidence score 0.0–1.0.

    Factors:
        residual    — solver fit quality (lower = better)
        gdop        — sensor geometry quality (lower = better)
        sensor_count — more sensors = more redundancy
        time_spread — TDOA time differences spread (ns) — too small = poor geometry
    """
    # Residual score: 0 residual → 1.0, residual ≥ 100 → 0.0
    residual_score = max(0.0, 1.0 - residual / 100.0)

    # GDOP score: gdop ≤ 2 → 1.0, gdop ≥ 10 → 0.0
    gdop_score = max(0.0, min(1.0, (10.0 - gdop) / 8.0))

    # Sensor count score: 3 → 0.5, 4 → 0.75, 5+ → 1.0
    sensor_score = min(1.0, (sensor_count - 2) / 3.0)

    # Time spread score: very small spread (< 1μs) suggests poor geometry
    spread_us = time_spread_ns / 1_000.0
    spread_score = min(1.0, spread_us / 50.0)

    # Weighted combination
    confidence = (
        0.40 * residual_score +
        0.30 * gdop_score +
        0.20 * sensor_score +
        0.10 * spread_score
    )

    return round(max(0.0, min(1.0, confidence)), 4)


# ── Main solver ───────────────────────────────────────────────

def solve_tdoa(
    readings: list[SensorReading],
    initial_altitude_m: float = 10_000.0,
    max_iterations: int = 200,
    tolerance: float = 1e-10,
) -> tuple[Optional[MLATPosition], str]:
    """
    Solve aircraft position from TDOA observations.

    Parameters:
        readings:           Sorted list of SensorReading (≥3 required, sorted by timestamp_ns)
        initial_altitude_m: Initial guess for aircraft altitude (default 10,000m / ~33,000ft)
        max_iterations:     LM optimiser max iterations
        tolerance:          Convergence tolerance

    Returns:
        (MLATPosition, "") on success
        (None, error_message) on failure
    """
    if len(readings) < 3:
        return None, f"Insufficient sensors: need ≥3, got {len(readings)}"

    # Sort by timestamp — earliest is reference sensor
    sorted_readings = sorted(readings, key=lambda r: r.timestamp_ns)
    ref = sorted_readings[0]

    # Convert sensors to ECEF
    sensor_ecef: list[np.ndarray] = []
    for r in sorted_readings:
        sensor_ecef.append(_lla_to_ecef(r.latitude, r.longitude, r.altitude_m))

    ref_ecef = sensor_ecef[0]

    # Observed TDOA values (seconds) vs reference sensor
    tdoa_obs = np.array([
        (r.timestamp_ns - ref.timestamp_ns) * 1e-9
        for r in sorted_readings[1:]
    ])

    # Initial guess: centroid of sensor positions (ONLY as initial guess, not final answer)
    centroid = np.mean(sensor_ecef, axis=0)
    centroid_norm = centroid / np.linalg.norm(centroid)
    init_lat, init_lon, _ = _ecef_to_lla(*centroid_norm)
    x0_ecef = _lla_to_ecef(init_lat, init_lon, initial_altitude_m)
    x0 = x0_ecef.copy()

    def residuals(x: np.ndarray) -> np.ndarray:
        """TDOA residuals: predicted - observed time differences."""
        pos = x[:3]
        res = []
        dist_ref = np.linalg.norm(pos - ref_ecef)

        for i, ecef_i in enumerate(sensor_ecef[1:]):
            dist_i = np.linalg.norm(pos - ecef_i)
            tdoa_pred = (dist_i - dist_ref) / _C
            res.append(tdoa_pred - tdoa_obs[i])

        return np.array(res)

    # ── Levenberg-Marquardt via least_squares ──
    try:
        result = least_squares(
            residuals,
            x0,
            method='lm',
            max_nfev=max_iterations,
            ftol=tolerance,
            xtol=tolerance,
            gtol=tolerance,
        )
    except Exception as e:
        return None, f"Optimiser exception: {e}"

    if not result.success and result.cost > 1e-4:
        return None, f"Solver did not converge (cost={result.cost:.6f}, message='{result.message}')"

    # Convert solution back to lat/lon/alt
    sol_x, sol_y, sol_z = result.x[:3]
    sol_lat, sol_lon, sol_alt = _ecef_to_lla(sol_x, sol_y, sol_z)

    # Validate solution is physically plausible
    if not (-90 <= sol_lat <= 90 and -180 <= sol_lon <= 180):
        return None, f"Solution outside valid coordinates: ({sol_lat:.4f}, {sol_lon:.4f})"

    if sol_alt < -500 or sol_alt > 50_000:
        return None, f"Solution altitude implausible: {sol_alt:.0f}m"

    # Quality metrics
    residual_rms = float(np.sqrt(np.mean(result.fun ** 2))) * _C  # convert to metres
    sol_ecef = np.array([sol_x, sol_y, sol_z])
    gdop = _compute_gdop(sol_ecef, sensor_ecef)

    time_spread_ns = sorted_readings[-1].timestamp_ns - sorted_readings[0].timestamp_ns
    confidence = _compute_confidence(
        residual=residual_rms,
        gdop=gdop,
        sensor_count=len(readings),
        time_spread_ns=time_spread_ns,
    )

    position = MLATPosition(
        icao_address=ref.icao_address,
        latitude=round(sol_lat, 6),
        longitude=round(sol_lon, 6),
        altitude_m=round(sol_alt, 1),
        confidence_score=confidence,
        sensor_count=len(readings),
        sensor_ids=[r.sensor_id for r in sorted_readings],
        residual_error=round(residual_rms, 4),
        gdop=round(gdop, 3),
        calculation_method='TDOA-LM',
        timestamp_ns=ref.timestamp_ns,
    )

    return position, ""
