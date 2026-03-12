#!/usr/bin/env python3
"""Apply Supabase schema using service role key for DDL operations."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

SCHEMA_FILE = BACKEND_ROOT / "supabase" / "schema.sql"


def main() -> None:
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    if not SCHEMA_FILE.exists():
        print(f"ERROR: Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)

    print(f"Reading schema from: {SCHEMA_FILE}")
    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")

    print(f"Connecting to Supabase: {url}")
    client: Client = create_client(url, service_key)

    print("Applying schema via Supabase REST API...")
    try:
        # Execute raw SQL using Supabase RPC or direct PostgREST query
        # Note: Supabase Python SDK doesn't expose direct SQL execution
        # We'll use the rpc method if available, or provide instructions
        
        print("\n" + "="*70)
        print("MANUAL STEP REQUIRED:")
        print("="*70)
        print("\nThe Supabase Python SDK doesn't support direct SQL execution.")
        print("Please apply the schema manually using one of these methods:\n")
        print("1. Supabase Dashboard SQL Editor:")
        print(f"   - Go to: {url.replace('https://', 'https://supabase.com/dashboard/project/')}/sql")
        print(f"   - Paste contents of: {SCHEMA_FILE}")
        print("   - Click 'Run'\n")
        print("2. Using psql CLI:")
        print("   - Get connection string from Supabase dashboard")
        print(f"   - Run: psql <connection_string> -f {SCHEMA_FILE}\n")
        print("3. Using Supabase CLI:")
        print(f"   - Run: supabase db push\n")
        print("="*70)
        print("\nSchema SQL preview (first 500 chars):")
        print("-"*70)
        print(schema_sql[:500])
        print("...")
        print("-"*70)
        
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
