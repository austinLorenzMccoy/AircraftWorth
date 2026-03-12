"""Neuron buyer client for consuming Mode-S streams from distributed sensors."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from models import ModeSMessage, SensorLocation

logger = logging.getLogger(__name__)


class NeuronBuyerService:
    """
    Connects to Neuron sensor network and consumes Mode-S message streams.
    
    In production, this would use the 4DSky SDK or libp2p to discover and
    subscribe to sensor streams. For now, implements a stub that can be
    replaced with real Neuron integration.
    """

    def __init__(self) -> None:
        self.buyer_account = os.getenv("NEURON_BUYER_ACCOUNT_ID")
        self.buyer_key = os.getenv("NEURON_BUYER_PRIVATE_KEY")
        self.sensor_ids = self._parse_sensor_ids()
        self.is_configured = bool(self.buyer_account and self.buyer_key and self.sensor_ids)
        self._message_queue: asyncio.Queue[ModeSMessage] = asyncio.Queue(maxsize=1000)
        self._running = False

        if not self.is_configured:
            logger.warning("Neuron buyer not configured. Set NEURON_BUYER_ACCOUNT_ID, NEURON_BUYER_PRIVATE_KEY, and NEURON_SENSOR_IDS.")

    def _parse_sensor_ids(self) -> List[str]:
        """Parse comma-separated sensor IDs from environment."""
        sensor_str = os.getenv("NEURON_SENSOR_IDS", "")
        if not sensor_str:
            return []
        return [s.strip() for s in sensor_str.split(",") if s.strip()]

    async def start(self) -> None:
        """Start consuming Mode-S streams from Neuron sensors."""
        if not self.is_configured:
            logger.error("Cannot start Neuron buyer: missing configuration")
            return

        if self._running:
            logger.warning("Neuron buyer already running")
            return

        self._running = True
        logger.info(f"Starting Neuron buyer for {len(self.sensor_ids)} sensors")

        # In production, this would:
        # 1. Discover sensors via Hedera smart contract
        # 2. Establish libp2p connections to each sensor
        # 3. Subscribe to their Mode-S streams
        # 4. Handle reconnection with exponential backoff
        
        # For now, log that we're ready to receive streams
        logger.info(f"Neuron buyer ready. Monitoring sensors: {self.sensor_ids[:3]}...")

    async def stop(self) -> None:
        """Stop consuming streams and clean up connections."""
        if not self._running:
            return

        self._running = False
        logger.info("Stopping Neuron buyer")

        # Close all sensor connections
        # Drain message queue
        while not self._message_queue.empty():
            try:
                self._message_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def get_messages(self, batch_size: int = 100, timeout: float = 1.0) -> List[ModeSMessage]:
        """
        Retrieve a batch of Mode-S messages from the queue.
        
        Args:
            batch_size: Maximum number of messages to retrieve
            timeout: Seconds to wait for at least one message
            
        Returns:
            List of Mode-S messages (may be empty if timeout expires)
        """
        messages: List[ModeSMessage] = []
        
        try:
            # Wait for first message with timeout
            first_msg = await asyncio.wait_for(self._message_queue.get(), timeout=timeout)
            messages.append(first_msg)
            
            # Drain remaining messages up to batch_size (non-blocking)
            while len(messages) < batch_size:
                try:
                    msg = self._message_queue.get_nowait()
                    messages.append(msg)
                except asyncio.QueueEmpty:
                    break
                    
        except asyncio.TimeoutError:
            pass
            
        return messages

    async def simulate_stream(self, sensor_locations: Dict[str, SensorLocation], duration_seconds: int = 60) -> None:
        """
        Simulate Mode-S stream for testing (replaces real Neuron integration during dev).
        
        Args:
            sensor_locations: Map of sensor_id -> location for synthetic data
            duration_seconds: How long to generate synthetic messages
        """
        if not self.is_configured:
            logger.error("Cannot simulate: buyer not configured")
            return

        logger.info(f"Simulating Mode-S stream for {duration_seconds}s with {len(sensor_locations)} sensors")
        
        # Synthetic aircraft ICAO addresses
        aircraft_icaos = ["A12345", "B67890", "C11111"]
        
        start_time = datetime.now(timezone.utc)
        message_count = 0
        
        while (datetime.now(timezone.utc) - start_time).total_seconds() < duration_seconds:
            for icao in aircraft_icaos:
                for sensor_id, location in list(sensor_locations.items())[:5]:  # Use first 5 sensors
                    # Create synthetic Mode-S message
                    timestamp_ns = int(datetime.now(timezone.utc).timestamp() * 1_000_000_000)
                    
                    message = ModeSMessage(
                        sensorId=sensor_id,
                        icaoAddress=icao,
                        rawMessage=f"SYNTHETIC_{icao}_{sensor_id}_{timestamp_ns}".encode(),
                        timestampNs=timestamp_ns,
                        sensorLocation=location,
                    )
                    
                    try:
                        self._message_queue.put_nowait(message)
                        message_count += 1
                    except asyncio.QueueFull:
                        logger.warning("Message queue full, dropping message")
                        
            await asyncio.sleep(0.5)  # 2 Hz message rate per aircraft
            
        logger.info(f"Simulation complete: generated {message_count} messages")

    def health(self) -> Dict[str, any]:
        """Return health status of buyer service."""
        return {
            "configured": self.is_configured,
            "running": self._running,
            "sensor_count": len(self.sensor_ids),
            "queue_size": self._message_queue.qsize(),
            "queue_capacity": self._message_queue.maxsize,
        }
