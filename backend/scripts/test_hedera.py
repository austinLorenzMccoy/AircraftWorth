#!/usr/bin/env python3
"""Test Hedera HCS and HTS integration with real testnet transactions."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")

from services.hedera_service import HederaService


async def test_hcs_logging() -> None:
    """Test HCS topic message submission."""
    print("=== Testing Hedera HCS Logging ===\n")
    
    hedera = HederaService()
    
    if not hedera.client:
        print("❌ Hedera client not initialized. Check credentials in .env")
        return
    
    print("✅ Hedera client initialized successfully\n")
    
    # Test MLAT log payload
    test_payload = {
        "type": "mlat_position",
        "icao": "TEST01",
        "latitude": 50.1234,
        "longitude": 10.5678,
        "altitude_ft": 35000,
        "confidence": 92.5,
        "sensor_count": 5,
        "sensor_ids": ["sensor1", "sensor2", "sensor3", "sensor4", "sensor5"],
        "calculation_method": "TDOA",
        "timestamp": "2026-02-19T16:00:00Z",
    }
    
    print("Submitting test MLAT log to HCS...")
    print(f"Payload: {test_payload}\n")
    
    try:
        sequence_number = await hedera.log_evaluation(test_payload)
        print(f"✅ HCS Log Success!")
        print(f"   Topic ID: {hedera.client and 'configured' or 'N/A'}")
        print(f"   Sequence Number: {sequence_number}")
        print(f"\n📋 View on HashScan:")
        import os
        topic_id = os.getenv("HCS_TOPIC_ID")
        if topic_id:
            print(f"   https://hashscan.io/testnet/topic/{topic_id}")
        return sequence_number
    except Exception as e:
        print(f"❌ HCS Log Failed: {e}")
        return None


async def test_hts_minting() -> None:
    """Test HTS token minting."""
    print("\n=== Testing Hedera HTS Token Minting ===\n")
    
    hedera = HederaService()
    
    if not hedera.client:
        print("❌ Hedera client not initialized. Check credentials in .env")
        return
    
    import os
    operator_id = os.getenv("HEDERA_OPERATOR_ID")
    
    print("Minting Flight Track Token...")
    print(f"Recipient: {operator_id}")
    print(f"Amount: 95 (confidence score)\n")
    
    try:
        token_id = await hedera.mint_skill_token(
            user_id=operator_id,
            skill_worth=95
        )
        print(f"✅ HTS Mint Success!")
        print(f"   Token ID: {token_id}")
        print(f"\n📋 View on HashScan:")
        print(f"   https://hashscan.io/testnet/token/{token_id}")
        return token_id
    except Exception as e:
        print(f"❌ HTS Mint Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def main() -> None:
    print("=" * 60)
    print("Hedera Integration Test")
    print("=" * 60 + "\n")
    
    # Test HCS
    hcs_seq = await test_hcs_logging()
    
    # Test HTS
    hts_token = await test_hts_minting()
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"HCS Logging: {'✅ PASS' if hcs_seq else '❌ FAIL'}")
    print(f"HTS Minting: {'✅ PASS' if hts_token else '❌ FAIL'}")
    
    if hcs_seq and hts_token:
        print("\n🎉 All Hedera integrations working!")
        print("\n📝 Save these for submission proof:")
        print(f"   HCS Sequence: {hcs_seq}")
        print(f"   HTS Token: {hts_token}")
    else:
        print("\n⚠️  Some tests failed. Check error messages above.")


if __name__ == "__main__":
    asyncio.run(main())
