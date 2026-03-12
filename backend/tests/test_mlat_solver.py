import math

from services.mlat_solver import MLATSolver


def test_mlat_solver_computes_position():
    solver = MLATSolver()

    aircraft_lat = 51.50
    aircraft_lon = -0.10

    sensors = [
        {"lat": 51.52, "lon": -0.12},
        {"lat": 51.48, "lon": -0.15},
        {"lat": 51.55, "lon": -0.05},
    ]

    distances = []
    for sensor in sensors:
        _, _, distance = solver.geod.inv(
            aircraft_lon,
            aircraft_lat,
            sensor["lon"],
            sensor["lat"],
        )
        distances.append(distance)

    base_timestamp = 1_700_000_000_000_000_000
    timestamps = []
    c = solver.speed_of_light
    for idx, distance in enumerate(distances):
        delta_seconds = (distance - distances[0]) / c
        timestamps.append(int(base_timestamp + delta_seconds * 1e9))

    observations = [
        {
            "sensor_id": f"sensor_{idx}",
            "latitude": sensor["lat"],
            "longitude": sensor["lon"],
            "timestamp_ns": timestamps[idx],
        }
        for idx, sensor in enumerate(sensors)
    ]

    result = solver.solve_position(observations)
    assert result is not None
    assert math.isclose(result["latitude"], aircraft_lat, rel_tol=0.01, abs_tol=0.01)
    assert math.isclose(result["longitude"], aircraft_lon, rel_tol=0.01, abs_tol=0.01)
    assert result["confidence_score"] > 70
    assert result["sensor_count"] == len(sensors)


def test_mlat_solver_requires_three_unique_sensors():
    solver = MLATSolver()
    observations = [
        {
            "sensor_id": "sensor_1",
            "latitude": 51.5,
            "longitude": -0.1,
            "timestamp_ns": 1_700_000_000_000_000_000,
        },
        {
            "sensor_id": "sensor_1",
            "latitude": 51.5,
            "longitude": -0.1,
            "timestamp_ns": 1_700_000_000_000_000_500,
        },
    ]

    result = solver.solve_position(observations)
    assert result is None
