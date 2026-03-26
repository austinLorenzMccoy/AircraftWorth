import { NextRequest, NextResponse } from 'next/server'

// Mock sensor data for hackathon demo
const mockSensors = [
  {
    id: 'sensor-001',
    name: 'London Heathrow',
    location: '51.4700°N, 0.4543°W',
    status: 'active',
    data_types: ['raw_modes', 'mlat_positions'],
    offerings_count: 3,
    active_offerings: [
      {
        id: 'offering-001',
        sensor_id: 'sensor-001',
        data_type: 'raw_modes',
        pricing_model: 'per_hour',
        price_amount: 0.5,
        duration_hours: 24,
        description: 'Access to raw Mode‑S transponder data from Heathrow airport'
      },
      {
        id: 'offering-002', 
        sensor_id: 'sensor-001',
        data_type: 'mlat_positions',
        pricing_model: 'per_day',
        price_amount: 2.0,
        duration_hours: 72,
        description: 'High-precision MLAT positioning data from Heathrow sensor network'
      },
      {
        id: 'offering-003',
        sensor_id: 'sensor-001', 
        data_type: 'both',
        pricing_model: 'bundle',
        price_amount: 5.0,
        duration_hours: 168,
        description: 'Complete access to all data types for one week'
      }
    ]
  },
  {
    id: 'sensor-002',
    name: 'New York JFK',
    location: '40.6413°N, 73.7781°W',
    status: 'active',
    data_types: ['mlat_positions'],
    offerings_count: 2,
    active_offerings: [
      {
        id: 'offering-004',
        sensor_id: 'sensor-002',
        data_type: 'mlat_positions',
        pricing_model: 'per_hour',
        price_amount: 0.75,
        duration_hours: 12,
        description: 'MLAT positioning data from JFK airport coverage area'
      },
      {
        id: 'offering-005',
        sensor_id: 'sensor-002',
        data_type: 'mlat_positions', 
        pricing_model: 'bundle',
        price_amount: 8.0,
        duration_hours: 96,
        description: 'Extended MLAT access with historical data included'
      }
    ]
  },
  {
    id: 'sensor-003',
    name: 'Tokyo Haneda',
    location: '35.5533°N, 139.7811°E',
    status: 'active',
    data_types: ['raw_modes', 'mlat_positions'],
    offerings_count: 2,
    active_offerings: [
      {
        id: 'offering-006',
        sensor_id: 'sensor-003',
        data_type: 'both',
        pricing_model: 'per_month',
        price_amount: 25.0,
        duration_hours: 720,
        description: 'Full access to Tokyo Bay Area sensor network'
      },
      {
        id: 'offering-007',
        sensor_id: 'sensor-003',
        data_type: 'raw_modes',
        pricing_model: 'per_day',
        price_amount: 3.5,
        duration_hours: 48,
        description: 'Mode‑S data from Pacific region coverage'
      }
    ]
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const data_type = searchParams.get('data_type') || ''
    const pricing_model = searchParams.get('pricing_model') || ''
    const min_price = searchParams.get('min_price') || ''
    const max_price = searchParams.get('max_price') || ''
    
    // Filter sensors based on query params
    let filteredSensors = mockSensors
    
    if (data_type) {
      filteredSensors = filteredSensors.filter(sensor => 
        sensor.data_types.includes(data_type)
      )
    }
    
    if (pricing_model) {
      filteredSensors = filteredSensors.map(sensor => ({
        ...sensor,
        active_offerings: sensor.active_offerings.filter(offering => 
          offering.pricing_model === pricing_model
        )
      }))
    }
    
    if (min_price || max_price) {
      filteredSensors = filteredSensors.map(sensor => ({
        ...sensor,
        active_offerings: sensor.active_offerings.filter(offering => {
          const price = offering.price_amount
          if (min_price && price < parseFloat(min_price)) return false
          if (max_price && price > parseFloat(max_price)) return false
          return true
        })
      }))
    }
    
    return NextResponse.json(filteredSensors)
  } catch (error) {
    console.error('Marketplace sensors API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sensors' },
      { status: 500 }
    )
  }
}
