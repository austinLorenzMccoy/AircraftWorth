'use client';

/**
 * GhostIntelPanel
 * Slides in from right when an aircraft is selected.
 * Shows AI threat assessment from /api/intelligence/analyse-track.
 * Wire into your map: pass selectedAircraft prop.
 */
import { useEffect, useState } from 'react';
import { groqClient, type ThreatAssessment } from '@/lib/groq-client';

interface AircraftData {
  icao: string;
  hasAdsb: boolean;
  sensorCount: number;
  track: Array<{
    lat: number;
    lon: number;
    alt_ft?: number;
    confidence: number;
    timestamp_iso: string;
  }>;
}

interface GhostIntelPanelProps {
  aircraft: AircraftData | null;
  onClose: () => void;
}

export default function GhostIntelPanel({ aircraft, onClose }: GhostIntelPanelProps) {
  const [assessment, setAssessment] = useState<ThreatAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (aircraft) {
      setLoading(true);
      setError('');
      
      groqClient.analyzeThreat(
        aircraft.icao,
        aircraft.hasAdsb,
        aircraft.sensorCount,
        aircraft.track
      ).then(result => {
        setAssessment(result);
      }).catch(err => {
        console.error('Threat analysis error:', err);
        setError('Failed to analyze aircraft threat');
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setAssessment(null);
      setError('');
    }
  }, [aircraft]);

  if (!aircraft) return null;

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return '#3ddc97';
      case 'medium': return '#ffd93d';
      case 'high': return '#ff9500';
      case 'critical': return '#ff6b6b';
      default: return '#6b7a99';
    }
  };

  const getThreatBg = (level: string) => {
    switch (level) {
      case 'low': return 'rgba(61, 223, 151, 0.1)';
      case 'medium': return 'rgba(255, 217, 61, 0.1)';
      case 'high': return 'rgba(255, 149, 0, 0.1)';
      case 'critical': return 'rgba(255, 107, 107, 0.1)';
      default: return 'rgba(107, 122, 153, 0.1)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: '#1c2333',
      borderLeft: '1px solid #3d4f6b',
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #3d4f6b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#3ddc97',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#e6eaf0'
          }}>
            👻 Ghost Intel
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0b0cc',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3d4f6b';
            e.currentTarget.style.color = '#e6eaf0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#a0b0cc';
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Aircraft Info */}
        <div style={{
          background: '#0d1117',
          border: '1px solid #3d4f6b',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontFamily: 'Courier New',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#3ddc97'
            }}>
              {aircraft.icao}
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: aircraft.hasAdsb ? '#3ddc97' : '#ffd93d',
              padding: '2px 8px',
              borderRadius: '100px',
              background: aircraft.hasAdsb ? 'rgba(61, 223, 151, 0.1)' : 'rgba(255, 217, 61, 0.1)'
            }}>
              {aircraft.hasAdsb ? 'ADS-B' : 'NON-COOP'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#a0b0cc'
          }}>
            <span>Sensors: {aircraft.sensorCount}</span>
            <span>Track points: {aircraft.track.length}</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#a0b0cc'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #3d4f6b',
              borderTop: '3px solid #3ddc97',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
              🧠 Analyzing threat level...
            </div>
            <div style={{ fontFamily: 'Courier New', fontSize: '11px', marginTop: '8px' }}>
              Groq Llama-3.1-70b-versatile
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            color: '#ff6b6b',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Assessment Results */}
        {assessment && !loading && (
          <div>
            {/* Threat Level */}
            <div style={{
              background: getThreatBg(assessment.threat_level),
              border: `1px solid ${getThreatColor(assessment.threat_level)}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e6eaf0'
                }}>
                  Threat Level
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: getThreatColor(assessment.threat_level),
                  textTransform: 'uppercase'
                }}>
                  {assessment.threat_level}
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#a0b0cc',
                marginBottom: '4px'
              }}>
                Confidence: {(assessment.confidence_in_assessment * 100).toFixed(0)}%
              </div>
            </div>

            {/* Summary */}
            {assessment.summary && (
              <div style={{
                background: '#0d1117',
                border: '1px solid #3d4f6b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#a0b0cc',
                  marginBottom: '8px'
                }}>
                  SUMMARY
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#e6eaf0',
                  lineHeight: '1.4'
                }}>
                  {assessment.summary}
                </div>
              </div>
            )}

            {/* Detail */}
            {assessment.detail && (
              <div style={{
                background: '#0d1117',
                border: '1px solid #3d4f6b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#a0b0cc',
                  marginBottom: '8px'
                }}>
                  ANALYSIS
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#e6eaf0',
                  lineHeight: '1.4'
                }}>
                  {assessment.detail}
                </div>
              </div>
            )}

            {/* Tags */}
            {assessment.tags && assessment.tags.length > 0 && (
              <div style={{
                background: '#0d1117',
                border: '1px solid #3d4f6b',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#a0b0cc',
                  marginBottom: '8px'
                }}>
                  INDICATORS
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {assessment.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#1c2333',
                        border: '1px solid #3d4f6b',
                        borderRadius: '100px',
                        padding: '4px 8px',
                        color: '#a0b0cc',
                        fontFamily: 'Courier New',
                        fontSize: '11px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #3d4f6b',
        fontSize: '11px',
        color: '#6b7a99',
        fontFamily: 'Courier New',
        textAlign: 'center'
      }}>
        Powered by Groq AI • Analysis time: ~200ms
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
