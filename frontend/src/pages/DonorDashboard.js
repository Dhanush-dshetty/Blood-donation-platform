import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: '#c0392b', marginBottom: 4 }}>Confirm Donation</h2>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>Your details will be sent to the hospital</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        {/* Request Summary */}
        <div style={{ background: '#fff5f5', borderRadius: 10, padding: 14, marginBottom: 20, borderLeft: '4px solid #c0392b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c0392b' }}>{request.bloodGroup}</span>
            <span style={{ background: URGENCY_COLORS[request.urgencyLevel] + '22', color: URGENCY_COLORS[request.urgencyLevel], padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem' }}>
              {request.urgencyLevel?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontWeight: 700, color: '#333' }}>{request.hospital?.hospitalName}</div>
          {(request.hospital?.city || request.hospital?.address) && (
            <div style={{ color: '#888', fontSize: '0.85rem', marginTop: 2 }}>
              📍 {[request.hospital?.address, request.hospital?.city].filter(Boolean).join(', ')}
            </div>
          )}
          <div style={{ color: '#555', fontSize: '0.9rem', marginTop: 4 }}>Needs {request.unitsRequired} unit(s)</div>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, color: '#444', fontSize: '0.9rem' }}>Full Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', marginBottom: 12, fontSize: '0.95rem' }}
            placeholder="Your full name" />

          <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, color: '#444', fontSize: '0.9rem' }}>Phone Number *</label>
          <input required value={form.phone} onChange={e => set('phone', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', marginBottom: 12, fontSize: '0.95rem' }}
            placeholder="e.g. 9876543210" type="tel" />

          <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, color: '#444', fontSize: '0.9rem' }}>Email Address *</label>
          <input required value={form.email} onChange={e => set('email', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', marginBottom: 12, fontSize: '0.95rem' }}
            placeholder="your@email.com" type="email" />

          <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, color: '#444', fontSize: '0.9rem' }}>Message (optional)</label>
          <textarea value={form.message} onChange={e => set('message', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', marginBottom: 16, fontSize: '0.95rem', resize: 'vertical', minHeight: 70 }}
            placeholder="e.g. I can come within 2 hours" />

          <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 16 }}>
            📋 By submitting, you confirm you are eligible to donate and the hospital will contact you directly.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 12, background: '#f0f0f0', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: 12, background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Submitting...' : '🩸 Confirm — I Will Donate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Donor Dashboard ────────────────────────────────────────────
export default function DonorDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [donorProfile, setDonorProfile] = useState(profile);
  const [openRequests, setOpenRequests] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null); // for modal

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
      setOpenRequests(res.data);
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

  // Called when donor submits the modal form
  const handleDonateSubmit = async (requestId, contactDetails) => {
    try {
      await axios.post(`${API_URL}/requests/${requestId}/respond`, { contactDetails });
      setSelectedRequest(null);
      setMsg('✅ Your details have been sent to the hospital! They will contact you shortly.');
      fetchOpenRequests();
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Could not submit. Try again.'));
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
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Donation Modal */}
      {selectedRequest && (
        <DonateModal
          request={selectedRequest}
          donorUser={user}
          onClose={() => setSelectedRequest(null)}
          onSubmit={handleDonateSubmit}
        />
      )}

      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Donor Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/donor/chat" style={{ color: 'white', fontWeight: 600 }}>💬 AI Assistant</Link>
          <button onClick={() => { logout(); navigate('/'); }}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>
        {msg && (
          <div style={{ background: msg.startsWith('❌') ? '#fdecea' : '#e8f8e8', color: msg.startsWith('❌') ? '#c0392b' : '#27ae60', padding: 14, borderRadius: 8, marginBottom: 16, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {/* Live alerts */}
        {alerts.length > 0 && (
          <div style={{ background: '#fdecea', border: '2px solid #c0392b', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <strong>🚨 Emergency Blood Request Nearby!</strong>
            {alerts.slice(0, 2).map((a, i) => (
              <div key={i} style={{ marginTop: 8, fontSize: '0.95rem' }}>
                [{a.time}] <strong>{a.bloodGroup}</strong> needed at <strong>{a.hospitalName}</strong> — Urgency: {a.urgencyLevel}
              </div>
            ))}
          </div>
        )}

        {/* Profile Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 12px' }}>
              {user?.name?.charAt(0)}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
            <div style={{ color: '#888', marginBottom: 12 }}>{user?.email}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#c0392b' }}>{donorProfile?.bloodGroup}</div>
            <div style={{ color: '#888', marginBottom: 16 }}>Blood Group</div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ background: donorProfile?.isAvailable ? '#e8f8e8' : '#fdecea', color: donorProfile?.isAvailable ? '#27ae60' : '#c0392b', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                {donorProfile?.isAvailable ? '✅ Available' : '❌ Unavailable'}
              </span>
            </div>
            <button onClick={toggleAvailability}
              style={{ width: '100%', padding: 10, background: donorProfile?.isAvailable ? '#fdecea' : '#e8f8e8', color: donorProfile?.isAvailable ? '#c0392b' : '#27ae60', border: 'none', borderRadius: 8, fontWeight: 600, marginTop: 8 }}>
              {donorProfile?.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginBottom: 16 }}>Your Donation Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Total Donations', value: donorProfile?.totalDonations || 0 },
                { label: 'Response Rate', value: `${donorProfile?.responseRate || 100}%` },
                { label: 'Area', value: donorProfile?.area || donorProfile?.hub || 'Not set' },
                { label: 'Can Donate Now', value: canDonate() ? '✅ Yes' : '⏳ Wait 90 days' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#c0392b' }}>{s.value}</div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Open Requests */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginBottom: 16 }}>🩸 Active Blood Requests Near You</h3>
          {openRequests.length === 0 ? (
            <p style={{ color: '#999' }}>No active requests right now. You'll be notified when there's a match.</p>
          ) : (
            openRequests.map(req => (
              <div key={req._id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c0392b' }}>{req.bloodGroup}</span>
                    <span style={{ background: URGENCY_COLORS[req.urgencyLevel] + '22', color: URGENCY_COLORS[req.urgencyLevel], padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                      {req.urgencyLevel?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: '#333', fontWeight: 600 }}>
                    {req.hospital?.hospitalName}
                  </div>
                  {/* Location display */}
                  {(req.hospital?.city || req.hospital?.address) && (
                    <div style={{ color: '#e67e22', fontSize: '0.88rem', marginTop: 3 }}>
                      📍 {[req.hospital?.address, req.hospital?.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>
                    Needs <strong>{req.unitsRequired} unit(s)</strong>
                    {req.unitsFulfilled > 0 && <span style={{ color: '#27ae60' }}> · {req.unitsFulfilled} already fulfilled</span>}
                  </div>
                  {req.patientCondition && (
                    <div style={{ color: '#888', fontSize: '0.85rem', marginTop: 3 }}>📋 {req.patientCondition}</div>
                  )}
                  <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: 4 }}>{new Date(req.createdAt).toLocaleString()}</div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {canDonate() && donorProfile?.isAvailable ? (
                    <button onClick={() => setSelectedRequest(req)}
                      style={{ padding: '10px 20px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      I Can Donate
                    </button>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', display: 'block' }}>
                      {!canDonate() ? '⏳ Not eligible yet' : '❌ Set available first'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
