import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AIInsights from './AIInsights';
import AuctionChat from './components/AuctionChat';
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

const C = {
  bg:     '#F5F5F5',
  card:   '#FFFFFF',
  panel:  '#F5F5F5',
  accent: '#E8372C',
  text:   '#222222',
  muted:  '#666666',
  border: '#E0E0E0',
  grid:   '#F0F0F0',
  shadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const CHART_COLORS = ['#E8372C', '#222222', '#666666', '#999999', '#CCCCCC'];

const fmtDollar = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK      = (v) => `$${(v / 1000).toFixed(0)}k`;
const profitHue = (v) => (v >= 0 ? C.accent : '#CCCCCC');
const TICK      = { fill: C.muted, fontSize: 11 };

// ─── primitives ───────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      margin: '0 0 16px', color: C.text, fontSize: 14, fontWeight: 700,
      borderLeft: `4px solid ${C.accent}`, paddingLeft: 10, letterSpacing: 0,
    }}>
      {children}
    </h2>
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 8, padding: '20px 24px',
      boxShadow: C.shadow, border: `1px solid ${C.border}`, ...style,
    }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      {children}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.card, borderRadius: 8, padding: '18px 24px',
      flex: 1, minWidth: 140,
      boxShadow: C.shadow, border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color || C.accent}`,
    }}>
      <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: color || C.accent, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderTop: `3px solid ${C.accent}`, borderRadius: 6,
      padding: '10px 14px', fontSize: 13, boxShadow: C.shadow,
    }}>
      <p style={{ margin: '0 0 6px', color: C.text, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: '3px 0', color: p.color === '#CCCCCC' ? C.muted : p.color }}>
          {p.name}: {p.name.includes('%') ? `${p.value?.toFixed(2)}%` : fmtDollar(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── charts ──────────────────────────────────────────────────────────────────

function CategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis dataKey="category" tick={TICK} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={TICK} tickFormatter={fmtK} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.category} fill={profitHue(d.profit)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProgramChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis dataKey="amazon_program" tick={TICK} angle={-20} textAnchor="end" interval={0} />
        <YAxis yAxisId="left"  tick={TICK} tickFormatter={fmtK} />
        <YAxis yAxisId="right" orientation="right" tick={TICK} tickFormatter={(v) => `${v.toFixed(0)}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 4 }} />
        <Bar yAxisId="left"  dataKey="profit" name="Profit"   fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="margin" name="Margin %" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} opacity={0.75} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis dataKey="month" tick={TICK} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={TICK} tickFormatter={fmtK} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 4 }} />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="profit"  name="Profit"  stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function LocationChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis type="number" tick={TICK} tickFormatter={fmtK} />
        <YAxis type="category" dataKey="location" tick={TICK} width={115} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.location} fill={profitHue(d.profit)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── insight renderer ─────────────────────────────────────────────────────────

function InsightBody({ text, style }) {
  const lines = text.split('\n');
  const hasBullets = lines.some(l => /^\s*[-•*]\s/.test(l));

  if (hasBullets) {
    return (
      <ul style={{ margin: '0 0 4px', paddingLeft: 18, ...style }}>
        {lines.map((line, i) => {
          const clean = line.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '').trim();
          if (!clean) return null;
          return /^[-•*]\s/.test(line.trim())
            ? <li key={i} style={{ color: C.text, fontSize: 13, lineHeight: 1.7, marginBottom: 3 }}>{clean}</li>
            : <p key={i} style={{ color: C.text, fontSize: 13, lineHeight: 1.7, margin: '4px 0' }}>{clean}</p>;
        })}
      </ul>
    );
  }
  return (
    <p style={{ margin: 0, color: C.text, fontSize: 13, lineHeight: 1.7, ...style }}>
      {text.replace(/\*\*/g, '')}
    </p>
  );
}

function InsightText({ text }) {
  return (
    <div>
      {text.split(/\n{2,}/).map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed || trimmed === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '4px 0 16px' }} />;
        }
        const lines = trimmed.split('\n');
        const match = lines[0].match(/^(?:#{1,3}\s*)?(\d+)\.\s+(.+)/);
        if (match) {
          const title = match[2].replace(/\*\*/g, '').replace(/^—\s*/, '').trim();
          const body  = lines.slice(1).join('\n').trim();
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{
                color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                textTransform: 'uppercase', paddingBottom: 6, marginBottom: 10,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {match[1]}. {title}
              </div>
              {body && <InsightBody text={body} />}
            </div>
          );
        }
        return <InsightBody key={i} text={trimmed} style={{ marginBottom: 12 }} />;
      })}
    </div>
  );
}

// ─── insights panel ───────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',    label: 'Strategic Overview', endpoint: 'insights' },
  { key: 'buyingGuide', label: 'Buying Guide',        endpoint: 'insights/buying-guide' },
  { key: 'weeklyFocus', label: 'Weekly Focus',        endpoint: 'insights/weekly-focus' },
  { key: 'riskFlags',   label: 'Risk Flags',          endpoint: 'insights/risk-flags' },
];

const EMPTY_TAB = { text: null, loading: false, error: null };

function ActionBtn({ onClick, disabled, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? C.border : hover ? '#C02E24' : C.accent,
        color:      disabled ? C.muted  : '#FFFFFF',
        border: 'none', borderRadius: 6,
        padding: '9px 20px', fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function InsightsSection() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tabState,  setTabState]  = useState({
    overview:    { ...EMPTY_TAB },
    buyingGuide: { ...EMPTY_TAB },
    weeklyFocus: { ...EMPTY_TAB },
    riskFlags:   { ...EMPTY_TAB },
  });

  const current = tabState[activeTab];
  const meta    = TABS.find(t => t.key === activeTab);

  async function generate() {
    setTabState(prev => ({ ...prev, [activeTab]: { text: null, loading: true, error: null } }));
    try {
      const res = await axios.get(`${API}/${meta.endpoint}`);
      setTabState(prev => ({ ...prev, [activeTab]: { text: res.data.insights, loading: false, error: null } }));
    } catch (e) {
      setTabState(prev => ({ ...prev, [activeTab]: { text: null, loading: false, error: e.message } }));
    }
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <SectionTitle>Insights</SectionTitle>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(tab => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background:   active ? C.accent : 'transparent',
                color:        active ? '#FFFFFF' : C.muted,
                border:       'none', borderRadius: '6px 6px 0 0',
                padding:      '8px 14px', fontSize: 12,
                fontWeight:   active ? 700 : 500, cursor: 'pointer',
                marginBottom: -1,
                borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
                transition:   'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <ActionBtn onClick={generate} disabled={current.loading}>
          {current.loading ? 'Analyzing…' : 'Get Recommendations'}
        </ActionBtn>
        {current.text && !current.loading && (
          <span style={{ color: C.muted, fontSize: 12 }}>Click to refresh</span>
        )}
      </div>

      {current.loading && (
        <div style={{ color: C.muted, fontSize: 13, padding: '20px 0', textAlign: 'center', fontStyle: 'italic' }}>
          Analyzing {meta.label.toLowerCase()}…
        </div>
      )}

      {current.error && (
        <div style={{ color: C.accent, fontSize: 13, padding: '12px 16px', background: '#FFF5F5', borderRadius: 6, border: `1px solid #F5C0BC` }}>
          Error: {current.error}
        </div>
      )}

      {current.text && !current.loading && (
        <div style={{ background: C.panel, borderRadius: 8, padding: '20px 24px', maxHeight: 480, overflowY: 'auto', border: `1px solid ${C.border}` }}>
          <InsightText text={current.text} />
        </div>
      )}

      {!current.text && !current.loading && !current.error && (
        <div style={{ color: C.muted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          Click <strong style={{ color: C.accent }}>Get Recommendations</strong> to view insights.
        </div>
      )}
    </Card>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────

const LAYOUT_CSS = `
  .app-shell {
    background: #F5F5F5;
    color: #222222;
    font-family: system-ui, -apple-system, Arial, sans-serif;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .app-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }
  .app-left {
    flex: 0 0 70%;
    overflow-y: auto;
    padding: 20px 20px 20px 32px;
    min-width: 0;
  }
  .app-right {
    flex: 0 0 30%;
    overflow: hidden;
    min-width: 0;
  }
  @media (max-width: 768px) {
    .app-shell { height: auto; overflow: visible; }
    .app-body  { flex-direction: column; overflow: visible; }
    .app-left  { flex: none; width: 100%; overflow-y: visible; padding: 16px; }
    .app-right { flex: none; width: 100%; height: 70vh; overflow: hidden; }
  }
`;

export default function App() {
  const [summary,    setSummary]    = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byProgram,  setByProgram]  = useState([]);
  const [byMonth,    setByMonth]    = useState([]);
  const [byLocation, setByLocation] = useState([]);
  const [status,     setStatus]     = useState('loading');
  const [errMsg,     setErrMsg]     = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/summary`),
      axios.get(`${API}/by-category`),
      axios.get(`${API}/by-program`),
      axios.get(`${API}/by-month`),
      axios.get(`${API}/by-location`),
    ])
      .then(([s, cat, prog, month, loc]) => {
        setSummary(s.data);
        setByCategory(cat.data);
        setByProgram(prog.data);
        setByMonth(month.data);
        setByLocation(loc.data);
        setStatus('ok');
      })
      .catch((e) => { setErrMsg(e.message); setStatus('error'); });
  }, []);

  if (status === 'loading') return (
    <>
      <style>{LAYOUT_CSS}</style>
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.muted, fontSize: 16 }}>Loading data…</span>
      </div>
    </>
  );

  if (status === 'error') return (
    <>
      <style>{LAYOUT_CSS}</style>
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ color: C.accent, fontSize: 18, fontWeight: 600 }}>Could not reach the API</span>
        <span style={{ color: C.muted, fontSize: 14 }}>{errMsg}</span>
      </div>
    </>
  );

  const totalProfitLabel =
    `${summary.total_profit >= 0 ? '' : '−'}$${Math.abs(summary.total_profit / 1000).toFixed(1)}k`;

  return (
    <>
      <style>{LAYOUT_CSS}</style>
      <div className="app-shell">

        {/* Header — full width */}
        <div style={{ background: '#FFFFFF', borderBottom: `3px solid ${C.accent}`, padding: '13px 32px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>Nellis Auction</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>Analytics Dashboard</span>
          </div>
        </div>

        {/* Two-column body */}
        <div className="app-body">

          {/* Left — charts & insights */}
          <div className="app-left">

            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard label="Total Revenue"  value={`$${(summary.total_revenue / 1000).toFixed(1)}k`}  color={C.accent} />
              <StatCard label="Total Profit"   value={totalProfitLabel}                                   color={summary.total_profit >= 0 ? C.accent : '#999999'} />
              <StatCard label="Total Auctions" value={summary.total_auctions.toLocaleString()}           color={C.text} />
              <StatCard label="Avg Margin"     value={`${summary.avg_margin_pct.toFixed(2)}%`}           color={summary.avg_margin_pct >= 0 ? C.accent : '#999999'} />
            </div>

            {/* Category + Program */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Card title="Profit by Category">
                <CategoryChart data={byCategory} />
              </Card>
              <Card title="Profit & Margin by Program">
                <ProgramChart data={byProgram} />
              </Card>
            </div>

            {/* Trend + Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
              <Card title="Monthly Revenue & Profit Trend">
                <TrendChart data={byMonth} />
              </Card>
              <Card title="Profit by Location">
                <LocationChart data={byLocation} />
              </Card>
            </div>

            <InsightsSection />
            <AIInsights />

            <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 4, paddingBottom: 16 }}>
              Nellis Auction Analytics · 2024 · {summary.total_auctions} auctions
            </div>
          </div>

          {/* Right — question panel */}
          <div className="app-right">
            <AuctionChat />
          </div>

        </div>
      </div>
    </>
  );
}
