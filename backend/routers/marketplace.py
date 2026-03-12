from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from decimal import Decimal

from models.marketplace import (
    SensorOffering, SensorOfferingCreate, SensorOfferingUpdate,
    MarketSensor, MarketplaceStats
)
from services.supabase_service import SupabaseService
from services.hedera_service import HederaService
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.get("/sensors", response_model=List[MarketSensor])
async def get_marketplace_sensors(
    lat_min: Optional[float] = None,
    lat_max: Optional[float] = None,
    lon_min: Optional[float] = None,
    lon_max: Optional[float] = None,
    data_type: Optional[str] = None,
    pricing_model: Optional[str] = None,
    supabase: SupabaseService = Depends()
):
    """Get sensors with active offerings for marketplace display"""
    
    # Build query for sensors with active offerings
    query = supabase.client.table('sensors').select(
        """
        id, name, location, last_heartbeat,
        sensor_offerings!inner(
            id, data_type, pricing_model, price_amount, 
            token_id, bundle_size, is_active, created_at
        )
        """
    ).eq('sensor_offerings.is_active', True)
    
    # Apply filters
    if data_type:
        query = query.eq('sensor_offerings.data_type', data_type)
    if pricing_model:
        query = query.eq('sensor_offerings.pricing_model', pricing_model)
    
    # Geographic bounds if provided
    if lat_min is not None and lat_max is not None:
        # For PostGIS: ST_Within(location, ST_MakeEnvelope(...))
        query = query.gte('location[1]', lat_min).lte('location[1]', lat_max)
    if lon_min is not None and lon_max is not None:
        query = query.gte('location[0]', lon_min).lte('location[0]', lon_max)
    
    result = query.execute()
    
    if not result.data:
        return []
    
    # Transform to MarketSensor format
    market_sensors = []
    for sensor_data in result.data:
        offerings = []
        min_price = None
        
        for offering_data in sensor_data.get('sensor_offerings', []):
            offering = SensorOffering(**offering_data)
            offerings.append(offering)
            
            if min_price is None or offering.price_amount < min_price:
                min_price = offering.price_amount
        
        market_sensor = MarketSensor(
            id=sensor_data['id'],
            name=sensor_data['name'],
            location=sensor_data['location'],
            last_heartbeat=sensor_data.get('last_heartbeat'),
            offerings_count=len(offerings),
            min_price=min_price,
            active_offerings=offerings
        )
        market_sensors.append(market_sensor)
    
    return market_sensors


@router.get("/offerings", response_model=List[SensorOffering])
async def get_all_offerings(
    sensor_id: Optional[uuid.UUID] = None,
    data_type: Optional[str] = None,
    pricing_model: Optional[str] = None,
    is_active: Optional[bool] = None,
    supabase: SupabaseService = Depends()
):
    """Get all sensor offerings with optional filters"""
    
    query = supabase.client.table('sensor_offerings').select(
        """
        *, 
        sensors!inner(
            name, location, last_heartbeat, hedera_account_id
        )
        """
    )
    
    if sensor_id:
        query = query.eq('sensor_id', sensor_id)
    if data_type:
        query = query.eq('data_type', data_type)
    if pricing_model:
        query = query.eq('pricing_model', pricing_model)
    if is_active is not None:
        query = query.eq('is_active', is_active)
    
    result = query.execute()
    
    offerings = []
    for offering_data in result.data:
        # Extract sensor details
        sensor_data = offering_data.get('sensors', {})
        offering_data['sensor_name'] = sensor_data.get('name')
        offering_data['sensor_location'] = sensor_data.get('location')
        
        offering = SensorOffering(**offering_data)
        offerings.append(offering)
    
    return offerings


@router.post("/offerings", response_model=SensorOffering)
async def create_offering(
    offering: SensorOfferingCreate,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Create a new sensor offering (sensor operator only)"""
    
    # Verify user owns the sensor
    sensor_result = supabase.client.table('sensors').select('id').eq(
        'hedera_account_id', current_user['account_id']
    ).eq('id', offering.sensor_id).execute()
    
    if not sensor_result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create offerings for your own sensors"
        )
    
    # Create offering
    result = supabase.client.table('sensor_offerings').insert({
        **offering.dict(),
        'is_active': True
    }).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create offering"
        )
    
    # Return with sensor details
    offering_data = result.data[0]
    sensor_data = sensor_result.data[0]
    offering_data['sensor_name'] = sensor_data.get('name')
    offering_data['sensor_location'] = sensor_data.get('location')
    
    return SensorOffering(**offering_data)


@router.put("/offerings/{offering_id}", response_model=SensorOffering)
async def update_offering(
    offering_id: uuid.UUID,
    offering_update: SensorOfferingUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Update a sensor offering (sensor operator only)"""
    
    # Verify user owns the sensor for this offering
    offering_result = supabase.client.table('sensor_offerings').select(
        'sensor_id, sensors!inner(hedera_account_id)'
    ).eq('id', offering_id).execute()
    
    if not offering_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offering not found"
        )
    
    offering_data = offering_result.data[0]
    sensor_data = offering_data.get('sensors', {})
    
    if sensor_data.get('hedera_account_id') != current_user['account_id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update offerings for your own sensors"
        )
    
    # Update only provided fields
    update_data = offering_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    result = supabase.client.table('sensor_offerings').update(
        update_data
    ).eq('id', offering_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update offering"
        )
    
    # Return with sensor details
    updated_offering = result.data[0]
    updated_offering['sensor_name'] = sensor_data.get('name')
    updated_offering['sensor_location'] = sensor_data.get('location')
    
    return SensorOffering(**updated_offering)


@router.delete("/offerings/{offering_id}")
async def delete_offering(
    offering_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    supabase: SupabaseService = Depends()
):
    """Deactivate a sensor offering (sensor operator only)"""
    
    # Verify ownership (same logic as update)
    offering_result = supabase.client.table('sensor_offerings').select(
        'sensor_id, sensors!inner(hedera_account_id)'
    ).eq('id', offering_id).execute()
    
    if not offering_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offering not found"
        )
    
    offering_data = offering_result.data[0]
    sensor_data = offering_data.get('sensors', {})
    
    if sensor_data.get('hedera_account_id') != current_user['account_id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete offerings for your own sensors"
        )
    
    # Soft delete by setting is_active to false
    result = supabase.client.table('sensor_offerings').update({
        'is_active': False
    }).eq('id', offering_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate offering"
        )
    
    return {"message": "Offering deactivated successfully"}


@router.get("/stats", response_model=MarketplaceStats)
async def get_marketplace_stats(supabase: SupabaseService = Depends()):
    """Get marketplace statistics"""
    
    # Count sensors with offerings
    sensors_result = supabase.client.table('sensor_offerings').select(
        'sensor_id', count='exact'
    ).eq('is_active', True).execute()
    
    # Count active offerings
    offerings_result = supabase.client.table('sensor_offerings').select(
        'id', count='exact'
    ).eq('is_active', True).execute()
    
    # Count subscriptions
    subscriptions_result = supabase.client.table('subscriptions').select(
        'id', count='exact'
    ).execute()
    
    # Calculate total volume
    volume_result = supabase.client.table('subscriptions').select(
        'total_amount'
    ).execute()
    
    total_volume = sum(
        sub['total_amount'] for sub in volume_result.data or []
    ) if volume_result.data else Decimal('0')
    
    return MarketplaceStats(
        total_sensors=len(set(s['sensor_id'] for s in sensors_result.data or [])),
        active_offerings=offerings_result.count or 0,
        total_subscriptions=subscriptions_result.count or 0,
        total_volume=total_volume
    )
