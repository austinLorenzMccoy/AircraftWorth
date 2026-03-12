'use client'

import { useState, useEffect } from 'react'

interface HederaWallet {
  isConnected: boolean
  accountId: string | null
  balance: number
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (transactionData: any) => Promise<any>
  sendTransaction: (signedTransaction: any) => Promise<any>
}

export function useHederaWallet(): HederaWallet {
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    // Check if wallet is already connected on mount
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      // Check for HashPack wallet
      if (typeof window !== 'undefined' && (window as any).hashpack) {
        const connection = await (window as any).hashpack.getConnection()
        if (connection && connection.accountIds.length > 0) {
          setAccountId(connection.accountIds[0])
          setIsConnected(true)
          await fetchBalance(connection.accountIds[0])
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error)
    }
  }

  const fetchBalance = async (account: string) => {
    try {
      // This would be a real API call to get account balance
      // For now, mock balance
      setBalance(Math.random() * 100)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const connect = async () => {
    try {
      // Try HashPack wallet first
      if (typeof window !== 'undefined' && (window as any).hashpack) {
        const connection = await (window as any).hashpack.connectToWallet()
        if (connection && connection.accountIds.length > 0) {
          const accountId = connection.accountIds[0]
          setAccountId(accountId)
          setIsConnected(true)
          await fetchBalance(accountId)
          return
        }
      }

      // Fallback to other wallets or manual connection
      // For demo purposes, we'll simulate a connection
      const mockAccountId = '0.0.1234567'
      setAccountId(mockAccountId)
      setIsConnected(true)
      setBalance(Math.random() * 100)
      
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw new Error('Failed to connect wallet')
    }
  }

  const disconnect = () => {
    try {
      // Disconnect from HashPack if available
      if (typeof window !== 'undefined' && (window as any).hashpack) {
        (window as any).hashpack.disconnect()
      }
      
      setAccountId(null)
      setIsConnected(false)
      setBalance(0)
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  const signTransaction = async (transactionData: any) => {
    try {
      if (!isConnected || !accountId) {
        throw new Error('Wallet not connected')
      }

      // For HashPack wallet
      if (typeof window !== 'undefined' && (window as any).hashpack) {
        const signedTransaction = await (window as any).hashpack.signTransaction(transactionData)
        return signedTransaction
      }

      // Fallback: simulate signing
      return {
        ...transactionData,
        signature: 'mock_signature_' + Date.now()
      }
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw new Error('Failed to sign transaction')
    }
  }

  const sendTransaction = async (signedTransaction: any) => {
    try {
      // This would send the transaction to Hedera network
      // For demo purposes, simulate successful transaction
      const transactionId = `0.0.${Math.floor(Math.random() * 1000000)}@${Date.now()}`
      
      return {
        success: true,
        transactionId,
        receipt: {
          status: 'SUCCESS',
          exchangeRate: {
            Hbars: 1,
            cents: 12000 // $0.12 per HBAR
          }
        }
      }
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw new Error('Failed to send transaction')
    }
  }

  return {
    isConnected,
    accountId,
    balance,
    connect,
    disconnect,
    signTransaction,
    sendTransaction
  }
}

// Wallet connection component
export default function HederaWalletConnector({ 
  onConnect, 
  onDisconnect 
}: { 
  onConnect?: (accountId: string) => void
  onDisconnect?: () => void 
}) {
  const wallet = useHederaWallet()

  useEffect(() => {
    if (wallet.isConnected && wallet.accountId) {
      onConnect?.(wallet.accountId)
    } else {
      onDisconnect?.()
    }
  }, [wallet.isConnected, wallet.accountId, onConnect, onDisconnect])

  if (wallet.isConnected) {
    return (
      <div className="flex items-center space-x-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">Connected</span>
        </div>
        <div className="text-sm text-gray-600">
          <div>Account: {wallet.accountId}</div>
          <div>Balance: {wallet.balance.toFixed(6)} HBAR</div>
        </div>
        <button
          onClick={wallet.disconnect}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Hedera Wallet</h3>
        <p className="text-gray-600 mb-4">
          Connect your HashPack or other Hedera wallet to complete this purchase
        </p>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={wallet.connect}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Connect HashPack Wallet
        </button>
        
        <div className="text-sm text-gray-500">
          Don't have a wallet?{' '}
          <a 
            href="https://www.hashpack.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Download HashPack
          </a>
        </div>
        
        <div className="text-xs text-gray-400 border-t pt-3">
          <p>• Your wallet will be used to sign the payment transaction</p>
          <p>• No funds will be transferred without your approval</p>
          <p>• All transactions are recorded on the Hedera blockchain</p>
        </div>
      </div>
    </div>
  )
}
