'use client';

import { useState } from 'react';

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTools = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/list',
          id: 1
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          id: 2,
          params: {
            name: 'search_flights',
            arguments: {
              from: 'JFK',
              to: 'LHR',
              date: '2026-04-25',
              adults: 1,
            },
          },
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>FareFirst MCP Server</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testTools}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Test Tools List
        </button>
        
        <button 
          onClick={testSearch}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Test Flight Search
        </button>
      </div>
      
      {loading && <p>Loading...</p>}
      
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '5px',
          overflow: 'auto',
        }}>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <h2>Widget Preview</h2>
        <p>Visit <a href="/api/mcp/widgets/flight-cards" target="_blank">/api/mcp/widgets/flight-cards</a> to see the widget</p>
      </div>
    </main>
  );
}