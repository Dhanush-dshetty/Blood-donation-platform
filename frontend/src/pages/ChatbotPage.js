import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const QUICK_QUESTIONS = [
  'Am I eligible to donate?',
  'When can I donate again?',
  'How long does donation take?',
  'What are the side effects?',
  'What diet should I follow before donating?',
  'What happens to my blood after donation?',
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'Hello! 👋 I am your Clinical Blood Donation Assistant. Ask me anything regarding donation eligibility criteria, prep guidelines, intervals, or blood safety protocols.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { from: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/chat`, { message: msg });
      setMessages(prev => [...prev, { from: 'bot', text: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { from: 'bot', text: 'I am experiencing a temporary connection issue. Please try again shortly.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: 840, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '28px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            <span>🤖</span> Clinical AI Consultant
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Blood Donation Assistant
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>
            Instant answers for donor eligibility, health pre-requisites & blood transfusion science
          </p>
        </div>

        {/* Quick Questions Pills */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Suggested Prompts:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  padding: '7px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 9999,
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat conversation area */}
        <div
          className="modern-card"
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            minHeight: 380,
            maxHeight: '52vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 10
              }}
            >
              {m.from === 'bot' && (
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0
                }}>
                  🤖
                </div>
              )}

              <div
                style={{
                  maxWidth: '78%',
                  padding: '12px 18px',
                  borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.from === 'user' ? '#dc2626' : '#f8fafc',
                  color: m.from === 'user' ? '#ffffff' : '#1e293b',
                  border: m.from === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: '0.925rem',
                  lineHeight: 1.55,
                  boxShadow: m.from === 'user' ? '0 2px 4px rgba(220, 38, 38, 0.2)' : 'none'
                }}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🤖
              </div>
              <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f8fafc', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
                Consulting clinical guidelines...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            className="form-control"
            style={{ borderRadius: 10, padding: '12px 16px', fontSize: '0.95rem' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your question (e.g. Can I donate if I had a tattoo 6 months ago?)..."
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', borderRadius: 10 }}
          >
            <span>Send</span>
          </button>
        </div>
      </main>
    </div>
  );
}
