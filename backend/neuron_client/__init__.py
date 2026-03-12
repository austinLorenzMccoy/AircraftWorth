"""
Neuron Client - Sensor Data Ingestion Module

This module provides utilities for connecting to the Neuron network,
ingesting Mode-S ADS-B data from sensors, and managing sensor metadata.

Key Features:
- Neuron sensor discovery and connection
- Mode-S message parsing
- Real-time data streaming
- Sensor health monitoring

Future SDK Usage:
    from neuron_client import NeuronClient
    
    client = NeuronClient(
        buyer_account_id="0.0.123456",
        buyer_private_key="302e...",
        sensor_ids=["sensor1", "sensor2"]
    )
    
    async for message in client.stream_messages():
        print(f"Received: {message.icao_address}")
"""

from .client import NeuronClient
from .models import ModeSMessage, SensorMetadata

__all__ = ['NeuronClient', 'ModeSMessage', 'SensorMetadata']
