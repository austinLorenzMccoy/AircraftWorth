-- Enable required extensions (PostGIS for geospatial)
-- Note: TimescaleDB not available on Supabase free tier, using regular tables with indexes
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================================
-- Sensors registered on the Neuron network
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id TEXT UNIQUE NOT NULL,
    hedera_account_id TEXT,
    name TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    hcs_stdin_topic TEXT,
    hcs_stdout_topic TEXT,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sensors_location_idx ON sensors USING GIST (location);
CREATE INDEX IF NOT EXISTS sensors_last_heartbeat_idx ON sensors (last_heartbeat DESC);

-- ============================================================================
-- Raw Mode-S messages (hypertable for efficient retention + querying)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mode_s_messages (
    id BIGSERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL REFERENCES sensors(sensor_id),
    icao_address TEXT NOT NULL,
    raw_message BYTEA NOT NULL,
    timestamp_ns BIGINT NOT NULL,
    sensor_lat DOUBLE PRECISION NOT NULL,
    sensor_lon DOUBLE PRECISION NOT NULL,
    sensor_alt_m DOUBLE PRECISION,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hypertable conversion skipped (TimescaleDB not available)
CREATE INDEX IF NOT EXISTS mode_s_messages_icao_idx ON mode_s_messages (icao_address, received_at DESC);
CREATE INDEX IF NOT EXISTS mode_s_messages_timestamp_idx ON mode_s_messages (timestamp_ns DESC);
CREATE INDEX IF NOT EXISTS mode_s_messages_received_at_idx ON mode_s_messages (received_at DESC);

-- ============================================================================
-- MLAT-derived aircraft positions (hypertable for time-series queries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS aircraft_positions (
    id BIGSERIAL PRIMARY KEY,
    icao_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude_ft INTEGER,
    confidence_score DOUBLE PRECISION,
    sensor_count INTEGER,
    calculation_method TEXT,
    hedera_sequence_number BIGINT,
    flight_track_token_id TEXT,
    -- AI Analysis Fields
    ai_threat_level TEXT,
    ai_summary TEXT,
    ai_tags TEXT[], -- Array of AI-generated tags
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hypertable conversion skipped (TimescaleDB not available)
CREATE INDEX IF NOT EXISTS aircraft_positions_icao_idx ON aircraft_positions (icao_address, calculated_at DESC);
CREATE INDEX IF NOT EXISTS aircraft_positions_confidence_idx ON aircraft_positions (confidence_score DESC);
CREATE INDEX IF NOT EXISTS aircraft_positions_calculated_at_idx ON aircraft_positions (calculated_at DESC);

-- ============================================================================
-- Row Level Security (optional multi-tenant controls)
-- ============================================================================
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_s_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft_positions ENABLE ROW LEVEL SECURITY;

-- By default allow read/write access; tighten policies once auth is wired up
DROP POLICY IF EXISTS "Allow read for all" ON sensors;
DROP POLICY IF EXISTS "Allow write for all" ON sensors;
DROP POLICY IF EXISTS "Allow read for all" ON mode_s_messages;
DROP POLICY IF EXISTS "Allow write for all" ON mode_s_messages;
DROP POLICY IF EXISTS "Allow read for all" ON aircraft_positions;
DROP POLICY IF EXISTS "Allow write for all" ON aircraft_positions;

CREATE POLICY "Allow read for all" ON sensors FOR SELECT USING (true);
CREATE POLICY "Allow write for all" ON sensors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all" ON sensors FOR UPDATE USING (true);

CREATE POLICY "Allow read for all" ON mode_s_messages FOR SELECT USING (true);
CREATE POLICY "Allow write for all" ON mode_s_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for all" ON aircraft_positions FOR SELECT USING (true);
CREATE POLICY "Allow write for all" ON aircraft_positions FOR INSERT WITH CHECK (true);
