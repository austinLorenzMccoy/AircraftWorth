import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { offering_id, buyer_account_id, quantity, duration_hours } = body

    if (!offering_id || !buyer_account_id) {
      return NextResponse.json(
        { error: 'offering_id and buyer_account_id are required' },
        { status: 400 }
      )
    }

    // ── Fetch offering ──────────────────────────────────────────────
    const { data: offering, error: offeringError } = await supabase
      .from('sensor_offerings')
      .select('*, sensors(name, operator_account_id)')
      .eq('id', offering_id)
      .eq('is_active', true)
      .single()

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: 'Offering not found or no longer active' },
        { status: 404 }
      )
    }

    // ── Calculate total cost ────────────────────────────────────────
    let totalCost = offering.price_amount
    if (offering.pricing_model === 'per_message' && quantity) {
      totalCost = offering.price_amount * quantity
    } else if (offering.pricing_model === 'bundle' && quantity) {
      const bundles = Math.ceil(quantity / (offering.bundle_size || 1))
      totalCost = offering.price_amount * bundles
    } else if (duration_hours) {
      if (offering.pricing_model === 'per_hour') totalCost = offering.price_amount * duration_hours
      if (offering.pricing_model === 'per_day') totalCost = offering.price_amount * (duration_hours / 24)
      if (offering.pricing_model === 'per_month') totalCost = offering.price_amount * (duration_hours / 24 / 30)
    }

    // ── Generate API key ────────────────────────────────────────────
    const apiKey = `aw_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // ── Record purchase in Supabase ──────────────────────────────
    const { data: purchase, error: purchaseError } = await supabase
      .from('marketplace_purchases')
      .insert({
        offering_id,
        buyer_account_id,
        quantity: quantity || null,
        duration_hours: duration_hours || null,
        api_key: apiKey,
        expires_at: expiresAt,
        status: 'pending_payment',
        total_cost: totalCost,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (purchaseError) {
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 }
      )
    }

    // ── Mock transaction for hackathon demo ──────────────────────
    const mockTransactionId = `0.0.${Math.floor(Math.random() * 999999)}@${Date.now()}`

    return NextResponse.json({
      success: true,
      purchase_id: purchase.id,
      transaction_id: mockTransactionId,
      api_key: apiKey,
      expires_at: expiresAt,
      total_cost: totalCost,
      message: 'Purchase recorded! In production, this would trigger a real Hedera transaction.',
      next_steps: [
        '1. API key generated for immediate access',
        '2. Transaction logged for demo purposes',
        '3. Use API key to access sensor data',
        '4. In production: Real HBAR transfer required'
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
