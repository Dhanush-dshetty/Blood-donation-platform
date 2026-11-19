import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import Navbar from '../components/Navbar';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TABS = ['Overview', 'Donors', 'Hospitals', 'Requests', 'Blood Safety'];

const URGENCY_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#059669' };
const BG_COLORS = ['#dc2626','#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bloodSafetyStats, setBloodSafetyStats] = useState(null);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, donorsRes, hospitalsRes, requestsRes, bloodSafetyRes, bloodUnitsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`),
        axios.get(`${API_URL}/admin/donors`),
        axios.get(`${API_URL}/admin/hospitals`),
        axios.get(`${API_URL}/admin/requests`),
        axios.get(`${API_URL}/admin/blood-safety-stats`),
        axios.get(`${API_URL}/admin/blood-units`)
      ]);
      setStats(statsRes.data);
      setDonors(donorsRes.data);
      setHospitals(hospitalsRes.data);
      setRequests(requestsRes.data);
      setBloodSafetyStats(bloodSafetyRes.data);
      setBloodUnits(bloodUnitsRes.data);
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
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#dc2626'
    }]
  };

  const urgencyBarData = {
    labels: stats?.urgencyBreakdown?.map(u => u._id) || [],
    datasets: [{
      label: 'Requests by Urgency',
      data: stats?.urgencyBreakdown?.map(u => u.count) || [],
      backgroundColor: stats?.urgencyBreakdown?.map(u => URGENCY_COLORS[u._id] || '#64748b') || [],
      borderRadius: 6
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

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container" style={{ maxWidth: 1320 }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            <span>🛡️</span> Administrative Governance
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            System Administration & Quality Oversight
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Manage regional hospital credentials, volunteer rosters, requests dispatch & safety compliance
          </p>
        </div>

        {msg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
            ⚠️ {msg}
          </div>
        )}

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, overflowX: 'auto' }}>
          {TABS.map(t => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fef2f2' : 'transparent',
                  color: isActive ? '#dc2626' : '#475569',
                  border: isActive ? '1px solid #fecaca' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ width: 44, height: 44, border: '4px solid #fecaca', borderTopColor: '#dc2626', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <div>Loading administrative telemetry...</div>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {tab === 'Overview' && stats && (
              <div>
                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                  {[
                    { label: 'Registered Donors', value: stats.totalDonors, color: '#dc2626', icon: '👤' },
                    { label: 'Active Ready Donors', value: stats.activeDonors, color: '#059669', icon: '✓' },
                    { label: 'Accredited Hospitals', value: stats.totalHospitals, color: '#2563eb', icon: '🏥' },
                    { label: 'Emergency Requests', value: stats.totalRequests, color: '#ea580c', icon: '🚨' },
                    { label: 'Fulfilled Emergencies', value: stats.fulfilledRequests, color: '#059669', icon: '✔️' },
                    { label: 'Platform Fulfillment', value: `${stats.fulfillmentRate}%`, color: '#7c3aed', icon: '📊' },
                    { label: 'Avg Dispatch Time', value: `${stats.avgResponseTimeHrs}h`, color: '#0891b2', icon: '⏱️' },
                    { label: 'Safe Blood Reserve', value: stats.totalInventory, color: '#dc2626', icon: '🩸' },
                  ].map(s => (
                    <div key={s.label} className="modern-card" style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                  <div className="modern-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                      🩸 Donors by Blood Group
                    </h3>
                    <div style={{ height: 240, position: 'relative' }}>
                      <Pie data={bloodGroupPieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11, weight: 600 } } } } }} />
                    </div>
                  </div>

                  <div className="modern-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                      ⚡ Requests by Urgency Level
                    </h3>
                    <div style={{ height: 240, position: 'relative' }}>
                      <Bar data={urgencyBarData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                    </div>
                  </div>

                  <div className="modern-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                      📈 Emergency Request Trend (30 Days)
                    </h3>
                    <div style={{ height: 240, position: 'relative' }}>
                      {requestTrendData.labels.length > 0 ? (
                        <Line data={requestTrendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 80 }}>No trend logged yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DONORS TAB ───────────────────────────────────────────── */}
            {tab === 'Donors' && (
              <div className="modern-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                      Volunteer Donors Directory ({donors.length})
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.825rem' }}>Active donors, blood groups, and status toggles</p>
                  </div>
                  <input
                    className="form-control"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, blood group, area..."
                    style={{ maxWidth: 300 }}
                  />
                </div>

                <div className="table-responsive">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Donor Name</th>
                        <th>Email</th>
                        <th>Blood Group</th>
                        <th>Age</th>
                        <th>District / Area</th>
                        <th>Donations</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map(d => (
                        <tr key={d._id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{d.user?.name || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{d.user?.email || '—'}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#dc2626' }}>{d.bloodGroup}</span>
                          </td>
                          <td style={{ color: '#475569' }}>{d.age}</td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{d.area || d.hub || '—'}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{d.totalDonations}</td>
                          <td>
                            <span className={`badge ${d.isAvailable ? 'badge-success' : 'badge-neutral'}`}>
                              {d.isAvailable ? 'Available' : 'Paused'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => toggleDonor(d._id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredDonors.length === 0 && <p style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>No donors matching filter</p>}
                </div>
              </div>
            )}

            {/* ── HOSPITALS TAB ────────────────────────────────────────── */}
            {tab === 'Hospitals' && (
              <div className="modern-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                      Registered Hospitals & Blood Banks ({hospitals.length})
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.825rem' }}>Verified facilities across Karnataka districts</p>
                  </div>
                  <input
                    className="form-control"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search hospital name, city..."
                    style={{ maxWidth: 300 }}
                  />
                </div>

                <div className="table-responsive">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Hospital Name</th>
                        <th>Reg. License</th>
                        <th>City / District</th>
                        <th>Designated Contact</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHospitals.map(h => (
                        <tr key={h._id}>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>{h.hospitalName}</td>
                          <td style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{h.registrationNumber}</td>
                          <td style={{ color: '#475569' }}>{h.city || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{h.contactPerson || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{h.user?.phone || h.phone || '—'}</td>
                          <td style={{ color: '#475569', fontSize: '0.85rem' }}>{h.user?.email || '—'}</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredHospitals.length === 0 && <p style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>No hospitals matching filter</p>}
                </div>
              </div>
            )}

            {/* ── REQUESTS TAB ─────────────────────────────────────────── */}
            {tab === 'Requests' && (
              <div className="modern-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 18 }}>
                  System-Wide Blood Requests ({requests.length})
                </h2>

                <div className="table-responsive">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Hospital</th>
                        <th>Blood Group</th>
                        <th>Fulfillment</th>
                        <th>Urgency</th>
                        <th>AI Score</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r._id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.hospital?.hospitalName || '—'}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#dc2626' }}>{r.bloodGroup}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.unitsFulfilled} / {r.unitsRequired}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 9999,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: URGENCY_COLORS[r.urgencyLevel] || '#64748b',
                              background: '#f8fafc',
                              border: `1px solid ${URGENCY_COLORS[r.urgencyLevel] || '#e2e8f0'}`
                            }}>
                              {r.urgencyLevel?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: '#64748b' }}>{(r.aiUrgencyScore * 100).toFixed(0)}%</td>
                          <td>
                            <span className={`badge ${r.status === 'fulfilled' ? 'badge-success' : 'badge-warning'}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(r.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── BLOOD SAFETY TAB ─────────────────────────────────────── */}
            {tab === 'Blood Safety' && bloodSafetyStats && (
              <div>
                {/* Safety KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
                  {[
                    { label: 'Total Tracked Bags', value: bloodSafetyStats.totalUnits, color: '#dc2626' },
                    { label: 'Available (Safe)', value: bloodSafetyStats.availableUnits, color: '#059669' },
                    { label: 'In Quarantine', value: bloodSafetyStats.quarantineUnits, color: '#d97706' },
                    { label: 'Rejected Flagged', value: bloodSafetyStats.rejectedUnits, color: '#dc2626' },
                    { label: 'Expired Units', value: bloodSafetyStats.expiredUnits, color: '#64748b' },
                    { label: 'Expiring in 7 Days', value: bloodSafetyStats.expiringSoon, color: '#ea580c' },
                    { label: 'Verified Safe Bags', value: bloodSafetyStats.verifiedSafeUnits, color: '#059669' },
                    { label: 'Safety Pass Ratio', value: `${bloodSafetyStats.safetyPassRate}%`, color: '#2563eb' },
                  ].map(s => (
                    <div key={s.label} className="modern-card" style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="modern-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                    Recent Blood Units Quality Audit (Latest 100)
                  </h3>

                  <div className="table-responsive">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Unit ID</th>
                          <th>Blood Group</th>
                          <th>Component</th>
                          <th>Status</th>
                          <th>Lab Verified</th>
                          <th>Expiry Date</th>
                          <th>Hospital</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloodUnits.map(u => {
                          const daysUntilExpiry = Math.floor((new Date(u.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                          const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;

                          return (
                            <tr key={u._id}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>{u.unitId}</td>
                              <td><span style={{ fontWeight: 800, color: '#dc2626' }}>{u.bloodGroup}</span></td>
                              <td style={{ fontSize: '0.85rem' }}>{u.componentType?.replace('_', ' ')}</td>
                              <td>
                                <span className={`badge ${u.status === 'available' ? 'badge-success' : u.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                  {u.status}
                                </span>
                              </td>
                              <td>{u.verifiedSafe ? '✅ Verified' : '❌ Pending'}</td>
                              <td style={{ fontSize: '0.85rem', color: isExpiringSoon ? '#ea580c' : '#475569', fontWeight: isExpiringSoon ? 700 : 400 }}>
                                {new Date(u.expiryDate).toLocaleDateString()} {isExpiringSoon && `(⚠️ ${daysUntilExpiry}d)`}
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.hospital?.hospitalName || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
