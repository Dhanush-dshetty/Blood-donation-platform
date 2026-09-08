import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  hero: {
    background: 'linear-gradient(135deg, #c0392b 0%, #8e1a12 100%)',
    color: 'white',
    padding: '80px 40px',
    textAlign: 'center',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: '3rem', fontWeight: 700, marginBottom: 16 },
  subtitle: { fontSize: '1.3rem', maxWidth: 600, marginBottom: 40, opacity: 0.9 },
  btnRow: { display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    padding: '14px 32px', borderRadius: 8, border: 'none',
    fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
  },
  features: { padding: '60px 40px', background: 'white' },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 24, maxWidth: 1000, margin: '0 auto'
  },
  card: {
    background: '#fff5f5', borderRadius: 12,
    padding: 24, borderLeft: '4px solid #c0392b'
  },
  cardTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: '#c0392b' },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDashboard = () => {
    if (user) navigate(user.role === 'hospital' ? '/hospital/dashboard' : '/donor/dashboard');
    else navigate('/login');
  };

  return (
    <div>
      <div style={styles.hero}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🩸</div>
        <h1 style={styles.title}>Integrated Blood Donation &amp;<br />Safety Verification Platform</h1>
        <p style={styles.subtitle}>
          Connecting hospitals with nearby donors in real-time. Every unit verified.
          Every transfusion safe. Powered by AI.
        </p>
        <div style={styles.btnRow}>
          <button style={{ ...styles.btn, background: 'white', color: '#c0392b' }} onClick={handleDashboard}>
            {user ? 'Go to Dashboard' : 'Login'}
          </button>
          {!user && (
            <button style={{ ...styles.btn, background: 'transparent', color: 'white', border: '2px solid white' }}
              onClick={() => navigate('/register')}>
              Register
            </button>
          )}
        </div>
      </div>

      <div style={styles.features}>
        <h2 style={{ textAlign: 'center', marginBottom: 32, color: '#c0392b' }}>Platform Features</h2>
        <div style={styles.featureGrid}>
          {[
            { icon: '📍', title: 'Location-Based Matching', desc: 'Real-time geolocation finds the nearest eligible donors within minutes during emergencies.' },
            { icon: '🤖', title: 'AI Donor Ranking', desc: 'Machine learning ranks donors by response rate, donation history, and proximity for faster mobilization.' },
            { icon: '🛡️', title: 'Digital Safety Verification', desc: 'Automated rule-based and AI-powered checks verify blood test results, expiry, and compatibility before transfusion.' },
            { icon: '📊', title: 'Demand Forecasting', desc: 'AI predicts future blood demand per group, helping hospitals maintain optimal stock levels.' },
            { icon: '🔔', title: 'Real-Time Alerts', desc: 'Socket.IO powered instant alerts notify donors the moment a matching request comes in.' },
            { icon: '💬', title: 'Donor AI Chatbot', desc: 'An intelligent chatbot guides donors through eligibility, scheduling, and FAQs 24/7.' },
          ].map(f => (
            <div key={f.title} style={styles.card}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{f.icon}</div>
              <div style={styles.cardTitle}>{f.title}</div>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
