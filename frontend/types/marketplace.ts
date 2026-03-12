export interface SensorOffering {
  id: string
  sensor_id: string
  data_type: 'raw_modes' | 'mlat_positions' | 'both'
  pricing_model: 'per_message' | 'per_minute' | 'per_hour' | 'per_day' | 'per_month' | 'bundle'
  price_amount: number
  token_id: string
  bundle_size?: number
  is_active: boolean
  created_at: string
  updated_at: string
  sensor_name?: string
  sensor_location?: { coordinates: [number, number] }
}

export interface MarketSensor {
  id: string
  name: string
  location: { coordinates: [number, number] }
  last_heartbeat?: string
  offerings_count: number
  min_price?: number
  active_offerings: SensorOffering[]
}

export interface Subscription {
  id: string
  consumer_account: string
  offering_id: string
  status: 'active' | 'expired' | 'cancelled'
  start_time: string
  end_time?: string
  remaining_credits?: number
  total_amount: number
  token_id: string
  transaction_hash?: string
  hcs_sequence?: number
  created_at: string
  offering?: SensorOffering
}

export interface APIKey {
  id: string
  consumer_account: string
  api_key: string
  created_at: string
  last_used?: string
}

export interface PurchaseRequest {
  offering_id: string
  quantity?: number
  duration_hours?: number
}

export interface PurchaseResponse {
  transaction_data: any
  total_cost: number
  token_id: string
  offering: SensorOffering
}

export interface MarketplaceStats {
  total_sensors: number
  active_offerings: number
  total_subscriptions: number
  total_volume: number
}
