# Hedera Logger

Hedera Consensus Service (HCS) and Hedera Token Service (HTS) integration for MLAT data logging.

## Features

- **HCS Logging**: Submit aircraft positions to Hedera Consensus Service topics
- **HTS Minting**: Mint flight track NFTs via Hedera Token Service
- **Batch Operations**: Log multiple positions efficiently
- **Async Support**: Full async/await support for non-blocking operations

## Usage

```python
from hedera_logger import HederaLogger
import os

# Initialize logger
logger = HederaLogger(
    operator_id=os.getenv("HEDERA_OPERATOR_ID"),
    operator_key=os.getenv("HEDERA_OPERATOR_KEY"),
    network="testnet"
)

# Log a single position
result = await logger.log_position(
    topic_id="0.0.7968510",
    position_data={
        "icao": "ABC123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "altitude_ft": 35000,
        "confidence": 95,
        "timestamp": "2024-01-20T12:00:00Z"
    }
)

if result.success:
    print(f"Logged to HCS: {result.sequence_number}")
    print(f"Transaction: {result.transaction_id}")
else:
    print(f"Error: {result.error}")

# Mint flight track NFT
mint_result = await logger.mint_flight_track_token(
    token_id="0.0.123456",
    metadata={
        "icao": "ABC123",
        "route": "SFO-LAX",
        "positions_count": 150,
        "duration_minutes": 90
    }
)

# Batch logging
positions = [pos1_data, pos2_data, pos3_data]
results = await logger.log_batch(
    topic_id="0.0.7968510",
    positions=positions
)
```

## Models

### HCSLogResult
- `success`: Whether the operation succeeded
- `topic_id`: HCS topic ID
- `sequence_number`: Message sequence number in topic
- `transaction_id`: Hedera transaction ID
- `consensus_timestamp`: Consensus timestamp
- `error`: Error message (if failed)

### HTSMintResult
- `success`: Whether minting succeeded
- `token_id`: HTS token ID
- `serial_number`: NFT serial number
- `transaction_id`: Hedera transaction ID
- `error`: Error message (if failed)

## Configuration

Set these environment variables:

```bash
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_KEY=302e...
HCS_TOPIC_ID=0.0.7968510
```

## Future Enhancements

- [ ] Automatic retry logic with exponential backoff
- [ ] Transaction batching for cost optimization
- [ ] Support for scheduled transactions
- [ ] Mirror node query integration
- [ ] Transaction receipt caching
