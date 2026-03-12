#!/usr/bin/env python3
"""Seed sensor metadata into Supabase using location-override.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_ROOT))

from models import SensorLocation, SensorMetadata  # type: ignore
from services.supabase_service import SupabaseService  # type: ignore

DEFAULT_LOCATION_FILE = Path(__file__).resolve().parents[1] / "location-override.json"


def load_location_file(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Location file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    load_dotenv(BACKEND_ROOT / ".env")
    location_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_LOCATION_FILE
    sensors = load_location_file(location_path)

    supabase = SupabaseService(use_service_role=True)
    if not supabase.is_configured:
        print("Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
        return

    inserted = 0
    for entry in sensors:
        metadata = SensorMetadata(
            sensorId=entry["public_key"],
            name=entry.get("name"),
            location=SensorLocation(
                latitude=entry["lat"],
                longitude=entry["lon"],
                altitudeMeters=entry.get("alt"),
            ),
        )
        supabase.upsert_sensor_metadata(metadata)
        inserted += 1

    print(f"Seeded {inserted} sensors from {location_path}")


if __name__ == "__main__":
    main()
