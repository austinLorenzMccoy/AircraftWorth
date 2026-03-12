from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal
import uuid


class SensorOfferingBase(BaseModel):
    sensor_id: uuid.UUID
    data_type: Literal["raw_modes", "mlat_positions", "both"]
    pricing_model: Literal["per_message", "per_minute", "per_hour", "per_day", "per_month", "bundle"]
    price_amount: Decimal = Field(gt=0, description="Price in smallest token unit")
    token_id: str = "HBAR"
    bundle_size: Optional[int] = Field(None, gt=0, description="For bundle pricing model")


class SensorOfferingCreate(SensorOfferingBase):
    pass


class SensorOfferingUpdate(BaseModel):
    data_type: Optional[Literal["raw_modes", "mlat_positions", "both"]] = None
    pricing_model: Optional[Literal["per_message", "per_minute", "per_hour", "per_day", "per_month", "bundle"]] = None
    price_amount: Optional[Decimal] = Field(None, gt=0)
    token_id: Optional[str] = None
    bundle_size: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class SensorOffering(SensorOfferingBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Sensor details
    sensor_name: Optional[str] = None
    sensor_location: Optional[dict] = None
    
    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    offering_id: uuid.UUID
    quantity: Optional[int] = Field(None, gt=0, description="For per-message purchases")
    duration_hours: Optional[int] = Field(None, gt=0, description="For time-based subscriptions")


class PurchaseResponse(BaseModel):
    transaction_data: dict
    total_cost: Decimal
    token_id: str
    offering: SensorOffering


class PurchaseConfirm(BaseModel):
    offering_id: uuid.UUID
    transaction_id: str


class SubscriptionBase(BaseModel):
    consumer_account: str
    offering_id: uuid.UUID
    total_amount: Decimal
    token_id: str


class Subscription(SubscriptionBase):
    id: uuid.UUID
    status: Literal["active", "expired", "cancelled"]
    start_time: datetime
    end_time: Optional[datetime]
    remaining_credits: Optional[int]
    transaction_hash: Optional[str]
    hcs_sequence: Optional[int]
    created_at: datetime
    
    # Offering details
    offering: Optional[SensorOffering] = None
    
    class Config:
        from_attributes = True


class APIKeyCreate(BaseModel):
    pass


class APIKey(BaseModel):
    id: uuid.UUID
    consumer_account: str
    api_key: str
    created_at: datetime
    last_used: Optional[datetime]
    
    class Config:
        from_attributes = True


class DataAccessRequest(BaseModel):
    since: Optional[datetime] = None
    limit: Optional[int] = Field(100, ge=1, le=1000)


class MarketSensor(BaseModel):
    id: uuid.UUID
    name: str
    location: dict
    last_heartbeat: Optional[datetime]
    offerings_count: int
    min_price: Optional[Decimal]
    active_offerings: List[SensorOffering] = []


class MarketplaceStats(BaseModel):
    total_sensors: int
    active_offerings: int
    total_subscriptions: int
    total_volume: Decimal
