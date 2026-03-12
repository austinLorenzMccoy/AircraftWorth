-- AircraftWorth Marketplace Schema Extension
-- Extends existing AircraftWorth database with marketplace functionality

-- Sensor offerings table
CREATE TABLE IF NOT EXISTS sensor_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('raw_modes', 'mlat_positions', 'both')),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_message', 'per_minute', 'per_hour', 'per_day', 'per_month', 'bundle')),
  price_amount NUMERIC NOT NULL, -- in smallest unit of token (e.g., tinybars)
  token_id TEXT NOT NULL DEFAULT 'HBAR', -- Hedera token ID
  bundle_size INTEGER, -- for bundle model: number of messages
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions / purchases table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_account TEXT NOT NULL, -- Hedera account ID of consumer
  offering_id UUID REFERENCES sensor_offerings(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ, -- for time-based subscriptions
  remaining_credits INTEGER, -- for per-message or bundle purchases
  total_amount NUMERIC NOT NULL,
  token_id TEXT NOT NULL,
  transaction_hash TEXT, -- Hedera transaction ID of payment
  hcs_sequence BIGINT, -- HCS sequence number of logged purchase
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumer API keys for authentication
CREATE TABLE IF NOT EXISTS consumer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_account TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_consumer ON subscriptions(consumer_account);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_offering ON subscriptions(offering_id);
CREATE INDEX IF NOT EXISTS idx_offerings_sensor ON sensor_offerings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_offerings_active ON sensor_offerings(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_consumer ON consumer_api_keys(consumer_account);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON consumer_api_keys(api_key);

-- RLS Policies
ALTER TABLE sensor_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumer_api_keys ENABLE ROW LEVEL SECURITY;

-- Sensor offerings RLS
CREATE POLICY "Operators can manage offerings for their sensors" ON sensor_offerings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sensors 
      WHERE sensors.id = sensor_offerings.sensor_id 
      AND sensors.hedera_account_id = current_setting('app.current_user', true)
    )
  );

CREATE POLICY "Everyone can view active offerings" ON sensor_offerings
  FOR SELECT USING (is_active = true);

-- Subscriptions RLS
CREATE POLICY "Consumers can view their own subscriptions" ON subscriptions
  FOR SELECT USING (consumer_account = current_setting('app.current_user', true));

CREATE POLICY "Operators can view subscriptions for their offerings" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sensor_offerings
      JOIN sensors ON sensors.id = sensor_offerings.sensor_id
      WHERE sensor_offerings.id = subscriptions.offering_id
      AND sensors.hedera_account_id = current_setting('app.current_user', true)
    )
  );

-- API keys RLS
CREATE POLICY "Consumers can manage their own API keys" ON consumer_api_keys
  FOR ALL USING (consumer_account = current_setting('app.current_user', true));

-- Updated triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sensor_offerings_updated_at 
    BEFORE UPDATE ON sensor_offerings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update API key last_used trigger
CREATE OR REPLACE FUNCTION update_api_key_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- This trigger will be called when API key is used (via application logic)

-- Seed sample offerings for testing
INSERT INTO sensor_offerings (sensor_id, data_type, pricing_model, price_amount, token_id)
SELECT id, 'mlat_positions', 'per_message', 100, 'HBAR' FROM sensors ORDER BY created_at LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sensor_offerings (sensor_id, data_type, pricing_model, price_amount, token_id)
SELECT id, 'raw_modes', 'per_hour', 50000, 'HBAR' FROM sensors ORDER BY created_at OFFSET 1 LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sensor_offerings (sensor_id, data_type, pricing_model, price_amount, token_id)
SELECT id, 'both', 'per_month', 1200000, 'HBAR' FROM sensors ORDER BY created_at OFFSET 2 LIMIT 1
ON CONFLICT DO NOTHING;
