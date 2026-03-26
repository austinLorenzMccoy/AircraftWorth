import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dataType = searchParams.get('data_type')
    const pricingModel = searchParams.get('pricing_model')

    // Build offerings query
    let offeringsQuery = supabase
      .from('sensor_offerings')
      .select(`
        id, sensor_id, data_type, pricing_model,
        price_amount, token_id, bundle_size, is_active,
        sensors (
          id, name, location, last_heartbeat, operator_account_id
        )
      `)
      .eq('is_active', true)

    if (dataType) offeringsQuery = offeringsQuery.eq('data_type', dataType)
    if (pricingModel) offeringsQuery = offeringsQuery.eq('pricing_model', pricingModel)

    const { data: offerings, error } = await offeringsQuery

    if (error) throw error

    // Group offerings by sensor
    const sensorMap = new Map<string, any>()

    for (const offering of offerings || []) {
      const sensor = offering.sensors as any
      if (!sensor) continue

      if (!sensorMap.has(sensor.id)) {
        sensorMap.set(sensor.id, {
          id: sensor.id,
          name: sensor.name,
          location: sensor.location,
          last_heartbeat: sensor.last_heartbeat,
          offerings_count: 0,
          min_price: null,
          active_offerings: [],
        })
      }

      const sensorData = sensorMap.get(sensor.id)
      sensorData.offerings_count++
      sensorData.active_offerings.push({
        id: offering.id,
        sensor_id: offering.sensor_id,
        data_type: offering.data_type,
        pricing_model: offering.pricing_model,
        price_amount: offering.price_amount,
        token_id: offering.token_id,
        bundle_size: offering.bundle_size,
        is_active: offering.is_active,
        sensor_name: sensor.name,
        sensor_location: sensor.location,
      })

      // Update min price
      if (sensorData.min_price === null || offering.price_amount < sensorData.min_price) {
        sensorData.min_price = offering.price_amount
      }
    }

    // Convert to array and sort by name
    const sensors = Array.from(sensorMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    )

    return NextResponse.json(sensors)
  } catch (error) {
    console.error('Sensors API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sensors' },
      { status: 500 }
    )
  }
}
