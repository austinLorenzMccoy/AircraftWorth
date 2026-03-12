import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

export type Sensor = {
  id: string
  sensor_id: string
  hedera_account_id: string | null
  name: string | null
  location: string
  hcs_stdin_topic: string | null
  hcs_stdout_topic: string | null
  last_heartbeat: string | null
  created_at: string
}

export type AircraftPosition = {
  id: number
  icao_address: string
  latitude: number
  longitude: number
  altitude_ft: number | null
  confidence_score: number | null
  sensor_count: number | null
  calculation_method: string | null
  hedera_sequence_number: number | null
  flight_track_token_id: string | null
  calculated_at: string
}

export type ModeSMessage = {
  id: number
  sensor_id: string
  icao_address: string
  raw_message: string
  timestamp_ns: number
  sensor_lat: number
  sensor_lon: number
  sensor_alt_m: number | null
  received_at: string
}
