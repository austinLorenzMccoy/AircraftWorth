'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, Radio, Activity, MapPin } from 'lucide-react'
import { supabase, type AircraftPosition, type Sensor } from '@/lib/supabase'
import { demoAircraft, demoSensors, getDemoAircraftTrack } from '@/lib/demo-data'
import { MLATNav } from '@/components/mlat-nav'
import dynamic from 'next/dynamic'
import GhostIntelPanel from '@/components/intelligence/GhostIntelPanel'
import FlightQueryBar from '@/components/intelligence/FlightQueryBar'
import JudgeBanner from '@/components/demo/JudgeBanner'
import KpiStrip from '@/components/demo/KpiStrip'
import HederaProofStrip from '@/components/demo/HederaProofStrip'
import ReplayToggle from '@/components/demo/ReplayToggle'

// Dynamically import map to avoid SSR issues with Leaflet
const AircraftMap = dynamic(() => import('@/components/aircraft-map'), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-muted animate-pulse rounded-lg" />
})

export default function MLATDashboard() {
  const [positions, setPositions] = useState<AircraftPosition[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [selectedAircraft, setSelectedAircraft] = useState<any>(null)
  const [stats, setStats] = useState({
    totalAircraft: 0,
    avgConfidence: 0,
    activeSensors: 0,
    hederaLogs: 0
  })

  useEffect(() => {
    if (!supabase) return

    // Fetch initial data
    fetchPositions()
    fetchSensors()

    // Subscribe to realtime position updates
    const positionChannel = supabase
      .channel('aircraft_positions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'aircraft_positions'
        },
        (payload: any) => {
          const newPosition = payload.new as AircraftPosition
          setPositions((prev) => [newPosition, ...prev.slice(0, 49)])
          updateStats([newPosition, ...positions])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(positionChannel)
    }
  }, [])

  const fetchPositions = async () => {
    if (!supabase) {
      // Use demo data if supabase is not available
      setPositions(demoAircraft)
      updateStats(demoAircraft)
      return
    }

    try {
      const { data, error } = await supabase
        .from('aircraft_positions')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        setPositions(data)
        updateStats(data)
      } else {
        // Fallback to demo data on error
        console.warn('Database error, using demo data:', error)
        setPositions(demoAircraft)
        updateStats(demoAircraft)
      }
    } catch (err) {
      console.warn('Database connection failed, using demo data:', err)
      setPositions(demoAircraft)
      updateStats(demoAircraft)
    }
  }

  const fetchSensors = async () => {
    if (!supabase) {
      // Use demo data if supabase is not available
      setSensors(demoSensors)
      setStats(prev => ({ ...prev, activeSensors: demoSensors.filter(s => s.status === 'online').length }))
      return
    }

    try {
      const { data, error } = await supabase
        .from('sensors')
        .select('*')

      if (data && !error) {
        setSensors(data)
        setStats(prev => ({ ...prev, activeSensors: data.length }))
      } else {
        // Fallback to demo data on error
        console.warn('Database error, using demo sensors:', error)
        setSensors(demoSensors)
        setStats(prev => ({ ...prev, activeSensors: demoSensors.filter(s => s.status === 'online').length }))
      }
    } catch (err) {
      console.warn('Database connection failed, using demo sensors:', err)
      setSensors(demoSensors)
      setStats(prev => ({ ...prev, activeSensors: demoSensors.filter(s => s.status === 'online').length }))
    }
  }

  const updateStats = (data: AircraftPosition[]) => {
    const uniqueAircraft = new Set(data.map(p => p.icao_address)).size
    const avgConf = data.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / (data.length || 1)
    const hederaCount = data.filter(p => p.hedera_sequence_number).length

    setStats(prev => ({
      ...prev,
      totalAircraft: uniqueAircraft,
      avgConfidence: Math.round(avgConf),
      hederaLogs: hederaCount
    }))
  }

  return (
    <>
      <JudgeBanner />
      <KpiStrip sensorCount={stats.activeSensors} successRate={stats.avgConfidence} hcsLive={true} />
      <ReplayToggle isLive={true} />
      
      <MLATNav />
      <div className="p-6 max-w-7xl mx-auto" style={{ paddingBottom: '80px' }}> {/* Add padding for HederaProofStrip */}
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Aircraft Tracking - MLAT Dashboard
        </h2>
        <p className="text-muted-foreground">
          Real-time multilateration using Neuron sensor network + Hedera consensus
        </p>
      </div>

      {/* AI Query Bar */}
      <FlightQueryBar aircraftCount={stats.totalAircraft} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tracked Aircraft</p>
                <p className="text-2xl font-bold text-foreground font-mono">{stats.totalAircraft}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-foreground font-mono">{stats.avgConfidence}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sensors</p>
                <p className="text-2xl font-bold text-foreground font-mono">{stats.activeSensors}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hedera Logs</p>
                <p className="text-2xl font-bold text-foreground font-mono">{stats.hederaLogs}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="mb-6 bg-card border-border relative">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Live Aircraft Map</CardTitle>
          <CardDescription>Real-time MLAT positions from Neuron sensor network</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <AircraftMap 
            positions={positions} 
            sensors={sensors} 
            onAircraftSelect={setSelectedAircraft}
          />
          <GhostIntelPanel
            aircraft={selectedAircraft ? {
              icao: selectedAircraft.icao_address || selectedAircraft.icao,
              hasAdsb: selectedAircraft.has_adsb || true,
              sensorCount: selectedAircraft.sensor_count || 5,
              track: getDemoAircraftTrack(selectedAircraft.icao_address || selectedAircraft.icao) || getFallbackTrack()
            } : null}
            onClose={() => setSelectedAircraft(null)}
          />
        </CardContent>
      </Card>

      {/* Recent Positions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Recent MLAT Solutions</CardTitle>
          <CardDescription>Latest aircraft positions calculated via TDOA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {positions.slice(0, 10).map((pos) => (
              <div
                key={pos.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-mono font-semibold text-foreground">{pos.icao_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {pos.latitude?.toFixed(4) || 'N/A'}, {pos.longitude?.toFixed(4) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pos.confidence_score && pos.confidence_score >= 85 ? 'default' : 'secondary'}>
                    {pos.confidence_score?.toFixed(0)}% conf
                  </Badge>
                  <Badge variant="outline">
                    {pos.sensor_count || 0} sensors
                  </Badge>
                  {pos.hedera_sequence_number && (
                    <Badge variant="outline" className="font-mono text-xs">
                      HCS #{pos.hedera_sequence_number}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    <HederaProofStrip />
    </>
  )
}
