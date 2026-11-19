import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import Navbar from '../components/Navbar';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BG_COLORS = ['#dc2626','#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#8b5cf6','#06b6d4'];
const URGENCY_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#059669' };
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState({});
  const [forecast, setForecast] = useState({});
  const [mobilizationMetrics, setMobilizationMetrics] = useState(null);
  const [fairnessReport, setFairnessReport] = useState(null);
  const [loading, setLoading] = useState(true);

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
        user?.role === 'hospital'
          ? axios.get(`${API_URL}/requests/metrics/summary`).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
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

  const bloodGroupPie = {
    labels: stats?.bloodGroupStats?.map(b => b._id) || [],
    datasets: [{
      data: stats?.bloodGroupStats?.map(b => b.count) || [],
      backgroundColor: BG_COLORS,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const inventoryVsForecast = {
    labels: BLOOD_GROUPS,
    datasets: [
      {
        label: 'Current Stock',
        data: BLOOD_GROUPS.map(bg => inventory[bg] || 0),
        backgroundColor: '#dc2626',
        borderRadius: 6
      },
      {
        label: 'Recommended Reserve (AI)',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.recommended_stock || 0),
        backgroundColor: '#f59e0b',
        borderRadius: 6
      },
      {
        label: '7-Day Demand Forecast',
        data: BLOOD_GROUPS.map(bg => forecast[bg]?.forecast_7_days || 0),
        backgroundColor: '#2563eb',
        borderRadius: 6
      }
    ]
  };

  const requestTrend = {
    labels: stats?.requestTrend?.map(r => r._id?.slice(5)) || [],
    datasets: [{
      label: 'Emergency Requests',
      data: stats?.requestTrend?.map(r => r.count) || [],
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#dc2626',
      pointRadius: 4
    }]
  };

  const urgencyDoughnut = {
    labels: stats?.urgencyBreakdown?.map(u => u._id?.toUpperCase()) || [],
    datasets: [{
      data: stats?.urgencyBreakdown?.map(u => u.count) || [],
      backgroundColor: stats?.urgencyBreakdown?.map(u => URGENCY_COLORS[u._id] || '#64748b') || [],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const fulfillmentRate = stats?.fulfillmentRate || 0;
  const fulfillmentGauge = {
    labels: ['Fulfilled', 'Pending'],
    datasets: [{
      data: [fulfillmentRate, 100 - fulfillmentRate],
      backgroundColor: ['#059669', '#f1f5f9'],
      borderWidth: 0
    }]
  };

  const dailyAvgBar = {
    labels: BLOOD_GROUPS,
    datasets: [{
      label: 'Daily Avg Consumption',
      data: BLOOD_GROUPS.map(bg => forecast[bg]?.daily_avg || 0),
      backgroundColor: BG_COLORS,
      borderRadius: 6
    }]
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container" style={{ maxWidth: 1300 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            <span>📊</span> Business Intelligence & Clinical Forecasting
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Advanced Analytics & Fairness Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Platform-wide metrics, predictive AI demand forecasting, donor mobilization speed & fairness distribution
          </p>
        </div>

        {/* KPI Strip */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Registered Donors', value: stats.totalDonors, sub: `${stats.activeDonors} active volunteers`, color: '#dc2626' },
              { label: 'Hospital Network', value: stats.totalHospitals, sub: 'accredited facilities', color: '#2563eb' },
              { label: 'Total Blood Requests', value: stats.totalRequests, sub: `${stats.fulfilledRequests} fulfilled`, color: '#ea580c' },
              { label: 'Fulfillment Rate', value: `${stats.fulfillmentRate}%`, sub: 'success index', color: '#059669' },
              { label: 'Avg Fulfillment Time', value: `${stats.avgResponseTimeHrs}h`, sub: 'dispatch latency', color: '#7c3aed' },
              { label: 'Total Tracked Units', value: stats.totalInventory, sub: 'in safe inventory', color: '#0891b2' },
            ].map(s => (
              <div key={s.label} className="modern-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: s.color, margin: '4px 0' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Row 1: Trend, Urgency, Gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24, marginBottom: 24 }} className="analytics-row-1">
          {/* Trend */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              📈 Emergency Request Trends (Last 30 Days)
            </h3>
            <div style={{ height: 240, position: 'relative' }}>
              {requestTrend.labels.length > 0 ? (
                <Line data={requestTrend} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 80 }}>No request data logged yet</div>
              )}
            </div>
          </div>

          {/* Urgency Doughnut */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              ⚡ Requests by Urgency
            </h3>
            <div style={{ height: 220, position: 'relative' }}>
              {stats?.urgencyBreakdown?.length > 0 ? (
                <Doughnut data={urgencyDoughnut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11, weight: 600 }, boxWidth: 12 } } }, cutout: '65%' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 70 }}>No breakdown yet</div>
              )}
            </div>
          </div>

          {/* Fulfillment Rate Gauge */}
          <div className="modern-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>
              ✅ Fulfillment Rate
            </h3>
            <div style={{ position: 'relative', width: 160, height: 100 }}>
              <Doughnut data={fulfillmentGauge} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '72%', rotation: -90, circumference: 180 }} />
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{fulfillmentRate}%</div>
              </div>
            </div>
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: '#059669', fontWeight: 700 }}>{stats?.fulfilledRequests || 0} fulfilled</span>
              <span style={{ color: '#64748b' }}> of {stats?.totalRequests || 0} total requests</span>
            </div>
          </div>
        </div>

        {/* Row 2: AI Demand Forecast vs Current Inventory */}
        <div className="modern-card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            🤖 AI Blood Demand Forecast vs Live Reserves
          </h3>
          <div style={{ height: 280, position: 'relative' }}>
            <Bar data={inventoryVsForecast} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top', labels: { font: { size: 12, weight: 600 }, boxWidth: 14 } } },
              scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Total Units' } }, x: { grid: { display: false } } }
            }} />
          </div>
        </div>

        {/* Row 3: Donor Distribution + Daily Avg Usage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }} className="analytics-row-3">
          <div className="modern-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              🩸 Donor Blood Group Demographics
            </h3>
            <div style={{ height: 240, position: 'relative' }}>
              {bloodGroupPie.labels.length > 0 ? (
                <Pie data={bloodGroupPie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11, weight: 600 } } } } }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 80 }}>No donor demographic data</div>
              )}
            </div>
          </div>

          <div className="modern-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              📅 Daily Average Consumption (AI Estimate)
            </h3>
            <div style={{ height: 240, position: 'relative' }}>
              <Bar data={dailyAvgBar} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Units / Day' } }, x: { grid: { display: false } } }
              }} />
            </div>
          </div>
        </div>

        {/* 7-Day Demand Forecast Table */}
        <div className="modern-card" style={{ padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            🔮 7-Day Blood Demand Forecast Matrix (AI)
          </h3>
          <div className="table-responsive">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Blood Group</th>
                  <th>Daily Avg Usage</th>
                  <th>7-Day Projected Need</th>
                  <th>Target Safe Reserve</th>
                  <th>Current Live Stock</th>
                  <th>Readiness Status</th>
                </tr>
              </thead>
              <tbody>
                {BLOOD_GROUPS.map(bg => {
                  const f = forecast[bg] || {};
                  const current = inventory[bg] || 0;
                  const recommended = f.recommended_stock || 0;
                  const isLow = current < recommended;

                  return (
                    <tr key={bg}>
                      <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>{bg}</td>
                      <td style={{ color: '#475569' }}>{f.daily_avg || 0} units</td>
                      <td style={{ color: '#2563eb', fontWeight: 700 }}>{f.forecast_7_days || 0} units</td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>{recommended} units</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{current} units</td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                          {isLow ? '⚠️ Low Reserve' : '✓ Stock Adequate'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobilization Metrics (Req A) */}
        {mobilizationMetrics && (
          <div className="modern-card" style={{ padding: '24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              🎯 Donor Mobilization KPIs (Last 30 Days)
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 18 }}>
              Evaluates response speed from alert dispatch to the first confirmed participating volunteer
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Mobilization Success Rate', value: mobilizationMetrics.fulfillmentRate != null ? `${mobilizationMetrics.fulfillmentRate}%` : '—', color: '#059669' },
                { label: 'Avg Alerts Dispatched / Request', value: mobilizationMetrics.avgAlertsPerRequest ?? '—', color: '#2563eb' },
                { label: 'Minutes to First Confirmation', value: mobilizationMetrics.avgMinutesToFirstConfirmed != null ? `${mobilizationMetrics.avgMinutesToFirstConfirmed} min` : '—', color: '#ea580c' },
                { label: 'Low-Donor Alert Scenarios', value: mobilizationMetrics.lowDonorScenarios ?? '—', color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Regional fulfillment bars */}
            {mobilizationMetrics.regionFulfillment?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: 12 }}>
                  District-Level Fulfillment Rates:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mobilizationMetrics.regionFulfillment.map(r => (
                    <div key={r.area} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 100, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{r.area}</div>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 9999, height: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${r.fulfillmentRate}%`, background: r.fulfillmentRate < 50 ? '#dc2626' : '#059669', height: '100%', borderRadius: 9999 }} />
                      </div>
                      <div style={{ width: 45, fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                        {r.fulfillmentRate}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fairness & Coverage Report (Req B) */}
        {fairnessReport?.summary && (
          <div className="modern-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              ⚖️ Fairness & Ethical Donor Dispatch Report
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
              Prevents donor fatigue, balances alert frequency, and flags underserved geographic zones
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' }}>{fairnessReport.summary.regionsAnalysed}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>Regions Monitored</div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>{fairnessReport.summary.highBurdenDonors}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>High-Burden (Fatigued) Donors</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706' }}>{fairnessReport.summary.underservedRegions?.length || 0}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>Underserved Districts (&lt;50% match)</div>
              </div>
            </div>

            {fairnessReport.summary.underservedRegions?.length > 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.875rem', color: '#92400e' }}>
                ⚠️ <strong>Underserved Districts:</strong> {fairnessReport.summary.underservedRegions.join(', ')} — Targeted donation mobilization campaigns recommended.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Responsive layout styles */}
      <style>{`
        @media (max-width: 992px) {
          .analytics-row-1 {
            grid-template-columns: 1fr !important;
          }
          .analytics-row-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
