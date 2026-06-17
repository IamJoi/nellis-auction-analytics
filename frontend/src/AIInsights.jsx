import React, { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

const C = {
  bg:     '#1a1a2e',
  card:   '#16213e',
  panel:  '#0f3460',
  accent: '#f5a623',
  blue:   '#4fc3f7',
  green:  '#66bb6a',
  red:    '#ef5350',
  text:   '#e0e0e0',
  muted:  '#9e9e9e',
  grid:   '#2a2a4a',
};

const CARD_COLORS = [C.accent, C.blue, C.green, '#ab47bc', '#ff7043'];

function RecommendationCard({ icon, title, description, index }) {
  const accent = CARD_COLORS[index % CARD_COLORS.length];
  return (
    <div style={{
      background:   C.bg,
      borderRadius: 10,
      padding:      '20px 22px',
      borderTop:    `3px solid ${accent}`,
      display:      'flex',
      flexDirection: 'column',
      gap:          10,
    }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{
        color:         accent,
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        lineHeight:    1.3,
      }}>
        {title}
      </div>
      <div style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>
        {description}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background:   C.bg,
      borderRadius: 10,
      padding:      '20px 22px',
      borderTop:    `3px solid ${C.grid}`,
      display:      'flex',
      flexDirection: 'column',
      gap:          12,
    }}>
      <div style={{ width: 28, height: 26, background: C.grid, borderRadius: 4 }} />
      <div style={{ width: '60%', height: 11, background: C.grid, borderRadius: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ width: '100%', height: 11, background: C.grid, borderRadius: 4 }} />
        <div style={{ width: '90%',  height: 11, background: C.grid, borderRadius: 4 }} />
        <div style={{ width: '75%',  height: 11, background: C.grid, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function AIInsights() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error,   setError]                   = useState(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/insights/executive`);
      setRecommendations(res.data.recommendations || []);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasResults = recommendations.length > 0;

  return (
    <div style={{ background: C.card, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Executive Recommendations
          </h2>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>
            Powered by Claude Sonnet · 3–5 immediately actionable moves
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          style={{
            background:    loading ? C.grid : C.accent,
            color:         loading ? C.muted : '#1a1a2e',
            border:        'none',
            borderRadius:  8,
            padding:       '9px 20px',
            fontSize:      12,
            fontWeight:    700,
            cursor:        loading ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3,
            transition:    'background 0.15s',
            whiteSpace:    'nowrap',
          }}
        >
          {loading ? 'Generating…' : hasResults ? '↺ Refresh' : 'Generate Insights'}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ color: C.red, fontSize: 13, padding: '12px 16px', background: 'rgba(239,83,80,0.1)', borderRadius: 8 }}>
          Error: {error}
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && hasResults && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} index={i} {...rec} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !hasResults && (
        <div style={{ color: C.muted, fontSize: 13, padding: '24px 0', textAlign: 'center', lineHeight: 1.6 }}>
          Click <strong style={{ color: C.accent }}>Generate Insights</strong> for Claude's executive action plan.
        </div>
      )}
    </div>
  );
}
