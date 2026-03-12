/**
 * FlightQueryBar - natural language query interface.
 * Sits at the top of the map. Judge types a question, gets an answer in 200ms.
 * Wire in: add <FlightQueryBar aircraftCount={count} /> above your map container.
 */
'use client';

import { useState, useRef } from 'react';
import { groqClient, type QueryResponse } from '@/lib/groq-client';

export default function FlightQueryBar({ aircraftCount }: { aircraftCount: number }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const examples = [
    "Which aircraft has the lowest confidence?",
    "Show me aircraft flying above 30000ft",
    "How many aircraft are non-cooperative?",
    "Which aircraft has the most sensor coverage?",
    "Find aircraft with unusual altitude changes"
  ];

  const ask = async (question: string = q) => {
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response: QueryResponse = await groqClient.queryFlights(question, aircraftCount);
      setAnswer(response.answer);
    } catch (err) {
      console.error('Query error:', err);
      setError('Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#1c2333',
      border: '1px solid #3d4f6b',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#3ddc97',
          animation: 'pulse 2s infinite'
        }} />
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          color: '#e6eaf0'
        }}>
          🧠 AI Flight Query
        </span>
        <span style={{
          fontFamily: 'Courier New',
          fontSize: '11px',
          color: '#a0b0cc'
        }}>
          (Ask about tracked aircraft in plain English)
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && ask()}
          placeholder="e.g., Which aircraft has the lowest confidence?"
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #3d4f6b',
            borderRadius: '6px',
            padding: '10px 12px',
            color: '#e6eaf0',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px'
          }}
        />
        <button
          onClick={() => ask()}
          disabled={loading || !q.trim()}
          style={{
            background: loading ? '#3d4f6b' : '#3ddc97',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            color: '#0d1117',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid #ff6b6b',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '12px'
        }}>
          <span style={{
            color: '#ff6b6b',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px'
          }}>
            {error}
          </span>
        </div>
      )}

      {answer && (
        <div style={{
          background: 'rgba(61, 223, 151, 0.1)',
          border: '1px solid #3ddc97',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: '#3ddc97',
              marginTop: '6px'
            }} />
            <span style={{
              color: '#3ddc97',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              AI Answer:
            </span>
          </div>
          <p style={{
            color: '#e6eaf0',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            margin: 0
          }}>
            {answer}
          </p>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <span style={{
          color: '#a0b0cc',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          marginRight: '8px'
        }}>
          Examples:
        </span>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQ(ex);
              ask(ex);
            }}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: 'none',
              border: '1px solid #3d4f6b',
              borderRadius: '100px',
              color: '#6b7a99',
              cursor: 'pointer',
              fontFamily: 'Courier New',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3d4f6b';
              e.currentTarget.style.color = '#e6eaf0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#6b7a99';
            }}
          >
            {ex}
          </button>
        ))}
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
