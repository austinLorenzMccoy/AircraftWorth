'use client'

import { useState } from 'react'
import { SensorOffering, PurchaseRequest } from '@/types/marketplace'

interface PurchaseModalProps {
  offering: SensorOffering
  isOpen: boolean
  onClose: () => void
  onConfirm: (request: PurchaseRequest) => void
  isLoading?: boolean
}

export default function PurchaseModal({ 
  offering, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: PurchaseModalProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [durationHours, setDurationHours] = useState<number>(1)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  if (!isOpen) return null

  const formatPrice = (amount: number, token: string) => {
    if (token === 'HBAR') {
      const hbar = amount / 100000000
      return `${hbar.toFixed(6)} HBAR`
    }
    return `${amount} ${token}`
  }

  const calculateTotalCost = () => {
    const basePrice = offering.price_amount
    
    switch (offering.pricing_model) {
      case 'per_message':
        return basePrice * quantity
      case 'bundle':
        const bundleSize = offering.bundle_size || 1
        const bundlesNeeded = Math.ceil(quantity / bundleSize)
        return basePrice * bundlesNeeded
      case 'per_minute':
        return basePrice * durationHours * 60
      case 'per_hour':
        return basePrice * durationHours
      case 'per_day':
        return basePrice * (durationHours / 24)
      case 'per_month':
        return basePrice * (durationHours / 24 / 30)
      default:
        return basePrice
    }
  }

  const handleConfirm = () => {
    const request: PurchaseRequest = {
      offering_id: offering.id,
    }

    if (offering.pricing_model === 'per_message' || offering.pricing_model === 'bundle') {
      request.quantity = quantity
    } else {
      request.duration_hours = durationHours
    }

    onConfirm(request)
  }

  const canConfirm = agreedToTerms && !isLoading

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">Purchase Data Access</h2>
              <p className="text-gray-600 mt-1">
                {offering.sensor_name} • {offering.data_type.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Pricing Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Pricing Model:</span>
              <span className="font-medium capitalize">
                {offering.pricing_model.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Unit Price:</span>
              <span className="font-medium">
                {formatPrice(offering.price_amount, offering.token_id)}
              </span>
            </div>
            {offering.bundle_size && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Bundle Size:</span>
                <span className="font-medium">{offering.bundle_size} messages</span>
              </div>
            )}
          </div>

          {/* Quantity/Duration Input */}
          {offering.pricing_model === 'per_message' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Messages
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll be charged per message received
              </p>
            </div>
          )}

          {offering.pricing_model === 'bundle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messages Needed
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Bundles of {offering.bundle_size} messages • {Math.ceil(quantity / (offering.bundle_size || 1))} bundle(s) required
              </p>
            </div>
          )}

          {(offering.pricing_model === 'per_hour' || 
            offering.pricing_model === 'per_day' || 
            offering.pricing_model === 'per_month') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={durationHours}
                onChange={(e) => setDurationHours(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {offering.pricing_model === 'per_day' && '≈ ' + (durationHours / 24).toFixed(1) + ' days'}
                {offering.pricing_model === 'per_month' && '≈ ' + (durationHours / 24 / 30).toFixed(1) + ' months'}
              </p>
            </div>
          )}

          {/* Total Cost */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Cost:</span>
              <span className="text-2xl font-bold text-indigo-600">
                {formatPrice(calculateTotalCost(), offering.token_id)}
              </span>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-t pt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Terms & Conditions</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Payment is non-refundable</li>
                <li>• Data access expires when credits/time are exhausted</li>
                <li>• API key will be provided after successful payment</li>
                <li>• All transactions are recorded on Hedera blockchain</li>
                <li>• You must comply with aviation data regulations</li>
              </ul>
            </div>
            
            <label className="flex items-center mt-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mr-2"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                I agree to the terms and conditions
              </span>
            </label>
          </div>

          {/* Hedera Payment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Payment Information</h4>
            <p className="text-sm text-blue-700">
              You'll be redirected to connect your Hedera wallet (HashPack, Blade, etc.) 
              to complete this purchase. The transaction will be signed and submitted to the Hedera network.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : (
                'Connect Wallet & Pay'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
