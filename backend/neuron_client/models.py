"""
Data models for Neuron network operations
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class ModeSMessage:
    """Represents a Mode-S ADS-B message from a Neuron sensor"""
    sensor_id: str
    icao_address: str
    raw_message: str
    timestamp_ns: int
    sensor_latitude: float
    sensor_longitude: float
    sensor_altitude_m: Optional[float] = None
    message_type: Optional[str] = None
    decoded_data: Optional[dict] = None


@dataclass
class SensorMetadata:
    """Neuron sensor metadata and configuration"""
    sensor_id: str
    hedera_account_id: Optional[str] = None
    name: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    altitude_m: Optional[float] = None
    hcs_stdin_topic: Optional[str] = None
    hcs_stdout_topic: Optional[str] = None
    last_heartbeat: Optional[str] = None
    status: str = "unknown"
