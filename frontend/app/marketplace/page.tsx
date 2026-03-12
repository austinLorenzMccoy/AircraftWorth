'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MarketSensor, SensorOffering, PurchaseRequest } from '@/types/marketplace'
import OfferingCard from '@/components/marketplace/OfferingCard'
import PurchaseModal from '@/components/marketplace/PurchaseModal'

// Dynamic import for client-side only components
const SensorMarketMap = dynamic(() => import('@/components/marketplace/SensorMarketMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div></div>
})

export default function MarketplacePage() {
  const [sensors, setSensors] = useState<MarketSensor[]>([])
  const [selectedOffering, setSelectedOffering] = useState<SensorOffering | null>(null)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [filters, setFilters] = useState({
    data_type: '',
    pricing_model: '',
    min_price: '',
    max_price: '',
  })

  useEffect(() => {
    fetchSensors()
  }, [filters])

  const fetchSensors = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/marketplace/sensors?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sensors')
      
      const data = await response.json()
      setSensors(data)
    } catch (error) {
      console.error('Error fetching sensors:', error)
    }
  }

  const handlePurchase = (offering: SensorOffering) => {
    setSelectedOffering(offering)
    setIsPurchaseModalOpen(true)
  }

  const handlePurchaseConfirm = async (request: PurchaseRequest) => {
    if (!selectedOffering) return

    try {
      setIsLoading(true)

      // Initiate purchase
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate purchase')
      }

      const purchaseData = await response.json()

      // TODO: Integrate with Hedera wallet
      // For now, just show the transaction data
      console.log('Purchase initiated:', purchaseData)

      // Close modal and reset
      setIsPurchaseModalOpen(false)
      setSelectedOffering(null)

      // Show success message
      alert('Purchase initiated! Please connect your wallet to complete the payment.')

    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to initiate purchase. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getAllOfferings = (): SensorOffering[] => {
    return sensors.flatMap(sensor => sensor.active_offerings)
  }

  const filteredOfferings = getAllOfferings().filter(offering => {
    if (filters.data_type && offering.data_type !== filters.data_type) return false
    if (filters.pricing_model && offering.pricing_model !== filters.pricing_model) return false
    if (filters.min_price && offering.price_amount < parseFloat(filters.min_price)) return false
    if (filters.max_price && offering.price_amount > parseFloat(filters.max_price)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Marketplace</h1>
                <p className="mt-2 text-gray-600">
                  Purchase access to live Mode‑S data and MLAT positions from our sensor network
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setView('map')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    view === 'map'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    view === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                value={filters.data_type}
                onChange={(e) => setFilters(prev => ({ ...prev, data_type: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Models</option>
                <option value="per_message">Per Message</option>
                <option value="per_hour">Per Hour</option>
                <option value="per_day">Per Day</option>
                <option value="per_month">Per Month</option>
                <option value="bundle">Bundle</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price (HBAR)
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="0.000001"
                value={filters.min_price}
                onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price (HBAR)
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="1.000000"
                value={filters.max_price}
                onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-2xl font-bold text-indigo-600">{sensors.length}</div>
            <div className="text-gray-600">Active Sensors</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">
              {getAllOfferings().length}
            </div>
            <div className="text-gray-600">Total Offerings</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">
              {filteredOfferings.length}
            </div>
            <div className="text-gray-600">Filtered Results</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">
              {sensors.filter(s => s.offerings_count > 0).length}
            </div>
            <div className="text-gray-600">Sensors with Data</div>
          </div>
        </div>

        {/* Main Content */}
        {view === 'map' ? (
          <div className="bg-white rounded-lg border" style={{ height: '600px' }}>
            <SensorMarketMap />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOfferings.map((offering) => {
              const sensor = sensors.find(s => s.id === offering.sensor_id)
              if (!sensor) return null
              
              return (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  sensorName={sensor.name}
                  sensorLocation={sensor.location}
                  onPurchase={handlePurchase}
                />
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredOfferings.length === 0 && view === 'list' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No offerings found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later for new offerings.
            </p>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedOffering && (
        <PurchaseModal
          offering={selectedOffering}
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false)
            setSelectedOffering(null)
          }}
          onConfirm={handlePurchaseConfirm}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
