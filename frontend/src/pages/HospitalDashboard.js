import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

export default function HospitalDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState({});
  const [requests, setRequests] = useState([]);
  const [forecast, setForecast] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ bloodGroup: 'O+', unitsRequired: 1, urgencyLevel: 'medium', patientCondition: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchInventory();
    fetchRequests();
    fetchForecast();

    // Socket for real-time alerts
    if (profile?._id) {
      const socket = io(SOCKET_URL);
      socket.emit('join_hospital', profile._id);
      socket.on('donor_responded', (data) => {
        setAlerts(prev => [{ ...data, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        fetchRequests();
      });
      return () => socket.disconnect();
    }
  }, [profile]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory`);
      setInventory(res.data.summary || {});
    } catch (e) {}
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/requests/hospital`);
      setRequests(res.data);
    } catch (e) {}
  };

  const fetchForecast = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/forecast`);
      setForecast(res.data.forecast || {});
    } catch (e) {}
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/requests`, reqForm);
      setMsg(`✅ Request created! ${res.data.alertedDonors} nearby donors alerted.`);
      setShowRequest(false);
      fetchRequests();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Failed to create request'));
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: BLOOD_GROUPS,
    datasets: [
      {
        label: 'Current Stock (units)',
        data: BLOOD_GROUPS.map(bg => inventory[bg] || 0),
        backgroundColor: '#c0392b',
      },
      {
        label: 'Recommended Stock (AI)',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.recommended_stock || 0),
        backgroundColor: '#f39c12',
      }
    ]
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile?.hospitalName || user?.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hospital Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/hospital/inventory" style={{ color: 'white', fontWeight: 600 }}>Inventory</Link>
          <Link to="/hospital/requests" style={{ color: 'white', fontWeight: 600 }}>Requests</Link>
          <Link to="/hospital/map" style={{ color: 'white', fontWeight: 600 }}>🗺️ Map</Link>
          <Link to="/hospital/analytics" style={{ color: 'white', fontWeight: 600 }}>📊 Analytics</Link>
          <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6 }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
        {msg && <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 16 }}>{msg}</div>}

        {/* Real-time Alerts */}
        {alerts.length > 0 && (
          <div style={{ background: '#e8f8e8', border: '1px solid #27ae60', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <strong>🔔 Live Donor Responses</strong>
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} style={{ marginTop: 10, background: 'white', borderRadius: 8, padding: 10, fontSize: '0.9rem' }}>
                <div style={{ color: '#27ae60', fontWeight: 600 }}>[{a.time}] New donor response — {a.unitsFulfilled} unit(s) fulfilled</div>
                {a.donorName && <div style={{ marginTop: 4 }}>👤 <strong>{a.donorName}</strong></div>}
                {a.donorPhone && <div>📞 {a.donorPhone}</div>}
                {a.donorEmail && <div>✉️ {a.donorEmail}</div>}
                {a.donorMessage && <div style={{ color: '#666', fontStyle: 'italic' }}>"{a.donorMessage}"</div>}
              </div>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Open Requests', value: requests.filter(r => r.status === 'open').length, color: '#e74c3c' },
            { label: 'Active Donors Alerted', value: requests.reduce((s, r) => s + r.respondedDonors.length, 0), color: '#e67e22' },
            { label: 'Total Blood Units', value: Object.values(inventory).reduce((s, v) => s + v, 0), color: '#c0392b' },
            { label: 'Fulfilled Today', value: requests.filter(r => r.status === 'fulfilled' && new Date(r.fulfilledAt) > new Date(Date.now() - 86400000)).length, color: '#27ae60' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Chart */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginBottom: 16 }}>Blood Inventory vs AI Forecast</h3>
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>

          {/* Quick Request */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginBottom: 16 }}>🚨 Emergency Blood Request</h3>
            {!showRequest ? (
              <button onClick={() => setShowRequest(true)} style={{ width: '100%', padding: 14, background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '1rem' }}>
                Create New Request
              </button>
            ) : (
              <form onSubmit={submitRequest}>
                <select style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }}
                  value={reqForm.bloodGroup} onChange={e => setReqForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
                <input type="number" min="1" style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }}
                  value={reqForm.unitsRequired} onChange={e => setReqForm(f => ({ ...f, unitsRequired: e.target.value }))}
                  placeholder="Units required" />
                <select style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }}
                  value={reqForm.urgencyLevel} onChange={e => setReqForm(f => ({ ...f, urgencyLevel: e.target.value }))}>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <input style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }}
                  value={reqForm.patientCondition} onChange={e => setReqForm(f => ({ ...f, patientCondition: e.target.value }))}
                  placeholder="Patient condition (optional)" />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700 }}>
                  {loading ? 'Sending...' : 'Alert Donors Now'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginBottom: 16 }}>Recent Blood Requests</h3>
          {requests.length === 0 ? (
            <p style={{ color: '#999' }}>No requests yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  {['Blood Group', 'Units', 'Urgency', 'AI Score', 'Responded', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', color: '#888', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 8).map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#c0392b' }}>{r.bloodGroup}</td>
                    <td style={{ padding: '10px 12px' }}>{r.unitsFulfilled}/{r.unitsRequired}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: URGENCY_COLORS[r.urgencyLevel] + '22', color: URGENCY_COLORS[r.urgencyLevel], padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                        {r.urgencyLevel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#888' }}>{(r.aiUrgencyScore * 100).toFixed(0)}%</td>
                    <td style={{ padding: '10px 12px' }}>{r.respondedDonors?.length || 0}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: r.status === 'fulfilled' ? '#e8f8e8' : '#fff3cd', color: r.status === 'fulfilled' ? '#27ae60' : '#e67e22', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#888', fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
