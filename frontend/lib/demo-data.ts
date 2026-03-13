/**
 * Demo data for testing AI features when database is unavailable
 */

export interface AircraftPosition {
  id: string;
  icao_address: string;
  lat: number;
  lon: number;
  alt_ft?: number;
  confidence: number;
  calculated_at: string;
  has_adsb: boolean;
  sensor_count: number;
  hedera_sequence_number?: number;
}

export interface Sensor {
  id: string;
  lat: number;
  lon: number;
  status: 'online' | 'offline' | 'maintenance';
  last_seen: string;
}

export const demoAircraft: AircraftPosition[] = [
  {
    id: '1',
    icao: 'ABC123',
    icao_address: 'ABC123',
    lat: 51.5074,
    lon: -0.1278,
    alt_ft: 35000,
    confidence: 0.95,
    calculated_at: '2024-01-01T12:00:00Z',
    has_adsb: true,
    sensor_count: 5,
    hedera_sequence_number: 123456789
  },
  {
    id: '2',
    icao: 'DEF456',
    icao_address: 'DEF456',
    lat: 51.5000,
    lon: -0.1200,
    alt_ft: 28000,
    confidence: 0.72,
    calculated_at: '2024-01-01T12:01:00Z',
    has_adsb: false,
    sensor_count: 4,
    hedera_sequence_number: 987654321
  },
  {
    icao: 'GHI789',
    lat: 51.5100,
    lon: -0.1300,
    alt_ft: 15000,
    confidence: 0.88,
    calculated_at: '2024-01-01T12:02:00Z',
    has_adsb: true,
    sensor_count: 6
  },
  {
    icao: 'JKL012',
    lat: 51.5050,
    lon: -0.1250,
    alt_ft: 32000,
    confidence: 0.45,
    calculated_at: '2024-01-01T12:03:00Z',
    has_adsb: false,
    sensor_count: 3
  },
  {
    icao: 'MNO345',
    lat: 51.5150,
    lon: -0.1350,
    alt_ft: 41000,
    confidence: 0.91,
    calculated_at: '2024-01-01T12:04:00Z',
    has_adsb: true,
    sensor_count: 7
  }
];

export const demoSensors: Sensor[] = [
  {
    id: 'sensor_001',
    lat: 51.5000,
    lon: -0.1000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_002',
    lat: 51.5200,
    lon: -0.1500,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_003',
    lat: 51.4800,
    lon: -0.0800,
    status: 'maintenance',
    last_seen: '2024-01-01T11:45:00Z'
  },
  {
    id: 'sensor_004',
    lat: 51.5400,
    lon: -0.2000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_005',
    lat: 51.4600,
    lon: -0.0500,
    status: 'offline',
    last_seen: '2024-01-01T10:30:00Z'
  },
  {
    id: 'sensor_006',
    lat: 51.5600,
    lon: -0.2500,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_007',
    lat: 51.4400,
    lon: 0.0000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_008',
    lat: 51.5800,
    lon: -0.3000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_009',
    lat: 51.4200,
    lon: 0.0500,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_010',
    lat: 51.6000,
    lon: -0.3500,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_011',
    lat: 51.4000,
    lon: 0.1000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  },
  {
    id: 'sensor_012',
    lat: 51.6200,
    lon: -0.4000,
    status: 'online',
    last_seen: '2024-01-01T12:00:00Z'
  }
];

export function getDemoAircraftTrack(icao: string) {
  const baseAircraft = demoAircraft.find(a => a.icao === icao);
  if (!baseAircraft) return [];
  
  // Generate a realistic track history
  const track = [];
  const baseTime = new Date(baseAircraft.calculated_at);
  
  for (let i = 8; i >= 0; i--) {
    const time = new Date(baseTime.getTime() - i * 30000); // 30 second intervals
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lonOffset = (Math.random() - 0.5) * 0.01;
    const altOffset = Math.floor((Math.random() - 0.5) * 1000);
    
    track.push({
      lat: baseAircraft.lat + latOffset,
      lon: baseAircraft.lon + lonOffset,
      alt_ft: (baseAircraft.alt_ft || 30000) + altOffset,
      confidence: Math.max(0.3, baseAircraft.confidence + (Math.random() - 0.5) * 0.2),
      timestamp_iso: time.toISOString()
    });
  }
  
  return track;
}

// Fallback track for unknown aircraft
export function getFallbackTrack() {
  const now = new Date();
  return [
    {
      lat: 51.5074,
      lon: -0.1278,
      alt_ft: 35000,
      confidence: 0.95,
      timestamp_iso: now.toISOString()
    },
    {
      lat: 51.5074 + (Math.random() - 0.5) * 0.01,
      lon: -0.1278 + (Math.random() - 0.5) * 0.01,
      alt_ft: 35000 + Math.floor((Math.random() - 0.5) * 1000),
      confidence: Math.max(0.3, 0.95 + (Math.random() - 0.5) * 0.2),
      timestamp_iso: new Date(now.getTime() - 30000).toISOString()
    }
  ];
}
