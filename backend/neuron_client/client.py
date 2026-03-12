"""
Neuron Client - Interface for Neuron network sensor data

This module wraps sensor data ingestion and provides a clean interface
for working with the Neuron network.
"""
import asyncio
from typing import AsyncIterator, List, Optional
from .models import ModeSMessage, SensorMetadata


class NeuronClient:
    """
    Client for connecting to Neuron network sensors
    
    Args:
        buyer_account_id: Hedera account ID for the buyer
        buyer_private_key: Private key for authentication
        sensor_ids: List of sensor IDs to connect to
        location: Geographic location identifier
        
    Example:
        client = NeuronClient(
            buyer_account_id="0.0.6324974",
            buyer_private_key=os.getenv("NEURON_BUYER_PRIVATE_KEY"),
            sensor_ids=["sensor1", "sensor2", "sensor3"]
        )
        
        # Stream messages in real-time
        async for message in client.stream_messages():
            print(f"Aircraft {message.icao_address} detected")
            
        # Or fetch batch
        messages = await client.fetch_recent_messages(
            time_window_seconds=60
        )
    """
    
    def __init__(
        self,
        buyer_account_id: str,
        buyer_private_key: str,
        sensor_ids: List[str],
        location: Optional[str] = None
    ):
        self.buyer_account_id = buyer_account_id
        self.buyer_private_key = buyer_private_key
        self.sensor_ids = sensor_ids
        self.location = location
        self._sensors: dict[str, SensorMetadata] = {}
    
    async def initialize(self):
        """Initialize connection to Neuron network and load sensor metadata"""
        # Load sensor metadata from Supabase or local cache
        from services.supabase_service import SupabaseService
        
        supabase = SupabaseService()
        for sensor_id in self.sensor_ids:
            metadata = await supabase.get_sensor_metadata(sensor_id)
            if metadata:
                self._sensors[sensor_id] = SensorMetadata(**metadata)
    
    async def stream_messages(
        self,
        icao_filter: Optional[str] = None
    ) -> AsyncIterator[ModeSMessage]:
        """
        Stream Mode-S messages from Neuron sensors in real-time
        
        Args:
            icao_filter: Optional ICAO address to filter for specific aircraft
            
        Yields:
            ModeSMessage objects as they arrive
        """
        # TODO: Implement actual Neuron network streaming
        # For now, this is a placeholder that would connect to Neuron's API
        
        # Placeholder: Poll Supabase for new messages
        from services.supabase_service import SupabaseService
        
        supabase = SupabaseService()
        last_id = 0
        
        while True:
            messages = await supabase.fetch_recent_messages(
                time_window_seconds=5,
                min_id=last_id
            )
            
            for msg in messages:
                if icao_filter and msg.get('icao_address') != icao_filter:
                    continue
                
                yield ModeSMessage(
                    sensor_id=msg['sensor_id'],
                    icao_address=msg['icao_address'],
                    raw_message=msg['raw_message'],
                    timestamp_ns=msg['timestamp_ns'],
                    sensor_latitude=msg['sensor_lat'],
                    sensor_longitude=msg['sensor_lon'],
                    sensor_altitude_m=msg.get('sensor_alt_m')
                )
                
                last_id = max(last_id, msg['id'])
            
            await asyncio.sleep(1)
    
    async def fetch_recent_messages(
        self,
        time_window_seconds: int = 60,
        icao_address: Optional[str] = None
    ) -> List[ModeSMessage]:
        """
        Fetch recent Mode-S messages from sensors
        
        Args:
            time_window_seconds: How far back to look for messages
            icao_address: Optional filter for specific aircraft
            
        Returns:
            List of ModeSMessage objects
        """
        from services.supabase_service import SupabaseService
        
        supabase = SupabaseService()
        messages = await supabase.fetch_recent_messages(
            time_window_seconds=time_window_seconds,
            icao_address=icao_address
        )
        
        return [
            ModeSMessage(
                sensor_id=msg['sensor_id'],
                icao_address=msg['icao_address'],
                raw_message=msg['raw_message'],
                timestamp_ns=msg['timestamp_ns'],
                sensor_latitude=msg['sensor_lat'],
                sensor_longitude=msg['sensor_lon'],
                sensor_altitude_m=msg.get('sensor_alt_m')
            )
            for msg in messages
        ]
    
    async def get_sensor_metadata(self, sensor_id: str) -> Optional[SensorMetadata]:
        """Get metadata for a specific sensor"""
        return self._sensors.get(sensor_id)
    
    async def get_active_sensors(self) -> List[SensorMetadata]:
        """Get list of currently active sensors"""
        return list(self._sensors.values())
    
    async def health_check(self) -> dict[str, bool]:
        """
        Check health status of all configured sensors
        
        Returns:
            Dictionary mapping sensor_id to health status (True/False)
        """
        health = {}
        for sensor_id in self.sensor_ids:
            # TODO: Implement actual health check via Neuron API
            # For now, check if we have metadata
            health[sensor_id] = sensor_id in self._sensors
        return health
