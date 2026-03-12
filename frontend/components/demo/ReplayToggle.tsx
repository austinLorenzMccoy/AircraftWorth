'use client';

import { useState } from 'react';

/**
 * ReplayToggle - Toggle between live and replay modes
 */
export default function ReplayToggle({ 
  isLive = true, 
  onToggle 
}: { 
  isLive?: boolean; 
  onToggle?: (live: boolean) => void; 
}) {
  const [live, setLive] = useState(isLive);

  const handleToggle = () => {
    const newLive = !live;
    setLive(newLive);
    if (onToggle) {
      onToggle(newLive);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#1c2333',
      border: '1px solid #3d4f6b',
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'Courier New',
      fontSize: '11px',
      zIndex: 1000
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
          background: live ? '#3ddc97' : '#ffd93d',
          animation: live ? 'pulse 2s infinite' : 'none'
        }} />
        <span style={{ color: '#a0b0cc' }}>Mode:</span>
        <span style={{ 
          color: live ? '#3ddc97' : '#ffd93d', 
          fontWeight: 'bold' 
        }}>
          {live ? 'LIVE' : 'REPLAY'}
        </span>
      </div>
      
      <button
        onClick={handleToggle}
        style={{
          background: 'none',
          border: '1px solid #3d4f6b',
          borderRadius: '4px',
          padding: '4px 8px',
          color: '#a0b0cc',
          cursor: 'pointer',
          fontFamily: 'Courier New',
          fontSize: '10px',
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
        {live ? 'SWITCH TO REPLAY' : 'SWITCH TO LIVE'}
      </button>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
