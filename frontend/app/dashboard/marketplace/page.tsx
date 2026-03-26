'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'
import PurchaseModal from '@/components/marketplace/PurchaseModal'
import WalletConnectButton from '@/components/marketplace/WalletConnectButton'
import { useHederaWallet } from '@/components/marketplace/HederaWalletConnector'

// SensorMarketMap uses Leaflet — must be client-side only (fixes SSR crash)
const SensorMarketMap = dynamic(
  () => import('@/components/marketplace/SensorMarketMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0D1117]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">Loading sensor map...</p>
        </div>
      </div>
    ),
  }
)

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

export default function MarketplacePage() {
  const { isConnected, accountId, connect } = useHederaWallet()
  const [selectedOffering, setSelectedOffering] = useState<SensorOffering | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const handlePurchase = (offering: SensorOffering) => {
    setPurchaseSuccess(null)
    setPurchaseError(null)

    if (!isConnected) {
      connect()
      return
    }

    setSelectedOffering(offering)
  }

  const handleConfirmPurchase = async (request: {
    offering_id: string
    quantity?: number
    duration_hours?: number
  }) => {
    if (!isConnected || !accountId) {
      setPurchaseError('Wallet not connected')
      return
    }

    setPurchaseLoading(true)
    setPurchaseError(null)

    try {
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          buyer_account_id: accountId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Purchase failed')
      }

      const data = await res.json()
      setPurchaseSuccess(
        `Purchase confirmed! Transaction ID: ${data.transaction_id}. Your API key: ${data.api_key}` 
      )
      setSelectedOffering(null)
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setPurchaseLoading(false)
    }
  }

  return (
    <ClientOnlyWrapper>
      <div className="min-h-screen bg-[#0D1117] text-white">
        {/* Header */}
        <div className="bg-[#161B22] border-b border-[#30363D] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AircraftWorth Sensor Marketplace</h1>
              <p className="text-sm text-gray-400 mt-1">
                Purchase live MLAT and Mode‑S data from our global sensor network. Payments via Hedera HBAR.
              </p>
            </div>
            <WalletConnectButton />
          </div>
        </div>

        {/* Wallet prompt banner */}
        {!isConnected && (
          <div className="bg-indigo-900/20 border-b border-indigo-500/30 px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-sm text-indigo-300">
                Connect your Hedera wallet (HashPack) to purchase sensor data access.
              </p>
              <button
                onClick={connect}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 underline"
              >
                Connect now →
              </button>
            </div>
          </div>
        )}

        {/* Success/Error banners */}
        {purchaseSuccess && (
          <div className="bg-green-900/20 border-b border-green-500/30 px-6 py-3">
            <div className="max-w-7xl mx-auto">
              <p className="text-sm text-green-400">✅ {purchaseSuccess}</p>
            </div>
          </div>
        )}
        {purchaseError && (
          <div className="bg-red-900/20 border-b border-red-500/30 px-6 py-3">
            <div className="max-w-7xl mx-auto">
              <p className="text-sm text-red-400">❌ {purchaseError}</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-[#161B22] rounded-lg border border-[#30363D] overflow-hidden" style={{ height: '70vh' }}>
            <SensorMarketMap onPurchase={handlePurchase} />
          </div>
        </div>

        {/* Purchase Modal */}
        {selectedOffering && (
          <PurchaseModal
            offering={selectedOffering}
            isOpen={!!selectedOffering}
            onClose={() => setSelectedOffering(null)}
            onConfirm={handleConfirmPurchase}
            isLoading={purchaseLoading}
          />
        )}
      </div>
    </ClientOnlyWrapper>
  )
}
