import { NextRequest, NextResponse } from 'next/server'

interface PurchaseRequest {
  offering_id: string
  sensor_id: string
  price_amount: number
  pricing_model: string
  duration_hours?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: PurchaseRequest = await request.json()
    
    // Validate request
    if (!body.offering_id || !body.sensor_id || !body.price_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Generate mock transaction data for hackathon demo
    const mockTransaction = {
      transaction_id: `0x${Math.random().toString(16).substr(2, 8)}`,
      offering_id: body.offering_id,
      sensor_id: body.sensor_id,
      amount: body.price_amount,
      pricing_model: body.pricing_model,
      duration_hours: body.duration_hours || 24,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      network: 'testnet',
      // In production, this would be a real Hedera transaction hash
    }
    
    console.log('Mock purchase transaction:', mockTransaction)
    
    return NextResponse.json({
      success: true,
      transaction: mockTransaction,
      message: 'Purchase initiated successfully. Connect your wallet to complete the transaction.',
      next_steps: [
        '1. Connect your Hedera wallet (HashPack, Blade, etc.)',
        '2. Approve the HBAR transaction',
        '3. Wait for blockchain confirmation',
        '4. Access granted to purchased data'
      ]
    })
  } catch (error) {
    console.error('Marketplace purchase API error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate purchase' },
      { status: 500 }
    )
  }
}
