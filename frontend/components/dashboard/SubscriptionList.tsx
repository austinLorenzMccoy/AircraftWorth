'use client'

import { useState, useEffect } from 'react'
import { Subscription } from '@/types/marketplace'

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/marketplace/my-subscriptions')
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }

      const data = await response.json()
      setSubscriptions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return
    }

    try {
      const response = await fetch(`/api/marketplace/cancel-subscription/${subscriptionId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      // Refresh subscriptions
      fetchSubscriptions()
    } catch (err) {
      alert('Failed to cancel subscription. Please try again.')
    }
  }

  const formatPrice = (amount: number, token: string) => {
    if (token === 'HBAR') {
      const hbar = amount / 100000000
      return `${hbar.toFixed(6)} HBAR`
    }
    return `${amount} ${token}`
  }

  const formatDataType = (type: string) => {
    const types = {
      raw_modes: 'Raw Mode‑S',
      mlat_positions: 'MLAT Positions',
      both: 'Both',
    }
    return types[type as keyof typeof types] || type
  }

  const getSubscriptionStatus = (subscription: Subscription) => {
    const now = new Date()
    
    if (subscription.status === 'cancelled') {
      return { text: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-100' }
    }
    
    if (subscription.end_time) {
      const endTime = new Date(subscription.end_time)
      if (endTime < now) {
        return { text: 'Expired', color: 'text-red-600', bg: 'bg-red-100' }
      }
      return { text: 'Active', color: 'text-green-600', bg: 'bg-green-100' }
    }
    
    if (subscription.remaining_credits !== undefined) {
      if (subscription.remaining_credits <= 0) {
        return { text: 'Exhausted', color: 'text-orange-600', bg: 'bg-orange-100' }
      }
      return { text: 'Active', color: 'text-green-600', bg: 'bg-green-100' }
    }
    
    return { text: 'Active', color: 'text-green-600', bg: 'bg-green-100' }
  }

  const getTimeRemaining = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchSubscriptions}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No active subscriptions
        </h3>
        <p className="text-gray-600 mb-4">
          You haven't purchased any data access yet.
        </p>
        <a
          href="/marketplace"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Browse Marketplace
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Subscriptions</h2>
        <button
          onClick={fetchSubscriptions}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {subscriptions.map((subscription) => {
          const status = getSubscriptionStatus(subscription)
          const offering = subscription.offering
          
          return (
            <div key={subscription.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {offering?.sensor_name || 'Unknown Sensor'}
                  </h3>
                  <p className="text-gray-600">
                    {formatDataType(offering?.data_type || 'both')}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                  {status.text}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600">Pricing:</span>
                  <div className="font-medium">
                    {offering?.pricing_model?.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Cost:</span>
                  <div className="font-medium">
                    {formatPrice(subscription.total_amount, subscription.token_id)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Started:</span>
                  <div className="font-medium">
                    {new Date(subscription.start_time).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Time/Credits:</span>
                  <div className="font-medium">
                    {subscription.end_time 
                      ? getTimeRemaining(subscription.end_time)
                      : `${subscription.remaining_credits || 0} credits`
                    }
                  </div>
                </div>
              </div>

              {/* Progress Bar for Time-based Subscriptions */}
              {subscription.end_time && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Time Remaining</span>
                    <span>{getTimeRemaining(subscription.end_time)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, 
                          ((new Date(subscription.end_time).getTime() - new Date().getTime()) /
                          (new Date(subscription.end_time).getTime() - new Date(subscription.start_time).getTime())) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Progress Bar for Credit-based Subscriptions */}
              {subscription.remaining_credits !== undefined && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Credits Remaining</span>
                    <span>{subscription.remaining_credits}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, (subscription.remaining_credits / 100) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                {subscription.status === 'active' && (
                  <>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                      View API Keys
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Download Data
                    </button>
                  </>
                )}
                {subscription.status === 'active' && (
                  <button
                    onClick={() => handleCancelSubscription(subscription.id)}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
                {subscription.transaction_hash && (
                  <a
                    href={`https://hashscan.io/testnet/transaction/${subscription.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
