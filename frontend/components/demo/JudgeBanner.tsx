'use client';

/**
 * JudgeBanner - Top banner for hackathon judges showing 3-step walkthrough
 */
export default function JudgeBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderBottom: '1px solid #3d4f6b',
      padding: '16px 24px',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#3ddc97',
          animation: 'pulse 2s infinite'
        }} />
        <span style={{
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#3ddc97',
          letterSpacing: '0.1em',
          fontWeight: 'bold'
        }}>
          LIVE DEMO MODE
        </span>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#3ddc97',
          animation: 'pulse 2s infinite'
        }} />
      </div>
      
      <h1 style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '18px',
        fontWeight: '700',
        color: '#e6eaf0',
        margin: '0 0 8px 0'
      }}>
        AircraftWorth - 3-Step Walkthrough
      </h1>
      
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color: '#a0b0cc',
        margin: '0',
        lineHeight: '1.4'
      }}>
        Step 1: MLAT Tracking → Step 2: AI Analysis → Step 3: Hedera Verification
      </p>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
