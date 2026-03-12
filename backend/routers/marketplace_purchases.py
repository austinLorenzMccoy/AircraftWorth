from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
import uuid
import secrets
from decimal import Decimal
from datetime import datetime, timedelta

from models.marketplace import (
    PurchaseRequest, PurchaseResponse, PurchaseConfirm,
    Subscription, APIKey, APIKeyCreate, DataAccessRequest
)
from services.supabase_service import SupabaseService
from services.hedera_service import HederaService
from services.auth_service import get_current_user
from services.marketplace_service import MarketplaceService

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.post("/purchase", response_model=PurchaseResponse)
async def initiate_purchase(
    purchase: PurchaseRequest,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends(),
    hedera: HederaService = Depends(),
    marketplace: MarketplaceService = Depends()
):
    """Initiate a purchase - returns transaction data for wallet signing"""
    
    # Get offering details
    offering_result = supabase.client.table('sensor_offerings').select(
        '*, sensors!inner(name, location)'
    ).eq('id', purchase.offering_id).eq('is_active', True).execute()
    
    if not offering_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offering not found or inactive"
        )
    
    offering_data = offering_result.data[0]
    
    # Calculate total cost based on pricing model
    total_cost = await marketplace.calculate_purchase_cost(
        offering_data, purchase.quantity, purchase.duration_hours
    )
    
    if total_cost <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid purchase parameters"
        )
    
    # Create Hedera transaction
    transaction_data = await hedera.create_transfer_transaction(
        from_account=current_user['account_id'],
        to_account=marketplace.get_escrow_account(),
        amount=int(total_cost),
        token_id=offering_data['token_id'],
        memo=f"Marketplace purchase: {purchase.offering_id}"
    )
    
    return PurchaseResponse(
        transaction_data=transaction_data,
        total_cost=total_cost,
        token_id=offering_data['token_id'],
        offering=offering_data
    )


@router.post("/confirm")
async def confirm_purchase(
    confirmation: PurchaseConfirm,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends(),
    hedera: HederaService = Depends(),
    marketplace: MarketplaceService = Depends()
):
    """Confirm purchase after transaction is submitted"""
    
    # Verify transaction on Hedera
    try:
        transaction_result = await hedera.verify_transaction(
            confirmation.transaction_id,
            current_user['account_id']
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transaction verification failed: {str(e)}"
        )
    
    if not transaction_result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction not found or failed"
        )
    
    # Get offering details
    offering_result = supabase.client.table('sensor_offerings').select('*').eq(
        'id', confirmation.offering_id
    ).execute()
    
    if not offering_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offering not found"
        )
    
    offering = offering_result.data[0]
    
    # Create subscription
    subscription_data = await marketplace.create_subscription(
        consumer_account=current_user['account_id'],
        offering=offering,
        transaction_result=transaction_result
    )
    
    # Log to HCS
    try:
        hcs_sequence = await hedera.log_marketplace_purchase({
            'consumer': current_user['account_id'],
            'offering_id': str(confirmation.offering_id),
            'amount': str(subscription_data['total_amount']),
            'token': offering['token_id'],
            'subscription_id': str(subscription_data['id']),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Update subscription with HCS sequence
        supabase.client.table('subscriptions').update({
            'hcs_sequence': hcs_sequence
        }).eq('id', subscription_data['id']).execute()
        
    except Exception as e:
        # Log error but don't fail the purchase
        print(f"HCS logging failed: {e}")
    
    # Generate API key for consumer
    api_key = await marketplace.generate_api_key(current_user['account_id'])
    
    return {
        "subscription_id": subscription_data['id'],
        "api_key": api_key,
        "status": "active",
        "message": "Purchase completed successfully"
    }


@router.get("/my-subscriptions", response_model=List[Subscription])
async def get_my_subscriptions(
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Get current user's active subscriptions"""
    
    result = supabase.client.table('subscriptions').select(
        """
        *,
        sensor_offerings!inner(
            *, sensors!inner(name, location)
        )
        """
    ).eq('consumer_account', current_user['account_id']).execute()
    
    subscriptions = []
    for sub_data in result.data:
        # Format offering data
        offering_data = sub_data.get('sensor_offerings', {})
        sub_data['offering'] = offering_data
        
        subscription = Subscription(**sub_data)
        subscriptions.append(subscription)
    
    return subscriptions


@router.get("/transactions")
async def get_transaction_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Get user's transaction history"""
    
    result = supabase.client.table('subscriptions').select(
        'id, total_amount, token_id, transaction_hash, created_at, status'
    ).eq('consumer_account', current_user['account_id']).order(
        'created_at', desc=True
    ).range(offset, offset + limit - 1).execute()
    
    return result.data or []


@router.post("/api-keys", response_model=APIKey)
async def create_api_key(
    api_key_create: APIKeyCreate,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Create a new API key for data access"""
    
    # Generate secure API key
    new_key = f"aw_{secrets.token_urlsafe(32)}"
    
    result = supabase.client.table('consumer_api_keys').insert({
        'consumer_account': current_user['account_id'],
        'api_key': new_key
    }).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )
    
    return APIKey(**result.data[0])


@router.get("/api-keys", response_model=List[APIKey])
async def get_api_keys(
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Get user's API keys"""
    
    result = supabase.client.table('consumer_api_keys').select('*').eq(
        'consumer_account', current_user['account_id']
    ).order('created_at', desc=True).execute()
    
    return [APIKey(**key_data) for key_data in result.data or []]


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Delete an API key"""
    
    result = supabase.client.table('consumer_api_keys').delete().eq(
        'id', key_id
    ).eq('consumer_account', current_user['account_id']).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return {"message": "API key deleted successfully"}


@router.get("/data")
async def get_marketplace_data(
    request: DataAccessRequest,
    api_key: str,
    supabase: SupabaseService = Depends(),
    marketplace: MarketplaceService = Depends()
):
    """Get data based on active subscription (API key authenticated)"""
    
    # Validate API key
    key_result = supabase.client.table('consumer_api_keys').select(
        'consumer_account'
    ).eq('api_key', api_key).execute()
    
    if not key_result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    consumer_account = key_result.data[0]['consumer_account']
    
    # Update last used
    supabase.client.table('consumer_api_keys').update({
        'last_used': datetime.utcnow()
    }).eq('api_key', api_key).execute()
    
    # Get active subscriptions
    subscriptions = await marketplace.get_active_subscriptions(consumer_account)
    
    if not subscriptions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active subscriptions found"
        )
    
    # Get data based on subscriptions
    data = await marketplace.get_subscription_data(
        subscriptions, request.since, request.limit
    )
    
    return data


@router.post("/cancel-subscription/{subscription_id}")
async def cancel_subscription(
    subscription_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Cancel an active subscription"""
    
    result = supabase.client.table('subscriptions').update({
        'status': 'cancelled'
    }).eq('id', subscription_id).eq(
        'consumer_account', current_user['account_id']
    ).eq('status', 'active').execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found or already cancelled"
        )
    
    return {"message": "Subscription cancelled successfully"}
