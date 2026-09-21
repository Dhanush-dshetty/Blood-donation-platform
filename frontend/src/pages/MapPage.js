import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';

// Fix broken default icons from webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// City coordinates lookup — same as RegisterPage
const CITY_COORDS = {
  'Mangalore': [12.8703, 74.8431], 'Udupi': [13.3409, 74.7421],
  'Bangalore': [12.9716, 77.5946], 'Mysore': [12.2958, 76.6394],
  'Mumbai': [19.0760, 72.8777], 'Pune': [18.5204, 73.8567],
  'Chennai': [13.0827, 80.2707], 'Coimbatore': [11.0168, 76.9558],
  'Hyderabad': [17.3850, 78.4867], 'Kochi': [9.9312, 76.2673],
  'Thiruvananthapuram': [8.5241, 76.9366], 'Kozhikode': [11.2588, 75.7804],
  'Visakhapatnam': [17.6868, 83.2185], 'Ahmedabad': [23.0225, 72.5714],
  'Jaipur': [26.9124, 75.7873], 'Lucknow': [26.8467, 80.9462],
  'Kolkata': [22.5726, 88.3639], 'Delhi': [28.6139, 77.2090],
  'New Delhi': [28.6139, 77.2090], 'Patna': [25.5941, 85.1376],
  'Bhopal': [23.2599, 77.4126], 'Indore': [22.7196, 75.8577],
  'Hubli': [15.3647, 75.1240], 'Shimoga': [13.9299, 75.5681],
  'Nagpur': [21.1458, 79.0882], 'Nashik': [19.9975, 73.7898],
  'Dehradun': [30.3165, 78.0322], 'Bhubaneswar': [20.2961, 85.8245],
};

const getCoords = (area, location) => {
  // Use stored GeoJSON coordinates if valid
  if (location?.coordinates) {
    const [lng, lat] = location.coordinates;
    if (lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  // Fall back to area name lookup
  if (area && CITY_COORDS[area]) return CITY_COORDS[area];
  return null; // no valid location
};

// Custom SVG marker icons
const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 9.9 14 22 14 22S28 23.9 28 14C28 6.3 21.7 0 14 0z"
      fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36]
});

const hospitalIcon   = makeIcon('#c0392b');
const availableIcon  = makeIcon('#27ae60');
const unavailableIcon = makeIcon('#aaa');

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.2 });
  }, [position, map]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBG, setFilterBG] = useState('All');
  const [showAvailable, setShowAvailable] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showHospitals, setShowHospitals] = useState(true);
  const [flyTo, setFlyTo] = useState(null);
  const [error, setError] = useState('');

  const defaultCenter = [12.8703, 74.8431]; // Mangalore

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [donorsRes, hospitalsRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/donors`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/hospitals`).catch(() => ({ data: [] })),
        user?.role === 'hospital'
          ? axios.get(`${API_URL}/requests/hospital`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);
      setDonors(donorsRes.data || []);
      setHospitals(hospitalsRes.data || []);
      setRequests(requestsRes.data || []);
    } catch (e) {
      setError('Could not load map data. Make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  // Build marker list — only include entries with valid coords
  const donorMarkers = donors
    .filter(d => {
      if (!showAvailable && d.isAvailable) return false;
      if (!showUnavailable && !d.isAvailable) return false;
      if (filterBG !== 'All' && d.bloodGroup !== filterBG) return false;
      return getCoords(d.area, d.location) !== null;
    })
    .map(d => ({ ...d, _coords: getCoords(d.area, d.location) }));

  const hospitalMarkers = hospitals
    .filter(() => showHospitals)
    .map(h => ({ ...h, _coords: getCoords(h.city, h.location) }))
    .filter(h => h._coords !== null);

  const openRequests = requests.filter(r => r.status === 'open' || r.status === 'partially_fulfilled');

  const availableCount = donorMarkers.filter(d => d.isAvailable).length;
  const unavailableCount = donorMarkers.filter(d => !d.isAvailable).length;

  const backLink = user?.role === 'hospital' ? '/hospital/dashboard'
    : user?.role === 'admin' ? '/admin' : '/donor/dashboard';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>Loading map...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Live Donor Map</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Real-time donor and hospital locations</div>
        </div>
        <Link to={backLink} style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Back to Dashboard</Link>
      </div>

      {error && <div style={{ background: '#fdecea', color: '#c0392b', padding: 10, textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 54px)' }}>
        {/* Sidebar */}
        <div style={{ width: 260, background: 'white', padding: 16, overflowY: 'auto', boxShadow: '2px 0 6px rgba(0,0,0,0.06)', flexShrink: 0, fontSize: '0.88rem' }}>

          {/* Stats */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>Live Stats</div>
            {[
              { label: 'Available Donors', value: donors.filter(d => d.isAvailable).length, color: '#27ae60' },
              { label: 'Total Donors', value: donors.length, color: '#555' },
              { label: 'Hospitals', value: hospitals.length, color: '#2980b9' },
              { label: 'Open Requests', value: openRequests.length, color: '#c0392b' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: '#f8f9fa', borderRadius: 6, marginBottom: 5 }}>
                <span style={{ color: '#666' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>Filters</div>
            <select value={filterBG} onChange={e => setFilterBG(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #ddd', marginBottom: 10, fontSize: '0.88rem' }}>
              {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
            </select>

            {[
              { checked: showAvailable, onChange: setShowAvailable, color: '#27ae60', label: 'Available Donors' },
              { checked: showUnavailable, onChange: setShowUnavailable, color: '#aaa', label: 'Unavailable Donors' },
              { checked: showHospitals, onChange: setShowHospitals, color: '#c0392b', label: 'Hospitals' },
            ].map(f => (
              <label key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.checked} onChange={e => f.onChange(e.target.checked)} />
                <span style={{ color: f.color, fontWeight: 600 }}>{f.label}</span>
              </label>
            ))}
          </div>

          {/* Active requests */}
          {openRequests.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>Active Requests</div>
              {openRequests.slice(0, 5).map(req => {
                const h = hospitalMarkers.find(h => h._id === (req.hospital?._id || req.hospital));
                return (
                  <div key={req._id}
                    onClick={() => h?._coords && setFlyTo(h._coords)}
                    style={{ background: '#fff5f5', borderRadius: 7, padding: '9px 10px', marginBottom: 7, cursor: h?._coords ? 'pointer' : 'default', borderLeft: `3px solid ${URGENCY_COLORS[req.urgencyLevel]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#c0392b' }}>{req.bloodGroup}</span>
                      <span style={{ color: URGENCY_COLORS[req.urgencyLevel], fontSize: '0.78rem', fontWeight: 700 }}>{req.urgencyLevel}</span>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.78rem', marginTop: 2 }}>{req.hospital?.hospitalName}</div>
                    <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{req.unitsRequired} unit(s) needed</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 8 }}>Legend</div>
            {[
              { color: '#c0392b', label: 'Hospital' },
              { color: '#27ae60', label: 'Available Donor' },
              { color: '#aaa', label: 'Unavailable Donor' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ color: '#666', fontSize: '0.82rem' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <button onClick={fetchData}
            style={{ width: '100%', padding: '9px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
            Refresh Map
          </button>

          {donorMarkers.length === 0 && !loading && (
            <div style={{ marginTop: 12, background: '#fff9e6', borderRadius: 8, padding: 10, color: '#888', fontSize: '0.82rem' }}>
              No donors on map yet. Donors will appear once registered with a location.
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {flyTo && <FlyTo position={flyTo} />}

            {/* Hospital markers */}
            {hospitalMarkers.map(h => (
              <React.Fragment key={h._id}>
                <Marker position={h._coords} icon={hospitalIcon}>
                  <Popup maxWidth={240}>
                    <div style={{ fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '0.95rem' }}>{h.hospitalName}</div>
                      {h.city && <div style={{ color: '#666', fontSize: '0.82rem' }}>{h.city}</div>}
                      {h.phone && <div style={{ color: '#666', fontSize: '0.82rem' }}>Phone: {h.phone}</div>}
                      {(() => {
                        const reqs = openRequests.filter(r => (r.hospital?._id || r.hospital) === h._id);
                        return reqs.length > 0 ? (
                          <div style={{ marginTop: 6, background: '#fff5f5', padding: 6, borderRadius: 4 }}>
                            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '0.8rem' }}>{reqs.length} active request(s)</div>
                            {reqs.map(r => (
                              <div key={r._id} style={{ fontSize: '0.78rem', color: '#555' }}>{r.bloodGroup} — {r.urgencyLevel}</div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </Popup>
                </Marker>
                {openRequests.some(r => (r.hospital?._id || r.hospital) === h._id) && (
                  <Circle center={h._coords} radius={20000}
                    pathOptions={{ color: '#c0392b', fillColor: '#c0392b', fillOpacity: 0.04, dashArray: '6', weight: 1.5 }} />
                )}
              </React.Fragment>
            ))}

            {/* Donor markers */}
            {donorMarkers.map(d => (
              <Marker key={d._id} position={d._coords} icon={d.isAvailable ? availableIcon : unavailableIcon}>
                <Popup maxWidth={200}>
                  <div style={{ fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.user?.name || 'Donor'}</div>
                    <div style={{ display: 'flex', gap: 6, margin: '4px 0', flexWrap: 'wrap' }}>
                      <span style={{ background: '#fff0f0', color: '#c0392b', padding: '1px 7px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem' }}>{d.bloodGroup}</span>
                      <span style={{ background: d.isAvailable ? '#e8f8e8' : '#f0f0f0', color: d.isAvailable ? '#27ae60' : '#aaa', padding: '1px 7px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}>
                        {d.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    {d.area && <div style={{ color: '#666', fontSize: '0.78rem' }}>{d.area}{d.state ? `, ${d.state}` : ''}</div>}
                    {d.hub && <div style={{ color: '#888', fontSize: '0.78rem' }}>{d.hub}</div>}
                    <div style={{ color: '#888', fontSize: '0.78rem' }}>Donations: {d.totalDonations}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating badge */}
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'white', borderRadius: 10, padding: '8px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', fontSize: '0.82rem', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 2 }}>On map</div>
            <div style={{ color: '#27ae60' }}>Available: {availableCount}</div>
            {showUnavailable && <div style={{ color: '#aaa' }}>Unavailable: {unavailableCount}</div>}
            {showHospitals && <div style={{ color: '#c0392b' }}>Hospitals: {hospitalMarkers.length}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
