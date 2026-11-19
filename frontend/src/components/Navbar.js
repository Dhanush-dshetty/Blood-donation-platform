import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getLinks = () => {
    if (!user) {
      return [
        { label: 'Home', path: '/' },
        { label: '🔍 Find Blood', path: '/find-blood' },
        { label: 'Sign In', path: '/login' },
        { label: 'Register', path: '/register', isHighlight: true },
      ];
    }

    if (user.role === 'hospital') {
      return [
        { label: 'Dashboard', path: '/hospital/dashboard' },
        { label: '🌐 Network', path: '/hospital/network' },
        { label: 'Inventory', path: '/hospital/inventory' },
        { label: 'Requests', path: '/hospital/requests' },
        { label: 'Safety Lab', path: '/hospital/blood-safety' },
        { label: 'Map', path: '/hospital/map' },
        { label: 'Analytics', path: '/hospital/analytics' },
      ];
    }

    if (user.role === 'donor') {
      return [
        { label: 'Dashboard', path: '/donor/dashboard' },
        { label: '🔍 Find Blood', path: '/donor/find-blood' },
        { label: 'History & Certificate', path: '/donor/history' },
        { label: '💬 AI Assistant', path: '/donor/chat' },
        { label: 'Map', path: '/donor/map' },
      ];
    }

    if (user.role === 'admin') {
      return [
        { label: 'Admin Panel', path: '/admin' },
        { label: 'Analytics', path: '/admin/analytics' },
        { label: 'Live Map', path: '/admin/map' },
      ];
    }

    return [];
  };

  const links = getLinks();
  const displayName = profile?.hospitalName || user?.name || 'Account';
  const displayRole = user?.role ? user.role.toUpperCase() : '';

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)'
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 20px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Brand Logo */}
        <Link to={user ? (user.role === 'hospital' ? '/hospital/dashboard' : user.role === 'admin' ? '/admin' : '/donor/dashboard') : '/'} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.35rem',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
          }}>
            🩸
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Blood<span style={{ color: '#dc2626' }}>Platform</span>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Safety & Network
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: 'none',
          alignItems: 'center',
          gap: '6px',
        }} className="desktop-nav">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            if (link.isHighlight) {
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                  }}
                >
                  {link.label}
                </Link>
              );
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#dc2626' : '#334155',
                  backgroundColor: isActive ? '#fef2f2' : 'transparent',
                  border: isActive ? '1px solid #fecaca' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Account & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'none',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }} className="user-profile-badge">
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '0.675rem', fontWeight: 600, color: '#dc2626', letterSpacing: '0.04em' }}>
                    {displayRole}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Logout from platform"
              >
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'none', gap: '8px' }} className="auth-buttons-desktop">
              <Link
                to="/login"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  border: '1px solid #cbd5e1'
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#dc2626',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                }}
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          padding: '16px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.06)'
        }} className="mobile-menu">
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#dc2626',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{displayName}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626' }}>{displayRole} ACCOUNT</div>
              </div>
            </div>
          )}

          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.925rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#dc2626' : '#334155',
                  backgroundColor: isActive ? '#fef2f2' : '#f8fafc',
                  border: isActive ? '1px solid #fecaca' : '1px solid #f1f5f9'
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Responsive CSS for Navbar */}
      <style>{`
        @media (min-width: 992px) {
          .desktop-nav {
            display: flex !important;
          }
          .user-profile-badge {
            display: flex !important;
          }
          .auth-buttons-desktop {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
