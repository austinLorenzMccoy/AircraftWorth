'use client';

/**
 * KpiStrip - Live KPI strip showing sensor count, success rate, and HCS status
 */
export default function KpiStrip({ 
  sensorCount = 12, 
  successRate = 100, 
  hcsLive = true 
}: { 
  sensorCount?: number; 
  successRate?: number; 
  hcsLive?: boolean; 
}) {
  return (
    <div style={{
      background: '#1c2333',
      borderTop: '1px solid #3d4f6b',
      borderBottom: '1px solid #3d4f6b',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'Courier New',
      fontSize: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#3ddc97'
          }} />
          <span style={{ color: '#a0b0cc' }}>Sensors:</span>
          <span style={{ color: '#e6eaf0', fontWeight: 'bold' }}>{sensorCount}</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: successRate >= 95 ? '#3ddc97' : '#ffd93d'
          }} />
          <span style={{ color: '#a0b0cc' }}>MLAT Success:</span>
          <span style={{ 
            color: successRate >= 95 ? '#e6eaf0' : '#ffd93d', 
            fontWeight: 'bold' 
          }}>{successRate}%</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: hcsLive ? '#3ddc97' : '#ff6b6b',
            animation: hcsLive ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ color: '#a0b0cc' }}>HCS:</span>
          <span style={{ 
            color: hcsLive ? '#3ddc97' : '#ff6b6b', 
            fontWeight: 'bold' 
          }}>{hcsLive ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ color: '#a0b0cc' }}>HashScan:</span>
        <a 
          href="https://hashscan.io/testnet/topic/0.0.7968510" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: '#3ddc97',
            textDecoration: 'none',
            fontFamily: 'Courier New',
            fontSize: '11px'
          }}
        >
          0.0.7968510
        </a>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
