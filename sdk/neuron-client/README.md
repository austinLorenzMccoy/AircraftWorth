# aircraftworth-neuron

![PyPI](https://img.shields.io/pypi/v/aircraftworth-neuron?style=flat&logo=pypi) ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg) ![Python](https://img.shields.io/badge/Python-blue.svg)

**Async client for Neuron Mode‑S sensor network.** 🔄 **Built and ready for PyPI publishing**

## 🚀 Installation

```bash
pip install aircraftworth-neuron
```

📦 **Status**: Built and ready for PyPI publishing
📦 **Files**: Ready in `dist/` directory

## Quick Start

```python
import asyncio
from neuron_client import NeuronClient, NeuronClientConfig

async def main():
    config = NeuronClientConfig(
        buyer_account_id='0.0.6324974',
        buyer_private_key='302e020100300506032b657004220420',
        sensor_ids=['sensor-s1', 'sensor-s2', 'sensor-s4']
    )
    
    async with NeuronClient(config) as client:
        async for message in client.stream_messages():
            print(f"{message.icao_address} @ {message.timestamp_ns}")
```

## Features

- ✅ **Async Streaming**: Real-time Mode-S message streaming with async generators
- ✅ **Auto Reconnection**: Exponential backoff reconnection with configurable limits
- ✅ **Sensor Discovery**: Automatic sensor discovery from Neuron registry
- ✅ **Batch Fetching**: Time-windowed message fetching with ICAO filtering
- ✅ **Health Monitoring**: Heartbeat tracking and sensor status monitoring
- ✅ **Backpressure**: Queue overflow handling with oldest message dropping
- ✅ **Type Safety**: Full Pydantic models for all data structures

## API

### `NeuronClient`

Main class for Neuron sensor network interaction.

#### Constructor

```python
NeuronClient(config: NeuronClientConfig)
```

#### Methods

- `stream_messages() -> AsyncIterator[ModeSMessage]`
- `fetch_recent_messages(time_window_seconds: float = 60.0) -> List[ModeSMessage]`
- `get_sensor_health() -> Dict[str, SensorInfo]`
- `connect() -> None`
- `close() -> None`

## License

MIT
