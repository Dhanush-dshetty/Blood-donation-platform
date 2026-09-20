import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function DonorHistoryPage() {
  const { user, profile } = useAuth();
  const [donorProfile, setDonorProfile] = useState(profile);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/donors/profile`),
        axios.get(`${API_URL}/donors/history`)
      ]);
      setDonorProfile(profileRes.data);
      setHistory(historyRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Generate PDF Certificate ───────────────────────────────────
  const generateCertificate = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(255, 245, 245);
    doc.rect(0, 0, W, H, 'F');

    // Decorative border
    doc.setDrawColor(192, 57, 43);
    doc.setLineWidth(3);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineWidth(1);
    doc.rect(12, 12, W - 24, H - 24);

    // Header blood drop emoji area
    doc.setFillColor(192, 57, 43);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOOD DONATION PLATFORM — NNM COLLEGE OF ENGINEERING', W / 2, 17, { align: 'center' });

    // Certificate title
    doc.setTextColor(192, 57, 43);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF DONATION', W / 2, 52, { align: 'center' });

    // Subtitle line
    doc.setDrawColor(192, 57, 43);
    doc.setLineWidth(0.5);
    doc.line(40, 57, W - 40, 57);

    // Body text
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to certify that', W / 2, 70, { align: 'center' });

    // Donor name
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.name?.toUpperCase() || 'DONOR NAME', W / 2, 84, { align: 'center' });

    // Underline name
    const nameWidth = doc.getTextWidth(user?.name?.toUpperCase() || 'DONOR NAME');
    doc.setLineWidth(1);
    doc.setDrawColor(192, 57, 43);
    doc.line(W / 2 - nameWidth / 2, 87, W / 2 + nameWidth / 2, 87);

    // Details
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`has voluntarily donated blood and contributed to saving lives.`, W / 2, 98, { align: 'center' });

    // Info boxes
    const boxY = 108;
    const boxes = [
      { label: 'Blood Group', value: donorProfile?.bloodGroup || '—' },
      { label: 'Total Donations', value: String(donorProfile?.totalDonations || 0) },
      { label: 'Donor ID', value: (donorProfile?._id || '—').slice(-8).toUpperCase() },
      { label: 'Issue Date', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
    ];

    const boxW = 55;
    const totalW = boxes.length * boxW + (boxes.length - 1) * 8;
    let startX = (W - totalW) / 2;

    boxes.forEach(box => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(192, 57, 43);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, boxY, boxW, 22, 3, 3, 'FD');
      doc.setTextColor(192, 57, 43);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(box.label.toUpperCase(), startX + boxW / 2, boxY + 8, { align: 'center' });
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(box.value, startX + boxW / 2, boxY + 17, { align: 'center' });
      startX += boxW + 8;
    });

    // Appreciation text
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('"Your donation gives the gift of life. Thank you for your selfless contribution."', W / 2, 146, { align: 'center' });

    // Footer
    doc.setFillColor(192, 57, 43);
    doc.rect(0, H - 18, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Integrated Blood Donation and Digital Blood Safety Verification Platform  |  NNM College of Engineering, Mangalore', W / 2, H - 7, { align: 'center' });

    doc.save(`BloodDonation_Certificate_${user?.name?.replace(/\s+/g, '_')}.pdf`);
  };

  // ── Generate Donation History PDF ─────────────────────────────
  const generateHistoryPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(192, 57, 43);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Blood Donation History Report', 105, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Donor: ${user?.name}  |  Blood Group: ${donorProfile?.bloodGroup}  |  Generated: ${new Date().toLocaleDateString()}`, 105, 21, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Hospital', 'Location', 'Blood Group', 'Date', 'Status']],
      body: history.length > 0
        ? history.map((h, i) => [
            i + 1,
            h.hospital?.hospitalName || '—',
            h.hospital?.city || '—',
            h.bloodGroup,
            new Date(h.respondedAt).toLocaleDateString(),
            h.status
          ])
        : [['-', 'No donation history yet', '', '', '', '']],
      headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      styles: { fontSize: 10 }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setTextColor(192, 57, 43);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Donations: ${donorProfile?.totalDonations || 0}`, 14, finalY);

    doc.save(`DonationHistory_${user?.name?.replace(/\s+/g, '_')}.pdf`);
  };

  const canDonate = () => {
    if (!donorProfile?.lastDonationDate) return { eligible: true, daysLeft: 0 };
    const days = (Date.now() - new Date(donorProfile.lastDonationDate)) / (1000 * 60 * 60 * 24);
    return { eligible: days >= 90, daysLeft: Math.max(0, Math.ceil(90 - days)) };
  };

  const eligibility = canDonate();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>🩸</div><div style={{ color: '#888', marginTop: 8 }}>Loading history...</div></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Donation History & Certificate</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Your complete donation record</div>
          </div>
        </div>
        <Link to="/donor/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>
      </div>

      <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Profile Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Donor Card */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#c0392b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700 }}>
                {user?.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{user?.name}</div>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Blood Group', value: donorProfile?.bloodGroup, color: '#c0392b' },
                { label: 'Total Donations', value: donorProfile?.totalDonations || 0, color: '#c0392b' },
                { label: 'Response Rate', value: `${donorProfile?.responseRate || 100}%`, color: '#27ae60' },
                { label: 'Area', value: donorProfile?.area || donorProfile?.hub || '—', color: '#2980b9' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: s.color }}>{s.value}</div>
                  <div style={{ color: '#888', fontSize: '0.78rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility + Certificate */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginBottom: 16 }}>Donation Eligibility</h3>
            <div style={{ background: eligibility.eligible ? '#e8f8e8' : '#fff3cd', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>{eligibility.eligible ? '✅' : '⏳'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: eligibility.eligible ? '#27ae60' : '#e67e22', marginTop: 6 }}>
                {eligibility.eligible ? 'Eligible to Donate Now!' : `${eligibility.daysLeft} days until eligible`}
              </div>
              <div style={{ color: '#888', fontSize: '0.85rem', marginTop: 4 }}>
                {eligibility.eligible
                  ? 'You have waited the required 90-day period'
                  : `Last donation: ${donorProfile?.lastDonationDate ? new Date(donorProfile.lastDonationDate).toLocaleDateString() : 'N/A'}`}
              </div>
            </div>

            <h3 style={{ marginBottom: 12 }}>Download Documents</h3>
            <button onClick={generateCertificate}
              style={{ width: '100%', padding: '12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', marginBottom: 10, fontSize: '0.95rem' }}>
              🏆 Download Donation Certificate (PDF)
            </button>
            <button onClick={generateHistoryPDF}
              style={{ width: '100%', padding: '12px', background: '#2980b9', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
              📄 Download Full History Report (PDF)
            </button>
          </div>
        </div>

        {/* Donation History Table */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>📋 Donation History ({history.length} records)</h3>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <div>No donation history yet. Respond to a blood request to get started!</div>
              <Link to="/donor/dashboard" style={{ color: '#c0392b', fontWeight: 600, marginTop: 12, display: 'inline-block' }}>
                View Active Requests →
              </Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                  {['#', 'Hospital', 'Location', 'Blood Group', 'Urgency', 'Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 14px', color: '#aaa', fontSize: '0.85rem' }}>{i + 1}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{h.hospital?.hospitalName || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#666', fontSize: '0.85rem' }}>{h.hospital?.city || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#fff0f0', color: '#c0392b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{h.bloodGroup}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: h.urgencyLevel === 'critical' ? '#e74c3c' : h.urgencyLevel === 'high' ? '#e67e22' : '#f39c12', fontWeight: 600, fontSize: '0.85rem' }}>
                        {h.urgencyLevel || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#666', fontSize: '0.85rem' }}>{new Date(h.respondedAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#e8f8e8', color: '#27ae60', padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                        ✅ {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
