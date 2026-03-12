from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import secrets
import json

from services.supabase_service import SupabaseService
from services.hedera_service import HederaService


class MarketplaceService:
    def __init__(self, supabase: SupabaseService, hedera: HederaService):
        self.supabase = supabase
        self.hedera = hedera
        self.escrow_account = "0.0.1234567"  # Marketplace escrow account
    
    def get_escrow_account(self) -> str:
        """Get the marketplace escrow account address"""
        return self.escrow_account
    
    async def calculate_purchase_cost(
        self, 
        offering: Dict[str, Any], 
        quantity: Optional[int] = None,
        duration_hours: Optional[int] = None
    ) -> Decimal:
        """Calculate total cost based on pricing model"""
        
        pricing_model = offering['pricing_model']
        base_price = Decimal(str(offering['price_amount']))
        
        if pricing_model == 'per_message':
            if not quantity or quantity <= 0:
                raise ValueError("Quantity required for per-message pricing")
            return base_price * quantity
        
        elif pricing_model == 'bundle':
            if not quantity or quantity <= 0:
                raise ValueError("Quantity required for bundle pricing")
            # Price is per bundle, calculate how many bundles needed
            bundle_size = offering.get('bundle_size', 1)
            bundles_needed = (quantity + bundle_size - 1) // bundle_size
            return base_price * bundles_needed
        
        elif pricing_model == 'per_minute':
            if not duration_hours or duration_hours <= 0:
                raise ValueError("Duration required for time-based pricing")
            return base_price * duration_hours * 60
        
        elif pricing_model == 'per_hour':
            if not duration_hours or duration_hours <= 0:
                raise ValueError("Duration required for hourly pricing")
            return base_price * duration_hours
        
        elif pricing_model == 'per_day':
            if not duration_hours or duration_hours <= 0:
                raise ValueError("Duration required for daily pricing")
            days = duration_hours / 24
            return base_price * days
        
        elif pricing_model == 'per_month':
            if not duration_hours or duration_hours <= 0:
                raise ValueError("Duration required for monthly pricing")
            # Approximate month as 30 days
            days = duration_hours / 24
            months = days / 30
            return base_price * months
        
        else:
            raise ValueError(f"Unknown pricing model: {pricing_model}")
    
    async def create_subscription(
        self,
        consumer_account: str,
        offering: Dict[str, Any],
        transaction_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a subscription record after successful payment"""
        
        pricing_model = offering['pricing_model']
        base_price = Decimal(str(offering['price_amount']))
        
        # Calculate subscription end time and remaining credits
        end_time = None
        remaining_credits = None
        
        if pricing_model in ['per_message', 'bundle']:
            # Credit-based subscription
            if pricing_model == 'bundle':
                bundle_size = offering.get('bundle_size', 1)
                remaining_credits = bundle_size
            else:
                # For per_message, this would be set based on purchase quantity
                # This should be passed in from the purchase request
                remaining_credits = 100  # Default, should come from request
        
        elif pricing_model in ['per_minute', 'per_hour', 'per_day', 'per_month']:
            # Time-based subscription
            # Calculate duration from transaction amount
            amount = Decimal(str(transaction_result['amount']))
            duration_hours = 0
            
            if pricing_model == 'per_minute':
                duration_hours = float(amount / base_price) / 60
            elif pricing_model == 'per_hour':
                duration_hours = float(amount / base_price)
            elif pricing_model == 'per_day':
                days = float(amount / base_price)
                duration_hours = days * 24
            elif pricing_model == 'per_month':
                months = float(amount / base_price)
                duration_hours = months * 24 * 30
            
            if duration_hours > 0:
                end_time = datetime.utcnow() + timedelta(hours=duration_hours)
        
        # Create subscription record
        subscription_data = {
            'consumer_account': consumer_account,
            'offering_id': offering['id'],
            'status': 'active',
            'start_time': datetime.utcnow().isoformat(),
            'end_time': end_time.isoformat() if end_time else None,
            'remaining_credits': remaining_credits,
            'total_amount': str(transaction_result['amount']),
            'token_id': offering['token_id'],
            'transaction_hash': transaction_result.get('transaction_id'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        result = self.supabase.client.table('subscriptions').insert(
            subscription_data
        ).execute()
        
        if not result.data:
            raise Exception("Failed to create subscription")
        
        return result.data[0]
    
    async def generate_api_key(self, consumer_account: str) -> str:
        """Generate a new API key for data access"""
        
        # Check if user already has an API key
        existing_key = self.supabase.client.table('consumer_api_keys').select(
            'api_key'
        ).eq('consumer_account', consumer_account).execute()
        
        if existing_key.data:
            # Return existing key
            return existing_key.data[0]['api_key']
        
        # Generate new key
        new_key = f"aw_{secrets.token_urlsafe(32)}"
        
        result = self.supabase.client.table('consumer_api_keys').insert({
            'consumer_account': consumer_account,
            'api_key': new_key
        }).execute()
        
        if not result.data:
            raise Exception("Failed to generate API key")
        
        return new_key
    
    async def get_active_subscriptions(self, consumer_account: str) -> List[Dict[str, Any]]:
        """Get active subscriptions for a consumer"""
        
        result = self.supabase.client.table('subscriptions').select(
            """
            *,
            sensor_offerings!inner(
                sensor_id, data_type, pricing_model, 
                sensors!inner(name, location)
            )
            """
        ).eq('consumer_account', consumer_account).eq('status', 'active').execute()
        
        if not result.data:
            return []
        
        # Filter out expired subscriptions
        active_subscriptions = []
        for sub in result.data:
            if sub.get('end_time'):
                end_time = datetime.fromisoformat(sub['end_time'].replace('Z', '+00:00'))
                if end_time > datetime.utcnow():
                    active_subscriptions.append(sub)
            elif sub.get('remaining_credits', 0) > 0:
                active_subscriptions.append(sub)
        
        return active_subscriptions
    
    async def get_subscription_data(
        self,
        subscriptions: List[Dict[str, Any]],
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get data based on active subscriptions"""
        
        data = {
            'mode_s_messages': [],
            'aircraft_positions': [],
            'sensors': []
        }
        
        # Collect sensor IDs and data types from subscriptions
        sensor_data_types = {}
        for sub in subscriptions:
            offering = sub.get('sensor_offerings', {})
            sensor_id = offering.get('sensor_id')
            data_type = offering.get('data_type')
            
            if sensor_id and data_type:
                if sensor_id not in sensor_data_types:
                    sensor_data_types[sensor_id] = []
                if data_type not in sensor_data_types[sensor_id]:
                    sensor_data_types[sensor_id].append(data_type)
        
        # Get sensor information
        if sensor_data_types:
            sensor_ids = list(sensor_data_types.keys())
            sensors_result = self.supabase.client.table('sensors').select(
                'id, name, location, last_heartbeat'
            ).in_('id', sensor_ids).execute()
            
            data['sensors'] = sensors_result.data or []
        
        # Get Mode-S messages if subscribed
        for sensor_id, data_types in sensor_data_types.items():
            if 'raw_modes' in data_types or 'both' in data_types:
                query = self.supabase.client.table('mode_s_messages').select(
                    'icao_address, raw_message, timestamp_ns, received_at'
                ).eq('sensor_id', sensor_id).order('received_at', desc=True)
                
                if since:
                    query = query.gte('received_at', since.isoformat())
                
                query = query.limit(limit)
                
                messages_result = query.execute()
                if messages_result.data:
                    data['mode_s_messages'].extend(messages_result.data)
        
        # Get aircraft positions if subscribed
        for sensor_id, data_types in sensor_data_types.items():
            if 'mlat_positions' in data_types or 'both' in data_types:
                query = self.supabase.client.table('aircraft_positions').select(
                    'icao_address, latitude, longitude, altitude_ft, '
                    'confidence_score, sensor_count, calculated_at'
                ).order('calculated_at', desc=True)
                
                if since:
                    query = query.gte('calculated_at', since.isoformat())
                
                query = query.limit(limit)
                
                positions_result = query.execute()
                if positions_result.data:
                    data['aircraft_positions'].extend(positions_result.data)
        
        # Update subscription usage
        await self._update_subscription_usage(subscriptions)
        
        return data
    
    async def _update_subscription_usage(self, subscriptions: List[Dict[str, Any]]):
        """Update subscription usage (credits consumed, etc.)"""
        
        for sub in subscriptions:
            offering = sub.get('sensor_offerings', {})
            pricing_model = offering.get('pricing_model')
            
            if pricing_model in ['per_message', 'bundle']:
                # For demo purposes, we'll decrement 1 credit per call
                # In production, this should be based on actual data usage
                remaining_credits = sub.get('remaining_credits', 0)
                if remaining_credits > 0:
                    new_credits = remaining_credits - 1
                    
                    self.supabase.client.table('subscriptions').update({
                        'remaining_credits': new_credits,
                        'status': 'expired' if new_credits <= 0 else 'active'
                    }).eq('id', sub['id']).execute()
    
    async def get_sensor_earnings(self, sensor_operator_account: str) -> Dict[str, Any]:
        """Get earnings summary for a sensor operator"""
        
        # Get all subscriptions for operator's sensors
        result = self.supabase.client.table('subscriptions').select(
            """
            total_amount, token_id, created_at,
            sensor_offerings!inner(
                sensor_id, sensors!inner(hedera_account_id)
            )
            """
        ).eq('sensor_offerings.sensors.hedera_account_id', sensor_operator_account).execute()
        
        if not result.data:
            return {
                'total_earnings': Decimal('0'),
                'total_subscriptions': 0,
                'recent_earnings': []
            }
        
        total_earnings = sum(
            Decimal(str(sub['total_amount'])) for sub in result.data
        )
        
        # Get recent earnings (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_earnings = [
            sub for sub in result.data
            if datetime.fromisoformat(sub['created_at'].replace('Z', '+00:00')) > thirty_days_ago
        ]
        
        return {
            'total_earnings': total_earnings,
            'total_subscriptions': len(result.data),
            'recent_earnings': recent_earnings
        }
