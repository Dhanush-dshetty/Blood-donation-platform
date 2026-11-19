import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const URGENCY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'HIGH',     color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  medium:   { label: 'MEDIUM',   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  low:      { label: 'LOW',      color: '#059669', bg: '#ecfdf5', border: '#d1fae5' }
};

// ── Navigation Map Modal ────────────────────────────────────────────
function NavigationModal({ hospital, onClose }) {
  const hospitalName = encodeURIComponent(hospital?.hospitalName || 'hospital');
  const lat = hospital?.location?.coordinates?.[1];
  const lng = hospital?.location?.coordinates?.[0];

  const mapsUrl = lat && lng && lat !== 0 && lng !== 0
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/search/${hospitalName}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 460, padding: '32px', borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.75rem', fontWeight: 800 }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
            Response Registered!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            The transfusion center has been notified with your contact details.
          </p>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{hospital?.hospitalName}</div>
          {(hospital?.city || hospital?.address) && (
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
              📍 {[hospital?.address, hospital?.city].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', textDecoration: 'none' }}
          >
            🗺️ Open Driving Directions in Google Maps
          </a>

          <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Donation Contact Modal ──────────────────────────────────────────
function DonateModal({ request, donorUser, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: donorUser?.name || '',
    email: donorUser?.email || '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(request._id, form);
    setLoading(false);
  };

  const ucfg = URGENCY_CONFIG[request.urgencyLevel] || URGENCY_CONFIG.medium;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 480, padding: '32px', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Confirm Blood Donation</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Send your contact details to the requesting medical center</p>
          </div>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Request Brief */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{request.bloodGroup}</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: ucfg.color,
              backgroundColor: ucfg.bg,
              border: `1px solid ${ucfg.border}`
            }}>
              {ucfg.label}
            </span>
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{request.hospital?.hospitalName}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Needs {request.unitsRequired} unit(s)</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input className="form-control" required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 9876543210" />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-control" required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@mail.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Message / Arrival ETA (Optional)</label>
            <textarea className="form-control" rows={2} value={form.message} onChange={e => set('message', e.target.value)} placeholder="e.g. Can reach the blood bank within 90 mins." />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
              {loading ? 'Submitting...' : 'Confirm — I Will Donate'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Donor Dashboard ────────────────────────────────────────────
export default function DonorDashboard() {
  const { user, profile } = useAuth();
  const [donorProfile, setDonorProfile] = useState(profile);
  const [openRequests, setOpenRequests] = useState([]);
  const [matchingInfo, setMatchingInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [navHospital, setNavHospital] = useState(null);

  useEffect(() => {
    fetchOpenRequests();
    fetchProfile();
    if (profile?._id) {
      const socket = io(SOCKET_URL);
      socket.emit('join_donor', profile._id);
      socket.on('blood_request_alert', (data) => {
        setAlerts(prev => [{ ...data, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        fetchOpenRequests();
      });
      return () => socket.disconnect();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/donors/profile`);
      setDonorProfile(res.data);
    } catch (e) {}
  };

  const fetchOpenRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/requests/open`);
      if (res.data.requests) {
        setOpenRequests(res.data.requests || []);
        setMatchingInfo({
          total: res.data.totalMatches || 0,
          bloodGroup: res.data.donorBloodGroup,
          location: res.data.donorLocation
        });
      } else {
        setOpenRequests(res.data || []);
      }
    } catch (e) {}
  };

  const toggleAvailability = async () => {
    try {
      const res = await axios.patch(`${API_URL}/donors/availability`);
      setDonorProfile(prev => ({ ...prev, isAvailable: res.data.isAvailable }));
      setMsg(res.data.message);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {}
  };

  const handleDonateSubmit = async (requestId, contactDetails) => {
    try {
      const req = openRequests.find(r => r._id === requestId);
      await axios.post(`${API_URL}/requests/${requestId}/respond`, { contactDetails });
      setSelectedRequest(null);
      if (req?.hospital) setNavHospital(req.hospital);
      fetchOpenRequests();
    } catch (err) {
      setMsg('Could not submit. ' + (err.response?.data?.message || 'Try again.'));
      setSelectedRequest(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const canDonate = () => {
    if (!donorProfile?.lastDonationDate) return true;
    const days = (Date.now() - new Date(donorProfile.lastDonationDate)) / (1000 * 60 * 60 * 24);
    return days >= 90;
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {selectedRequest && (
          <DonateModal request={selectedRequest} donorUser={user} onClose={() => setSelectedRequest(null)} onSubmit={handleDonateSubmit} />
        )}
        {navHospital && (
          <NavigationModal hospital={navHospital} onClose={() => setNavHospital(null)} />
        )}

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Donor Volunteer Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Emergency requests matched to your blood group, live alerts & donation history
          </p>
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: 20
          }}>
            {msg}
          </div>
        )}

        {/* Live Alerts Stream */}
        {alerts.length > 0 && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 800, fontSize: '1rem', marginBottom: 10 }}>
              <span>🚨</span> High-Priority Emergency Request Nearby!
            </div>
            {alerts.slice(0, 2).map((a, i) => (
              <div key={i} style={{ borderTop: i > 0 ? '1px solid #fee2e2' : 'none', paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>
                  {a.bloodGroup} Needed • {a.urgencyLevel?.toUpperCase()} URGENCY
                  {a.distanceKm && <span style={{ color: '#2563eb', marginLeft: 8 }}>📍 {a.distanceKm} km away</span>}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                  {a.hospitalName} {a.hospitalCity && `(${a.hospitalCity})`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile & Eligibility Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }} className="donor-grid">
          {/* Identity Card */}
          <div className="modern-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              margin: '0 auto 12px',
              border: '1px solid #fecaca'
            }}>
              {user?.name?.charAt(0) || 'D'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{user?.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 12 }}>{user?.email}</div>

            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
              {donorProfile?.bloodGroup || '—'}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>
              Blood Group
            </div>

            <div style={{ marginBottom: 14 }}>
              <span className={`badge ${donorProfile?.isAvailable ? 'badge-success' : 'badge-danger'}`}>
                {donorProfile?.isAvailable ? 'Active Volunteer' : 'Currently Unavailable'}
              </span>
            </div>

            <button
              onClick={toggleAvailability}
              className={`btn ${donorProfile?.isAvailable ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', padding: '10px' }}
            >
              {donorProfile?.isAvailable ? 'Pause Availability' : 'Make Me Available'}
            </button>
          </div>

          {/* Stats Card */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              Volunteer Vital Statistics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { label: 'Total Transfusions Given', value: donorProfile?.totalDonations || 0, icon: '🩸', color: '#dc2626' },
                { label: 'Response Reliability Rate', value: `${donorProfile?.responseRate ? Math.round(donorProfile.responseRate * (donorProfile.responseRate <= 1 ? 100 : 1)) : 100}%`, icon: '📈', color: '#059669' },
                { label: 'Registered District / Hub', value: donorProfile?.area || donorProfile?.hub || 'Karnataka', icon: '📍', color: '#2563eb' },
                { label: 'Biological Donation Eligibility', value: canDonate() ? 'Eligible to Donate Now' : 'In 90-Day Cooldown', icon: '🛡️', color: canDonate() ? '#059669' : '#d97706' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: s.color, marginTop: 4 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Matched Blood Requests Feed */}
        <div className="modern-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Matched Requests for Your Blood Type
              </h2>
              {matchingInfo && (
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                  Showing requests compatible with <strong style={{ color: '#dc2626' }}>{matchingInfo.bloodGroup}</strong> within 100km radius
                </div>
              )}
            </div>
          </div>

          {openRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>No urgent requests right now</div>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                You will receive instant alerts the moment a local hospital needs your blood group.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {openRequests.map(req => {
                const ucfg = URGENCY_CONFIG[req.urgencyLevel] || URGENCY_CONFIG.medium;
                const isEligible = canDonate() && donorProfile?.isAvailable;

                return (
                  <div
                    key={req._id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                      background: '#ffffff'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                          {req.bloodGroup}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: ucfg.color,
                          backgroundColor: ucfg.bg,
                          border: `1px solid ${ucfg.border}`
                        }}>
                          {ucfg.label} URGENCY
                        </span>
                        {req.distanceKm !== undefined && (
                          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 9999, fontWeight: 700, fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                            📍 {req.distanceKm} km away
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        {req.hospital?.hospitalName}
                      </div>

                      {(req.hospital?.city || req.hospital?.address) && (
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
                          {[req.hospital?.address, req.hospital?.city].filter(Boolean).join(', ')}
                        </div>
                      )}

                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
                        Required: <strong>{req.unitsRequired} unit(s)</strong>
                        {req.unitsFulfilled > 0 && <span style={{ color: '#059669', marginLeft: 6 }}>• {req.unitsFulfilled} already fulfilled</span>}
                      </div>

                      {req.patientCondition && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                          Note: "{req.patientCondition}"
                        </div>
                      )}
                    </div>

                    <div>
                      {isEligible ? (
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="btn btn-primary"
                          style={{ padding: '10px 20px', fontWeight: 700 }}
                        >
                          🩸 I Can Donate
                        </button>
                      ) : (
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                          {!canDonate() ? 'In 90-day cooldown' : 'Activate availability'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Responsive layout styles */}
      <style>{`
        @media (max-width: 900px) {
          .donor-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
