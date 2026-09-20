import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';

// Fix default marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Custom colored marker icons
const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:${color};border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const hospitalIcon = createIcon('#c0392b');
const availableDonorIcon = createIcon('#27ae60');
const unavailableDonorIcon = createIcon('#aaa');

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

// Component to fly map to a position
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.5 });
  }, [position, map]);
  return null;
}

export default function MapPage() {
  const { user, profile } = useAuth();
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBG, setFilterBG] = useState('All');
  const [showAvailable, setShowAvailable] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showHospitals, setShowHospitals] = useState(true);
  const [flyTo, setFlyTo] = useState(null);
  const [stats, setStats] = useState({ available: 0, unavailable: 0, hospitals: 0 });

  // Default center — Mangalore
  const defaultCenter = [12.8703, 74.8431];

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const [donorsRes, hospitalsRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/donors`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/hospitals`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/requests/hospital`).catch(() => ({ data: [] }))
      ]);
      setDonors(donorsRes.data);
      setHospitals(hospitalsRes.data);
      setRequests(requestsRes.data);
      setStats({
        available: donorsRes.data.filter(d => d.isAvailable).length,
        unavailable: donorsRes.data.filter(d => !d.isAvailable).length,
        hospitals: hospitalsRes.data.length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter donors
  const filteredDonors = donors.filter(d => {
    if (!showAvailable && d.isAvailable) return false;
    if (!showUnavailable && !d.isAvailable) return false;
    if (filterBG !== 'All' && d.bloodGroup !== filterBG) return false;
    const [lng, lat] = d.location?.coordinates || [0, 0];
    return lat !== 0 && lng !== 0;
  });

  const filteredHospitals = hospitals.filter(h => {
    const [lng, lat] = h.location?.coordinates || [0, 0];
    return lat !== 0 && lng !== 0;
  });

  // Open requests count
  const openRequests = requests.filter(r => r.status === 'open' || r.status === 'partially_fulfilled');

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🗺️</div>
        <div style={{ marginTop: 12, color: '#888' }}>Loading map data...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>🗺️</span>
          <div>
            <div style={{ fontWeight: 700 }}>Live Donor Map</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Real-time donor locations</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {user?.role === 'hospital' && <Link to="/hospital/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>}
          {user?.role === 'donor' && <Link to="/donor/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>}
          {user?.role === 'admin' && <Link to="/admin" style={{ color: 'white', fontWeight: 600 }}>← Admin</Link>}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width: 280, background: 'white', padding: 20, overflowY: 'auto', boxShadow: '2px 0 8px rgba(0,0,0,0.06)', flexShrink: 0 }}>
          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, color: '#333', fontSize: '0.95rem' }}>📊 Live Stats</h3>
            {[
              { label: 'Available Donors', value: stats.available, color: '#27ae60' },
              { label: 'Unavailable Donors', value: stats.unavailable, color: '#aaa' },
              { label: 'Hospitals', value: stats.hospitals, color: '#2980b9' },
              { label: 'Open Requests', value: openRequests.length, color: '#c0392b' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6 }}>
                <span style={{ color: '#666', fontSize: '0.85rem' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, color: '#333', fontSize: '0.95rem' }}>🔍 Filters</h3>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Blood Group</label>
            <select value={filterBG} onChange={e => setFilterBG(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #ddd', marginBottom: 12, fontSize: '0.9rem' }}>
              {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showAvailable} onChange={e => setShowAvailable(e.target.checked)} />
              <span style={{ color: '#27ae60', fontWeight: 600 }}>● Available Donors</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} />
              <span style={{ color: '#aaa', fontWeight: 600 }}>● Unavailable Donors</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={showHospitals} onChange={e => setShowHospitals(e.target.checked)} />
              <span style={{ color: '#c0392b', fontWeight: 600 }}>● Hospitals</span>
            </label>
          </div>

          {/* Open Requests */}
          {openRequests.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, color: '#333', fontSize: '0.95rem' }}>🚨 Active Requests</h3>
              {openRequests.slice(0, 5).map(req => (
                <div key={req._id}
                  onClick={() => {
                    const h = hospitals.find(h => h._id === (req.hospital?._id || req.hospital));
                    if (h?.location?.coordinates) {
                      const [lng, lat] = h.location.coordinates;
                      setFlyTo([lat, lng]);
                    }
                  }}
                  style={{ background: '#fff5f5', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer', borderLeft: `3px solid ${URGENCY_COLORS[req.urgencyLevel]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#c0392b', fontSize: '1rem' }}>{req.bloodGroup}</span>
                    <span style={{ background: URGENCY_COLORS[req.urgencyLevel] + '22', color: URGENCY_COLORS[req.urgencyLevel], padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                      {req.urgencyLevel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 3 }}>{req.hospital?.hospitalName || 'Hospital'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{req.unitsRequired} unit(s) needed</div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 20, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
            <h3 style={{ marginBottom: 10, color: '#333', fontSize: '0.85rem' }}>Legend</h3>
            {[
              { color: '#c0392b', label: 'Hospital' },
              { color: '#27ae60', label: 'Available Donor' },
              { color: '#aaa', label: 'Unavailable Donor' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#666' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <button onClick={fetchMapData}
            style={{ width: '100%', marginTop: 16, padding: '10px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            🔄 Refresh Map
          </button>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTo && <FlyTo position={flyTo} />}

            {/* Hospital markers */}
            {showHospitals && filteredHospitals.map(h => {
              const [lng, lat] = h.location.coordinates;
              const openReqs = openRequests.filter(r => (r.hospital?._id || r.hospital) === h._id);
              return (
                <React.Fragment key={h._id}>
                  <Marker position={[lat, lng]} icon={hospitalIcon}>
                    <Popup maxWidth={260}>
                      <div style={{ fontFamily: 'sans-serif' }}>
                        <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '1rem', marginBottom: 6 }}>
                          🏥 {h.hospitalName}
                        </div>
                        {h.city && <div style={{ color: '#666', fontSize: '0.85rem' }}>📍 {h.city}</div>}
                        {h.phone && <div style={{ color: '#666', fontSize: '0.85rem' }}>📞 {h.phone}</div>}
                        {openReqs.length > 0 && (
                          <div style={{ marginTop: 8, background: '#fff5f5', padding: 8, borderRadius: 6 }}>
                            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '0.85rem' }}>
                              🚨 {openReqs.length} Active Request(s)
                            </div>
                            {openReqs.map(r => (
                              <div key={r._id} style={{ fontSize: '0.8rem', color: '#555', marginTop: 4 }}>
                                {r.bloodGroup} — {r.urgencyLevel} — {r.unitsRequired} units
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {/* Radius circle showing 20km search area */}
                  {openReqs.length > 0 && (
                    <Circle
                      center={[lat, lng]}
                      radius={20000}
                      pathOptions={{ color: '#c0392b', fillColor: '#c0392b', fillOpacity: 0.04, dashArray: '6' }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Donor markers */}
            {filteredDonors.map(d => {
              const [lng, lat] = d.location.coordinates;
              const icon = d.isAvailable ? availableDonorIcon : unavailableDonorIcon;
              return (
                <Marker key={d._id} position={[lat, lng]} icon={icon}>
                  <Popup maxWidth={220}>
                    <div style={{ fontFamily: 'sans-serif' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                        {d.user?.name || 'Donor'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ background: '#fff0f0', color: '#c0392b', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.9rem' }}>
                          {d.bloodGroup}
                        </span>
                        <span style={{ background: d.isAvailable ? '#e8f8e8' : '#f0f0f0', color: d.isAvailable ? '#27ae60' : '#aaa', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          {d.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      {d.area && <div style={{ color: '#666', fontSize: '0.82rem' }}>📍 {d.area}{d.state ? `, ${d.state}` : ''}</div>}
                      {d.hub && <div style={{ color: '#888', fontSize: '0.8rem' }}>🏢 {d.hub}</div>}
                      <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>
                        Total Donations: <strong>{d.totalDonations}</strong>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating counter badge */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: 'white', borderRadius: 12, padding: '10px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>Showing on map:</div>
            <div style={{ color: '#27ae60' }}>● {filteredDonors.filter(d => d.isAvailable).length} available donors</div>
            {showUnavailable && <div style={{ color: '#aaa' }}>● {filteredDonors.filter(d => !d.isAvailable).length} unavailable</div>}
            {showHospitals && <div style={{ color: '#c0392b' }}>● {filteredHospitals.length} hospitals</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
