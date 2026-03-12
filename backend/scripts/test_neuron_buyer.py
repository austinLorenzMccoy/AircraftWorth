#!/usr/bin/env python3
"""Test script for Neuron buyer service with simulated streams."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")

from models import SensorLocation
from services.neuron_buyer import NeuronBuyerService
from services.supabase_service import SupabaseService


async def main() -> None:
    print("=== Neuron Buyer Test ===\n")
    
    # Initialize services
    buyer = NeuronBuyerService()
    supabase = SupabaseService()
    
    # Check configuration
    print(f"Buyer configured: {buyer.is_configured}")
    print(f"Supabase configured: {supabase.is_configured}")
    print(f"Monitoring {len(buyer.sensor_ids)} sensors\n")
    
    if not buyer.is_configured:
        print("ERROR: Neuron buyer not configured. Check .env for:")
        print("  - NEURON_BUYER_ACCOUNT_ID")
        print("  - NEURON_BUYER_PRIVATE_KEY")
        print("  - NEURON_SENSOR_IDS")
        return
    
    # Fetch sensor locations from Supabase
    sensor_locations = {}
    if supabase.is_configured:
        print("Fetching sensor locations from Supabase...")
        sensors = supabase.get_active_sensors(minutes=999999)  # Get all sensors
        for sensor in sensors:
            sensor_id = sensor["sensor_id"]
            # Parse PostGIS POINT format
            location_str = sensor.get("location")
            if location_str:
                # Extract lat/lon from WKB or text format
                # For now, use placeholder coordinates
                sensor_locations[sensor_id] = SensorLocation(
                    latitude=50.0 + len(sensor_locations) * 0.1,
                    longitude=10.0 + len(sensor_locations) * 0.1,
                    altitudeMeters=100.0,
                )
        print(f"Loaded {len(sensor_locations)} sensor locations\n")
    else:
        print("Supabase not configured, using synthetic locations\n")
        for sensor_id in buyer.sensor_ids[:5]:
            sensor_locations[sensor_id] = SensorLocation(
                latitude=50.0 + len(sensor_locations) * 0.1,
                longitude=10.0 + len(sensor_locations) * 0.1,
                altitudeMeters=100.0,
            )
    
    # Start buyer
    await buyer.start()
    
    # Run simulation in background
    simulation_task = asyncio.create_task(
        buyer.simulate_stream(sensor_locations, duration_seconds=10)
    )
    
    # Consume messages
    print("Consuming Mode-S messages...\n")
    total_messages = 0
    batch_count = 0
    
    while not simulation_task.done() or buyer._message_queue.qsize() > 0:
        messages = await buyer.get_messages(batch_size=50, timeout=0.5)
        if messages:
            batch_count += 1
            total_messages += len(messages)
            print(f"Batch {batch_count}: {len(messages)} messages | Queue: {buyer._message_queue.qsize()}")
            
            # Show sample message
            if batch_count == 1:
                sample = messages[0]
                print(f"  Sample: ICAO={sample.icaoAddress}, Sensor={sample.sensorId[:8]}..., TS={sample.timestampNs}")
    
    await simulation_task
    await buyer.stop()
    
    print(f"\n=== Test Complete ===")
    print(f"Total messages: {total_messages}")
    print(f"Total batches: {batch_count}")
    print(f"Health: {buyer.health()}")


if __name__ == "__main__":
    asyncio.run(main())
