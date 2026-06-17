import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

const C = {
  bg:     '#F5F5F5',
  card:   '#FFFFFF',
  accent: '#E8372C',
  text:   '#222222',
  muted:  '#666666',
  border: '#E0E0E0',
  shadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const CARD_COLORS = ['#E8372C', '#222222', '#2E7D32', '#7B1FA2', '#E64A19'];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

function RecommendationCard({ icon, title, description, index, mobile }) {
  const accent = CARD_COLORS[index % CARD_COLORS.length];
  return (
    <div style={{
      background:    C.card,
      borderRadius:  8,
      padding:       mobile ? '12px 14px' : '18px 20px',
      borderTop:     `3px solid ${accent}`,
      border:        `1px solid ${C.border}`,
      borderTopColor: accent,
      boxShadow:     C.shadow,
      display:       'flex',
      flexDirection: 'column',
      gap:           10,
    }}>
      <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>
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
      background:    C.card,
      borderRadius:  8,
      padding:       '18px 20px',
      borderTop:     `3px solid ${C.border}`,
      border:        `1px solid ${C.border}`,
      boxShadow:     C.shadow,
      display:       'flex',
      flexDirection: 'column',
      gap:           12,
    }}>
      <div style={{ width: 28, height: 26, background: C.border, borderRadius: 4 }} />
      <div style={{ width: '60%', height: 11, background: C.border, borderRadius: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ width: '100%', height: 11, background: C.border, borderRadius: 4 }} />
        <div style={{ width: '90%',  height: 11, background: C.border, borderRadius: 4 }} />
        <div style={{ width: '75%',  height: 11, background: C.border, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function AIInsights() {
  const mobile = useIsMobile();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error,   setError]                   = useState(null);
  const [hover,   setHover]                   = useState(false);

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
    <div style={{
      background: C.card, borderRadius: 8,
      padding: mobile ? '12px 14px' : '20px 24px',
      marginBottom: mobile ? 10 : 16,
      boxShadow: C.shadow, border: `1px solid ${C.border}`,
    }}>

      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: mobile ? 'flex-start' : 'center',
        flexDirection: mobile ? 'column' : 'row',
        gap: mobile ? 10 : 0,
        marginBottom: mobile ? 14 : 20,
      }}>
        <div>
          <h2 style={{
            margin: 0, color: C.text,
            fontSize: mobile ? 13 : 14,
            fontWeight: 700,
            borderLeft: `4px solid ${C.accent}`, paddingLeft: 10,
          }}>
            Executive Recommendations
          </h2>
          <p style={{ margin: '6px 0 0 14px', color: C.muted, fontSize: 12 }}>
            3–5 immediately actionable moves based on your data
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background:    loading ? C.border : hover ? '#C02E24' : C.accent,
            color:         loading ? C.muted  : '#FFFFFF',
            border:        'none', borderRadius: 6,
            padding:       mobile ? '8px 14px' : '9px 20px',
            fontSize:      mobile ? 11 : 12,
            fontWeight:    700,
            cursor:        loading ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3, transition: 'background 0.15s', whiteSpace: 'nowrap',
            alignSelf:     mobile ? 'flex-start' : 'auto',
          }}
        >
          {loading ? 'Analyzing…' : hasResults ? '↺ Refresh' : 'Get Recommendations'}
        </button>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: mobile ? 10 : 14 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && !loading && (
        <div style={{
          color: C.accent, fontSize: 13, padding: '12px 16px',
          background: '#FFF5F5', borderRadius: 6, border: '1px solid #F5C0BC',
        }}>
          Error: {error}
        </div>
      )}

      {!loading && hasResults && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: mobile ? 10 : 14 }}>
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} index={i} mobile={mobile} {...rec} />
          ))}
        </div>
      )}

      {!loading && !error && !hasResults && (
        <div style={{ color: C.muted, fontSize: 13, padding: '24px 0', textAlign: 'center', lineHeight: 1.6 }}>
          Click <strong style={{ color: C.accent }}>Get Recommendations</strong> for an executive action plan.
        </div>
      )}
    </div>
  );
}
