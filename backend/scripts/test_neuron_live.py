#!/usr/bin/env python3
"""
Test live Neuron sensor stream connectivity.
Run: python backend/scripts/test_neuron_live.py
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from neuron_client import NeuronClient, NeuronClientConfig
except ImportError:
    print("❌ neuron_client not installed. Run: pip install aircraftworth-neuron")
    exit(1)

async def test():
    """Test live Neuron connection and stream."""
    
    # Check environment variables
    buyer_account_id = os.getenv("NEURON_BUYER_ACCOUNT_ID")
    buyer_private_key = os.getenv("NEURON_BUYER_PRIVATE_KEY")
    sensor_ids_str = os.getenv("NEURON_SENSOR_IDS", "")
    
    if not buyer_account_id or not buyer_private_key:
        print("❌ Missing NEURON_BUYER_ACCOUNT_ID or NEURON_BUYER_PRIVATE_KEY in .env")
        print("💡 Get credentials from: https://discord.gg/PeAbrrrq7Z")
        return
    
    sensor_ids = [sid.strip() for sid in sensor_ids_str.split(',') if sid.strip()]
    if not sensor_ids:
        print("❌ No sensor IDs found in NEURON_SENSOR_IDS")
        return
    
    print("🔗 Testing live Neuron connection...")
    print(f"   Buyer Account: {buyer_account_id}")
    print(f"   Sensor Count: {len(sensor_ids)}")
    print(f"   Network: testnet")
    
    try:
        # Initialize Neuron client
        config = NeuronClientConfig(
            buyer_account_id=buyer_account_id,
            buyer_private_key=buyer_private_key,
            sensor_ids=sensor_ids,
            network="testnet",
        )
        
        print("\n📡 Connecting to Neuron network...")
        
        async with NeuronClient(config) as client:
            print(f"✅ Connected! Online sensors: {client.online_sensor_count}")
            
            if client.online_sensor_count == 0:
                print("⚠️  No sensors online. This could mean:")
                print("   - Sensor IDs are incorrect")
                print("   - Sensors are offline")
                print("   - Network connectivity issues")
                return
            
            print(f"\n📨 Listening for messages (10 second test)...")
            message_count = 0
            icao_set = set()
            
            # Listen for messages for 10 seconds
            try:
                async for msg in client.stream_messages():
                    print(f"   [{msg.sensor_id[:8]}...] ICAO={msg.icao_address} ts={msg.timestamp_ns}")
                    message_count += 1
                    icao_set.add(msg.icao_address)
                    
                    if message_count >= 10:  # Stop after 10 messages
                        break
                        
            except asyncio.TimeoutError:
                print("⏰ Timeout - no messages received in 10 seconds")
            
            print(f"\n📊 Test Results:")
            print(f"   Messages received: {message_count}")
            print(f"   Unique aircraft: {len(icao_set)}")
            print(f"   Online sensors: {client.online_sensor_count}")
            
            if message_count > 0:
                print(f"   Aircraft tracked: {', '.join(list(icao_set)[:5])}")
                if len(icao_set) > 5:
                    print(f"   ... and {len(icao_set) - 5} more")
                
                print("\n✅ Live stream confirmed - working end-to-end!")
                print("🎯 Your Neuron integration is ready for production!")
            else:
                print("\n⚠️  No messages received. Possible causes:")
                print("   - Low air traffic in your area")
                print("   - Sensor coverage issues")
                print("   - Time of day (less traffic at night)")
                print("   - Network connectivity problems")
    
    except Exception as e:
        print(f"❌ Neuron connection failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check if credentials are correct")
        print("   2. Verify sensor IDs are current")
        print("   3. Check network connectivity")
        print("   4. Try getting fresh credentials from Discord")

def main():
    """Main function."""
    print("=" * 60)
    print("🛩️  AircraftWorth - Live Neuron Stream Test")
    print("=" * 60)
    
    asyncio.run(test())
    
    print("\n" + "=" * 60)
    print("📋 Next steps:")
    print("1. If successful: Your live stream is ready!")
    print("2. If failed: Get fresh credentials from Discord")
    print("3. Update your demo script with live data")
    print("=" * 60)

if __name__ == "__main__":
    main()
