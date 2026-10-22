import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const s = {
  page:  { minHeight: '100vh', background: '#f8f9fa', padding: '32px 16px' },
  card:  { background: 'white', borderRadius: 14, padding: 36, maxWidth: 580, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  label: { display: 'block', marginBottom: 5, fontWeight: 600, color: '#444', fontSize: '0.88rem' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.95rem', marginBottom: 12, outline: 'none', boxSizing: 'border-box' },
  select:{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.95rem', marginBottom: 12, boxSizing: 'border-box' },
  btn:   { width: '100%', padding: '13px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, marginTop: 8, cursor: 'pointer' },
  error: { background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.88rem' },
  grid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  section: { background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14 },
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INDIA_AREAS = {
  'Karnataka': ['Mangalore', 'Bangalore', 'Mysore', 'Hubli', 'Dharwad', 'Belgaum', 'Shimoga', 'Udupi', 'Hassan', 'Tumkur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Thane'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Vellore'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Palakkad'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Noida'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Hisar', 'Rohtak'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'],
  'Himachal Pradesh': ['Shimla', 'Dharamsala', 'Solan', 'Mandi'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg'],
};

const CITY_COORDS = {
  'Mangalore': [12.8703, 74.8431], 'Udupi': [13.3409, 74.7421],
  'Bangalore': [12.9716, 77.5946], 'Mysore': [12.2958, 76.6394],
  'Mumbai': [19.0760, 72.8777], 'Pune': [18.5204, 73.8567],
  'Chennai': [13.0827, 80.2707], 'Coimbatore': [11.0168, 76.9558],
  'Hyderabad': [17.3850, 78.4867], 'Kochi': [9.9312, 76.2673],
  'Thiruvananthapuram': [8.5241, 76.9366], 'Kozhikode': [11.2588, 75.7804],
  'Visakhapatnam': [17.6868, 83.2185], 'Ahmedabad': [23.0225, 72.5714],
  'Jaipur': [26.9124, 75.7873], 'Lucknow': [26.8467, 80.9462],
  'Kolkata': [22.5726, 88.3639], 'New Delhi': [28.6139, 77.2090],
  'Delhi': [28.6139, 77.2090], 'Patna': [25.5941, 85.1376],
  'Bhopal': [23.2599, 77.4126], 'Indore': [22.7196, 75.8577],
  'Hubli': [15.3647, 75.1240], 'Shimoga': [13.9299, 75.5681],
  'Dehradun': [30.3165, 78.0322], 'Bhubaneswar': [20.2961, 85.8245],
  'Ranchi': [23.3441, 85.3096], 'Guwahati': [26.1445, 91.7362],
  'Panaji': [15.4909, 73.8278], 'Raipur': [21.2514, 81.6296],
};

// Component that listens for clicks on the map
function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function RegisterPage() {
  const [role, setRole] = useState('donor');
  const [form, setForm] = useState({});
  const [selectedState, setSelectedState] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.8703, 74.8431]);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedArea('');
    set('state', state);
    set('area', '');
    setPinLat(null);
    setPinLng(null);
  };

  const handleAreaChange = (area) => {
    setSelectedArea(area);
    set('area', area);
    const coords = CITY_COORDS[area];
    if (coords) {
      const [lat, lng] = coords;
      set('latitude', lat);
      set('longitude', lng);
      setMapCenter([lat, lng]);
      setPinLat(lat);
      setPinLng(lng);
      // Auto-open map for hospitals to force exact location selection
      if (role === 'hospital') {
        setShowMap(true);
      }
    }
  };

  const handleMapPick = (lat, lng) => {
    setPinLat(lat);
    setPinLng(lng);
    set('latitude', lat);
    set('longitude', lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedState || !selectedArea) {
      setError('Please select your state and city');
      return;
    }
    // For hospitals, require exact location pinpoint
    if (role === 'hospital' && (!pinLat || !pinLng || pinLat === 0 || pinLng === 0)) {
      setError('Please pinpoint your exact hospital location on the map');
      setShowMap(true);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const endpoint = role === 'donor' ? '/auth/register/donor' : '/auth/register/hospital';
      const payload = { ...form };
      if (role === 'donor') payload.hub = form.hub || `${selectedArea}, ${selectedState}`;
      if (role === 'hospital') {
        payload.city = selectedArea;
        payload.address = `${selectedArea}, ${selectedState}`;
        payload.state = selectedState;
      }
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('profile', JSON.stringify(res.data.donor || res.data.hospital));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      navigate(role === 'hospital' ? '/hospital/dashboard' : '/donor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#c0392b', marginBottom: 20 }}>Create Account</h1>

        {/* Role tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 22 }}>
          {['donor', 'hospital'].map(r => (
            <button key={r} onClick={() => { setRole(r); setError(''); }}
              style={{ padding: '9px 24px', border: 'none', background: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', color: role === r ? '#c0392b' : '#888', borderBottom: role === r ? '2px solid #c0392b' : '2px solid transparent', textTransform: 'capitalize' }}>
              {r}
            </button>
          ))}
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Common fields */}
          <div style={s.grid}>
            <div>
              <label style={s.label}>Full Name *</label>
              <input style={s.input} required onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" required onChange={e => set('email', e.target.value)} placeholder="Email" />
            </div>
          </div>
          <div style={s.grid}>
            <div>
              <label style={s.label}>Password *</label>
              <input style={s.input} type="password" required onChange={e => set('password', e.target.value)} placeholder="Password" />
            </div>
            <div>
              <label style={s.label}>Phone</label>
              <input style={s.input} type="tel" onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
            </div>
          </div>

          {/* Location section */}
          <div style={{ ...s.section, border: '1px solid #f0d0d0' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 10, fontSize: '0.92rem' }}>Location</div>
            <div style={s.grid}>
              <div>
                <label style={s.label}>State *</label>
                <select style={s.select} required value={selectedState} onChange={e => handleStateChange(e.target.value)}>
                  <option value="">Select state</option>
                  {Object.keys(INDIA_AREAS).sort().map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>City *</label>
                <select style={s.select} required value={selectedArea} disabled={!selectedState}
                  onChange={e => handleAreaChange(e.target.value)}>
                  <option value="">Select city</option>
                  {(INDIA_AREAS[selectedState] || []).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Hospital-only: pinpoint on map */}
            {role === 'hospital' && selectedArea && (
              <div>
                <button type="button" onClick={() => setShowMap(v => !v)}
                  style={{ padding: '8px 16px', background: showMap ? '#eee' : '#c0392b', color: showMap ? '#555' : 'white', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', marginTop: 4 }}>
                  {showMap ? 'Hide Map' : '📍 Pinpoint Exact Location (Required)'}
                </button>

                {showMap && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: 6, fontWeight: 600 }}>
                      ⚠️ Click on the map to mark your hospital's exact location (Required for donor navigation)
                    </p>
                    <div style={{ height: 300, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #ddd' }}>
                      <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap contributors'
                        />
                        <LocationPicker onPick={handleMapPick} />
                        {pinLat && pinLng && <Marker position={[pinLat, pinLng]} />}
                      </MapContainer>
                    </div>
                    {pinLat && pinLng ? (
                      <div style={{ marginTop: 6, color: '#27ae60', fontSize: '0.82rem', fontWeight: 600 }}>
                        Location pinned: {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, color: '#e67e22', fontSize: '0.82rem' }}>
                        Click anywhere on the map to drop a pin on your hospital location
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedArea && !showMap && (
              <div style={{ fontSize: '0.82rem', color: '#27ae60', marginTop: 4 }}>
                Location set to {selectedArea}, {selectedState}
                {role === 'hospital' && ' — use the button above to pinpoint exact location'}
              </div>
            )}
          </div>

          {/* Donor fields */}
          {role === 'donor' && (
            <>
              <div style={s.grid}>
                <div>
                  <label style={s.label}>Blood Group *</label>
                  <select style={s.select} required onChange={e => set('bloodGroup', e.target.value)}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Age *</label>
                  <input style={s.input} type="number" required min="18" max="65" onChange={e => set('age', e.target.value)} placeholder="18 – 65" />
                </div>
              </div>
              <div style={s.grid}>
                <div>
                  <label style={s.label}>Weight (kg)</label>
                  <input style={s.input} type="number" min="50" onChange={e => set('weight', e.target.value)} placeholder="Minimum 50 kg" />
                </div>
                <div>
                  <label style={s.label}>Gender</label>
                  <select style={s.select} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <label style={s.label}>College / Office / Organization (optional)</label>
              <input style={s.input} onChange={e => set('hub', e.target.value)} placeholder="e.g. NNM College of Engineering" />
              <label style={s.label}>Hub Type</label>
              <select style={s.select} onChange={e => set('hubType', e.target.value)}>
                <option value="">Select</option>
                <option value="college">College</option>
                <option value="office">Office</option>
                <option value="residential">Residential</option>
                <option value="other">Other</option>
              </select>
            </>
          )}

          {/* Hospital fields */}
          {role === 'hospital' && (
            <>
              <label style={s.label}>Hospital Name *</label>
              <input style={s.input} required onChange={e => set('hospitalName', e.target.value)} placeholder="Hospital name" />
              <div style={s.grid}>
                <div>
                  <label style={s.label}>Registration Number *</label>
                  <input style={s.input} required onChange={e => set('registrationNumber', e.target.value)} placeholder="e.g. REG-001" />
                </div>
                <div>
                  <label style={s.label}>Contact Person</label>
                  <input style={s.input} onChange={e => set('contactPerson', e.target.value)} placeholder="Contact name" />
                </div>
              </div>
            </>
          )}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, color: '#666', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#c0392b', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
