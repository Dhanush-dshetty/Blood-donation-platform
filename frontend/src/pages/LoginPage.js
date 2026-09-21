import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' },
  card: { background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#c0392b', marginBottom: 8 },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#444', fontSize: '0.9rem' },
  input: { width: '100%', padding: '12px 16px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '1rem', marginBottom: 16, outline: 'none' },
  btn: { width: '100%', padding: '14px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  error: { background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' },
};

const getRedirect = (role) => {
  if (role === 'hospital') return '/hospital/dashboard';
  if (role === 'admin') return '/admin';
  return '/donor/dashboard';
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(getRedirect(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign In</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>Welcome back to the Blood Donation Platform</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
          Don't have an account? <Link to="/register" style={{ color: '#c0392b', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
