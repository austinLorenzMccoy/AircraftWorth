'use client'

import { useState } from 'react'
import { useHederaWallet } from './HederaWalletConnector'

export default function WalletConnectButton() {
  const { isConnected, accountId, balance, network, walletType, connect, disconnect } = useHederaWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      await connect()
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    setShowDetails(false)
    setError(null)
  }

  const copyAccountId = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Connected state ───────────────────────────────────────────────
  if (isConnected && accountId) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg text-sm text-green-300 hover:bg-green-900/50 transition-colors"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-mono">{accountId.slice(0, 10)}...</span>
          <span className="text-green-500">{balance.toFixed(3)} ℏ</span>
          <span className="text-green-700">▾</span>
        </button>

        {showDetails && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl p-4 z-50">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-white">Wallet Details</h4>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Account ID</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm text-white font-mono">{accountId}</code>
                  <button
                    onClick={copyAccountId}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className="text-lg text-white font-mono">{balance.toFixed(4)} ℏ</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Network</p>
                <p className="text-sm text-white capitalize">{network}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Wallet Type</p>
                <p className="text-sm text-white">{walletType}</p>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Disconnected state ─────────────────────────────────────────────
  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <span className="text-indigo-600 text-xs font-bold">ₕ</span>
            </span>
            <span>Connect HashPack</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
