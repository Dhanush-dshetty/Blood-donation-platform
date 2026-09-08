import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const QUICK_QUESTIONS = [
  'Am I eligible to donate?',
  'When can I donate again?',
  'How long does donation take?',
  'What are the side effects?',
  'What diet should I follow?',
  'What happens to my blood?',
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! 👋 I\'m your blood donation assistant. Ask me anything about donating blood — eligibility, scheduling, diet, and more!' }
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
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, I\'m having trouble connecting right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>💬</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>AI Donation Assistant</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Powered by Blood Platform AI</div>
          </div>
        </div>
        <Link to="/donor/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>
      </div>

      <div style={{ flex: 1, maxWidth: 700, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
        {/* Quick questions */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 8 }}>Quick questions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{ padding: '6px 14px', background: 'white', border: '1.5px solid #ddd', borderRadius: 20, fontSize: '0.85rem', cursor: 'pointer', color: '#555' }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowY: 'auto', maxHeight: '50vh', minHeight: 300 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {m.from === 'bot' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, fontSize: '1rem', flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                maxWidth: '75%', padding: '10px 16px', borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.from === 'user' ? '#c0392b' : '#f8f9fa',
                color: m.from === 'user' ? 'white' : '#333',
                fontSize: '0.95rem', lineHeight: 1.5
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>🤖</div>
              <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: '#f8f9fa', color: '#888' }}>Typing...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            style={{ flex: 1, padding: '12px 16px', borderRadius: 24, border: '1.5px solid #ddd', fontSize: '1rem', outline: 'none' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about blood donation..."
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ padding: '12px 24px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
