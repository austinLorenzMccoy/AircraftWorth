"""
aircraftworth-neuron — Tests

Uses aioresponses to mock HTTP without real network calls.
Run: pytest tests/ -v
"""

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from neuron_client import NeuronClient, NeuronClientConfig, ModeSMessage, SensorStatus

# ── Fixtures ──────────────────────────────────────────

BASE_CONFIG = NeuronClientConfig(
    buyer_account_id  = '0.0.6324974',
    buyer_private_key = '302e020100300506032b657004220420' + 'aa' * 32,
    sensor_ids        = ['sensor-s1', 'sensor-s2', 'sensor-s4'],
    neuron_api_url    = 'http://mock-neuron-api',
)

SAMPLE_MESSAGE = {
    'sensor_id':        'sensor-s1',
    'icao_address':     'ABC123',
    'timestamp_ns':     1_000_000_000,
    'raw_message':      '8d4b19f399d425f4a9d21bacdf0c',
    'sensor_latitude':  51.4775,
    'sensor_longitude': -0.4614,
    'sensor_altitude_m': 25.0,
    'signal_strength':  -45.2,
    'message_type':     'ADSB_MSG',
}

SAMPLE_MESSAGE_2 = {**SAMPLE_MESSAGE, 'sensor_id': 'sensor-s2', 'timestamp_ns': 1_000_000_034,
                   'sensor_latitude': 49.0097, 'sensor_longitude': 2.5479}
SAMPLE_MESSAGE_3 = {**SAMPLE_MESSAGE, 'sensor_id': 'sensor-s4', 'timestamp_ns': 1_000_000_081,
                   'sensor_latitude': 50.9013, 'sensor_longitude': 4.4844}

# ── ModeSMessage model tests ──────────────────────────────────

class TestModeSMessage:
    def test_parse_valid_message(self):
        msg = ModeSMessage.model_validate(SAMPLE_MESSAGE)
        assert msg.icao_address == 'ABC123'
        assert msg.timestamp_ns == 1_000_000_000
        assert msg.sensor_latitude == 51.4775

    def test_default_altitude(self):
        data = {**SAMPLE_MESSAGE}
        del data['sensor_altitude_m']
        msg = ModeSMessage.model_validate(data)
        assert msg.sensor_altitude_m == 0.0

    def test_optional_fields_nullable(self):
        data = {**SAMPLE_MESSAGE, 'signal_strength': None, 'message_type': None}
        msg = ModeSMessage.model_validate(data)
        assert msg.signal_strength is None
        assert msg.message_type is None

# ── NeuronClientConfig tests ──────────────────────────────────

class TestNeuronClientConfig:
    def test_default_values(self):
        config = NeuronClientConfig(
            buyer_account_id='0.0.123',
            buyer_private_key='key',
        )
        assert config.sensor_ids == []
        assert config.message_queue_size == 1000
        assert config.max_reconnect_attempts == 10
        assert config.icao_filter is None

    def test_icao_filter_assignment(self):
        config = NeuronClientConfig(
            buyer_account_id='0.0.123',
            buyer_private_key='key',
            icao_filter=['ABC123', 'DEF456'],
        )
        assert 'ABC123' in config.icao_filter

# ── NeuronClient tests ───────────────────────────────────────

class TestNeuronClient:
    @pytest.mark.asyncio
    async def test_connect_sets_sensors_from_config(self):
        """Client should register sensor IDs from config on connect."""
        with patch('aiohttp.ClientSession') as mock_session_cls:
            mock_session = MagicMock()
            mock_session_cls.return_value = mock_session

            client = NeuronClient(BASE_CONFIG)
            await client.connect()

            assert len(client._sensors) == 3
            assert 'sensor-s1' in client._sensors
            assert 'sensor-s2' in client._sensors

            await client.close()

    @pytest.mark.asyncio
    async def test_fetch_recent_messages_returns_sorted(self):
        """fetch_recent_messages should return messages sorted by timestamp."""
        client = NeuronClient(BASE_CONFIG)

        # Mock _fetch_from_sensor to return unsorted messages
        async def mock_fetch(sensor_id, since_ns, icao_filter):
            if sensor_id == 'sensor-s1':
                return [ModeSMessage.model_validate(SAMPLE_MESSAGE)]
            elif sensor_id == 'sensor-s2':
                return [ModeSMessage.model_validate(SAMPLE_MESSAGE_2)]
            elif sensor_id == 'sensor-s4':
                return [ModeSMessage.model_validate(SAMPLE_MESSAGE_3)]
            return []

        client._sensors = {sid: MagicMock() for sid in BASE_CONFIG.sensor_ids}
        client._session = MagicMock()
        client._fetch_from_sensor = mock_fetch

        messages = await client.fetch_recent_messages(time_window_seconds=60)

        assert len(messages) == 3
        # Should be sorted ascending by timestamp
        timestamps = [m.timestamp_ns for m in messages]
        assert timestamps == sorted(timestamps)
        assert messages[0].sensor_id == 'sensor-s1'

    @pytest.mark.asyncio
    async def test_fetch_tolerates_partial_sensor_failure(self):
        """If some sensors fail, others should still return data."""
        client = NeuronClient(BASE_CONFIG)
        client._sensors = {sid: MagicMock() for sid in BASE_CONFIG.sensor_ids}
        client._session = MagicMock()

        async def mock_fetch_partial(sensor_id, since_ns, icao_filter):
            if sensor_id == 'sensor-s1':
                return [ModeSMessage.model_validate(SAMPLE_MESSAGE)]
            elif sensor_id == 'sensor-s2':
                raise ConnectionError("Sensor offline")
            return []

        client._fetch_from_sensor = mock_fetch_partial

        # Should not raise — partial failures are captured
        messages = await client.fetch_recent_messages()
        assert len(messages) >= 1  # at least sensor-s1 returned

    def test_icao_filter_passes_matching(self):
        config = NeuronClientConfig(
            buyer_account_id='0.0.123',
            buyer_private_key='key',
            icao_filter=['ABC123'],
        )
        client = NeuronClient(config)
        msg = ModeSMessage.model_validate(SAMPLE_MESSAGE)
        assert client._passes_filter(msg) is True

    def test_icao_filter_blocks_non_matching(self):
        config = NeuronClientConfig(
            buyer_account_id='0.0.123',
            buyer_private_key='key',
            icao_filter=['XYZ999'],
        )
        client = NeuronClient(config)
        msg = ModeSMessage.model_validate(SAMPLE_MESSAGE)  # ICAO is ABC123
        assert client._passes_filter(msg) is False

    def test_icao_filter_case_insensitive(self):
        config = NeuronClientConfig(
            buyer_account_id='0.0.123',
            buyer_private_key='key',
            icao_filter=['abc123'],  # lowercase
        )
        client = NeuronClient(config)
        msg = ModeSMessage.model_validate(SAMPLE_MESSAGE)  # uppercase in message
        assert client._passes_filter(msg) is True

    def test_no_filter_passes_all(self):
        client = NeuronClient(BASE_CONFIG)
        msg = ModeSMessage.model_validate(SAMPLE_MESSAGE)
        assert client._passes_filter(msg) is True

    @pytest.mark.asyncio
    async def test_sensor_health_marks_offline(self):
        """Sensor with old heartbeat should be marked offline."""
        import time
        client = NeuronClient(BASE_CONFIG)
        client._sensors = {
            'sensor-s1': MagicMock(
                last_heartbeat=time.time() - 1000,  # very old
                status=SensorStatus.ONLINE
            ),
        }

        health = await client.get_sensor_health()
        assert health['sensor-s1'].status == SensorStatus.OFFLINE

    def test_online_sensor_count(self):
        client = NeuronClient(BASE_CONFIG)
        client._sensors = {
            's1': MagicMock(status=SensorStatus.ONLINE),
            's2': MagicMock(status=SensorStatus.OFFLINE),
            's3': MagicMock(status=SensorStatus.ONLINE),
        }
        assert client.online_sensor_count == 2

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Async context manager should connect and close cleanly."""
        with patch.object(NeuronClient, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(NeuronClient, 'close',   new_callable=AsyncMock) as mock_close:

            async with NeuronClient(BASE_CONFIG) as client:
                assert isinstance(client, NeuronClient)

            mock_connect.assert_called_once()
            mock_close.assert_called_once()
