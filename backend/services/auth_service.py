from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import jwt
from datetime import datetime, timedelta

from services.supabase_service import SupabaseService

# JWT Secret for API key authentication
JWT_SECRET = "aircraftworth_marketplace_secret"
JWT_ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: SupabaseService = Depends()
) -> Dict[str, Any]:
    """Get current user from Hedera account authentication"""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Decode JWT token (should contain Hedera account ID)
        payload = jwt.decode(
            credentials.credentials, 
            JWT_SECRET, 
            algorithms=[JWT_ALGORITHM]
        )
        
        account_id = payload.get('account_id')
        if not account_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Verify account exists in system
        user_result = supabase.client.table('sensors').select('hedera_account_id').eq(
            'hedera_account_id', account_id
        ).execute()
        
        if not user_result.data:
            # User might be a consumer without sensors
            pass
        
        return {
            'account_id': account_id,
            'is_sensor_operator': bool(user_result.data)
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


async def verify_api_key(
    api_key: str,
    supabase: SupabaseService = Depends()
) -> Dict[str, Any]:
    """Verify API key for data access"""
    
    if not api_key.startswith('aw_'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )
    
    result = supabase.client.table('consumer_api_keys').select(
        'consumer_account, created_at, last_used'
    ).eq('api_key', api_key).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    key_data = result.data[0]
    
    # Update last used
    supabase.client.table('consumer_api_keys').update({
        'last_used': datetime.utcnow()
    }).eq('api_key', api_key).execute()
    
    return {
        'consumer_account': key_data['consumer_account'],
        'api_key_id': key_data['id']
    }


def create_user_token(account_id: str) -> str:
    """Create JWT token for user authentication"""
    
    payload = {
        'account_id': account_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_sensor_operator(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Require user to be a sensor operator"""
    
    if not current_user.get('is_sensor_operator'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sensor operator access required"
        )
    
    return current_user


async def require_active_subscription(
    api_key: str,
    supabase: SupabaseService = Depends()
) -> Dict[str, Any]:
    """Require user to have active subscription for data access"""
    
    # First verify API key
    auth_data = await verify_api_key(api_key, supabase)
    consumer_account = auth_data['consumer_account']
    
    # Check for active subscriptions
    result = supabase.client.table('subscriptions').select(
        'id, status, end_time, remaining_credits'
    ).eq('consumer_account', consumer_account).eq('status', 'active').execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active subscriptions found"
        )
    
    # Check if any subscription is still valid
    valid_subscription = None
    for sub in result.data:
        if sub.get('end_time'):
            end_time = datetime.fromisoformat(sub['end_time'].replace('Z', '+00:00'))
            if end_time > datetime.utcnow():
                valid_subscription = sub
                break
        elif sub.get('remaining_credits', 0) > 0:
            valid_subscription = sub
            break
    
    if not valid_subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="All subscriptions have expired"
        )
    
    return {
        'consumer_account': consumer_account,
        'subscription_id': valid_subscription['id']
    }
