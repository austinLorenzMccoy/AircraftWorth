'use client'

import { useState, useEffect } from 'react'

interface HederaWallet {
  isConnected: boolean
  accountId: string | null
  balance: number
  network: 'testnet' | 'mainnet'
  walletType: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signTransaction: (transactionData: any) => Promise<any>
  sendTransaction: (signedTransaction: any) => Promise<any>
  getAccountInfo: () => Promise<any>
}

export function useHederaWallet(): HederaWallet {
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet')
  const [walletType, setWalletType] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet is already connected on mount
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      // Check for existing connection in localStorage or session
      const savedConnection = localStorage.getItem('hedera_wallet_connection')
      if (savedConnection) {
        const connection = JSON.parse(savedConnection)
        setAccountId(connection.accountId)
        setIsConnected(true)
        setWalletType(connection.walletType || 'HashPack')
        await fetchBalance(connection.accountId)
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error)
    }
  }

  const connect = async () => {
    try {
      // For demo purposes, simulate wallet connection
      // In production, this would integrate with real HashPack or other wallets
      const mockAccountId = `0.0.${Math.floor(Math.random() * 9000000) + 1000000}`
      const mockBalance = Math.random() * 100
      
      setAccountId(mockAccountId)
      setBalance(mockBalance)
      setIsConnected(true)
      setWalletType('HashPack')
      
      // Save connection
      localStorage.setItem('hedera_wallet_connection', JSON.stringify({
        accountId: mockAccountId,
        walletType: 'HashPack',
        connectedAt: new Date().toISOString()
      }))
      
      console.log('Wallet connected successfully!')
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw new Error('Failed to connect wallet')
    }
  }

  const disconnect = async () => {
    try {
      // Clear connection
      localStorage.removeItem('hedera_wallet_connection')
      setIsConnected(false)
      setAccountId(null)
      setBalance(0)
      setWalletType(null)
      
      console.log('Wallet disconnected successfully!')
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  const fetchBalance = async (account: string) => {
    try {
      // Mock balance fetch - in production would call Hedera API
      const mockBalance = Math.random() * 100
      setBalance(mockBalance)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(0)
    }
  }

  const signTransaction = async (transactionData: any) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      // Mock transaction signing
      return {
        ...transactionData,
        signature: 'mock_signature_' + Date.now(),
        signedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw new Error('Failed to sign transaction')
    }
  }

  const sendTransaction = async (signedTransaction: any) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      // Mock transaction sending
      const transactionId = `0.0.${Math.floor(Math.random() * 1000000)}@${Date.now()}`
      
      return {
        success: true,
        transactionId,
        receipt: {
          status: 'SUCCESS',
          transactionHash: transactionId,
          gasUsed: 21000,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw new Error('Failed to send transaction')
    }
  }

  const getAccountInfo = async () => {
    if (!accountId) {
      throw new Error('Wallet not connected')
    }

    try {
      // Mock account info
      return {
        accountId,
        balance: balance.toString(),
        network,
        walletType,
        tokens: [
          {
            tokenId: '0.0.123456',
            symbol: 'HBAR',
            balance: balance.toString(),
            decimals: 8
          }
        ],
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
        lastTransaction: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      }
    } catch (error) {
      console.error('Error getting account info:', error)
      throw new Error('Failed to get account info')
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
    signTransaction,
    sendTransaction,
    getAccountInfo
  }
}

export default useHederaWallet
