"""
AircraftWorth Smart Contract Integration for Neuron Client

This module provides Python interfaces for interacting with AircraftWorth
smart contracts specifically for Neuron network operations.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

@dataclass
class NeuronContractConfig:
    """Configuration for Neuron contract integration"""
    client: Any
    marketplace_address: str = "0.0.7324974"
    escrow_address: str = "0.0.7324975"
    reputation_address: str = "0.0.7324976"
    buyer_account_id: str = "0.0.7973782"
    auto_purchase: bool = True
    max_purchase_amount: float = 10.0  # HBAR

class NeuronContractIntegration:
    """
    Neuron-specific smart contract integration
    
    This class handles contract interactions for the Neuron network,
    including automatic data purchases and reputation management.
    """
    
    def __init__(self, config: NeuronContractConfig):
        """
        Initialize Neuron contract integration
        
        Args:
            config: Neuron contract configuration
        """
        self.config = config
        self.client = config.client
        self._active_purchases = {}
        self._reputation_cache = {}
        
    async def auto_purchase_data(self, offering_id: int, max_price: float) -> Dict[str, Any]:
        """
        Automatically purchase data if within price limits
        
        Args:
            offering_id: ID of the offering to purchase
            max_price: Maximum price willing to pay in HBAR
            
        Returns:
            Purchase result
        """
        try:
            # Check if we've already purchased this offering
            if offering_id in self._active_purchases:
                logger.info(f"Already purchased offering {offering_id}")
                return {
                    "success": False,
                    "error": "Already purchased",
                    "offering_id": offering_id
                }
            
            # This would interact with the AircraftMarketplace contract
            # For now, simulate purchase
            purchase_amount = min(max_price, self.config.max_purchase_amount)
            
            # Create purchase record
            purchase_id = hash(f"{offering_id}_{purchase_amount}_{int(time.time())}") & 0xFFFFFFFF
            
            self._active_purchases[offering_id] = {
                "purchase_id": purchase_id,
                "amount": purchase_amount,
                "timestamp": int(time.time()),
                "status": "pending"
            }
            
            logger.info(f"Auto-purchased offering {offering_id} for {purchase_amount} HBAR")
            
            return {
                "success": True,
                "purchase_id": purchase_id,
                "offering_id": offering_id,
                "amount": purchase_amount,
                "buyer": self.config.buyer_account_id,
                "transaction_id": f"0.0.{purchase_id}",
                "contract": self.config.marketplace_address
            }
            
        except Exception as e:
            logger.error(f"Failed to auto-purchase offering {offering_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "offering_id": offering_id
            }
    
    async def submit_sensor_review(self, operator: str, quality_score: int, reliability_score: int) -> Dict[str, Any]:
        """
        Submit a review for a sensor operator based on data quality
        
        Args:
            operator: Hedera account ID of the sensor operator
            quality_score: Data quality score (1-5)
            reliability_score: Reliability score (1-5)
            
        Returns:
            Review submission result
        """
        try:
            # Calculate overall rating
            overall_rating = (quality_score + reliability_score) // 2
            
            # Generate review comment
            if overall_rating >= 4:
                comment = f"Excellent sensor data quality and reliability. Quality: {quality_score}/5, Reliability: {reliability_score}/5"
            elif overall_rating >= 3:
                comment = f"Good sensor data with some inconsistencies. Quality: {quality_score}/5, Reliability: {reliability_score}/5"
            else:
                comment = f"Poor sensor data quality or reliability issues. Quality: {quality_score}/5, Reliability: {reliability_score}/5"
            
            # This would interact with the ReputationSystem contract
            review_id = hash(json.dumps({
                "operator": operator,
                "rating": overall_rating,
                "comment": comment,
                "quality_score": quality_score,
                "reliability_score": reliability_score,
                "timestamp": int(time.time())
            })) & 0xFFFFFFFF
            
            logger.info(f"Submitted review {review_id} for operator {operator}: {overall_rating}/5 stars")
            
            return {
                "success": True,
                "review_id": review_id,
                "operator": operator,
                "rating": overall_rating,
                "quality_score": quality_score,
                "reliability_score": reliability_score,
                "comment": comment,
                "transaction_id": f"0.0.{review_id}",
                "contract": self.config.reputation_address
            }
            
        except Exception as e:
            logger.error(f"Failed to submit review for operator {operator}: {e}")
            return {
                "success": False,
                "error": str(e),
                "operator": operator
            }
    
    async def get_operator_trust_status(self, operator: str) -> Dict[str, Any]:
        """
        Get comprehensive trust status for an operator
        
        Args:
            operator: Hedera account ID of the operator
            
        Returns:
            Trust status with detailed information
        """
        try:
            # Check cache first
            if operator in self._reputation_cache:
                cache_time = self._reputation_cache[operator]["timestamp"]
                if int(time.time()) - cache_time < 300:  # 5 minute cache
                    return self._reputation_cache[operator]["data"]
            
            # This would query the ReputationSystem contract
            # For now, simulate reputation data
            reputation_score = 650 + (hash(operator) % 350)  # 650-1000 range
            
            is_trusted = reputation_score >= 700
            tier = "Platinum" if reputation_score >= 900 else "Gold" if reputation_score >= 700 else "Silver" if reputation_score >= 500 else "Bronze"
            
            trust_status = {
                "operator": operator,
                "reputation_score": reputation_score,
                "is_trusted": is_trusted,
                "tier": tier,
                "review_count": 10 + (hash(operator) % 100),
                "successful_transactions": 8 + (hash(operator) % 50),
                "failed_transactions": (hash(operator) % 10),
                "last_updated": int(time.time()),
                "recommendation": "trusted" if is_trusted else "caution"
            }
            
            # Cache result
            self._reputation_cache[operator] = {
                "data": trust_status,
                "timestamp": int(time.time())
            }
            
            logger.info(f"Retrieved trust status for operator {operator}: {tier} tier")
            return trust_status
            
        except Exception as e:
            logger.error(f"Failed to get trust status for operator {operator}: {e}")
            return {
                "operator": operator,
                "error": str(e),
                "is_trusted": False,
                "recommendation": "error"
            }
    
    async def monitor_purchases(self) -> List[Dict[str, Any]]:
        """
        Monitor active purchases and update their status
        
        Returns:
            List of purchase updates
        """
        updates = []
        current_time = int(time.time())
        
        for offering_id, purchase in self._active_purchases.items():
            # Simulate purchase completion after 30 seconds
            if current_time - purchase["timestamp"] > 30 and purchase["status"] == "pending":
                purchase["status"] = "completed"
                purchase["completed_at"] = current_time
                
                updates.append({
                    "offering_id": offering_id,
                    "purchase_id": purchase["purchase_id"],
                    "status": "completed",
                    "completed_at": current_time
                })
                
                logger.info(f"Purchase {purchase['purchase_id']} completed for offering {offering_id}")
        
        return updates
    
    async def get_purchase_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get purchase history for the buyer
        
        Args:
            limit: Maximum number of purchases to return
            
        Returns:
            List of purchase records
        """
        try:
            # This would query contract events
            # For now, return mock data
            purchases = []
            for i in range(min(limit, 20)):  # Mock 20 purchases max
                purchase = {
                    "purchase_id": 1000 + i,
                    "offering_id": 2000 + i,
                    "seller": f"0.0.{6324974 + i}",
                    "amount": 1.0 + (i * 0.3),
                    "data_type": "mlat_positions" if i % 2 == 0 else "raw_modes",
                    "status": "completed" if i < 15 else "pending",
                    "created_at": int(time.time()) - (i * 7200),  # 2 hour intervals
                    "completed_at": int(time.time()) - (i * 7200) if i < 15 else None
                }
                purchases.append(purchase)
            
            logger.info(f"Retrieved {len(purchases)} purchase records")
            return purchases
            
        except Exception as e:
            logger.error(f"Failed to get purchase history: {e}")
            return []
    
    def get_active_purchases_count(self) -> int:
        """Get number of active purchases"""
        return len([p for p in self._active_purchases.values() if p["status"] == "pending"])
    
    def clear_cache(self) -> None:
        """Clear reputation cache"""
        self._reputation_cache.clear()
        logger.info("Cleared reputation cache")

# Utility functions for Neuron contract integration
import time

def create_neuron_config(
    client: Any,
    buyer_account_id: str = "0.0.7973782",
    auto_purchase: bool = True,
    max_purchase_amount: float = 10.0
) -> NeuronContractConfig:
    """Helper function to create NeuronContractConfig"""
    return NeuronContractConfig(
        client=client,
        buyer_account_id=buyer_account_id,
        auto_purchase=auto_purchase,
        max_purchase_amount=max_purchase_amount
    )

def calculate_quality_score(
    data_accuracy: float,
    update_frequency: float,
    signal_strength: float
) -> int:
    """
    Calculate quality score based on data metrics
    
    Args:
        data_accuracy: Accuracy percentage (0-100)
        update_frequency: Updates per minute
        signal_strength: Signal strength (0-100)
        
    Returns:
        Quality score (1-5)
    """
    # Normalize metrics to 0-1 range
    accuracy_score = min(data_accuracy / 100, 1.0)
    frequency_score = min(update_frequency / 10, 1.0)  # 10 updates/min = perfect
    signal_score = min(signal_strength / 100, 1.0)
    
    # Calculate weighted average
    weighted_score = (accuracy_score * 0.4 + frequency_score * 0.3 + signal_score * 0.3)
    
    # Convert to 1-5 scale
    return max(1, min(5, int(weighted_score * 5) + 1))

def calculate_reliability_score(
    uptime_percentage: float,
    error_rate: float,
    response_time: float
) -> int:
    """
    Calculate reliability score based on performance metrics
    
    Args:
        uptime_percentage: Uptime percentage (0-100)
        error_rate: Error rate percentage (0-100)
        response_time: Response time in milliseconds
        
    Returns:
        Reliability score (1-5)
    """
    # Normalize metrics
    uptime_score = uptime_percentage / 100
    error_score = max(0, 1 - (error_rate / 100))
    response_score = max(0, 1 - (response_time / 1000))  # 1s = poor, 0ms = perfect
    
    # Calculate weighted average
    weighted_score = (uptime_score * 0.5 + error_score * 0.3 + response_score * 0.2)
    
    # Convert to 1-5 scale
    return max(1, min(5, int(weighted_score * 5) + 1))
