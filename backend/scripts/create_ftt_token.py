#!/usr/bin/env python3
"""
Create Flight Track Token (FTT) with supply key for HTS minting.
Run ONCE: python backend/scripts/create_ftt_token.py
"""

import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Import Hedera SDK
try:
    from hedera import (
        Client, 
        AccountId, 
        PrivateKey,
        TokenCreateTransaction, 
        TokenType, 
        TokenSupplyType
    )
except ImportError:
    print("❌ Hedera SDK not installed. Run: pip install hedera-sdk-py")
    exit(1)

async def create_token():
    """Create HTS NFT token with supply key for AircraftWorth."""
    
    # Check environment variables
    operator_id = os.getenv("HEDERA_OPERATOR_ID")
    operator_key = os.getenv("HEDERA_OPERATOR_KEY")
    
    if not operator_id or not operator_key:
        print("❌ Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in .env")
        return
    
    print("🔑 Creating Flight Track Token (FTT)...")
    print(f"   Operator ID: {operator_id}")
    print(f"   Network: testnet")
    
    try:
        # Initialize Hedera client
        client = Client.for_testnet()
        operator_id_obj = AccountId.from_string(operator_id)
        operator_key_obj = PrivateKey.from_string(operator_key)
        client.set_operator(operator_id_obj, operator_key_obj)
        
        # Create token with supply key
        tx = await (
            TokenCreateTransaction()
            .set_token_name("AircraftWorth Flight Track Token")
            .set_token_symbol("FTT")
            .set_token_type(TokenType.NON_FUNGIBLE_UNIQUE)
            .set_supply_type(TokenSupplyType.FINITE)
            .set_max_supply(1_000_000)
            .set_treasury_account_id(operator_id_obj)
            .set_admin_key(operator_key_obj)
            .set_supply_key(operator_key_obj)  # <-- THIS is what was missing
            .set_token_memo("AircraftWorth MLAT position proof NFTs")
            .freeze_with(client)
            .sign(operator_key_obj)
            .execute(client)
        )
        
        receipt = await tx.get_receipt(client)
        token_id = receipt.token_id
        
        print(f"✅ Token created successfully!")
        print(f"   Token ID: {token_id}")
        print(f"   View on HashScan: https://hashscan.io/testnet/token/{token_id}")
        
        # Update .env file
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
        with open(env_file, 'r') as f:
            content = f.read()
        
        # Add or update HTS_TOKEN_ID
        if 'HTS_TOKEN_ID=' in content:
            # Update existing
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith('HTS_TOKEN_ID='):
                    lines[i] = f'HTS_TOKEN_ID={token_id}'
                    break
            content = '\n'.join(lines)
        else:
            # Add new
            content += f'\nHTS_TOKEN_ID={token_id}\n'
        
        with open(env_file, 'w') as f:
            f.write(content)
        
        print(f"✅ Updated .env file with HTS_TOKEN_ID={token_id}")
        
        # Verify token was created
        print(f"\n🔍 Verifying token creation...")
        token_info = await client.get_token_info(token_id)
        print(f"   Token Name: {token_info.token_name}")
        print(f"   Symbol: {token_info.symbol}")
        print(f"   Type: {token_info.token_type}")
        print(f"   Supply Type: {token_info.supply_type}")
        print(f"   Max Supply: {token_info.max_supply}")
        print(f"   Supply Key: {'✅ Set' if token_info.supply_key else '❌ Not set'}")
        
        return token_id
        
    except Exception as e:
        print(f"❌ Failed to create token: {e}")
        return None

def main():
    """Main function."""
    print("=" * 60)
    print("🛩️  AircraftWorth - Flight Track Token Creation")
    print("=" * 60)
    
    token_id = asyncio.run(create_token())
    
    if token_id:
        print("\n🎉 Token creation completed successfully!")
        print("\n📋 Next steps:")
        print("1. Update your MLAT pipeline to use the new token ID")
        print("2. Test NFT minting with high-confidence positions")
        print("3. Verify tokens appear on HashScan")
    else:
        print("\n❌ Token creation failed. Please check the error above.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
