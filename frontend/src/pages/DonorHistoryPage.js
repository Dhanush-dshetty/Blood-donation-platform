import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from '../components/Navbar';

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

  const generateCertificate = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setFillColor(255, 245, 245);
    doc.rect(0, 0, W, H, 'F');

    doc.setDrawColor(192, 57, 43);
    doc.setLineWidth(3);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineWidth(1);
    doc.rect(12, 12, W - 24, H - 24);

    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOOD DONATION PLATFORM — DIGITAL LIFE SAVING NETWORK', W / 2, 17, { align: 'center' });

    doc.setTextColor(220, 38, 38);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF DONATION', W / 2, 52, { align: 'center' });

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(40, 57, W - 40, 57);

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to certify that', W / 2, 70, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.name?.toUpperCase() || 'DONOR NAME', W / 2, 84, { align: 'center' });

    const nameWidth = doc.getTextWidth(user?.name?.toUpperCase() || 'DONOR NAME');
    doc.setLineWidth(1);
    doc.setDrawColor(220, 38, 38);
    doc.line(W / 2 - nameWidth / 2, 87, W / 2 + nameWidth / 2, 87);

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('has voluntarily donated blood and contributed to saving human lives.', W / 2, 98, { align: 'center' });

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
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.roundedRect(startX, boxY, boxW, 22, 3, 3, 'FD');
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(box.label.toUpperCase(), startX + boxW / 2, boxY + 8, { align: 'center' });
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(box.value, startX + boxW / 2, boxY + 17, { align: 'center' });
      startX += boxW + 8;
    });

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('"Your donation gives the gift of life. Thank you for your selfless contribution."', W / 2, 146, { align: 'center' });

    doc.setFillColor(220, 38, 38);
    doc.rect(0, H - 18, W, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Integrated Blood Donation and Digital Blood Safety Verification Platform | Karnataka Region', W / 2, H - 7, { align: 'center' });

    doc.save(`BloodDonation_Certificate_${user?.name?.replace(/\s+/g, '_')}.pdf`);
  };

  const generateHistoryPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Blood Donation History Report', 105, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Donor: ${user?.name} | Blood Group: ${donorProfile?.bloodGroup} | Generated: ${new Date().toLocaleDateString()}`, 105, 21, { align: 'center' });

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
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      styles: { fontSize: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
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

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Donation History & Recognition
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Verified clinical donation records, recovery cooldown tracker & downloadable certificates
          </p>
        </div>

        {/* 2-Column Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }} className="history-grid">
          {/* Donor Card */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: '#fef2f2', color: '#dc2626',
                border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 800
              }}>
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{user?.name}</h2>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: 'Blood Group', value: donorProfile?.bloodGroup || '—', color: '#dc2626' },
                { label: 'Total Donations', value: donorProfile?.totalDonations || 0, color: '#0f172a' },
                { label: 'Response Rate', value: `${donorProfile?.responseRate ? Math.round(donorProfile.responseRate * (donorProfile.responseRate <= 1 ? 100 : 1)) : 100}%`, color: '#059669' },
                { label: 'Registered District', value: donorProfile?.area || donorProfile?.hub || 'Karnataka', color: '#2563eb' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: s.color }}>{s.value}</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility & Certificates Card */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
              Biological Recovery Status
            </h2>

            <div style={{
              background: eligibility.eligible ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${eligibility.eligible ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem' }}>{eligibility.eligible ? '✅' : '⏳'}</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: eligibility.eligible ? '#059669' : '#d97706', marginTop: 4 }}>
                {eligibility.eligible ? 'Eligible to Donate Blood Today!' : `${eligibility.daysLeft} Days Remaining in Cooldown`}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.825rem', marginTop: 4 }}>
                {eligibility.eligible
                  ? 'Your blood cell reserves have fully replenished (90-day medical interval completed).'
                  : `Last donation recorded: ${donorProfile?.lastDonationDate ? new Date(donorProfile.lastDonationDate).toLocaleDateString() : 'N/A'}`}
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Official Documents
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={generateCertificate}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}
              >
                🏆 Download Official Certificate of Donation (PDF)
              </button>
              <button
                onClick={generateHistoryPDF}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}
              >
                📄 Export Full Donation History (PDF)
              </button>
            </div>
          </div>
        </div>

        {/* History Records Table */}
        <div className="modern-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Past Donation Engagements ({history.length})
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: 18 }}>
            Verified hospital transfusions linked to your volunteer profile
          </p>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>No donation records found yet</div>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Respond to emergency blood alerts in your dashboard to start saving lives!
              </p>
              <Link to="/donor/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}>
                Browse Active Requests →
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hospital / Center</th>
                    <th>City / District</th>
                    <th>Blood Group</th>
                    <th>Urgency Level</th>
                    <th>Donation Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{h.hospital?.hospitalName || '—'}</td>
                      <td style={{ color: '#475569' }}>{h.hospital?.city || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#dc2626' }}>{h.bloodGroup}</span>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: '#64748b', fontWeight: 600 }}>
                        {h.urgencyLevel || 'Standard'}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                        {new Date(h.respondedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          ✓ {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Responsive layout styles */}
      <style>{`
        @media (max-width: 900px) {
          .history-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
