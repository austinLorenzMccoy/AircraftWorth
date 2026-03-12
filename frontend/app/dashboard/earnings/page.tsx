'use client'

import { useState, useEffect } from 'react'

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<{
    total_earnings: number
    total_subscriptions: number
    recent_earnings: {
      total_amount: number
      token_id: string
      created_at: string
      consumer_account: string
    }[]
  }>({
    total_earnings: 0,
    total_subscriptions: 0,
    recent_earnings: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      setError(null)

      // This would be a real API call
      // const response = await fetch('/api/marketplace/earnings')
      // const data = await response.json()
      
      // Mock data for now
      const mockData = {
        total_earnings: 1250.50,
        total_subscriptions: 15,
        recent_earnings: [
          {
            total_amount: 100000000, // 1 HBAR in tinybars
            token_id: 'HBAR',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            consumer_account: '0.0.1234567'
          },
          {
            total_amount: 50000000, // 0.5 HBAR
            token_id: 'HBAR',
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            consumer_account: '0.0.2345678'
          },
          {
            total_amount: 75000000, // 0.75 HBAR
            token_id: 'HBAR',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            consumer_account: '0.0.3456789'
          }
        ]
      }
      
      setEarnings(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, token: string) => {
    if (token === 'HBAR') {
      const hbar = amount / 100000000
      return `${hbar.toFixed(6)} HBAR`
    }
    return `${amount} ${token}`
  }

  const formatAccount = (account: string) => {
    return `${account.slice(0, 8)}...${account.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading earnings...</p>
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
            onClick={fetchEarnings}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h2>
        <button
          onClick={fetchEarnings}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Refresh
        </button>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">₿</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(earnings.total_earnings * 100000000, 'HBAR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{earnings.total_subscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. per Subscription</p>
              <p className="text-2xl font-bold text-gray-900">
                {earnings.total_subscriptions > 0 
                  ? formatPrice((earnings.total_earnings * 100000000) / earnings.total_subscriptions, 'HBAR')
                  : '0 HBAR'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Earnings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Earnings</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {earnings.recent_earnings.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent earnings
            </div>
          ) : (
            earnings.recent_earnings.map((earning, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">
                        {formatPrice(earning.total_amount, earning.token_id)}
                      </span>
                      <span className="text-sm text-gray-500">
                        from {formatAccount(earning.consumer_account)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(earning.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                      Completed
                    </span>
                    <a
                      href="#"
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      Details
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sensor Performance */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sensor Performance</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sensor #001 - London</span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">8 subscriptions</span>
                <span className="font-medium text-green-600">+0.85 HBAR</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sensor #002 - Manchester</span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">5 subscriptions</span>
                <span className="font-medium text-green-600">+0.42 HBAR</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sensor #003 - Birmingham</span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">2 subscriptions</span>
                <span className="font-medium text-green-600">+0.18 HBAR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Withdraw Earnings</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Balance
              </label>
              <div className="text-2xl font-bold text-indigo-600">
                {formatPrice(earnings.total_earnings * 100000000, 'HBAR')}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Withdrawal Address
              </label>
              <input
                type="text"
                placeholder="0.0.1234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (HBAR)
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="0.000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Withdraw
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
