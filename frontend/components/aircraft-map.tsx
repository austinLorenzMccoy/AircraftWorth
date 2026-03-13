'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { type AircraftPosition, type Sensor } from '@/lib/supabase'

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface AircraftMapProps {
  positions: AircraftPosition[]
  sensors: Sensor[]
  onAircraftSelect?: (aircraft: any) => void
}

export default function AircraftMap({ positions, sensors, onAircraftSelect }: AircraftMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: L.Marker }>({})
  const sensorMarkersRef = useRef<{ [key: string]: L.CircleMarker }>({})

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map centered on Europe
      mapRef.current = L.map('aircraft-map').setView([50.0, 10.0], 6)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update sensor markers
  useEffect(() => {
    if (!mapRef.current) return

    // Clear old sensor markers
    Object.values(sensorMarkersRef.current).forEach(marker => marker.remove())
    sensorMarkersRef.current = {}

    // Add sensor markers
    sensors.forEach(sensor => {
      if (!sensor.location || !mapRef.current) return

      // Parse PostGIS POINT format (simplified - assumes WKT text format)
      // In production, properly parse the geography type
      const coords = parseSensorLocation(sensor.location)
      if (!coords) return

      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        fillColor: '#3b82f6',
        color: '#1e40af',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6,
      }).addTo(mapRef.current)

      marker.bindPopup(`
        <div class="p-2">
          <p class="font-semibold">${sensor.name || 'Sensor'}</p>
          <p class="text-xs text-gray-600">${sensor.sensor_id.substring(0, 12)}...</p>
          <p class="text-xs">Lat: ${coords.lat.toFixed(4)}, Lon: ${coords.lng.toFixed(4)}</p>
        </div>
      `)

      sensorMarkersRef.current[sensor.sensor_id] = marker
    })
  }, [sensors])

  // Update aircraft markers
  useEffect(() => {
    if (!mapRef.current) return

    // Group positions by ICAO (keep only latest per aircraft)
    const latestPositions = new Map<string, AircraftPosition>()
    positions.forEach(pos => {
      const existing = latestPositions.get(pos.icao_address)
      if (!existing || new Date(pos.calculated_at) > new Date(existing.calculated_at)) {
        latestPositions.set(pos.icao_address, pos)
      }
    })

    // Remove markers for aircraft no longer in latest positions
    Object.keys(markersRef.current).forEach(icao => {
      if (!latestPositions.has(icao)) {
        markersRef.current[icao].remove()
        delete markersRef.current[icao]
      }
    })

    // Update or create markers
    latestPositions.forEach((pos, icao) => {
      // Handle both field name conventions (latitude/lat, longitude/lon)
      const lat = pos.latitude ?? pos.lat;
      const lon = pos.longitude ?? pos.lon;
      const confidence = pos.confidence_score ?? pos.confidence ?? 0.5;
      const icaoCode = pos.icao_address ?? pos.icao ?? 'UNKNOWN';
      
      // Guard against undefined/invalid coordinates
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return; // silently skip — no console spam in prod
      }

      const latlng = L.latLng(lat, lon)

      if (markersRef.current[icao]) {
        // Update existing marker
        markersRef.current[icao].setLatLng(latlng)
      } else {
        // Create new marker
        const icon = L.divIcon({
          className: 'aircraft-marker',
          html: `
            <div class="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                      fill="${confidence >= 85 ? '#10b981' : '#f59e0b'}" 
                      stroke="#000" 
                      stroke-width="0.5"/>
              </svg>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        const marker = L.marker(latlng, { icon }).addTo(mapRef.current!)

        // Add click handler for AI analysis
        marker.on('click', () => {
          if (onAircraftSelect) {
            // Create track data for AI analysis (last few positions)
            const trackData = positions
              .filter(p => (p.icao_address ?? p.icao) === icaoCode)
              .slice(-8)
              .map(p => ({
                lat: p.latitude ?? p.lat,
                lon: p.longitude ?? p.lon,
                alt_ft: p.altitude_ft ?? p.alt_ft,
                confidence: p.confidence_score ?? p.confidence ?? 0,
                timestamp_iso: p.calculated_at
              }));

            onAircraftSelect({
              icao: icaoCode,
              hasAdsb: false, // Default to false since ADSB status not tracked
              sensorCount: pos.sensor_count || 0,
              track: trackData
            });
          }
        });

        marker.bindPopup(`
          <div class="p-2 min-w-[200px]">
            <p class="font-semibold font-mono text-lg">${icaoCode}</p>
            <p class="text-xs text-gray-600">Confidence: ${(confidence * 100).toFixed(0)}%</p>
            <p class="text-xs">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</p>
            <p class="text-xs">Alt: ${(pos.altitude_ft ?? pos.alt_ft ?? 'N/A')} ft</p>
            <p class="text-xs">Sensors: ${pos.sensor_count || 0}</p>
          </div>
        `);

        markersRef.current[icao] = marker
      }
    })
  }, [positions])

  return <div id="aircraft-map" className="h-[600px] w-full rounded-lg" />
}

function parseSensorLocation(location: string): { lat: number; lng: number } | null {
  try {
    // Parse PostGIS POINT format: "POINT(longitude latitude)"
    const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      }
    }
    return null
  } catch {
    return null
  }
}
