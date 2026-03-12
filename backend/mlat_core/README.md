# MLAT Core

Time Difference of Arrival (TDOA) multilateration engine for aircraft position calculation.

## Features

- **TDOA Calculation**: Calculate aircraft positions from multiple sensor readings
- **Confidence Scoring**: Automatic confidence assessment based on sensor count and geometry
- **GDOP Estimation**: Geometric Dilution of Precision calculation
- **Time Window Filtering**: Automatic filtering of stale sensor readings

## Usage

```python
from mlat_core import MLATCalculator, SensorReading

# Initialize calculator
calculator = MLATCalculator(
    min_sensors=4,
    max_time_window_ns=100_000_000,  # 100ms
    confidence_threshold=70.0
)

# Prepare sensor readings
readings = [
    SensorReading(
        sensor_id="sensor1",
        icao_address="ABC123",
        timestamp_ns=1234567890000000,
        latitude=37.7749,
        longitude=-122.4194,
        altitude_m=10.0
    ),
    # ... more readings
]

# Calculate position
result = calculator.calculate_position(
    icao_address="ABC123",
    sensor_readings=readings
)

if result.position:
    print(f"Position: {result.position.latitude}, {result.position.longitude}")
    print(f"Confidence: {result.position.confidence_score}%")
    print(f"GDOP: {result.gdop}")
```

## Models

### SensorReading
- `sensor_id`: Unique sensor identifier
- `icao_address`: Aircraft ICAO address
- `timestamp_ns`: Reading timestamp in nanoseconds
- `latitude`, `longitude`: Sensor position
- `altitude_m`: Sensor altitude in meters (optional)

### AircraftPosition
- `icao_address`: Aircraft ICAO address
- `latitude`, `longitude`: Calculated position
- `altitude_ft`: Altitude in feet (optional)
- `confidence_score`: Confidence percentage (0-100)
- `sensor_count`: Number of sensors used

### MLATResult
- `position`: Calculated AircraftPosition
- `sensor_readings`: List of readings used
- `gdop`: Geometric Dilution of Precision
- `calculation_time_ms`: Processing time
- `errors`: List of error messages (if any)

## Future Enhancements

- [ ] Full TDOA implementation (currently using centroid)
- [ ] Kalman filtering for position smoothing
- [ ] Advanced GDOP calculation
- [ ] Support for different coordinate systems
- [ ] Altitude calculation from barometric data
