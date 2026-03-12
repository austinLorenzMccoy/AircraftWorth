"""
Hedera Logger Client - HCS and HTS operations

This module wraps the existing HederaService with a cleaner SDK-ready interface.
"""
import json
from typing import Dict, Any, Optional
from .models import HCSLogResult, HTSMintResult


class HederaLogger:
    """
    Client for logging MLAT data to Hedera network
    
    Args:
        operator_id: Hedera account ID (e.g., "0.0.123456")
        operator_key: Hedera private key (DER encoded hex string)
        network: Hedera network ("mainnet" or "testnet")
        
    Example:
        logger = HederaLogger(
            operator_id=os.getenv("HEDERA_OPERATOR_ID"),
            operator_key=os.getenv("HEDERA_OPERATOR_KEY"),
            network="testnet"
        )
        
        result = await logger.log_position(
            topic_id="0.0.7968510",
            position_data={
                "icao": "ABC123",
                "lat": 37.7749,
                "lon": -122.4194,
                "confidence": 95
            }
        )
    """
    
    def __init__(
        self,
        operator_id: str,
        operator_key: str,
        network: str = "testnet"
    ):
        self.operator_id = operator_id
        self.operator_key = operator_key
        self.network = network
        self._client = None
    
    async def log_position(
        self,
        topic_id: str,
        position_data: Dict[str, Any]
    ) -> HCSLogResult:
        """
        Log aircraft position to Hedera Consensus Service
        
        Args:
            topic_id: HCS topic ID (e.g., "0.0.7968510")
            position_data: Position data dictionary
            
        Returns:
            HCSLogResult with transaction details
        """
        try:
            # Import here to avoid circular dependency
            from services.hedera_service import HederaService
            
            service = HederaService()
            message = json.dumps(position_data)
            
            result = await service.submit_topic_message(topic_id, message)
            
            return HCSLogResult(
                success=True,
                topic_id=topic_id,
                sequence_number=result.get("sequence_number"),
                transaction_id=result.get("transaction_id"),
                consensus_timestamp=result.get("consensus_timestamp")
            )
            
        except Exception as e:
            return HCSLogResult(
                success=False,
                topic_id=topic_id,
                error=str(e)
            )
    
    async def mint_flight_track_token(
        self,
        token_id: str,
        metadata: Dict[str, Any]
    ) -> HTSMintResult:
        """
        Mint a flight track NFT via Hedera Token Service
        
        Args:
            token_id: HTS token ID (e.g., "0.0.123456")
            metadata: Token metadata dictionary
            
        Returns:
            HTSMintResult with minting details
        """
        try:
            from services.hedera_service import HederaService
            
            service = HederaService()
            metadata_bytes = json.dumps(metadata).encode('utf-8')
            
            result = await service.mint_token(token_id, metadata_bytes)
            
            return HTSMintResult(
                success=True,
                token_id=token_id,
                serial_number=result.get("serial_number"),
                transaction_id=result.get("transaction_id")
            )
            
        except Exception as e:
            return HTSMintResult(
                success=False,
                token_id=token_id,
                error=str(e)
            )
    
    async def log_batch(
        self,
        topic_id: str,
        positions: list[Dict[str, Any]]
    ) -> list[HCSLogResult]:
        """
        Log multiple positions in batch
        
        Args:
            topic_id: HCS topic ID
            positions: List of position data dictionaries
            
        Returns:
            List of HCSLogResult for each position
        """
        results = []
        for position in positions:
            result = await self.log_position(topic_id, position)
            results.append(result)
        return results
