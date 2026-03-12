"""
Data models for Hedera logging operations
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class HCSLogResult:
    """Result from logging a message to Hedera Consensus Service"""
    success: bool
    topic_id: str
    sequence_number: Optional[int] = None
    transaction_id: Optional[str] = None
    consensus_timestamp: Optional[str] = None
    error: Optional[str] = None


@dataclass
class HTSMintResult:
    """Result from minting a token via Hedera Token Service"""
    success: bool
    token_id: str
    serial_number: Optional[int] = None
    transaction_id: Optional[str] = None
    error: Optional[str] = None
