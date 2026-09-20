import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TABS = ['Overview', 'Donors', 'Hospitals', 'Requests'];

const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };
const BG_COLORS = ['#c0392b','#e74c3c','#e67e22','#f39c12','#27ae60','#2980b9','#8e44ad','#16a085'];

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, donorsRes, hospitalsRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`),
        axios.get(`${API_URL}/admin/donors`),
        axios.get(`${API_URL}/admin/hospitals`),
        axios.get(`${API_URL}/admin/requests`)
      ]);
      setStats(statsRes.data);
      setDonors(donorsRes.data);
      setHospitals(hospitalsRes.data);
      setRequests(requestsRes.data);
    } catch (e) {
      setMsg('Failed to load data. Make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDonor = async (id) => {
    try {
      await axios.patch(`${API_URL}/admin/donors/${id}/toggle`);
      fetchAll();
    } catch (e) {}
  };

  // ── Charts data ──────────────────────────────────────────────────
  const bloodGroupPieData = {
    labels: stats?.bloodGroupStats?.map(b => b._id) || [],
    datasets: [{
      data: stats?.bloodGroupStats?.map(b => b.count) || [],
      backgroundColor: BG_COLORS,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const requestTrendData = {
    labels: stats?.requestTrend?.map(r => r._id) || [],
    datasets: [{
      label: 'Blood Requests',
      data: stats?.requestTrend?.map(r => r.count) || [],
      borderColor: '#c0392b',
      backgroundColor: 'rgba(192,57,43,0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const urgencyBarData = {
    labels: stats?.urgencyBreakdown?.map(u => u._id) || [],
    datasets: [{
      label: 'Requests by Urgency',
      data: stats?.urgencyBreakdown?.map(u => u.count) || [],
      backgroundColor: stats?.urgencyBreakdown?.map(u => URGENCY_COLORS[u._id] || '#888') || []
    }]
  };

  const filteredDonors = donors.filter(d =>
    d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.bloodGroup?.includes(search) ||
    d.area?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredHospitals = hospitals.filter(h =>
    h.hospitalName?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🩸</div>
        <div style={{ marginTop: 12, color: '#888' }}>Loading Admin Panel...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Blood Platform — Admin Panel</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Logged in as {user?.name}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '2px solid #eee', padding: '0 32px', display: 'flex', gap: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '14px 24px', border: 'none', background: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: tab === t ? '#c0392b' : '#888', borderBottom: tab === t ? '3px solid #c0392b' : '3px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {msg && <div style={{ background: '#fdecea', color: '#c0392b', padding: 12, margin: '16px 32px', borderRadius: 8 }}>{msg}</div>}

      <div style={{ padding: '32px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {tab === 'Overview' && stats && (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total Donors', value: stats.totalDonors, icon: '🧑', color: '#c0392b' },
                { label: 'Active Donors', value: stats.activeDonors, icon: '✅', color: '#27ae60' },
                { label: 'Hospitals', value: stats.totalHospitals, icon: '🏥', color: '#2980b9' },
                { label: 'Total Requests', value: stats.totalRequests, icon: '🩸', color: '#e67e22' },
                { label: 'Fulfilled', value: stats.fulfilledRequests, icon: '✔️', color: '#27ae60' },
                { label: 'Fulfillment Rate', value: `${stats.fulfillmentRate}%`, icon: '📊', color: '#8e44ad' },
                { label: 'Avg Response', value: `${stats.avgResponseTimeHrs}h`, icon: '⏱️', color: '#16a085' },
                { label: 'Blood Units', value: stats.totalInventory, icon: '💉', color: '#c0392b' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${s.color}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color, margin: '6px 0' }}>{s.value}</div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>🩸 Donors by Blood Group</h3>
                <Pie data={bloodGroupPieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>⚡ Requests by Urgency</h3>
                <Bar data={urgencyBarData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>📈 Request Trend (30 days)</h3>
                {requestTrendData.labels.length > 0
                  ? <Line data={requestTrendData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
                  : <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>No data yet</p>
                }
              </div>
            </div>
          </>
        )}

        {/* ── DONORS TAB ───────────────────────────────────────────── */}
        {tab === 'Donors' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#333' }}>All Donors ({donors.length})</h2>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, blood group, area..."
                style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #ddd', width: 280, fontSize: '0.9rem' }} />
            </div>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    {['Name', 'Email', 'Blood Group', 'Age', 'Area', 'State', 'Donations', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map(d => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.user?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>{d.user?.email || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#fff0f0', color: '#c0392b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{d.bloodGroup}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{d.age}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>{d.area || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>{d.state || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{d.totalDonations}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: d.isAvailable ? '#e8f8e8' : '#fdecea', color: d.isAvailable ? '#27ae60' : '#c0392b', padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                          {d.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => toggleDonor(d._id)}
                          style={{ padding: '5px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDonors.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No donors found</p>}
            </div>
          </>
        )}

        {/* ── HOSPITALS TAB ────────────────────────────────────────── */}
        {tab === 'Hospitals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#333' }}>All Hospitals ({hospitals.length})</h2>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by hospital name, city..."
                style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #ddd', width: 280, fontSize: '0.9rem' }} />
            </div>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    {['Hospital Name', 'Reg. No', 'City', 'Contact Person', 'Phone', 'Email', 'Registered On'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map(h => (
                    <tr key={h._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#c0392b' }}>{h.hospitalName}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem', fontFamily: 'monospace' }}>{h.registrationNumber}</td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{h.city || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{h.contactPerson || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>{h.user?.phone || h.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: '0.85rem' }}>{h.user?.email || '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#aaa', fontSize: '0.8rem' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHospitals.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No hospitals found</p>}
            </div>
          </>
        )}

        {/* ── REQUESTS TAB ─────────────────────────────────────────── */}
        {tab === 'Requests' && (
          <>
            <h2 style={{ color: '#333', marginBottom: 20 }}>All Blood Requests ({requests.length})</h2>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    {['Hospital', 'Blood Group', 'Units', 'Urgency', 'AI Score', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.hospital?.hospitalName || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#fff0f0', color: '#c0392b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{r.bloodGroup}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{r.unitsFulfilled}/{r.unitsRequired}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: URGENCY_COLORS[r.urgencyLevel] + '22', color: URGENCY_COLORS[r.urgencyLevel], padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                          {r.urgencyLevel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888' }}>{(r.aiUrgencyScore * 100).toFixed(0)}%</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: r.status === 'fulfilled' ? '#e8f8e8' : r.status === 'open' ? '#fff0f0' : '#fff9e6', color: r.status === 'fulfilled' ? '#27ae60' : r.status === 'open' ? '#c0392b' : '#e67e22', padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#aaa', fontSize: '0.8rem' }}>{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No requests found</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
