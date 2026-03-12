#!/usr/bin/env python3
"""Replay Mode-S messages from file to test full MLAT pipeline."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import List

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")

from models import ModeSMessage, SensorLocation, MLATProcessRequest
from services.mlat_pipeline import MLATPipelineService
from services.supabase_service import SupabaseService


async def replay_from_file(file_path: Path, batch_size: int = 10) -> None:
    """
    Replay Mode-S messages from NDJSON file through MLAT pipeline.
    
    File format (one JSON object per line):
    {"sensorId": "...", "icaoAddress": "...", "rawMessage": "...", "timestampNs": ..., "sensorLocation": {...}}
    """
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        return

    # Use service role for replay to bypass RLS
    import os
    os.environ["SUPABASE_ANON_KEY"] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    
    pipeline = MLATPipelineService()
    supabase = SupabaseService()

    print(f"=== MLAT Replay Tool ===")
    print(f"File: {file_path}")
    print(f"Pipeline configured: Supabase={supabase.is_configured}, Hedera={pipeline.hedera.client is not None}\n")

    # Load all messages
    messages: List[ModeSMessage] = []
    with file_path.open("r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
                msg = ModeSMessage(
                    sensorId=data["sensorId"],
                    icaoAddress=data["icaoAddress"],
                    rawMessage=data["rawMessage"].encode() if isinstance(data["rawMessage"], str) else data["rawMessage"],
                    timestampNs=data["timestampNs"],
                    sensorLocation=SensorLocation(**data["sensorLocation"]),
                )
                messages.append(msg)
            except Exception as e:
                print(f"WARN: Skipping line {line_num}: {e}")

    print(f"Loaded {len(messages)} messages\n")

    if not messages:
        print("No valid messages to replay")
        return

    # Group by ICAO
    icao_groups: dict[str, List[ModeSMessage]] = {}
    for msg in messages:
        icao_groups.setdefault(msg.icaoAddress, []).append(msg)

    print(f"Found {len(icao_groups)} unique aircraft\n")

    # Process each aircraft
    total_processed = 0
    total_success = 0

    for icao, icao_messages in icao_groups.items():
        print(f"Processing {icao} ({len(icao_messages)} messages)...")

        # Process in batches
        for i in range(0, len(icao_messages), batch_size):
            batch = icao_messages[i:i + batch_size]

            request = MLATProcessRequest(
                icaoAddress=icao,
                messages=batch,
                timeWindowMs=2000,
            )

            response = await pipeline.process_mlat(request)
            total_processed += 1

            if response.success:
                total_success += 1
                pos = response.position
                print(f"  ✓ Solution: {pos.latitude:.4f}, {pos.longitude:.4f} | "
                      f"Confidence: {pos.confidenceScore:.1f}% | "
                      f"Sensors: {pos.sensorCount} | "
                      f"HCS: #{pos.hederaSequenceNumber or 'N/A'}")
            else:
                print(f"  ✗ {response.message}")

    print(f"\n=== Replay Complete ===")
    print(f"Total requests: {total_processed}")
    print(f"Successful MLAT: {total_success}")
    print(f"Success rate: {total_success / total_processed * 100:.1f}%")


async def generate_sample_data(output_path: Path, num_aircraft: int = 3, messages_per_aircraft: int = 20) -> None:
    """Generate sample Mode-S data file for testing."""
    import random
    from datetime import datetime, timezone

    supabase = SupabaseService()
    sensors = supabase.get_active_sensors(minutes=999999) if supabase.is_configured else []

    if not sensors:
        print("No sensors found in Supabase, using synthetic sensor locations")
        sensors = [
            {"sensor_id": f"sensor_{i}", "location": f"POINT({10 + i * 0.1} {50 + i * 0.1})"}
            for i in range(5)
        ]

    print(f"Generating sample data with {num_aircraft} aircraft, {messages_per_aircraft} messages each...")

    with output_path.open("w", encoding="utf-8") as f:
        for aircraft_idx in range(num_aircraft):
            icao = f"A{aircraft_idx:05d}"
            base_time = int(datetime.now(timezone.utc).timestamp() * 1_000_000_000)

            for msg_idx in range(messages_per_aircraft):
                # Pick random sensor
                sensor = random.choice(sensors)
                sensor_id = sensor["sensor_id"]

                # Parse sensor location
                location_str = sensor.get("location", "POINT(10.0 50.0)")
                try:
                    match = location_str.split("(")[1].split(")")[0].split()
                    lon, lat = float(match[0]), float(match[1])
                except (IndexError, ValueError):
                    lon, lat = 10.0 + aircraft_idx * 0.1, 50.0 + aircraft_idx * 0.1

                message_data = {
                    "sensorId": sensor_id,
                    "icaoAddress": icao,
                    "rawMessage": f"SYNTHETIC_{icao}_{sensor_id}_{msg_idx}",
                    "timestampNs": base_time + (msg_idx * 500_000_000),  # 500ms intervals
                    "sensorLocation": {
                        "latitude": lat,
                        "longitude": lon,
                        "altitudeMeters": 100.0,
                    }
                }

                f.write(json.dumps(message_data) + "\n")

    print(f"Sample data written to: {output_path}")


async def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Replay Mode-S messages for MLAT testing")
    parser.add_argument("--file", type=Path, help="NDJSON file to replay")
    parser.add_argument("--generate", type=Path, help="Generate sample data to this file")
    parser.add_argument("--aircraft", type=int, default=3, help="Number of aircraft for sample data")
    parser.add_argument("--messages", type=int, default=20, help="Messages per aircraft for sample data")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch size for processing")

    args = parser.parse_args()

    if args.generate:
        await generate_sample_data(args.generate, args.aircraft, args.messages)
    elif args.file:
        await replay_from_file(args.file, args.batch_size)
    else:
        print("ERROR: Specify --file to replay or --generate to create sample data")
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())
