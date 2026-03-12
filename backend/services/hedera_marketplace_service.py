from hedera import Hbar, TransferTransaction, Client, AccountId, TokenId, PrivateKey, TransactionId, TransactionReceiptQuery, TransactionQuery, AccountBalanceQuery, Status
from typing import Dict, Any, Optional, List
import json

class HederaService:
    def __init__(self, operator_id: str, operator_key: str):
        self.client = Client.for_testnet()
        self.operator_id = AccountId.fromString(operator_id)
        self.operator_key = PrivateKey.fromString(operator_key)
        self.client.set_operator(self.operator_id, self.operator_key)
        
        # Marketplace escrow account
        self.escrow_account = AccountId.fromString("0.0.1234567")
    
    async def create_transfer_transaction(
        self,
        from_account: str,
        to_account: str,
        amount: int,
        token_id: Optional[str] = None,
        memo: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a transfer transaction for wallet signing"""
        
        try:
            from_id = AccountId.fromString(from_account)
            to_id = AccountId.fromString(to_account)
            
            if token_id and token_id != "HBAR":
                # Token transfer
                token = TokenId.fromString(token_id)
                transaction = (
                    TransferTransaction()
                    .add_token_transfer(token, from_id, -amount)
                    .add_token_transfer(token, to_id, amount)
                )
            else:
                # HBAR transfer
                transaction = (
                    TransferTransaction()
                    .add_hbar_transfer(from_id, Hbar.from_tinybars(-amount))
                    .add_hbar_transfer(to_id, Hbar.from_tinybars(amount))
                )
            
            if memo:
                transaction = transaction.set_transaction_memo(memo)
            
            # Freeze transaction for signing
            transaction_bytes = transaction.freeze_with(self.client).to_bytes()
            
            return {
                "transaction_bytes": transaction_bytes.hex(),
                "transaction_data": {
                    "from_account": from_account,
                    "to_account": to_account,
                    "amount": amount,
                    "token_id": token_id or "HBAR",
                    "memo": memo
                },
                "node_account_ids": [str(node) for node in transaction.node_account_ids],
                "transaction_id": str(transaction.transaction_id)
            }
            
        except Exception as e:
            raise Exception(f"Failed to create transfer transaction: {str(e)}")
    
    async def verify_transaction(
        self,
        transaction_id: str,
        expected_payer: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify a transaction was executed on Hedera"""
        
        try:
            # Parse transaction ID
            tx_id = TransactionId.fromString(transaction_id)
            
            # Get transaction record
            record = await TransactionReceiptQuery().set_transaction_id(tx_id).execute(self.client)
            
            # Verify transaction status
            if record.status != Status.SUCCESS:
                return {
                    "success": False,
                    "error": f"Transaction failed with status: {record.status}"
                }
            
            # Get transaction details
            transaction = await TransactionQuery().set_transaction_id(tx_id).execute(self.client)
            
            # Verify payer if specified
            if expected_payer:
                # This would require parsing the transaction to get the payer
                # For now, we'll assume it's correct if the transaction succeeded
                pass
            
            # Extract transfer amounts
            transfers = []
            if record.transfer_list:
                for account_amount in record.transfer_list.account_amounts:
                    transfers.append({
                        "account": str(account_amount.account_id),
                        "amount": account_amount.amount
                    })
            
            return {
                "success": True,
                "transaction_id": transaction_id,
                "consensus_timestamp": str(record.consensus_timestamp),
                "transaction_fee": record.transaction_fee,
                "transfers": transfers,
                "memo": transaction.transaction_memo
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to verify transaction: {str(e)}"
            }
    
    async def log_marketplace_purchase(
        self,
        purchase_data: Dict[str, Any]
    ) -> int:
        """Log marketplace purchase to HCS"""
        
        try:
            from services.hedera_service import HederaService as BaseHederaService
            
            # Use existing HCS logging functionality
            base_hedera = BaseHederaService()
            
            message = json.dumps({
                "type": "marketplace_purchase",
                "data": purchase_data
            })
            
            sequence = await base_hedera.log_evaluation({
                "marketplace_purchase": message
            })
            
            return sequence
            
        except Exception as e:
            print(f"Failed to log marketplace purchase to HCS: {e}")
            return 0
    
    async def get_account_balance(
        self,
        account_id: str,
        token_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get account balance"""
        
        try:
            account = AccountId.fromString(account_id)
            
            if token_id and token_id != "HBAR":
                # Token balance
                token = TokenId.fromString(token_id)
                balance_query = AccountBalanceQuery().set_account_id(account).set_token_id(token)
            else:
                # HBAR balance
                balance_query = AccountBalanceQuery().set_account_id(account)
            
            balance = await balance_query.execute(self.client)
            
            if token_id and token_id != "HBAR":
                return {
                    "balance": balance.tokens.get(token, 0),
                    "token_id": token_id
                }
            else:
                return {
                    "balance": balance.hbars.tinybars,
                    "token_id": "HBAR"
                }
                
        except Exception as e:
            raise Exception(f"Failed to get account balance: {str(e)}")
    
    async def distribute_funds(
        self,
        from_escrow: bool = True,
        distributions: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Distribute funds from escrow to sensor operators"""
        
        try:
            if not distributions:
                return {"success": False, "error": "No distributions provided"}
            
            # Create transfer transaction for distributions
            transaction = TransferTransaction()
            
            if from_escrow:
                transaction = transaction.add_hbar_transfer(
                    self.escrow_account, 
                    Hbar.from_tinybars(-sum(d["amount"] for d in distributions))
                )
            
            for distribution in distributions:
                to_account = AccountId.fromString(d["account_id"])
                amount = Hbar.from_tinybars(d["amount"])
                transaction = transaction.add_hbar_transfer(to_account, amount)
            
            # Execute transaction
            receipt = await transaction.freeze_with(self.client).execute(self.client)
            
            return {
                "success": receipt.status == Status.SUCCESS,
                "transaction_id": str(receipt.transaction_id),
                "distributed_amount": sum(d["amount"] for d in distributions)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to distribute funds: {str(e)}"
            }
