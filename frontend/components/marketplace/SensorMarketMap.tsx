'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// ── Types ────────────────────────────────────────────────────────────
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

interface SensorMarketMapProps {
  onPurchase: (offering: SensorOffering) => void
}

// ── Sensor marker icon ────────────────────────────────────────────────
const sensorIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 22px; height: 22px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border: 2.5px solid #ffffff;
      box-shadow: 0 2px 10px rgba(99,102,241,0.5);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 10px;
    ">S</div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// ── Component ───────────────────────────────────────────────────────────────
export default function SensorMarketMap({ onPurchase }: SensorMarketMapProps) {
  const [sensors, setSensors] = useState<MarketSensor[]>([])
  const [selectedSensor, setSelectedSensor] = useState<MarketSensor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSensors()
  }, [])

  const fetchSensors = async () => {
    try {
      const response = await fetch('/api/marketplace/sensors')
      if (!response.ok) throw new Error('Failed to fetch sensors')
      
      const data = await response.json()
      setSensors(data)
    } catch (error) {
      console.error('Error fetching sensors:', error)
      setError('Failed to load sensor data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0D1117]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading sensor network...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0D1117]">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
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

  return (
    <div className="h-full flex flex-col">
      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.5074, -0.1278]} // London center
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          className="bg-[#0D1117]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Sensor Markers */}
          {sensors.map((sensor) => (
            <Marker
              key={sensor.id}
              position={[sensor.location.coordinates[0], sensor.location.coordinates[1]]}
              icon={sensorIcon}
              eventHandlers={{
                click: () => setSelectedSensor(sensor),
              }}
            >
              <Popup>
                <div className="bg-[#161B22] text-white p-4 rounded-lg min-w-[200px]">
                  <h3 className="font-semibold text-white mb-2">{sensor.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {sensor.offerings_count} active offerings
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-white">Available Offerings:</h4>
                    {sensor.active_offerings.map((offering) => (
                      <div key={offering.id} className="bg-[#0D1117] p-2 rounded text-xs">
                        <div className="font-medium text-white">
                          {offering.data_type === 'raw_modes' && 'Raw Mode‑S'}
                          {offering.data_type === 'mlat_positions' && 'MLAT Positions'}
                          {offering.data_type === 'both' && 'Both Data Types'}
                        </div>
                        <div className="text-gray-400">
                          {offering.pricing_model === 'per_message' && `${offering.price_amount} ℏ per message`}
                          {offering.pricing_model === 'per_hour' && `${offering.price_amount} ℏ per hour`}
                          {offering.pricing_model === 'per_day' && `${offering.price_amount} ℏ per day`}
                          {offering.pricing_model === 'bundle' && `${offering.price_amount} ℏ bundle`}
                        </div>
                        <button
                          onClick={() => onPurchase(offering)}
                          className="mt-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                        >
                          Purchase Access
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
        <div className="absolute top-4 right-4 w-80 bg-[#161B22] border border-[#30363D] rounded-lg p-4 shadow-xl">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg text-white">{selectedSensor.name}</h3>
            <button
              onClick={() => setSelectedSensor(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">
            {selectedSensor.offerings_count} active offerings
          </p>
          
          <div className="space-y-2">
            {selectedSensor.active_offerings.map((offering) => (
              <div key={offering.id} className="bg-[#0D1117] p-3 rounded border border-[#30363D]">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-white">
                    {offering.data_type === 'raw_modes' && 'Raw Mode‑S'}
                    {offering.data_type === 'mlat_positions' && 'MLAT Positions'}
                    {offering.data_type === 'both' && 'Both Data Types'}
                  </span>
                  <span className="text-sm text-indigo-400">
                    {offering.price_amount} ℏ
                  </span>
                </div>
                
                <div className="text-xs text-gray-400 mb-2">
                  {offering.pricing_model === 'per_message' && 'per message'}
                  {offering.pricing_model === 'per_hour' && 'per hour'}
                  {offering.pricing_model === 'per_day' && 'per day'}
                  {offering.pricing_model === 'bundle' && 'bundle package'}
                </div>
                
                <button
                  onClick={() => onPurchase(offering)}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
                >
                  Purchase Access
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
