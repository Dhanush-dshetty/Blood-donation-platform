import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const styles = {
  page: { minHeight: '100vh', background: '#f8f9fa', padding: '40px 20px' },
  card: { background: 'white', borderRadius: 16, padding: 40, maxWidth: 560, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.8rem', fontWeight: 700, color: '#c0392b', marginBottom: 20 },
  tabs: { display: 'flex', marginBottom: 24, borderBottom: '2px solid #eee' },
  tab: { padding: '10px 24px', cursor: 'pointer', fontWeight: 600, color: '#888', border: 'none', background: 'none', fontSize: '1rem' },
  activeTab: { color: '#c0392b', borderBottom: '2px solid #c0392b' },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#444', fontSize: '0.9rem' },
  input: { width: '100%', padding: '12px 16px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '1rem', marginBottom: 14, outline: 'none' },
  select: { width: '100%', padding: '12px 16px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '1rem', marginBottom: 14 },
  btn: { width: '100%', padding: '14px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, marginTop: 8 },
  error: { background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// India states and their major areas/cities
const INDIA_AREAS = {
  'Karnataka': ['Mangalore', 'Bangalore', 'Mysore', 'Hubli', 'Dharwad', 'Belgaum', 'Gulbarga', 'Shimoga', 'Tumkur', 'Bijapur', 'Udupi', 'Hassan'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Thane', 'Navi Mumbai'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Vellore', 'Erode'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Palakkad', 'Malappuram'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Noida Border'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Ghaziabad', 'Noida'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Malda'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Hisar', 'Rohtak', 'Karnal'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Nagaon'],
  'Himachal Pradesh': ['Shimla', 'Dharamsala', 'Solan', 'Mandi', 'Kullu'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Roorkee'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba'],
};

// Approximate coordinates for major cities (for geolocation)
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
};

function getCoords(city) {
  return CITY_COORDS[city] || [13.0, 74.8]; // default to Mangalore area
}

export default function RegisterPage() {
  const [role, setRole] = useState('donor');
  const [form, setForm] = useState({});
  const [selectedState, setSelectedState] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedArea('');
    set('state', state);
    set('area', '');
  };

  const handleAreaChange = (area) => {
    setSelectedArea(area);
    set('area', area);
    // Auto-set coordinates from the city
    const [lat, lng] = getCoords(area);
    set('latitude', lat);
    set('longitude', lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedState || !selectedArea) {
      setError('Please select your state and area');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const endpoint = role === 'donor' ? '/auth/register/donor' : '/auth/register/hospital';
      const payload = { ...form };
      // Pass area as hub for donors
      if (role === 'donor') payload.hub = `${selectedArea}, ${selectedState}`;
      if (role === 'hospital') { payload.city = selectedArea; payload.address = `${selectedArea}, ${selectedState}`; }

      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('profile', JSON.stringify(res.data.donor || res.data.hospital));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      navigate(role === 'hospital' ? '/hospital/dashboard' : '/donor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🩸</div>
        <h1 style={styles.title}>Create Account</h1>
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(role === 'donor' ? styles.activeTab : {}) }} onClick={() => setRole('donor')}>Donor</button>
          <button style={{ ...styles.tab, ...(role === 'hospital' ? styles.activeTab : {}) }} onClick={() => setRole('hospital')}>Hospital</button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Common fields */}
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Full Name</label>
              <input style={styles.input} required onChange={e => set('name', e.target.value)} placeholder="Full Name" />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" required onChange={e => set('email', e.target.value)} placeholder="Email" />
            </div>
          </div>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" required onChange={e => set('password', e.target.value)} placeholder="Password" />
            </div>
            <div>
              <label style={styles.label}>Phone</label>
              <input style={styles.input} type="tel" onChange={e => set('phone', e.target.value)} placeholder="Phone Number" />
            </div>
          </div>

          {/* Location — State + Area dropdowns */}
          <div style={{ background: '#fff5f5', borderRadius: 10, padding: 16, marginBottom: 14, border: '1px solid #fdd' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 10, fontSize: '0.95rem' }}>📍 Your Location</div>
            <div style={styles.grid}>
              <div>
                <label style={styles.label}>State *</label>
                <select style={styles.select} required value={selectedState} onChange={e => handleStateChange(e.target.value)}>
                  <option value="">Select State</option>
                  {Object.keys(INDIA_AREAS).sort().map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>City / Area *</label>
                <select style={styles.select} required value={selectedArea}
                  onChange={e => handleAreaChange(e.target.value)}
                  disabled={!selectedState}>
                  <option value="">Select City</option>
                  {(INDIA_AREAS[selectedState] || []).map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedArea && (
              <div style={{ fontSize: '0.82rem', color: '#27ae60', marginTop: -8 }}>
                ✅ Location set to {selectedArea}, {selectedState}
              </div>
            )}
          </div>

          {/* Donor-specific fields */}
          {role === 'donor' ? (
            <>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Blood Group</label>
                  <select style={styles.select} required onChange={e => set('bloodGroup', e.target.value)}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Age</label>
                  <input style={styles.input} type="number" required min="18" max="65" onChange={e => set('age', e.target.value)} placeholder="Age (18–65)" />
                </div>
              </div>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Weight (kg)</label>
                  <input style={styles.input} type="number" min="50" onChange={e => set('weight', e.target.value)} placeholder="Min 50kg" />
                </div>
                <div>
                  <label style={styles.label}>Gender</label>
                  <select style={styles.select} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <label style={styles.label}>College / Office / Organization (optional)</label>
              <input style={styles.input} onChange={e => set('hub', e.target.value)} placeholder="e.g. NNM College of Engineering" />
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Hub Type</label>
                  <select style={styles.select} onChange={e => set('hubType', e.target.value)}>
                    <option value="">Select</option>
                    <option value="college">College</option>
                    <option value="office">Office</option>
                    <option value="residential">Residential</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Hospital-specific fields */}
              <label style={styles.label}>Hospital Name</label>
              <input style={styles.input} required onChange={e => set('hospitalName', e.target.value)} placeholder="Hospital Name" />
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Registration Number</label>
                  <input style={styles.input} required onChange={e => set('registrationNumber', e.target.value)} placeholder="REG-001" />
                </div>
                <div>
                  <label style={styles.label}>Contact Person</label>
                  <input style={styles.input} onChange={e => set('contactPerson', e.target.value)} placeholder="Contact Name" />
                </div>
              </div>
            </>
          )}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
          Already have an account? <Link to="/login" style={{ color: '#c0392b', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
