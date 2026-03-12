'use client'

import { useState } from 'react'
import { SensorOffering } from '@/types/marketplace'

interface OfferingCardProps {
  offering: SensorOffering
  sensorName: string
  sensorLocation: { coordinates: [number, number] }
  onPurchase: (offering: SensorOffering) => void
}

export default function OfferingCard({ 
  offering, 
  sensorName, 
  sensorLocation, 
  onPurchase 
}: OfferingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatPrice = (amount: number, token: string) => {
    if (token === 'HBAR') {
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

  const getPricingDescription = () => {
    switch (offering.pricing_model) {
      case 'per_message':
        return `Pay for each Mode‑S message received`
      case 'per_minute':
        return `Access to live data stream per minute`
      case 'per_hour':
        return `Hourly access to sensor data`
      case 'per_day':
        return `Full day access to sensor data`
      case 'per_month':
        return `Monthly subscription with unlimited access`
      case 'bundle':
        return `Pre-paid bundle of ${offering.bundle_size} messages`
      default:
        return ''
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{sensorName}</h3>
            <p className="text-sm text-gray-600">
              📍 {sensorLocation.coordinates[1].toFixed(4)}, {sensorLocation.coordinates[0].toFixed(4)}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            offering.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {offering.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Data Type */}
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {formatDataType(offering.data_type)}
          </span>
        </div>

        {/* Pricing */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-indigo-600">
                {formatPrice(offering.price_amount, offering.token_id)}
              </span>
              {offering.bundle_size && (
                <span className="text-sm text-gray-500 ml-1">
                  ({offering.bundle_size} messages)
                </span>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {formatPricingModel(offering.pricing_model)}
            </span>
          </div>
        </div>

        {/* Pricing Description */}
        <div className="text-sm text-gray-600 mb-3">
          {getPricingDescription()}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-3"
        >
          {isExpanded ? 'Show less ▲' : 'Show more ▼'}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Token:</span>
              <span className="font-medium">{offering.token_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Offering ID:</span>
              <span className="font-mono text-xs">{offering.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(offering.created_at).toLocaleDateString()}</span>
            </div>
            
            {/* Data Quality Indicators */}
            <div className="border-t pt-2 mt-2">
              <h4 className="font-medium mb-2">Data Quality:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Live Stream</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Validated</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>Real-time</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>On-chain</span>
                </div>
              </div>
            </div>

            {/* Usage Examples */}
            <div className="border-t pt-2 mt-2">
              <h4 className="font-medium mb-2">Use Cases:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {offering.data_type === 'raw_modes' && (
                  <>
                    <li>• Custom MLAT algorithms</li>
                    <li>• Signal analysis</li>
                    <li>• Research & development</li>
                  </>
                )}
                {offering.data_type === 'mlat_positions' && (
                  <>
                    <li>• Aircraft tracking</li>
                    <li>• Traffic monitoring</li>
                    <li>• Security applications</li>
                  </>
                )}
                {offering.data_type === 'both' && (
                  <>
                    <li>• Complete pipeline access</li>
                    <li>• Full dataset analysis</li>
                    <li>• Enterprise integration</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={() => onPurchase(offering)}
            disabled={!offering.is_active}
            className={`w-full py-2 px-4 rounded font-medium transition-colors ${
              offering.is_active
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {offering.is_active ? 'Purchase Access' : 'Currently Unavailable'}
          </button>
        </div>
      </div>
    </div>
  )
}
