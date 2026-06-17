import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

const C = {
  bg:     '#1a1a2e',
  card:   '#16213e',
  panel:  '#0f3460',
  accent: '#f5a623',
  text:   '#e0e0e0',
  muted:  '#9e9e9e',
  grid:   '#2a2a4a',
  red:    '#ef5350',
};

const SUGGESTIONS = [
  'Which category makes the most profit?',
  'Should we buy more Renewed pallets?',
  'Dean Martin vs North Las Vegas?',
  "What's our worst product mix?",
  'Buying recommendation for next week?',
];

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm your Nellis Analytics assistant. I have access to your full 2024 auction data. Ask me anything — categories, margins, program performance, or what to buy next week.",
};

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth:     '82%',
        background:   isUser ? C.accent : C.panel,
        color:        isUser ? '#1a1a2e' : C.text,
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding:      '10px 14px',
        fontSize:     13,
        lineHeight:   1.65,
        fontWeight:   isUser ? 500 : 400,
        whiteSpace:   'pre-wrap',
        wordBreak:    'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        background: C.panel, borderRadius: '14px 14px 14px 4px',
        padding: '12px 18px', display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: C.muted,
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function AuctionChat() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function send(text = input.trim()) {
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, {
        message: text,
        history: messages,   // full history including welcome; backend strips leading assistant
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${detail}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── collapsed bubble ────────────────────────────────────────────────────────
  if (!open) {
    return (
      <>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40%            { transform: scale(1.2); opacity: 1; }
          }
        `}</style>
        <button
          onClick={() => setOpen(true)}
          title="Open Nellis Assistant"
          style={{
            position:      'fixed', bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: '50%',
            background: C.accent, border: 'none', cursor: 'pointer',
            fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
            zIndex: 1000, transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          💬
        </button>
      </>
    );
  }

  // ── open panel ──────────────────────────────────────────────────────────────
  const showSuggestions = messages.length === 1;

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
        .chat-input::placeholder { color: #9e9e9e; }
        .chat-input:focus { border-color: #f5a623 !important; }
      `}</style>

      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        width: 390, height: 530,
        display: 'flex', flexDirection: 'column',
        background: C.card, borderRadius: 16,
        border: `1px solid ${C.grid}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: C.panel, padding: '13px 18px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${C.grid}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: C.accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15, flexShrink: 0,
            }}>🤖</div>
            <div>
              <div style={{ color: C.accent, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
                Nellis Assistant
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                {loading ? 'Thinking…' : 'Powered by Claude'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'transparent', border: 'none',
              color: C.muted, cursor: 'pointer', fontSize: 22,
              lineHeight: 1, padding: '2px 6px', borderRadius: 4,
            }}
          >×</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {showSuggestions && (
          <div style={{
            padding: '4px 12px 10px', display: 'flex',
            flexWrap: 'wrap', gap: 6, flexShrink: 0,
          }}>
            {SUGGESTIONS.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  background: C.bg, color: C.muted,
                  border: `1px solid ${C.grid}`, borderRadius: 12,
                  padding: '5px 10px', fontSize: 11, cursor: 'pointer',
                  transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.grid; }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          padding: '10px 12px', borderTop: `1px solid ${C.grid}`,
          display: 'flex', gap: 8, flexShrink: 0, background: C.card,
        }}>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your auction data…"
            disabled={loading}
            style={{
              flex: 1, background: C.bg,
              border: `1px solid ${C.grid}`, borderRadius: 8,
              padding: '9px 12px', color: C.text, fontSize: 13,
              outline: 'none', transition: 'border-color 0.15s',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              background:   (!input.trim() || loading) ? C.grid : C.accent,
              color:        (!input.trim() || loading) ? C.muted : '#1a1a2e',
              border:       'none', borderRadius: 8,
              padding:      '9px 16px', fontWeight: 700, fontSize: 13,
              cursor:       (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              transition:   'background 0.15s',
              flexShrink:   0,
            }}
          >
            ↑
          </button>
        </div>

      </div>
    </>
  );
}
