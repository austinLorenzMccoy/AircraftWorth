'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ────────────────────────────────────────────────────────────
export interface HederaWallet {
  isConnected: boolean
  accountId: string | null
  balance: number
  network: 'testnet' | 'mainnet'
  walletType: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signAndSendTransaction: (params: TransactionParams) => Promise<TransactionResult>
  getAccountInfo: () => Promise<AccountInfo>
}

export interface TransactionParams {
  offeringId: string
  amount: number        // in tinybars
  recipientId: string   // operator Hedera account ID e.g. "0.0.123456"
  memo?: string
}

export interface TransactionResult {
  success: boolean
  transactionId: string
  receipt: {
    status: string
    transactionHash: string
    timestamp: string
  }
}

export interface AccountInfo {
  accountId: string
  balance: string
  network: string
  walletType: string | null
}

// ── Storage key ───────────────────────────────────────────────────────
const STORAGE_KEY = 'aircraftworth_hedera_wallet'

// ── Hook ───────────────────────────────────────────────────────────────
export function useHederaWallet(): HederaWallet {
  const [mounted, setMounted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [walletType, setWalletType] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // HashPack browser extension detection
  const hashpackRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
    
    // Check for existing connection
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const connection = JSON.parse(stored)
        setAccountId(connection.accountId)
        setWalletType(connection.walletType)
        setIsConnected(true)
        setNetwork(connection.network || 'testnet')
        
        // Fetch real balance from Hedera testnet
        fetchBalance(connection.accountId)
      } catch (error) {
        console.error('Error parsing stored wallet connection:', error)
      }
    }

    // Detect HashPack extension
    if (typeof window !== 'undefined') {
      // @ts-ignore - HashPack global
      hashpackRef.current = window.hashpack
      
      // Listen for HashPack events
      if (hashpackRef.current) {
        hashpackRef.current.on('disconnect', () => {
          handleDisconnect()
        })
      }
    }

    return () => {
      if (hashpackRef.current) {
        hashpackRef.current.disconnect()
      }
    }
  }, [])

  const fetchBalance = async (accountId: string) => {
    try {
      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
      )
      if (response.ok) {
        const data = await response.json()
        setBalance(parseFloat(data.balance.balance) / 100000000) // Convert tinybars to HBAR
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const connect = async () => {
    if (isConnecting) return
    
    setIsConnecting(true)
    try {
      // Try HashPack browser extension first
      if (hashpackRef.current) {
        const authData = await hashpackRef.current.connect({
          network: 'testnet',
          metadata: {
            name: 'AircraftWorth Marketplace',
            description: 'MLAT sensor data marketplace',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
        })

        if (authData.accountIds && authData.accountIds.length > 0) {
          const accountId = authData.accountIds[0]
          setAccountId(accountId)
          setWalletType('HashPack')
          setIsConnected(true)
          setNetwork('testnet')
          
          // Store connection
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            accountId,
            walletType: 'HashPack',
            network: 'testnet',
            connectedAt: new Date().toISOString(),
          }))
          
          // Fetch real balance
          await fetchBalance(accountId)
        }
      } else {
        // Fallback to WalletConnect QR code
        await connectWithWalletConnect()
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error)
      throw new Error(error.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const connectWithWalletConnect = async () => {
    // WalletConnect QR code fallback for mobile HashPack
    try {
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      if (!projectId) {
        throw new Error('WalletConnect project ID not configured')
      }

      // For hackathon demo, create mock connection
      const mockAccountId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`
      setAccountId(mockAccountId)
      setWalletType('HashPack (WC)')
      setIsConnected(true)
      setNetwork('testnet')
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accountId: mockAccountId,
        walletType: 'HashPack (WC)',
        network: 'testnet',
        connectedAt: new Date().toISOString(),
      }))
      
      setBalance(Math.random() * 100) // Mock balance
    } catch (error) {
      console.error('WalletConnect error:', error)
      throw error
    }
  }

  const disconnect = async () => {
    try {
      if (hashpackRef.current) {
        await hashpackRef.current.disconnect()
      }
      
      handleDisconnect()
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }

  const handleDisconnect = () => {
    setAccountId(null)
    setWalletType(null)
    setIsConnected(false)
    setBalance(0)
    localStorage.removeItem(STORAGE_KEY)
  }

  const signAndSendTransaction = async (params: TransactionParams): Promise<TransactionResult> => {
    if (!isConnected || !accountId) {
      throw new Error('Wallet not connected')
    }

    try {
      // Mock transaction for hackathon demo
      const mockTransactionId = `0.0.${Math.floor(Math.random() * 999999)}@${Date.now()}`
      
      return {
        success: true,
        transactionId: mockTransactionId,
        receipt: {
          status: 'SUCCESS',
          transactionHash: mockTransactionId,
          timestamp: new Date().toISOString(),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        receipt: {
          status: 'FAILED',
          transactionHash: '',
          timestamp: new Date().toISOString(),
        },
      }
    }
  }

  const getAccountInfo = async (): Promise<AccountInfo> => {
    if (!accountId) {
      throw new Error('No account connected')
    }

    return {
      accountId,
      balance: balance.toString(),
      network,
      walletType,
    }
  }

  return {
    isConnected,
    accountId,
    balance,
    network,
    walletType,
    connect,
    disconnect,
    signAndSendTransaction,
    getAccountInfo,
  }
}
