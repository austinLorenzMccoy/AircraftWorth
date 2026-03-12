"""
AircraftWorth Neuron Client SDK

Neuron network interface for Mode-S message streaming and sensor data ingestion
with smart contract integration for marketplace operations.
"""

from .client import NeuronClient
from .contracts import (
    NeuronContractIntegration,
    NeuronContractConfig,
    create_neuron_config,
    calculate_quality_score,
    calculate_reliability_score
)

__version__ = "0.1.0"
__all__ = [
    # Core Neuron functionality
    "NeuronClient",
    
    # Contract integration
    "NeuronContractIntegration",
    "NeuronContractConfig",
    "create_neuron_config",
    "calculate_quality_score",
    "calculate_reliability_score"
]

from __future__ import annotations
import logging
from typing import AsyncIterator, Optional
from enum import Enum

import aiohttp
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Data models ───────────────────────────────────────

class SensorStatus(str, Enum):
    ONLINE   = "online"
    OFFLINE  = "offline"
    DEGRADED = "degraded"
    UNKNOWN  = "unknown"

class ModeSMessage(BaseModel):
    """
    A single Mode-S message received from a Neuron sensor.

    All fields match Neuron network message schema.
    """
    sensor_id:        str = Field(..., description="Neuron sensor Hedera account ID")
    icao_address:     str = Field(..., description="6-char hex ICAO aircraft identifier")
    timestamp_ns:     int = Field(..., description="GPS-synchronised reception time (nanoseconds)")
    raw_message:      str = Field(..., description="Raw Mode-S hex payload")
    sensor_latitude:  float = Field(..., description="Sensor latitude (decimal degrees)")
    sensor_longitude: float = Field(..., description="Sensor longitude (decimal degrees)")
    sensor_altitude_m: float = Field(default=0.0, description="Sensor altitude (metres)")
    signal_strength:  Optional[float] = Field(default=None, description="Signal-to-noise ratio (dB)")
    message_type:     Optional[str] = Field(default=None, description="Decoded Mode-S message type")

class SensorInfo(BaseModel):
    """Neuron network sensor metadata."""
    sensor_id:      str
    hedera_account: str
    latitude:       float
    longitude:      float
    altitude_m:     float = 0.0
    trust_score:    float = 1.0
    status:         SensorStatus = SensorStatus.UNKNOWN
    last_heartbeat: Optional[float] = None  # Unix timestamp
    message_count:  int = 0

# ── Config ────────────────────────────────────────────

from dataclasses import dataclass, field
from typing import Optional, list

@dataclass
class NeuronClientConfig:
    """Configuration for NeuronClient."""

    buyer_account_id:  str
    """Your Neuron buyer Hedera account ID (e.g. "0.0.6324974")"""

    buyer_private_key: str
    """Your Neuron buyer private key"""

    sensor_ids: list[str] = field(default_factory=list)
    """Specific sensor IDs to connect to. Empty = use discovery."""

    neuron_api_url: str = "https://api.neuron.4dsky.io"
    """Neuron network API base URL"""

    max_reconnect_attempts: int = 10
    """Max reconnection attempts per sensor before giving up"""

    reconnect_base_delay_s: float = 1.0
    """Base delay for exponential backoff on reconnect"""

    message_queue_size: int = 1000
    """Max messages to buffer in async queue"""

    heartbeat_interval_s: float = 30.0
    """How often to check sensor heartbeats"""

    icao_filter: Optional[list[str]] = None
    """If set, only yield messages for these ICAO addresses"""
