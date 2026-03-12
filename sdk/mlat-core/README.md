# aircraftworth-mlat

![PyPI](https://img.shields.io/pypi/v/aircraftworth-mlat?style=flat&logo=pypi) ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg) ![Python](https://img.shields.io/badge/Python-blue.svg)

**Pure TDOA multilateration solver for aircraft localization.** 🔄 **Built and ready for PyPI publishing**

## 🚀 Installation

```bash
pip install aircraftworth-mlat
```

📦 **Status**: Built and ready for PyPI publishing
📦 **Files**: Ready in `dist/` directory

## Quick Start

```python
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
```

## Features

- ✅ **Pure TDOA**: No centroid fallback - full Levenberg-Marquardt solver
- ✅ **ECEF Coordinates**: Proper 3D coordinate transformations
- ✅ **Quality Scoring**: Composite confidence from residual + GDOP + sensors + time spread
- ✅ **Time Windowing**: Configurable time windows for reading filtering
- ✅ **Drift Detection**: Basic outlier detection for sensor clock errors
- ✅ **Type Safety**: Full type annotations throughout

## API

### `MLATCalculator`

Main class for TDOA calculations.

#### Constructor

```python
MLATCalculator(
    min_sensors: int = 3,
    time_window_ms: float = 1500.0,
    max_time_drift_ns: int = 200,
    confidence_threshold: float = 0.0,
    initial_altitude_m: float = 10_000.0
)
```

#### Methods

- `calculate_position(icao_address: str, sensor_readings: List[SensorReading]) -> MLATResult`
- `group_by_icao(readings: List[SensorReading]) -> Dict[str, List[SensorReading]]`

## License

MIT
