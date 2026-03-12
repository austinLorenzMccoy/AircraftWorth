"""
aircraftworth-neuron — NeuronClient

Async Python client for Neuron/4DSky distributed Mode-S sensor network.

Handles:
- Sensor discovery from Neuron registry
- Real-time Mode-S message streaming with async generators
- Batch message fetching with time windowing
- Sensor health monitoring with heartbeat tracking
- Automatic reconnection with exponential backoff
- ICAO address filtering
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

import aiohttp
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Main client ───────────────────────────────────────

class NeuronClient:
    """
    Async client for Neuron/4DSky Mode-S sensor network.

    Example — streaming::

        async with NeuronClient(config) as client:
            async for message in client.stream_messages():
                print(f"{message.icao_address} @ {message.timestamp_ns}")

    Example — batch fetch::

        async with NeuronClient(config) as client:
            messages = await client.fetch_recent_messages(time_window_seconds=60)
            print(f"Got {len(messages)} messages from {len(config.sensor_ids)} sensors")
    """

    def __init__(self, config: NeuronClientConfig):
        self.config  = config
        self._session: Optional[aiohttp.ClientSession] = None
        self._queue:   asyncio.Queue[ModeSMessage] = asyncio.Queue(
            maxsize=config.message_queue_size
        )
        self._sensors: dict[str, SensorInfo] = {}
        self._running = False
        self._stream_tasks: list[asyncio.Task] = []

    # ── Context manager ───────────────────────────────────────

    async def __aenter__(self) -> NeuronClient:
        await self.connect()
        return self

    async def __aexit__(self, *_) -> None:
        await self.close()

    # ── Lifecycle ─────────────────────────────────────────────

    async def connect(self) -> None:
        """Open HTTP session and discover/validate sensors."""
        self._session = aiohttp.ClientSession(
            headers={
                'X-Neuron-Buyer-ID': self.config.buyer_account_id,
                'X-Neuron-Buyer-Key': self.config.buyer_private_key[:8] + '...',  # don't log full key
                'Content-Type': 'application/json',
            },
            timeout=aiohttp.ClientTimeout(total=30),
        )
        self._running = True

        # Discover sensors if none specified
        if not self.config.sensor_ids:
            self._sensors = await self._discover_sensors()
        else:
            for sensor_id in self.config.sensor_ids:
                self._sensors[sensor_id] = SensorInfo(
                    sensor_id=sensor_id,
                    hedera_account=sensor_id,
                    latitude=0.0,
                    longitude=0.0,
                )

        logger.info(f"[NeuronClient] Connected — {len(self._sensors)} sensors")

    async def close(self) -> None:
        """Cancel all stream tasks and close HTTP session."""
        self._running = False
        for task in self._stream_tasks:
            task.cancel()
        if self._stream_tasks:
            await asyncio.gather(*self._stream_tasks, return_exceptions=True)
        if self._session:
            await self._session.close()
        logger.info("[NeuronClient] Closed")

    # ── Sensor discovery ──────────────────────────────────────

    async def _discover_sensors(self) -> dict[str, SensorInfo]:
        """
        Query Neuron registry for active sensors.
        Falls back to empty dict with a warning if unavailable.
        """
        if not self._session:
            return {}

        try:
            async with self._session.get(
                f"{self.config.neuron_api_url}/v1/sensors",
                params={'status': 'online'},
            ) as resp:
                if resp.status != 200:
                    logger.warning(f"[NeuronClient] Sensor discovery returned {resp.status}")
                    return {}

                data = await resp.json()
                sensors = {}
                for s in data.get('sensors', []):
                    info = SensorInfo(
                        sensor_id=s['id'],
                        hedera_account=s.get('hedera_account', s['id']),
                        latitude=s['latitude'],
                        longitude=s['longitude'],
                        altitude_m=s.get('altitude_m', 0.0),
                        trust_score=s.get('trust_score', 1.0),
                        status=SensorStatus(s.get('status', 'unknown')),
                    )
                    sensors[info.sensor_id] = info

                logger.info(f"[NeuronClient] Discovered {len(sensors)} sensors")
                return sensors

        except Exception as e:
            logger.warning(f"[NeuronClient] Sensor discovery failed: {e}")
            return {}

    # ── Real-time streaming ───────────────────────────────────

    async def stream_messages(self) -> AsyncIterator[ModeSMessage]:
        """
        Stream Mode-S messages from all connected sensors.

        Yields messages as they arrive. Handles reconnection automatically.
        Filters by ICAO if `config.icao_filter` is set.

        Usage::

            async for msg in client.stream_messages():
                process(msg)
        """
        # Start background tasks for each sensor
        for sensor_id in self._sensors:
            task = asyncio.create_task(
                self._stream_from_sensor(sensor_id),
                name=f"neuron-stream-{sensor_id}",
            )
            self._stream_tasks.append(task)

        # Yield from queue
        while self._running:
            try:
                message = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                if self._passes_filter(message):
                    yield message
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    async def _stream_from_sensor(self, sensor_id: str) -> None:
        """
        Maintain a persistent SSE/WebSocket connection to one sensor.
        Reconnects with exponential backoff on failure.
        """
        attempts = 0
        base_delay = self.config.reconnect_base_delay_s

        while self._running and attempts < self.config.max_reconnect_attempts:
            try:
                await self._connect_sensor_stream(sensor_id)
                attempts = 0  # reset on successful connection

            except asyncio.CancelledError:
                break
            except Exception as e:
                attempts += 1
                if attempts >= self.config.max_reconnect_attempts:
                    logger.error(
                        f"[NeuronClient] Sensor {sensor_id}: max reconnects reached, giving up"
                    )
                    if sensor_id in self._sensors:
                        self._sensors[sensor_id].status = SensorStatus.OFFLINE
                    break

                delay = base_delay * (2 ** (attempts - 1))
                jitter = delay * 0.1  # 10% jitter
                wait = delay + (asyncio.get_event_loop().time() % jitter)
                logger.warning(
                    f"[NeuronClient] Sensor {sensor_id}: connection error ({e}), "
                    f"retry {attempts}/{self.config.max_reconnect_attempts} in {wait:.1f}s"
                )
                await asyncio.sleep(wait)

    async def _connect_sensor_stream(self, sensor_id: str) -> None:
        """
        Connect to Neuron SSE stream for one sensor and pump messages into queue.
        """
        if not self._session:
            raise RuntimeError("Client not connected")

        stream_url = f"{self.config.neuron_api_url}/v1/sensors/{sensor_id}/stream"

        async with self._session.get(stream_url) as resp:
            if resp.status != 200:
                raise aiohttp.ClientResponseError(
                    resp.request_info,
                    resp.history,
                    status=resp.status,
                    message=f"Stream endpoint returned {resp.status}",
                )

            if sensor_id in self._sensors:
                self._sensors[sensor_id].status = SensorStatus.ONLINE
                self._sensors[sensor_id].last_heartbeat = time.time()

            logger.info(f"[NeuronClient] Streaming from sensor {sensor_id}")

            # Parse Server-Sent Events
            async for line in resp.content:
                if not self._running:
                    break
                decoded = line.decode('utf-8').strip()
                if decoded.startswith('data:'):
                    payload = decoded[5:].strip()
                    try:
                        msg = ModeSMessage.model_validate(payload)
                        if self._queue.full():
                            # Drop oldest message (backpressure)
                            try:
                                self._queue.get_nowait()
                            except asyncio.QueueEmpty:
                                pass
                        await self._queue.put(msg)

                        if sensor_id in self._sensors:
                            self._sensors[sensor_id].message_count += 1
                            self._sensors[sensor_id].last_heartbeat = time.time()

                    except Exception as e:
                        logger.debug(f"[NeuronClient] Failed to parse message: {e}")

    # ── Batch fetching ───────────────────────────────────────

    async def fetch_recent_messages(
        self,
        time_window_seconds: float = 60.0,
        icao_addresses: Optional[list[str]] = None,
    ) -> list[ModeSMessage]:
        """
        Fetch a batch of recent Mode-S messages from all sensors.

        Parameters:
            time_window_seconds: How far back to fetch messages (default 60s)
            icao_addresses:      Optional ICAO filter (overrides config.icao_filter)

        Returns:
            List of ModeSMessage sorted by timestamp_ns ascending
        """
        if not self._session:
            raise RuntimeError("Client not connected — call connect() first or use async context manager")

        since_ns = int((time.time() - time_window_seconds) * 1e9)
        messages: list[ModeSMessage] = []
        filter_icao = icao_addresses or self.config.icao_filter

        tasks = [
            self._fetch_from_sensor(sensor_id, since_ns, filter_icao)
            for sensor_id in self._sensors
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for sensor_id, result in zip(self._sensors, results):
            if isinstance(result, Exception):
                logger.warning(f"[NeuronClient] Fetch failed for {sensor_id}: {result}")
            else:
                messages.extend(result)

        return sorted(messages, key=lambda m: m.timestamp_ns)

    async def _fetch_from_sensor(
        self,
        sensor_id: str,
        since_ns: int,
        icao_filter: Optional[list[str]],
    ) -> list[ModeSMessage]:
        """Fetch recent messages from a single sensor endpoint."""
        if not self._session:
            return []

        params = {'since_ns': since_ns}
        if icao_filter:
            params['icao'] = ','.join(icao_filter)

        try:
            async with self._session.get(
                f"{self.config.neuron_api_url}/v1/sensors/{sensor_id}/messages",
                params=params,
            ) as resp:
                if resp.status != 200:
                    return []

                data = await resp.json()
                return [
                    ModeSMessage.model_validate(msg)
                    for msg in data.get('messages', [])
                ]

        except Exception as e:
            logger.warning(f"[NeuronClient] Fetch error for {sensor_id}: {e}")
            return []

    # ── Health monitoring ─────────────────────────────────────

    async def get_sensor_health(self) -> dict[str, SensorInfo]:
        """Return current health status of all known sensors."""
        now = time.time()
        for sensor_id, info in self._sensors.items():
            if info.last_heartbeat is None:
                info.status = SensorStatus.UNKNOWN
            elif (now - info.last_heartbeat) > self.config.heartbeat_interval_s * 2:
                info.status = SensorStatus.OFFLINE
            elif (now - info.last_heartbeat) > self.config.heartbeat_interval_s:
                info.status = SensorStatus.DEGRADED
            else:
                info.status = SensorStatus.ONLINE

        return dict(self._sensors)

    @property
    def online_sensor_count(self) -> int:
        return sum(
            1 for s in self._sensors.values()
            if s.status == SensorStatus.ONLINE
        )

    # ── Helpers ───────────────────────────────────────────────

    def _passes_filter(self, message: ModeSMessage) -> bool:
        if not self.config.icao_filter:
            return True
        return message.icao_address.upper() in [
            i.upper() for i in self.config.icao_filter
        ]
