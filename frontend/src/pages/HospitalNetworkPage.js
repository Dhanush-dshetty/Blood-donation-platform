import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function getStatusStyle(status) {
  if (status === 'surplus') {
    return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Surplus' };
  }
  if (status === 'adequate') {
    return { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Adequate' };
  }
  return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Critical' };
}

export default function HospitalNetworkPage() {
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [radiusKm, setRadiusKm] = useState(100);
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer modal
  const [transferModal, setTransferModal] = useState(null);
  const [transferForm, setTransferForm] = useState({ bloodGroup: 'O+', unitsRequired: 1, urgency: 'medium', note: '' });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = { radiusKm };
      if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get(`${API_URL}/hospitals/network-overview`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setPeers(res.data.peers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, [radiusKm, bloodGroupFilter, searchQuery]);

  useEffect(() => { fetchNetwork(); }, [fetchNetwork]);

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transferModal) return;
    setTransferLoading(true);
    setTransferMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/requests/inter-hospital-transfer`, {
        targetHospitalId: transferModal._id,
        bloodGroup: transferForm.bloodGroup,
        unitsRequired: parseInt(transferForm.unitsRequired),
        urgency: transferForm.urgency,
        note: transferForm.note
      }, { headers: { Authorization: `Bearer ${token}` } });
      setTransferMsg(`✅ Transfer request dispatched to ${transferModal.hospitalName}!`);
      setTimeout(() => { setTransferModal(null); setTransferMsg(''); }, 2200);
    } catch (err) {
      setTransferMsg('❌ ' + (err.response?.data?.message || 'Failed to send request'));
    } finally {
      setTransferLoading(false);
    }
  };

  const googleMapsUrl = (hospital) => {
    const [lng, lat] = hospital.location.coordinates;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            <span>🌐</span> Peer-to-Peer Inter-Hospital Network
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Regional Stock Exchange & Visibility
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Inspect live reserves at nearby hospitals, spot regional shortages or surpluses, and initiate direct blood transfers.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="modern-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 160 }}>
              <label className="form-label">Search Radius</label>
              <select
                className="form-control"
                value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
              >
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
                <option value={100}>Within 100 km</option>
                <option value={500}>Statewide (Karnataka)</option>
              </select>
            </div>

            <div style={{ minWidth: 140 }}>
              <label className="form-label">Blood Group Filter</label>
              <select
                className="form-control"
                value={bloodGroupFilter}
                onChange={e => setBloodGroupFilter(e.target.value)}
              >
                <option value="">All Blood Groups</option>
                {ALL_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Search Hospital or City</label>
              <input
                className="form-control"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. KMC Hospital, Apollo, Mangalore..."
              />
            </div>

            <button
              onClick={fetchNetwork}
              className="btn btn-primary"
              style={{ padding: '10px 22px' }}
            >
              <span>🔍 Refresh Network</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span className="badge badge-success">🟢 Surplus (&gt;10 units)</span>
            <span className="badge badge-warning">🟡 Adequate (3–9 units)</span>
            <span className="badge badge-danger">🔴 Critical (&lt;3 units)</span>
          </div>

          {!loading && (
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
              Showing {peers.length} verified hospitals within {radiusKm} km
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626', marginBottom: 20, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Peer Hospital Cards List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
            <div style={{ width: 44, height: 44, border: '4px solid #fecaca', borderTopColor: '#dc2626', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontWeight: 600 }}>Syncing regional hospital networks...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : peers.length === 0 ? (
          <div className="modern-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>No peer hospitals found</div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
              Try expanding your search radius to 100 km or Statewide.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {peers.map(hospital => (
              <div key={hospital._id} className="modern-card" style={{ padding: '24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {hospital.hospitalName}
                      </h3>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {hospital.facilityType || 'Hospital'}
                      </span>
                    </div>

                    <div style={{ color: '#475569', fontSize: '0.875rem', marginTop: 4 }}>
                      📍 {hospital.address}, {hospital.city}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                      🕒 Hours: {hospital.operatingHours || '24/7 Available'} &nbsp;•&nbsp; 
                      📦 Total Verified Reserves: <strong style={{ color: '#0f172a' }}>{hospital.totalUnits} units</strong>
                    </div>
                  </div>

                  {/* Proximity / Ambulance ETA */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      padding: '5px 12px',
                      borderRadius: 9999,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#dc2626'
                    }}>
                      <span>📏 {hospital.distanceKm} km away</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      🚑 Ambulance ETA ~{hospital.etaMinutes} mins
                    </div>
                  </div>
                </div>

                {/* Blood Group Matrix */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                  gap: 8,
                  marginBottom: 20
                }}>
                  {ALL_GROUPS.map(group => {
                    const units = hospital.inventoryByGroup[group] || 0;
                    const st = getStatusStyle(hospital.groupStatus[group]);

                    return (
                      <div
                        key={group}
                        style={{
                          background: st.bg,
                          border: `1px solid ${st.border}`,
                          borderRadius: 8,
                          padding: '8px 6px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: st.color }}>{group}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>{units}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: st.color, textTransform: 'uppercase' }}>
                          {st.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  {hospital.phone && (
                    <a
                      href={`tel:${hospital.phone}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      📞 Direct Hotline
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setTransferModal(hospital);
                      setTransferForm({ bloodGroup: 'O+', unitsRequired: 1, urgency: 'medium', note: '' });
                      setTransferMsg('');
                    }}
                    className="btn btn-outline-primary"
                    style={{ fontSize: '0.85rem', padding: '8px 18px', fontWeight: 700 }}
                  >
                    🔄 Request Inter-Hospital Transfer
                  </button>

                  <a
                    href={googleMapsUrl(hospital)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 16px', marginLeft: 'auto' }}
                  >
                    🗺️ Ambulance Navigation
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Transfer Modal */}
      {transferModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.4rem' }}>🔄</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Request Stock Transfer
                </h3>
              </div>
              <button onClick={() => setTransferModal(null)} style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 18 }}>
              Sending direct transfer order to: <strong style={{ color: '#0f172a' }}>{transferModal.hospitalName}</strong> ({transferModal.city})
            </p>

            {transferMsg && (
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: transferMsg.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
                color: transferMsg.startsWith('✅') ? '#065f46' : '#991b1b',
                fontWeight: 600,
                fontSize: '0.875rem',
                marginBottom: 16
              }}>
                {transferMsg}
              </div>
            )}

            <form onSubmit={submitTransfer}>
              <div className="form-group">
                <label className="form-label">Blood Group Required</label>
                <select
                  className="form-control"
                  value={transferForm.bloodGroup}
                  onChange={e => setTransferForm(f => ({ ...f, bloodGroup: e.target.value }))}
                >
                  {ALL_GROUPS.map(g => (
                    <option key={g} value={g}>
                      {g} — {transferModal.inventoryByGroup[g] || 0} units available at peer bank
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Units Needed</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1"
                    max="50"
                    value={transferForm.unitsRequired}
                    onChange={e => setTransferForm(f => ({ ...f, unitsRequired: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency Priority</label>
                  <select
                    className="form-control"
                    value={transferForm.urgency}
                    onChange={e => setTransferForm(f => ({ ...f, urgency: e.target.value }))}
                  >
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Justification / Note</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={transferForm.note}
                  onChange={e => setTransferForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Trauma case admitted, O- units critically required within 60 mins."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {transferLoading ? 'Transmitting...' : 'Dispatch Transfer Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferModal(null)}
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
    </div>
  );
}
