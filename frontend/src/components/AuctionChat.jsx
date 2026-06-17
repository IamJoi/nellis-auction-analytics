import React, { useState, useRef, useEffect } from 'react';
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

const SUGGESTIONS = [
  'Which category makes the most profit?',
  'Should we buy more Phoenix 6 pallets?',
  'Dean Martin vs North Las Vegas?',
  "What's our worst product mix?",
  'Buying recommendation for next week?',
];

const WELCOME = {
  role: 'assistant',
  content: 'Have a question about your 2024 auction data? Ask about categories, margins, programs, or what to buy next week.',
};

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth:     '85%',
        background:   isUser ? C.accent : C.bg,
        color:        isUser ? '#FFFFFF' : C.text,
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding:      '10px 14px',
        fontSize:     13,
        lineHeight:   1.65,
        fontWeight:   isUser ? 500 : 400,
        whiteSpace:   'pre-wrap',
        wordBreak:    'break-word',
        border:       isUser ? 'none' : `1px solid ${C.border}`,
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AuctionChat() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Only scroll after the user has sent at least one message (length > 1 means WELCOME + at least one turn)
  useEffect(() => {
    if (messages.length > 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Only auto-focus on desktop — on mobile, focusing the input triggers the virtual
  // keyboard and causes the browser to scroll the entire page to the input field.
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, []);

  async function send(text = input.trim()) {
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, {
        message: text,
        history: messages,
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

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      <style>{`
        .chat-input::placeholder { color: #999999; }
        .chat-input:focus { border-color: #E8372C !important; outline: none; }
        .chat-chip:hover { color: #E8372C !important; border-color: #E8372C !important; }
        .send-btn:not(:disabled):hover { background: #C02E24 !important; }
      `}</style>

      <div style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        background:    C.card,
        borderLeft:    `3px solid ${C.accent}`,
      }}>

        {/* Header */}
        <div style={{
          padding:      '14px 18px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
          background:   C.card,
        }}>
          <h2 style={{ margin: 0, color: C.text, fontSize: 15, fontWeight: 700 }}>
            Ask a Question
          </h2>
        </div>

        {/* Messages */}
        <div style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '14px 12px 8px',
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
          background:    C.bg,
        }}>
          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}

          {loading && (
            <div style={{ color: C.muted, fontStyle: 'italic', fontSize: 13, padding: '4px 6px' }}>
              Analyzing…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips — shown only on first load */}
        {showSuggestions && (
          <div style={{
            padding:     '6px 12px 8px',
            display:     'flex',
            flexWrap:    'wrap',
            gap:         6,
            flexShrink:  0,
            background:  C.card,
            borderTop:   `1px solid ${C.border}`,
          }}>
            {SUGGESTIONS.map(q => (
              <button
                key={q}
                className="chat-chip"
                onClick={() => send(q)}
                style={{
                  background:   C.bg,
                  color:        C.muted,
                  border:       `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding:      '5px 10px',
                  fontSize:     11,
                  cursor:       'pointer',
                  transition:   'color 0.1s, border-color 0.1s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          padding:     '10px 12px',
          borderTop:   `1px solid ${C.border}`,
          display:     'flex',
          gap:         8,
          flexShrink:  0,
          background:  C.card,
        }}>
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your question…"
            disabled={loading}
            style={{
              flex:       1,
              background: C.bg,
              border:     `1px solid ${C.border}`,
              borderRadius: 8,
              padding:    '9px 12px',
              color:      C.text,
              fontSize:   13,
              outline:    'none',
              transition: 'border-color 0.15s',
            }}
          />
          <button
            className="send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              background:  (!input.trim() || loading) ? C.border : C.accent,
              color:       (!input.trim() || loading) ? C.muted  : '#FFFFFF',
              border:      'none',
              borderRadius: 8,
              padding:     '9px 16px',
              fontWeight:  700,
              fontSize:    13,
              cursor:      (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              transition:  'background 0.15s',
              flexShrink:  0,
            }}
          >
            Send
          </button>
        </div>

      </div>
    </>
  );
}
