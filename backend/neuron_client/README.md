# Neuron Client

Interface for connecting to the Neuron network and ingesting Mode-S ADS-B sensor data.

## Features

- **Sensor Discovery**: Automatic sensor metadata loading
- **Real-time Streaming**: Stream Mode-S messages as they arrive
- **Batch Fetching**: Retrieve historical messages within time windows
- **Health Monitoring**: Check sensor connectivity and status
- **ICAO Filtering**: Filter messages for specific aircraft

## Usage

```python
from neuron_client import NeuronClient
import os

# Initialize client
client = NeuronClient(
    buyer_account_id="0.0.6324974",
    buyer_private_key=os.getenv("NEURON_BUYER_PRIVATE_KEY"),
    sensor_ids=["sensor1", "sensor2", "sensor3"],
    location="San Francisco"
)

# Initialize connection
await client.initialize()

# Stream messages in real-time
async for message in client.stream_messages():
    print(f"Aircraft: {message.icao_address}")
    print(f"Sensor: {message.sensor_id}")
    print(f"Position: {message.sensor_latitude}, {message.sensor_longitude}")
    print(f"Timestamp: {message.timestamp_ns}")

# Or fetch recent messages in batch
messages = await client.fetch_recent_messages(
    time_window_seconds=60,
    icao_address="ABC123"  # Optional filter
)

print(f"Received {len(messages)} messages")

# Check sensor health
health = await client.health_check()
for sensor_id, is_healthy in health.items():
    print(f"{sensor_id}: {'✓' if is_healthy else '✗'}")

# Get active sensors
sensors = await client.get_active_sensors()
for sensor in sensors:
    print(f"{sensor.name}: {sensor.latitude}, {sensor.longitude}")
```

## Models

### ModeSMessage
- `sensor_id`: Sensor that received the message
- `icao_address`: Aircraft ICAO address
- `raw_message`: Raw Mode-S message hex string
- `timestamp_ns`: Reception timestamp in nanoseconds
- `sensor_latitude`, `sensor_longitude`: Sensor position
- `sensor_altitude_m`: Sensor altitude (optional)
- `message_type`: Decoded message type (optional)
- `decoded_data`: Parsed message data (optional)

### SensorMetadata
- `sensor_id`: Unique sensor identifier
- `hedera_account_id`: Associated Hedera account
- `name`: Human-readable sensor name
- `latitude`, `longitude`: Sensor geographic position
- `altitude_m`: Sensor altitude in meters
- `hcs_stdin_topic`: HCS topic for sensor input
- `hcs_stdout_topic`: HCS topic for sensor output
- `last_heartbeat`: Last heartbeat timestamp
- `status`: Current sensor status

## Configuration

Set these environment variables:

```bash
NEURON_BUYER_ACCOUNT_ID=0.0.6324974
NEURON_BUYER_PRIVATE_KEY=302e...
NEURON_SENSOR_IDS=sensor1,sensor2,sensor3
```

## Future Enhancements

- [ ] Direct Neuron API integration (currently uses Supabase)
- [ ] WebSocket support for lower latency
- [ ] Message decoding (ADS-B, Mode-S)
- [ ] Automatic sensor discovery via Hedera
- [ ] Sensor performance metrics
- [ ] Data compression for bandwidth optimization
