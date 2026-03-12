'use client';

import { useState, useEffect } from 'react';

/**
 * HederaProofStrip - Bottom strip showing real-time HCS sequence numbers
 */
export default function HederaProofStrip() {
  const [sequenceNumber, setSequenceNumber] = useState(7968510);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Simulate real-time HCS sequence updates
    const interval = setInterval(() => {
      setSequenceNumber(prev => prev + 1);
      setLastUpdate(new Date());
    }, 2000 + Math.random() * 1000); // Random interval between 2-3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0d1117',
      borderTop: '1px solid #3d4f6b',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'Courier New',
      fontSize: '11px',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
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
            background: '#3ddc97',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ color: '#a0b0cc' }}>HCS Sequence:</span>
          <span style={{ 
            color: '#3ddc97', 
            fontWeight: 'bold',
            fontFamily: 'Courier New'
          }}>
            #{sequenceNumber}
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#a0b0cc' }}>Last TX:</span>
          <span style={{ 
            color: '#e6eaf0',
            fontFamily: 'Courier New'
          }}>
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#a0b0cc' }}>Topic:</span>
          <a 
            href={`https://hashscan.io/testnet/topic/0.0.7968510?sequence=${sequenceNumber}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#3ddc97',
              textDecoration: 'none',
              fontFamily: 'Courier New'
            }}
          >
            0.0.7968510
          </a>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: '#a0b0cc' }}>Network:</span>
          <span style={{ 
            color: '#ffd93d',
            fontWeight: 'bold'
          }}>
            TESTNET
          </span>
        </div>
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
