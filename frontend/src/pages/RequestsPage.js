import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const URGENCY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  high:     { label: 'HIGH',     color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  medium:   { label: 'MEDIUM',   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  low:      { label: 'LOW',      color: '#059669', bg: '#ecfdf5', border: '#d1fae5' }
};

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

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter || r.urgencyLevel === filter);

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Hospital Blood Requests & Dispatch
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Monitor emergency requests, donor response timelines & patient fulfillment
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'open', label: 'Open' },
            { id: 'partially_fulfilled', label: 'In Progress' },
            { id: 'fulfilled', label: 'Fulfilled' },
            { id: 'critical', label: 'Critical Urgency' },
            { id: 'high', label: 'High Urgency' }
          ].map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 9999,
                  border: isActive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  background: isActive ? '#fef2f2' : '#ffffff',
                  color: isActive ? '#dc2626' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Request Cards */}
        {filtered.length === 0 ? (
          <div className="modern-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>No requests found</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
              Try selecting a different filter above.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(req => {
              const ucfg = URGENCY_CONFIG[req.urgencyLevel] || URGENCY_CONFIG.medium;
              const isFulfilled = req.status === 'fulfilled';
              const isOpen = req.status === 'open';

              return (
                <div
                  key={req._id}
                  className="modern-card"
                  style={{
                    padding: '24px',
                    borderLeft: `5px solid ${ucfg.color}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      {/* Blood Group and Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                          {req.bloodGroup}
                        </span>

                        <span style={{
                          display: 'inline-flex',
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

                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          AI Urgency: {(req.aiUrgencyScore * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div style={{ color: '#334155', fontSize: '0.95rem' }}>
                        Requested: <strong style={{ color: '#0f172a' }}>{req.unitsRequired} units</strong>
                        {' '}&nbsp;|&nbsp;{' '}
                        Fulfilled: <strong style={{ color: '#059669' }}>{req.unitsFulfilled} units</strong>
                      </div>

                      {req.patientCondition && (
                        <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
                          Patient Status: <span style={{ color: '#0f172a' }}>{req.patientCondition}</span>
                        </div>
                      )}

                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 6 }}>
                        Created: {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <span className={`badge ${isFulfilled ? 'badge-success' : isOpen ? 'badge-danger' : 'badge-warning'}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Responded Donors */}
                  {req.respondedDonors?.length > 0 && (
                    <div style={{ marginTop: 18, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                        👥 Alerted Donor Responses ({req.respondedDonors.length})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                        {req.respondedDonors.map((d, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '12px 14px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, color: '#059669' }}>✓ Donor #{i + 1}</span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {new Date(d.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {d.contactDetails?.name && (
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.contactDetails.name}</div>
                            )}

                            {d.contactDetails?.phone && (
                              <div style={{ marginTop: 2 }}>
                                📞 <a href={`tel:${d.contactDetails.phone}`} style={{ color: '#dc2626', fontWeight: 600 }}>
                                  {d.contactDetails.phone}
                                </a>
                              </div>
                            )}

                            {d.contactDetails?.email && (
                              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 1 }}>
                                ✉️ {d.contactDetails.email}
                              </div>
                            )}

                            {d.contactDetails?.message && (
                              <div style={{ color: '#475569', fontStyle: 'italic', marginTop: 4, fontSize: '0.8rem', background: '#ffffff', padding: '6px 8px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                "{d.contactDetails.message}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
