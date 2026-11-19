import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDashboard = () => {
    if (user) {
      const route = user.role === 'hospital' ? '/hospital/dashboard' : user.role === 'admin' ? '/admin' : '/donor/dashboard';
      navigate(route);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 20%, #fef2f2 0%, #ffffff 70%)',
        borderBottom: '1px solid #e2e8f0',
        padding: '70px 20px 80px',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 9999,
            background: '#ffffff',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.825rem',
            fontWeight: 700,
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)',
            marginBottom: 24
          }}>
            <span>🩸</span>
            <span>NEXT-GEN BLOOD SAFETY & REGIONAL LOGISTICS</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 20
          }}>
            Integrated Blood Donation & <br />
            <span style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Digital Safety Verification
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: '#475569',
            maxWidth: 680,
            margin: '0 auto 36px',
            lineHeight: 1.6
          }}>
            Connecting hospitals and verified donors in real time. Every unit digitally inspected, 
            every transfer tracked, and every patient safeguarded through intelligent medical verification.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleDashboard}
              className="btn btn-primary"
              style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 10 }}
            >
              <span>{user ? 'Open Dashboard →' : 'Sign In to Portal'}</span>
            </button>

            <Link
              to="/find-blood"
              className="btn btn-secondary"
              style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: 10, borderColor: '#cbd5e1' }}
            >
              <span>🔍 Find Blood (100km Search)</span>
            </Link>

            {!user && (
              <button
                onClick={() => navigate('/register')}
                className="btn btn-outline-primary"
                style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: 10 }}
              >
                <span>Register as Donor / Hospital</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div style={{
          maxWidth: 960,
          margin: '50px auto 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          background: '#ffffff',
          padding: '24px',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>102+</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Hospitals in Network</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>100km</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Emergency Search Radius</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>100%</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Lab-Verified Units</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>42-Day</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>RBC Expiry Tracking</div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Comprehensive Architecture
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            Engineered for Clinical Reliability
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 560, margin: '10px auto 0' }}>
            Designed with medical rigor to eliminate transfusion mismatch, reduce wastage, and speed up emergency donor dispatch.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          {[
            {
              icon: '📍',
              title: 'Location-Based Matching',
              desc: 'Real-time geospatial indexing identifies the closest eligible donors and peer blood banks within a 100km radius during acute shortages.'
            },
            {
              icon: '🤖',
              title: 'AI Donor Ranking Engine',
              desc: 'Fairness-aware algorithms evaluate donor response probability, historical donation dates, and fatigue factors to alert the best-suited donors.'
            },
            {
              icon: '🛡️',
              title: 'Digital Safety Verification',
              desc: 'Strict multi-tier lab screening verifies HIV, Hepatitis B/C, and Syphilis tests alongside temperature and hemoglobin biomarkers before approval.'
            },
            {
              icon: '📊',
              title: 'AI Demand Forecasting',
              desc: 'Predictive intelligence models blood usage patterns to help transfusion officers anticipate shortages and maintain optimal reserve levels.'
            },
            {
              icon: '🔔',
              title: 'Instant Socket.IO Alerts',
              desc: 'High-priority emergency alerts are delivered instantly to active donors and neighboring hospital rooms with ambulance transit ETAs.'
            },
            {
              icon: '💬',
              title: 'Clinical AI Assistant',
              desc: '24/7 interactive assistant guiding donors on biological eligibility criteria, donation intervals, and prep guidelines.'
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="modern-card"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                border: '1px solid #fecaca'
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                {feature.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        padding: '32px 20px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0f172a' }}>
            <span>🩸</span> BloodPlatform — Digital Blood Safety & Emergency Logistics
          </div>
          <div>
            Secure • Compliant • Real-time
          </div>
        </div>
      </footer>
    </div>
  );
}
