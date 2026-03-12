from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
from pyproj import Geod
from scipy.optimize import least_squares


class MLATSolver:
    """Multilateration solver using Time Difference of Arrival (TDOA)."""

    def __init__(self, speed_of_light: float = 299_792_458.0) -> None:
        self.speed_of_light = speed_of_light
        self.geod = Geod(ellps="WGS84")

    def solve_position(self, observations: List[Dict[str, float]]) -> Optional[Dict[str, float]]:
        """Solve aircraft position from sensor observations.

        Each observation dict must include:
        - sensor_id
        - latitude
        - longitude
        - timestamp_ns (nanoseconds)
        - altitude_m (optional)
        """

        filtered = self._filter_observations(observations)
        if len(filtered) < 3:
            return None

        timestamps = np.array([obs["timestamp_ns"] for obs in filtered], dtype=np.float64)
        min_timestamp = float(np.min(timestamps))
        tdoa = (timestamps - min_timestamp) * 1e-9  # seconds

        sensors = np.array([(obs["latitude"], obs["longitude"]) for obs in filtered], dtype=np.float64)
        initial_guess = self._initial_guess(sensors)

        try:
            result = least_squares(
                self._residuals,
                initial_guess,
                args=(sensors, tdoa),
                method="lm",
                max_nfev=1000,
            )
        except Exception:
            return None

        if not result.success:
            return None

        latitude, longitude = result.x
        confidence = self._confidence_from_residuals(result.fun)
        return {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "confidence_score": confidence,
            "sensor_count": len(filtered),
            "residuals": result.fun.tolist(),
        }

    def _initial_guess(self, sensors: np.ndarray) -> np.ndarray:
        if sensors.size == 0:
            return np.array([0.0, 0.0])
        return np.mean(sensors, axis=0)

    def _residuals(self, candidate: np.ndarray, sensors: np.ndarray, tdoa: np.ndarray) -> np.ndarray:
        distances = np.array([self._distance(candidate, sensor) for sensor in sensors], dtype=np.float64)
        predicted = (distances - distances[0]) / self.speed_of_light
        return predicted - tdoa

    def _distance(self, point_a: np.ndarray, point_b: np.ndarray) -> float:
        _, _, distance = self.geod.inv(point_a[1], point_a[0], point_b[1], point_b[0])
        return distance

    def _filter_observations(self, observations: List[Dict[str, float]]) -> List[Dict[str, float]]:
        if not observations:
            return []

        dedup: Dict[str, Dict[str, float]] = {}
        # Prefer the most recent observation per sensor
        for obs in sorted(observations, key=lambda x: x["timestamp_ns"], reverse=True):
            sensor_id = str(obs.get("sensor_id"))
            if sensor_id not in dedup:
                dedup[sensor_id] = obs

        filtered = list(dedup.values())
        filtered.sort(key=lambda x: x["timestamp_ns"])
        return filtered

    def _confidence_from_residuals(self, residuals: np.ndarray) -> float:
        if residuals.size == 0:
            return 100.0
        rms_error_seconds = float(np.sqrt(np.mean(residuals**2)))
        # Convert to nanoseconds for a human-friendly scale
        rms_error_ns = rms_error_seconds * 1e9
        score = max(0.0, min(100.0, 100.0 - (rms_error_ns * 0.05)))
        return round(score, 2)
