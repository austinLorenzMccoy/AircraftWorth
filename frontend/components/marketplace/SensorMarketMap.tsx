'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { supabase } from '@/lib/supabase'
import L from 'leaflet'

// Types
interface SensorOffering {
  id: string
  sensor_id: string
  data_type: 'raw_modes' | 'mlat_positions' | 'both'
  pricing_model: 'per_message' | 'per_minute' | 'per_hour' | 'per_day' | 'per_month' | 'bundle'
  price_amount: number
  token_id: string
  bundle_size?: number
  is_active: boolean
  sensor_name?: string
  sensor_location?: { coordinates: [number, number] }
}

interface MarketSensor {
  id: string
  name: string
  location: { coordinates: [number, number] }
  last_heartbeat?: string
  offerings_count: number
  min_price?: number
  active_offerings: SensorOffering[]
}

// Custom marker icon for sensors
const sensorIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 20px; height: 20px; border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
    ">S</div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// Component to control map view
function MapController({ sensors }: { sensors: MarketSensor[] }) {
  const map = useMap()

  useEffect(() => {
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(
        sensors.map(sensor => [
          sensor.location.coordinates[1],
          sensor.location.coordinates[0]
        ])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [sensors, map])

  return null
}

export default function SensorMarketMap() {
  const [sensors, setSensors] = useState<MarketSensor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSensor, setSelectedSensor] = useState<MarketSensor | null>(null)
  const [filters, setFilters] = useState({
    data_type: '',
    pricing_model: '',
  })

  useEffect(() => {
    fetchSensors()
  }, [filters])

  const fetchSensors = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.data_type) params.append('data_type', filters.data_type)
      if (filters.pricing_model) params.append('pricing_model', filters.pricing_model)

      const response = await fetch(`/api/marketplace/sensors?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sensors')
      }

      const data = await response.json()
      setSensors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, token: string) => {
    if (token === 'HBAR') {
      // Convert from tinybars to HBAR
      const hbar = amount / 100000000
      return `${hbar.toFixed(6)} HBAR`
    }
    return `${amount} ${token}`
  }

  const formatPricingModel = (model: string) => {
    const models = {
      per_message: 'Per Message',
      per_minute: 'Per Minute',
      per_hour: 'Per Hour',
      per_day: 'Per Day',
      per_month: 'Per Month',
      bundle: 'Bundle',
    }
    return models[model as keyof typeof models] || model
  }

  const formatDataType = (type: string) => {
    const types = {
      raw_modes: 'Raw Mode‑S',
      mlat_positions: 'MLAT Positions',
      both: 'Both',
    }
    return types[type as keyof typeof types] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketplace sensors...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchSensors}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (sensors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">📍</div>
          <p className="text-gray-600">No sensors found matching your criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="bg-white border-b p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Type
            </label>
            <select
              value={filters.data_type}
              onChange={(e) => setFilters(prev => ({ ...prev, data_type: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="raw_modes">Raw Mode‑S</option>
              <option value="mlat_positions">MLAT Positions</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pricing Model
            </label>
            <select
              value={filters.pricing_model}
              onChange={(e) => setFilters(prev => ({ ...prev, pricing_model: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Models</option>
              <option value="per_message">Per Message</option>
              <option value="per_hour">Per Hour</option>
              <option value="per_day">Per Day</option>
              <option value="per_month">Per Month</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchSensors}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.5, -0.1]}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapController sensors={sensors} />
          
          {sensors.map((sensor) => (
            <Marker
              key={sensor.id}
              position={[
                sensor.location.coordinates[1],
                sensor.location.coordinates[0]
              ]}
              icon={sensorIcon}
              eventHandlers={{
                click: () => setSelectedSensor(sensor),
              }}
            >
              <Popup>
                <div className="p-2 min-w-64">
                  <h3 className="font-semibold text-lg mb-2">{sensor.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Offerings:</span> {sensor.offerings_count}
                    </div>
                    
                    {sensor.min_price && (
                      <div>
                        <span className="font-medium">From:</span>{' '}
                        {formatPrice(sensor.min_price, 'HBAR')}
                      </div>
                    )}
                    
                    {sensor.last_heartbeat && (
                      <div>
                        <span className="font-medium">Last seen:</span>{' '}
                        {new Date(sensor.last_heartbeat).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <h4 className="font-medium text-sm">Available Offerings:</h4>
                    {sensor.active_offerings.map((offering) => (
                      <div key={offering.id} className="bg-gray-50 p-2 rounded text-xs">
                        <div className="font-medium">
                          {formatDataType(offering.data_type)}
                        </div>
                        <div>
                          {formatPricingModel(offering.pricing_model)} -{' '}
                          {formatPrice(offering.price_amount, offering.token_id)}
                          {offering.bundle_size && (
                            <span> ({offering.bundle_size} messages)</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // TODO: Open purchase modal
                            console.log('Purchase offering:', offering.id)
                          }}
                          className="mt-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                        >
                          Purchase
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected Sensor Sidebar */}
      {selectedSensor && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">{selectedSensor.name}</h3>
            <button
              onClick={() => setSelectedSensor(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Location:</span>{' '}
              {selectedSensor.location.coordinates[1].toFixed(4)},{' '}
              {selectedSensor.location.coordinates[0].toFixed(4)}
            </div>
            
            <div>
              <span className="font-medium">Active Offerings:</span>{' '}
              {selectedSensor.offerings_count}
            </div>
            
            {selectedSensor.min_price && (
              <div>
                <span className="font-medium">Starting from:</span>{' '}
                {formatPrice(selectedSensor.min_price, 'HBAR')}
              </div>
            )}
            
            <div className="pt-2 border-t">
              <h4 className="font-medium mb-2">All Offerings:</h4>
              <div className="space-y-2">
                {selectedSensor.active_offerings.map((offering) => (
                  <div key={offering.id} className="bg-gray-50 p-2 rounded">
                    <div className="font-medium text-xs">
                      {formatDataType(offering.data_type)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatPricingModel(offering.pricing_model)}
                    </div>
                    <div className="text-xs font-medium text-indigo-600">
                      {formatPrice(offering.price_amount, offering.token_id)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
