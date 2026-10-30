import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BG_COLORS = ['#c0392b','#e74c3c','#e67e22','#f39c12','#27ae60','#2980b9','#8e44ad','#16a085'];
const URGENCY_COLORS = { critical: '#e74c3c', high: '#e67e22', medium: '#f39c12', low: '#27ae60' };

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState({});
  const [forecast, setForecast] = useState({});
  const [mobilizationMetrics, setMobilizationMetrics] = useState(null);
  const [fairnessReport, setFairnessReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isAdmin = user?.role === 'admin';
      const [statsRes, inventoryRes, forecastRes, mobRes, fairRes] = await Promise.all([
        isAdmin
          ? axios.get(`${API_URL}/admin/stats`)
          : axios.get(`${API_URL}/admin/stats`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/inventory`).catch(() => ({ data: { summary: {} } })),
        axios.get(`${API_URL}/ai/forecast`).catch(() => ({ data: { forecast: {} } })),
        // Mobilization metrics (Req A) — only available for hospital users
        user?.role === 'hospital'
          ? axios.get(`${API_URL}/requests/metrics/summary`).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        // Fairness report (Req B) — only for hospital users
        user?.role === 'hospital'
          ? axios.get(`${API_URL}/ai/fairness-report`).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
      ]);
      setStats(statsRes.data);
      setInventory(inventoryRes.data?.summary || {});
      setForecast(forecastRes.data?.forecast || {});
      setMobilizationMetrics(mobRes.data);
      setFairnessReport(fairRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Chart: Blood group distribution (donors)
  const bloodGroupPie = {
    labels: stats?.bloodGroupStats?.map(b => b._id) || [],
    datasets: [{
      data: stats?.bloodGroupStats?.map(b => b.count) || [],
      backgroundColor: BG_COLORS,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Chart: Current inventory vs AI forecast
  const inventoryVsForecast = {
    labels: BLOOD_GROUPS,
    datasets: [
      {
        label: 'Current Stock',
        data: BLOOD_GROUPS.map(bg => inventory[bg] || 0),
        backgroundColor: '#c0392b',
        borderRadius: 6
      },
      {
        label: 'Recommended (AI)',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.recommended_stock || 0),
        backgroundColor: '#f39c12',
        borderRadius: 6
      },
      {
        label: '7-Day Forecast',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.forecast_7_days || 0),
        backgroundColor: '#2980b9',
        borderRadius: 6
      }
    ]
  };

  // Chart: Request trend (last 30 days)
  const requestTrend = {
    labels: stats?.requestTrend?.map(r => r._id.slice(5)) || [],
    datasets: [{
      label: 'Blood Requests',
      data: stats?.requestTrend?.map(r => r.count) || [],
      borderColor: '#c0392b',
      backgroundColor: 'rgba(192,57,43,0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#c0392b',
      pointRadius: 4
    }]
  };

  // Chart: Urgency breakdown doughnut
  const urgencyDoughnut = {
    labels: stats?.urgencyBreakdown?.map(u => u._id?.toUpperCase()) || [],
    datasets: [{
      data: stats?.urgencyBreakdown?.map(u => u.count) || [],
      backgroundColor: stats?.urgencyBreakdown?.map(u => URGENCY_COLORS[u._id] || '#888') || [],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Chart: Fulfillment rate gauge (using doughnut)
  const fulfillmentRate = stats?.fulfillmentRate || 0;
  const fulfillmentGauge = {
    labels: ['Fulfilled', 'Pending'],
    datasets: [{
      data: [fulfillmentRate, 100 - fulfillmentRate],
      backgroundColor: ['#27ae60', '#f0f0f0'],
      borderWidth: 0
    }]
  };

  // Chart: Daily donation average per blood group
  const dailyAvgBar = {
    labels: BLOOD_GROUPS,
    datasets: [{
      label: 'Daily Average Usage',
      data: BLOOD_GROUPS.map(bg => forecast[bg]?.daily_avg || 0),
      backgroundColor: BG_COLORS,
      borderRadius: 6
    }]
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>📊</div>
        <div style={{ color: '#888', marginTop: 8 }}>Loading analytics...</div>
      </div>
    </div>
  );

  const backLink = user?.role === 'hospital' ? '/hospital/dashboard' : user?.role === 'admin' ? '/admin' : '/donor/dashboard';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #c0392b)', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>📊</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Advanced Analytics Dashboard</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Real-time platform insights & AI forecasts</div>
          </div>
        </div>
        <Link to={backLink} style={{ color: 'white', fontWeight: 600 }}>← Back</Link>
      </div>

      <div style={{ padding: '32px', maxWidth: 1300, margin: '0 auto' }}>

        {/* KPI Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Donors', value: stats.totalDonors, icon: '🧑', color: '#c0392b', sub: `${stats.activeDonors} active` },
              { label: 'Hospitals', value: stats.totalHospitals, icon: '🏥', color: '#2980b9', sub: 'registered' },
              { label: 'Total Requests', value: stats.totalRequests, icon: '🩸', color: '#e67e22', sub: `${stats.fulfilledRequests} fulfilled` },
              { label: 'Fulfillment Rate', value: `${stats.fulfillmentRate}%`, icon: '✅', color: '#27ae60', sub: 'of all requests' },
              { label: 'Avg Response', value: `${stats.avgResponseTimeHrs}h`, icon: '⏱️', color: '#8e44ad', sub: 'time to fulfill' },
              { label: 'Blood Units', value: stats.totalInventory, icon: '💉', color: '#16a085', sub: 'in inventory' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${s.color}` }}>
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: s.color, margin: '4px 0' }}>{s.value}</div>
                <div style={{ color: '#555', fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</div>
                <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Row 1: Trend + Urgency + Fulfillment */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', color: '#333' }}>📈 Request Trend (Last 30 Days)</h3>
            </div>
            {requestTrend.labels.length > 0
              ? <Line data={requestTrend} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
              : <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No request data yet</div>
            }
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16 }}>⚡ Requests by Urgency</h3>
            {stats?.urgencyBreakdown?.length > 0
              ? <Doughnut data={urgencyDoughnut} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '60%' }} />
              : <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No data yet</div>
            }
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16, textAlign: 'center' }}>✅ Fulfillment Rate</h3>
            <div style={{ position: 'relative', width: 160 }}>
              <Doughnut data={fulfillmentGauge} options={{ plugins: { legend: { display: false } }, cutout: '70%', rotation: -90, circumference: 180 }} />
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#27ae60' }}>{fulfillmentRate}%</div>
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ color: '#27ae60', fontWeight: 600 }}>{stats?.fulfilledRequests || 0} fulfilled</div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>out of {stats?.totalRequests || 0} total</div>
            </div>
          </div>
        </div>

        {/* Row 2: Inventory vs Forecast */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16 }}>🤖 AI Blood Demand Forecast vs Current Inventory</h3>
          <Bar data={inventoryVsForecast} options={{
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Units' } } }
          }} />
        </div>

        {/* Row 3: Blood group pie + Daily avg */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16 }}>🩸 Donor Blood Group Distribution</h3>
            {bloodGroupPie.labels.length > 0
              ? <Pie data={bloodGroupPie} options={{ plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }} />
              : <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No donor data yet</div>
            }
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16 }}>📅 Daily Average Blood Usage (AI Estimate)</h3>
            <Bar data={dailyAvgBar} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'Units / Day' } } }
            }} />
          </div>
        </div>

        {/* Forecast table */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: 16 }}>🔮 7-Day Blood Demand Forecast (AI)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                {['Blood Group', 'Daily Avg Usage', '7-Day Forecast', 'Recommended Stock', 'Current Stock', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOOD_GROUPS.map(bg => {
                const f = forecast[bg] || {};
                const current = inventory[bg] || 0;
                const recommended = f.recommended_stock || 0;
                const isLow = current < recommended;
                return (
                  <tr key={bg} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#fff0f0', color: '#c0392b', padding: '3px 10px', borderRadius: 4, fontWeight: 700 }}>{bg}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{f.daily_avg || 0} units</td>
                    <td style={{ padding: '12px 16px', color: '#2980b9', fontWeight: 600 }}>{f.forecast_7_days || 0} units</td>
                    <td style={{ padding: '12px 16px', color: '#e67e22', fontWeight: 600 }}>{recommended} units</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{current} units</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: isLow ? '#fdecea' : '#e8f8e8', color: isLow ? '#c0392b' : '#27ae60', padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                        {isLow ? '⚠️ Low Stock' : '✅ Adequate'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobilization Metrics (Req A) ── */}
        {mobilizationMetrics && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24 }}>
            <h3 style={{ marginBottom: 4, fontSize: '1rem' }}>🎯 Donor Mobilization Metrics <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 400 }}>(last 30 days)</span></h3>
            <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: 16 }}>
              Metrics track confirmed participation (donor accepts), not necessarily completed donation.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Fulfillment Rate', value: mobilizationMetrics.fulfillmentRate != null ? `${mobilizationMetrics.fulfillmentRate}%` : '—', color: '#27ae60' },
                { label: 'Avg Alerts/Request', value: mobilizationMetrics.avgAlertsPerRequest ?? '—', color: '#2980b9' },
                { label: 'Avg Mins to 1st Confirmed', value: mobilizationMetrics.avgMinutesToFirstConfirmed != null ? `${mobilizationMetrics.avgMinutesToFirstConfirmed} min` : '—', color: '#e67e22' },
                { label: 'Low-Donor Scenarios', value: mobilizationMetrics.lowDonorScenarios ?? '—', color: '#e74c3c' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per-region fulfillment (Req B) */}
            {mobilizationMetrics.regionFulfillment?.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem', color: '#555' }}>Regional Fulfillment Rates</div>
                {mobilizationMetrics.regionFulfillment.map(r => (
                  <div key={r.area} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 80, fontSize: '0.82rem', color: '#555' }}>{r.area}</div>
                    <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 10 }}>
                      <div style={{ width: `${r.fulfillmentRate}%`, background: r.fulfillmentRate < 50 ? '#e74c3c' : '#27ae60', height: '100%', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 40, fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>{r.fulfillmentRate}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Fairness Report (Req B) ── */}
        {fairnessReport?.summary && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 16 }}>
            <h3 style={{ marginBottom: 4, fontSize: '1rem' }}>⚖️ Fairness & Coverage Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#8e44ad' }}>{fairnessReport.summary.regionsAnalysed}</div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>Regions Analysed</div>
              </div>
              <div style={{ background: '#fdecea', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c0392b' }}>{fairnessReport.summary.highBurdenDonors}</div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>High-Burden Donors</div>
              </div>
              <div style={{ background: '#fff3cd', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e67e22' }}>{fairnessReport.summary.underservedRegions?.length || 0}</div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>Underserved Regions (&lt;50% fulfillment)</div>
              </div>
            </div>
            {fairnessReport.summary.underservedRegions?.length > 0 && (
              <div style={{ marginTop: 12, padding: 10, background: '#fff3cd', borderRadius: 8, fontSize: '0.85rem', color: '#856404' }}>
                ⚠️ <strong>Underserved regions</strong> (fewer donors or lower fulfillment): {fairnessReport.summary.underservedRegions.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
