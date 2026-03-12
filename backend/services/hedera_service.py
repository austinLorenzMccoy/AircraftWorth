import asyncio
import logging
import os
import uuid

from hedera import (
    Client,
    PrivateKey,
    AccountId,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenType,
    TokenSupplyType,
)


logger = logging.getLogger(__name__)

_fallback_sequence = 1


def _account_id_from_string(value: str) -> AccountId:
    if hasattr(AccountId, "from_string"):
        return AccountId.from_string(value)
    if hasattr(AccountId, "fromString"):
        return AccountId.fromString(value)
    raise AttributeError("AccountId parsing method not found")


def _private_key_from_string(value: str) -> PrivateKey:
    if hasattr(PrivateKey, "from_string"):
        return PrivateKey.from_string(value)
    if hasattr(PrivateKey, "fromString"):
        return PrivateKey.fromString(value)
    raise AttributeError("PrivateKey parsing method not found")


def _call_setter(obj, snake_name: str, camel_name: str, *args, **kwargs):
    method = getattr(obj, snake_name, None)
    if method is None:
        method = getattr(obj, camel_name)
    return method(*args, **kwargs)


class HederaService:
    def __init__(self):
        self.client = None
        operator_id = os.getenv("HEDERA_OPERATOR_ID")
        operator_key = os.getenv("HEDERA_OPERATOR_KEY")

        client_ctor = getattr(Client, "for_testnet", None) or getattr(Client, "forTestnet", None)

        if operator_id and operator_key and client_ctor:
            try:
                client = client_ctor()
                # Try both method naming conventions (SDK version compatibility)
                try:
                    client.set_operator(_account_id_from_string(operator_id), _private_key_from_string(operator_key))
                except AttributeError:
                    client.setOperator(_account_id_from_string(operator_id), _private_key_from_string(operator_key))
                self.client = client
                logger.info(f"Hedera client initialized for operator {operator_id}")
            except Exception as exc:
                logger.warning("Failed to initialize Hedera client, falling back to stub mode: %s", exc)
        else:
            logger.info("Hedera credentials not fully provided – running in stub mode.")

    async def log_evaluation(self, evaluation: dict) -> int:
        topic_id_str = os.getenv("HCS_TOPIC_ID")
        message = str(evaluation)

        if not self.client or not topic_id_str:
            return self._fallback_sequence()

        # Parse topic ID from string
        from hedera import TopicId
        topic_id = TopicId.fromString(topic_id_str) if hasattr(TopicId, 'fromString') else TopicId.from_string(topic_id_str)

        transaction = TopicMessageSubmitTransaction()
        _call_setter(transaction, "set_topic_id", "setTopicId", topic_id)
        _call_setter(transaction, "set_message", "setMessage", message)

        # Execute synchronously (Java SDK doesn't support Python async)
        def _execute_sync():
            try:
                tx_response = transaction.execute(self.client)
            except AttributeError:
                # Try camelCase variant
                tx_response = transaction.execute(self.client)
            
            try:
                receipt = tx_response.getReceipt(self.client)
            except AttributeError:
                receipt = tx_response.get_receipt(self.client)
            
            return receipt.topicSequenceNumber if hasattr(receipt, 'topicSequenceNumber') else receipt.topic_sequence_number
        
        return await asyncio.to_thread(_execute_sync)

    async def mint_skill_token(self, user_id: str, skill_worth: int) -> str:
        token_id_str = os.getenv("SWT_TOKEN_ID")

        if not self.client or not token_id_str:
            return self._fallback_token_id()

        # Parse token ID from string
        from hedera import TokenId
        token_id = TokenId.fromString(token_id_str) if hasattr(TokenId, 'fromString') else TokenId.from_string(token_id_str)

        account_id = _account_id_from_string(user_id)

        transaction = TokenMintTransaction()
        _call_setter(transaction, "set_token_id", "setTokenId", token_id)
        _call_setter(transaction, "set_amount", "setAmount", skill_worth)

        # Execute synchronously (Java SDK doesn't support Python async)
        def _execute_sync():
            try:
                tx_response = transaction.execute(self.client)
            except AttributeError:
                tx_response = transaction.execute(self.client)
            
            try:
                receipt = tx_response.getReceipt(self.client)
            except AttributeError:
                receipt = tx_response.get_receipt(self.client)
            
            token_id_result = receipt.tokenId if hasattr(receipt, 'tokenId') else receipt.token_id
            return str(token_id_result)
        
        return await asyncio.to_thread(_execute_sync)

    async def create_skill_token(self) -> str:
        operator_id = os.getenv("HEDERA_OPERATOR_ID")
        operator_key = os.getenv("HEDERA_OPERATOR_KEY")

        if not self.client:
            return self._fallback_token_id()

        transaction = TokenCreateTransaction()
        _call_setter(transaction, "set_token_name", "setTokenName", "Skill Worth Token")
        _call_setter(transaction, "set_token_symbol", "setTokenSymbol", "SWT")
        _call_setter(transaction, "set_token_type", "setTokenType", TokenType.FUNGIBLE_COMMON)
        _call_setter(transaction, "set_decimals", "setDecimals", 2)
        _call_setter(transaction, "set_initial_supply", "setInitialSupply", 0)
        _call_setter(transaction, "set_treasury_account_id", "setTreasuryAccountId", _account_id_from_string(operator_id))
        _call_setter(transaction, "set_admin_key", "setAdminKey", _private_key_from_string(operator_key))
        _call_setter(transaction, "set_supply_key", "setSupplyKey", _private_key_from_string(operator_key))
        _call_setter(transaction, "set_supply_type", "setSupplyType", TokenSupplyType.INFINITE)

        tx_response = await transaction.execute_async(self.client)
        receipt = await tx_response.get_receipt_async(self.client)
        return str(receipt.token_id)

    def _fallback_sequence(self) -> int:
        global _fallback_sequence
        seq = _fallback_sequence
        _fallback_sequence += 1
        return seq

    def _fallback_token_id(self) -> str:
        return f"SWT-LOCAL-{uuid.uuid4().hex[:8]}"
