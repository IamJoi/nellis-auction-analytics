import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

const C = {
  bg:        '#1a1a2e',
  card:      '#16213e',
  panel:     '#0f3460',
  accent:    '#f5a623',
  blue:      '#4fc3f7',
  green:     '#66bb6a',
  red:       '#ef5350',
  text:      '#e0e0e0',
  muted:     '#9e9e9e',
  grid:      '#2a2a4a',
};

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDollar  = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK       = (v) => `$${(v / 1000).toFixed(0)}k`;
const profitHue  = (v) => (v >= 0 ? C.accent : C.red);

// ─── primitives ─────────────────────────────────────────────────────────────

function Card({ title, children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: '20px 24px', ...style }}>
      {title && (
        <h2 style={{
          margin: '0 0 16px', color: C.accent, fontSize: 13, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, padding: '18px 24px',
      flex: 1, minWidth: 160, borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.accent}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ margin: '0 0 6px', color: C.accent, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: '3px 0', color: p.color }}>
          {p.name}:{' '}
          {p.name.includes('%') ? `${p.value?.toFixed(2)}%` : fmtDollar(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── charts ─────────────────────────────────────────────────────────────────

function CategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis
          dataKey="category"
          tick={{ fill: C.muted, fontSize: 11 }}
          angle={-35} textAnchor="end" interval={0}
        />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={fmtK} />
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
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis
          dataKey="amazon_program"
          tick={{ fill: C.muted, fontSize: 11 }}
          angle={-20} textAnchor="end" interval={0}
        />
        <YAxis yAxisId="left" tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={fmtK} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: C.blue, fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 4 }} />
        <Bar yAxisId="left"  dataKey="profit" name="Profit"    fill={C.accent} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="margin" name="Margin %"  fill={C.blue}   radius={[4, 4, 0, 0]} opacity={0.75} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis
          dataKey="month"
          tick={{ fill: C.muted, fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={fmtK} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ color: C.muted, fontSize: 12, paddingTop: 4 }} />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="profit"  name="Profit"  stroke={C.blue}   strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function LocationChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={fmtK} />
        <YAxis type="category" dataKey="location" tick={{ fill: C.muted, fontSize: 11 }} width={115} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.location} fill={profitHue(d.profit)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── root ────────────────────────────────────────────────────────────────────

export default function App() {
  const [summary,     setSummary]     = useState(null);
  const [byCategory,  setByCategory]  = useState([]);
  const [byProgram,   setByProgram]   = useState([]);
  const [byMonth,     setByMonth]     = useState([]);
  const [byLocation,  setByLocation]  = useState([]);
  const [status,      setStatus]      = useState('loading'); // 'loading' | 'error' | 'ok'
  const [errMsg,      setErrMsg]      = useState('');

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

  const shell = (content) => (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: C.text, padding: '28px 36px' }}>
      {content}
    </div>
  );

  if (status === 'loading') return shell(
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: C.accent, fontSize: 18 }}>
      Loading data…
    </div>
  );

  if (status === 'error') return shell(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: 12 }}>
      <span style={{ color: C.red, fontSize: 18 }}>Could not reach the API</span>
      <span style={{ color: C.muted, fontSize: 14 }}>{errMsg}</span>
      <span style={{ color: C.muted, fontSize: 13 }}>Make sure the FastAPI server is running on port 8000.</span>
    </div>
  );

  const totalProfitLabel =
    `${summary.total_profit >= 0 ? '' : '−'}$${Math.abs(summary.total_profit / 1000).toFixed(1)}k`;

  return shell(
    <>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.accent }}>
          Nellis Auction Analytics
        </h1>
        <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 14 }}>2024 Performance Dashboard</p>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Revenue"   value={`$${(summary.total_revenue / 1000).toFixed(1)}k`}        color={C.accent} />
        <StatCard label="Total Profit"    value={totalProfitLabel}                                         color={profitHue(summary.total_profit)} />
        <StatCard label="Total Auctions"  value={summary.total_auctions.toLocaleString()}                 color={C.blue} />
        <StatCard label="Avg Margin"      value={`${summary.avg_margin_pct.toFixed(2)}%`}                 color={profitHue(summary.avg_margin_pct)} />
      </div>

      {/* Category + Program */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Profit by Category">
          <CategoryChart data={byCategory} />
        </Card>
        <Card title="Profit & Margin by Amazon Program">
          <ProgramChart data={byProgram} />
        </Card>
      </div>

      {/* Trend + Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Monthly Revenue & Profit Trend">
          <TrendChart data={byMonth} />
        </Card>
        <Card title="Profit by Location">
          <LocationChart data={byLocation} />
        </Card>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 8 }}>
        Nellis Auction Analytics · 2024 · {summary.total_auctions} auctions
      </div>
    </>
  );
}
