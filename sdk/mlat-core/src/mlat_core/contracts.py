"""
AircraftWorth Smart Contract Integration for MLAT Core

This module provides Python interfaces for interacting with AircraftWorth
smart contracts on Hedera network.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json
import logging

logger = logging.getLogger(__name__)

@dataclass
class ContractAddresses:
    """Hedera contract addresses for AircraftWorth marketplace"""
    marketplace: str = "0.0.7324974"
    escrow: str = "0.0.7324975"
    reputation: str = "0.0.7324976"

@dataclass
class OfferingData:
    """Data structure for marketplace offerings"""
    price: float  # in HBAR
    data_type: str  # "raw_modes", "mlat_positions", "both"
    duration: int  # in seconds
    description: str
    min_confidence: Optional[int] = None
    min_sensors: Optional[int] = None
    max_purchases: Optional[int] = None

@dataclass
class ReviewData:
    """Data structure for operator reviews"""
    operator: str  # Hedera account ID
    rating: int  # 1-5 stars
    comment: str

@dataclass
class ReputationScore:
    """Operator reputation score"""
    total_score: int
    review_count: int
    successful_transactions: int
    failed_transactions: int
    last_updated: int
    last_reason: str

class AircraftWorthContracts:
    """
    Python interface for AircraftWorth smart contracts
    
    This class provides methods to interact with the marketplace, escrow,
    and reputation contracts on Hedera network.
    """
    
    def __init__(self, client: Any, addresses: Optional[ContractAddresses] = None):
        """
        Initialize contract interface
        
        Args:
            client: Hedera client instance
            addresses: Contract addresses (uses testnet defaults if None)
        """
        self.client = client
        self.addresses = addresses or ContractAddresses()
        self._contracts = {}
        
    async def create_offering(self, data: OfferingData) -> Dict[str, Any]:
        """
        Create a new data offering on marketplace
        
        Args:
            data: Offering data including price, duration, etc.
            
        Returns:
            Transaction result with offering ID
        """
        try:
            # This would interact with the AircraftMarketplace contract
            # For now, return mock result
            offering_id = hash(json.dumps({
                "price": data.price,
                "data_type": data.data_type,
                "duration": data.duration,
                "description": data.description,
                "timestamp": int(time.time())
            })) & 0xFFFFFFFF
            
            logger.info(f"Created offering {offering_id} for {data.data_type}")
            
            return {
                "success": True,
                "offering_id": offering_id,
                "transaction_id": f"0.0.{offering_id}",
                "contract": self.addresses.marketplace
            }
            
        except Exception as e:
            logger.error(f"Failed to create offering: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def purchase_offering(self, offering_id: int, amount: float) -> Dict[str, Any]:
        """
        Purchase a data offering
        
        Args:
            offering_id: ID of the offering to purchase
            amount: Amount in HBAR to pay
            
        Returns:
            Transaction result with purchase ID
        """
        try:
            # This would interact with the AircraftMarketplace contract
            purchase_id = hash(f"{offering_id}_{int(time.time())}") & 0xFFFFFFFF
            
            logger.info(f"Purchased offering {offering_id} for {amount} HBAR")
            
            return {
                "success": True,
                "purchase_id": purchase_id,
                "offering_id": offering_id,
                "amount": amount,
                "transaction_id": f"0.0.{purchase_id}",
                "contract": self.addresses.marketplace
            }
            
        except Exception as e:
            logger.error(f"Failed to purchase offering {offering_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def submit_review(self, data: ReviewData) -> Dict[str, Any]:
        """
        Submit an operator review
        
        Args:
            data: Review data including operator, rating, and comment
            
        Returns:
            Transaction result with review ID
        """
        try:
            # This would interact with the ReputationSystem contract
            review_id = hash(json.dumps({
                "operator": data.operator,
                "rating": data.rating,
                "comment": data.comment,
                "timestamp": int(time.time())
            })) & 0xFFFFFFFF
            
            logger.info(f"Submitted review {review_id} for operator {data.operator}")
            
            return {
                "success": True,
                "review_id": review_id,
                "operator": data.operator,
                "rating": data.rating,
                "transaction_id": f"0.0.{review_id}",
                "contract": self.addresses.reputation
            }
            
        except Exception as e:
            logger.error(f"Failed to submit review for {data.operator}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_reputation(self, operator: str) -> Optional[ReputationScore]:
        """
        Get operator reputation score
        
        Args:
            operator: Hedera account ID of the operator
            
        Returns:
            Reputation score data or None if not found
        """
        try:
            # This would query the ReputationSystem contract
            # For now, return mock data
            reputation = ReputationScore(
                total_score=750,  # Gold tier
                review_count=42,
                successful_transactions=38,
                failed_transactions=4,
                last_updated=int(time.time()),
                last_reason="Recent successful transactions"
            )
            
            logger.info(f"Retrieved reputation for operator {operator}: {reputation.total_score}")
            return reputation
            
        except Exception as e:
            logger.error(f"Failed to get reputation for {operator}: {e}")
            return None
    
    async def get_active_offerings(self, offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get active marketplace offerings
        
        Args:
            offset: Number of offerings to skip
            limit: Maximum number of offerings to return
            
        Returns:
            List of active offerings
        """
        try:
            # This would query the AircraftMarketplace contract
            # For now, return mock data
            offerings = []
            for i in range(min(limit, 10)):  # Mock 10 offerings max
                offering = {
                    "id": offset + i + 1,
                    "seller": f"0.0.{6324974 + i}",
                    "price": 1.0 + (i * 0.5),
                    "data_type": "mlat_positions" if i % 2 == 0 else "raw_modes",
                    "duration": 86400,  # 24 hours
                    "description": f"High-quality aircraft data offering #{i+1}",
                    "min_confidence": 80 + (i * 2),
                    "min_sensors": 3 + (i % 2),
                    "created_at": int(time.time()) - (i * 3600)
                }
                offerings.append(offering)
            
            logger.info(f"Retrieved {len(offerings)} active offerings")
            return offerings
            
        except Exception as e:
            logger.error(f"Failed to get active offerings: {e}")
            return []
    
    async def is_trusted_operator(self, operator: str) -> bool:
        """
        Check if operator is trusted (high reputation)
        
        Args:
            operator: Hedera account ID of the operator
            
        Returns:
            True if operator is trusted, False otherwise
        """
        try:
            reputation = await self.get_reputation(operator)
            return reputation.total_score >= 700 if reputation else False
            
        except Exception as e:
            logger.error(f"Failed to check if operator {operator} is trusted: {e}")
            return False
    
    def get_contract_addresses(self) -> ContractAddresses:
        """Get current contract addresses"""
        return self.addresses
    
    def update_contract_addresses(self, addresses: ContractAddresses) -> None:
        """Update contract addresses"""
        self.addresses = addresses
        logger.info("Updated contract addresses")

# Utility functions for contract integration
import time

def create_offering_data(
    price: float,
    data_type: str,
    duration: int,
    description: str,
    min_confidence: Optional[int] = None,
    min_sensors: Optional[int] = None
) -> OfferingData:
    """Helper function to create OfferingData"""
    return OfferingData(
        price=price,
        data_type=data_type,
        duration=duration,
        description=description,
        min_confidence=min_confidence,
        min_sensors=min_sensors
    )

def create_review_data(
    operator: str,
    rating: int,
    comment: str
) -> ReviewData:
    """Helper function to create ReviewData"""
    return ReviewData(
        operator=operator,
        rating=rating,
        comment=comment
    )
