import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/requests/hospital`);
      setRequests(res.data);
    } catch (e) {}
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter || r.urgencyLevel === filter);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <strong style={{ fontSize: '1.1rem' }}>Blood Requests</strong>
        </div>
        <Link to="/hospital/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>
      </div>

      <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['all', 'open', 'partially_fulfilled', 'fulfilled', 'critical', 'high'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '8px 16px', borderRadius: 20, border: '1.5px solid #ddd', background: filter === f ? '#c0392b' : 'white', color: filter === f ? 'white' : '#555', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {filtered.map(req => (
          <div key={req._id} style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${URGENCY_COLORS[req.urgencyLevel]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: '#c0392b' }}>{req.bloodGroup}</span>
                  <span style={{ background: URGENCY_COLORS[req.urgencyLevel] + '22', color: URGENCY_COLORS[req.urgencyLevel], padding: '3px 12px', borderRadius: 4, fontWeight: 600 }}>
                    {req.urgencyLevel.toUpperCase()}
                  </span>
                  <span style={{ background: '#f8f9fa', padding: '3px 12px', borderRadius: 4, fontSize: '0.85rem', color: '#666' }}>
                    AI Urgency: {(req.aiUrgencyScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ color: '#555' }}>Requested: <strong>{req.unitsRequired} units</strong> | Fulfilled: <strong style={{ color: '#27ae60' }}>{req.unitsFulfilled}</strong></div>
                {req.patientCondition && <div style={{ color: '#888', marginTop: 4 }}>{req.patientCondition}</div>}
                <div style={{ color: '#999', fontSize: '0.85rem', marginTop: 6 }}>{new Date(req.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: req.status === 'fulfilled' ? '#e8f8e8' : req.status === 'open' ? '#fff3f3' : '#fff9e6', color: req.status === 'fulfilled' ? '#27ae60' : req.status === 'open' ? '#c0392b' : '#e67e22', padding: '6px 14px', borderRadius: 6, fontWeight: 700 }}>
                  {req.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {req.respondedDonors?.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#555' }}>Donor Responses ({req.respondedDonors.length})</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {req.respondedDonors.map((d, i) => (
                    <div key={i} style={{ background: '#f0faf0', border: '1px solid #b2dfdb', borderRadius: 8, padding: '8px 14px', fontSize: '0.85rem', minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: '#27ae60' }}>✅ Donor {i + 1}</div>
                      {d.contactDetails?.name && <div>👤 {d.contactDetails.name}</div>}
                      {d.contactDetails?.phone && <div>📞 <a href={`tel:${d.contactDetails.phone}`} style={{ color: '#c0392b', fontWeight: 600 }}>{d.contactDetails.phone}</a></div>}
                      {d.contactDetails?.email && <div>✉️ {d.contactDetails.email}</div>}
                      {d.contactDetails?.message && <div style={{ color: '#666', fontStyle: 'italic', marginTop: 2 }}>"{d.contactDetails.message}"</div>}
                      <div style={{ color: '#aaa', fontSize: '0.78rem', marginTop: 4 }}>{new Date(d.respondedAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>No requests found for this filter.</div>
        )}
      </div>
    </div>
  );
}
