import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Navbar from '../components/Navbar';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const URGENCY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'HIGH',     color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  medium:   { label: 'MEDIUM',   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  low:      { label: 'LOW',      color: '#059669', bg: '#ecfdf5', border: '#d1fae5' }
};

export default function HospitalDashboard() {
  const { profile } = useAuth();
  const [inventory, setInventory] = useState({});
  const [requests, setRequests] = useState([]);
  const [forecast, setForecast] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({ bloodGroup: 'O+', unitsRequired: 1, urgencyLevel: 'medium', patientCondition: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchInventory();
    fetchRequests();
    fetchForecast();

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
    setMsg('');
    try {
      const res = await axios.post(`${API_URL}/requests`, reqForm);
      setMsg(`✅ Request created successfully! ${res.data.alertedDonors} nearby donors alerted.`);
      setShowRequestModal(false);
      setReqForm({ bloodGroup: 'O+', unitsRequired: 1, urgencyLevel: 'medium', patientCondition: '' });
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
        label: 'Current Verified Stock',
        data: BLOOD_GROUPS.map(bg => inventory[bg] || 0),
        backgroundColor: '#dc2626',
        borderRadius: 6,
      },
      {
        label: 'Recommended Safety Reserve (AI)',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.recommended_stock || 0),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
          boxWidth: 14,
          boxHeight: 14,
          borderRadius: 3
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
    }
  };

  const openRequestsCount = requests.filter(r => r.status === 'open').length;
  const totalUnits = Object.values(inventory).reduce((s, v) => s + v, 0);
  const activeDonors = requests.reduce((s, r) => s + (r.respondedDonors?.length || 0), 0);
  const fulfilledRecent = requests.filter(r => r.status === 'fulfilled' && new Date(r.fulfilledAt) > new Date(Date.now() - 86400000)).length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Hospital Transfusion Center
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
              Live inventory monitoring, emergency donor mobilization & regional exchange
            </p>
          </div>

          <button
            onClick={() => setShowRequestModal(true)}
            className="btn btn-primary"
            style={{ padding: '12px 20px', fontSize: '0.95rem' }}
          >
            <span>🚨 Create Emergency Request</span>
          </button>
        </div>

        {msg && (
          <div style={{
            padding: '12px 18px',
            borderRadius: 10,
            background: msg.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${msg.startsWith('✅') ? '#a7f3d0' : '#fecaca'}`,
            color: msg.startsWith('✅') ? '#065f46' : '#991b1b',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')} style={{ color: 'inherit', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Real-time Alerts Banner */}
        {alerts.length > 0 && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 28
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46', fontWeight: 700, fontSize: '0.95rem' }}>
              <span>🔔</span> Live Donor Response Feed ({alerts.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ background: '#ffffff', borderRadius: 8, padding: '12px 14px', border: '1px solid #d1fae5', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginBottom: 4 }}>
                    [{a.time}] {a.unitsFulfilled || 1} Unit(s) Committed
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{a.donorName || 'Verified Donor'}</div>
                  {a.donorPhone && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📞 {a.donorPhone}</div>}
                  {a.donorMessage && <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginTop: 4 }}>"{a.donorMessage}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Verified Units', value: totalUnits, icon: '📦', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Open Emergency Requests', value: openRequestsCount, icon: '🚨', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
            { label: 'Active Donors Alerted', value: activeDonors, icon: '👥', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Fulfilled in Last 24h', value: fulfilledRecent, icon: '✓', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
          ].map(stat => (
            <div key={stat.label} className="modern-card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, marginTop: 4, lineHeight: 1.1 }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: stat.bg, color: stat.color,
                  border: `1px solid ${stat.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem'
                }}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid: Chart & Quick Inventory Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 28 }} className="dashboard-grid">
          {/* Chart Card */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Live Inventory vs AI Recommended Target
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.825rem', marginTop: 2 }}>
                  Real-time stock compared against predictive daily demand models
                </p>
              </div>
            </div>
            <div style={{ height: 280, position: 'relative' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Quick Matrix Card */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              Current Reserves
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: 16 }}>
              Instant view of safe units per blood group
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {BLOOD_GROUPS.map(bg => {
                const count = inventory[bg] || 0;
                const isCritical = count < 3;
                const isSurplus = count > 10;
                const statusColor = isCritical ? '#dc2626' : isSurplus ? '#059669' : '#d97706';
                const statusBg = isCritical ? '#fef2f2' : isSurplus ? '#ecfdf5' : '#fffbeb';
                const statusBorder = isCritical ? '#fecaca' : isSurplus ? '#a7f3d0' : '#fef3c7';

                return (
                  <div key={bg} style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: statusBg,
                    border: `1px solid ${statusBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{bg}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: statusColor }}>{count}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 3 }}>units</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Blood Requests */}
        <div className="modern-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Recent Blood Requests
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.825rem', marginTop: 2 }}>
                Hospital patient emergency requests and donor dispatch status
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600 }}>No requests created yet.</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
                Click "Create Emergency Request" to initiate donor alerts.
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Blood Group</th>
                    <th>Fulfillment</th>
                    <th>Urgency Level</th>
                    <th>AI Score</th>
                    <th>Responded</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 8).map(r => {
                    const ucfg = URGENCY_CONFIG[r.urgencyLevel] || URGENCY_CONFIG.medium;
                    const isFulfilled = r.status === 'fulfilled';

                    return (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>
                          {r.bloodGroup}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: isFulfilled ? '#059669' : '#0f172a' }}>
                            {r.unitsFulfilled}
                          </span>
                          <span style={{ color: '#94a3b8' }}> / {r.unitsRequired} units</span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: ucfg.color,
                            backgroundColor: ucfg.bg,
                            border: `1px solid ${ucfg.border}`
                          }}>
                            {ucfg.label}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontWeight: 600 }}>
                          {(r.aiUrgencyScore * 100).toFixed(0)}%
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {r.respondedDonors?.length || 0} donors
                        </td>
                        <td>
                          <span className={`badge ${isFulfilled ? 'badge-success' : 'badge-warning'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.825rem' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Emergency Request Modal */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div className="modern-card" style={{ width: '100%', maxWidth: 480, padding: '32px', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.5rem' }}>🚨</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>New Emergency Request</h3>
              </div>
              <button onClick={() => setShowRequestModal(false)} style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={submitRequest}>
              <div className="form-group">
                <label className="form-label">Required Blood Group *</label>
                <select
                  className="form-control"
                  value={reqForm.bloodGroup}
                  onChange={e => setReqForm(f => ({ ...f, bloodGroup: e.target.value }))}
                >
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Units Required *</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max="50"
                    value={reqForm.unitsRequired}
                    onChange={e => setReqForm(f => ({ ...f, unitsRequired: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency Level *</label>
                  <select
                    className="form-control"
                    value={reqForm.urgencyLevel}
                    onChange={e => setReqForm(f => ({ ...f, urgencyLevel: e.target.value }))}
                  >
                    <option value="critical">🔴 Critical (Immediate)</option>
                    <option value="high">🟠 High (Within 2 hrs)</option>
                    <option value="medium">🟡 Medium (Same day)</option>
                    <option value="low">🟢 Low (Scheduled)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Patient Clinical Condition (Optional)</label>
                <input
                  className="form-control"
                  value={reqForm.patientCondition}
                  onChange={e => setReqForm(f => ({ ...f, patientCondition: e.target.value }))}
                  placeholder="e.g. Trauma Surgery, ICU severe anemia, OR 3"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {loading ? 'Alerting Donors...' : '⚡ Broadcast Emergency Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
