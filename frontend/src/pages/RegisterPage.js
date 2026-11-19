import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../components/Navbar';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    <div className="page-wrapper">
      <Navbar />

      <main style={{ flex: 1, padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="modern-card" style={{ width: '100%', maxWidth: 640, padding: '36px 32px', borderRadius: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Create an Account
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
              Join the regional verified blood safety and donor network
            </p>
          </div>

          {/* Role selector pill */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 10,
            marginBottom: 24
          }}>
            <button
              type="button"
              onClick={() => { setRole('donor'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.9rem',
                backgroundColor: role === 'donor' ? '#ffffff' : 'transparent',
                color: role === 'donor' ? '#dc2626' : '#64748b',
                boxShadow: role === 'donor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              👤 Individual Donor
            </button>
            <button
              type="button"
              onClick={() => { setRole('hospital'); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.9rem',
                backgroundColor: role === 'hospital' ? '#ffffff' : 'transparent',
                color: role === 'hospital' ? '#dc2626' : '#64748b',
                boxShadow: role === 'hospital' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🏥 Hospital / Blood Bank
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: 20
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{role === 'hospital' ? 'Official Hospital Contact Name *' : 'Full Name *'}</label>
                <input className="form-control" required onChange={e => set('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-control" type="email" required onChange={e => set('email', e.target.value)} placeholder="you@domain.com" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-control" type="password" required onChange={e => set('password', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-control" type="tel" required onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" />
              </div>
            </div>

            {/* Hospital Specifics */}
            {role === 'hospital' && (
              <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 14 }}>
                  🏥 Hospital Credentials
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital Name *</label>
                  <input className="form-control" required onChange={e => set('hospitalName', e.target.value)} placeholder="e.g. Kasturba Medical Hospital" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Registration / License Number *</label>
                    <input className="form-control" required onChange={e => set('registrationNumber', e.target.value)} placeholder="e.g. KA-HOSP-2024-912" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Contact Person Designation</label>
                    <input className="form-control" onChange={e => set('contactPerson', e.target.value)} placeholder="e.g. Blood Bank In-Charge" />
                  </div>
                </div>
              </div>
            )}

            {/* Location Section */}
            <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 12 }}>
                📍 Regional Jurisdiction & Coordinates
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">State *</label>
                  <select className="form-control" required value={selectedState} onChange={e => handleStateChange(e.target.value)}>
                    <option value="">Select State</option>
                    {Object.keys(INDIA_AREAS).sort().map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">City / District *</label>
                  <select className="form-control" required value={selectedArea} disabled={!selectedState} onChange={e => handleAreaChange(e.target.value)}>
                    <option value="">Select City</option>
                    {(INDIA_AREAS[selectedState] || []).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {role === 'hospital' && selectedArea && (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowMap(v => !v)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 14px', width: '100%' }}
                  >
                    {showMap ? 'Hide Map Location' : '📍 Drop Exact GPS Pin on Map (Required)'}
                  </button>

                  {showMap && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ color: '#dc2626', fontSize: '0.825rem', marginBottom: 8, fontWeight: 600 }}>
                        ⚠️ Click on the map to set the exact facility coordinates for ambulance and donor routing:
                      </p>
                      <div style={{ height: 260, borderRadius: 10, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                          <LocationPicker onPick={handleMapPick} />
                          {pinLat && pinLng && <Marker position={[pinLat, pinLng]} />}
                        </MapContainer>
                      </div>
                      <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 600, color: pinLat ? '#059669' : '#d97706' }}>
                        {pinLat ? `✓ Coordinates saved: ${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}` : 'Click anywhere on the map to place the pin'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Donor Specifics */}
            {role === 'donor' && (
              <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginBottom: 14 }}>
                  🩸 Biological & Eligibility Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Blood Group *</label>
                    <select className="form-control" required onChange={e => set('bloodGroup', e.target.value)}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Age *</label>
                    <input className="form-control" type="number" required min="18" max="65" onChange={e => set('age', e.target.value)} placeholder="18–65" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Weight (kg) *</label>
                    <input className="form-control" type="number" required min="45" onChange={e => set('weight', e.target.value)} placeholder="Min 45kg" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Gender</label>
                    <select className="form-control" onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Associated Institution / Office (Optional)</label>
                    <input className="form-control" onChange={e => set('hub', e.target.value)} placeholder="e.g. Manipal Institute of Technology" />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#dc2626', fontWeight: 700 }}>
              Sign In here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
