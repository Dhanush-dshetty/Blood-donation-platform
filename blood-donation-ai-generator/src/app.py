"""
app.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flask REST API microservice for AI Synthetic Data & Simulation Engine.
Exposes endpoints for generating synthetic datasets on demand and
serving daily dynamic analytics for frontend dashboards.

Default Port: 8001
Author: Aditi Sandikar (NNM23IS006)
"""

import time
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from .distribution_learner import DistributionLearner
    from .generator import SyntheticGenerator
    from .lifecycle_engine import LifecycleEngine
except (ImportError, ValueError):
    from distribution_learner import DistributionLearner
    from generator import SyntheticGenerator
    from lifecycle_engine import LifecycleEngine

app = Flask(__name__)
CORS(app)

# Initialize Learner, Generator, and Lifecycle Engine on startup
baseline_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_real_donors.json")
learner = DistributionLearner(baseline_path if os.path.exists(baseline_path) else None)
generator = SyntheticGenerator(learner)
lifecycle = LifecycleEngine(generator, initial_pool_size=50000)


@app.route("/", methods=["GET"])
def dashboard():
    """Browser-friendly HTML dashboard."""
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>🩸 Blood Donation AI — Synthetic Data Engine</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:32px 24px}
  h1{font-size:1.8rem;font-weight:700;color:#f8fafc;margin-bottom:4px}
  .subtitle{color:#94a3b8;font-size:0.95rem;margin-bottom:32px}
  .badge{background:#dc2626;color:#fff;border-radius:9999px;padding:3px 10px;font-size:0.75rem;vertical-align:middle;margin-left:8px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:32px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
  .card h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:8px}
  .card .value{font-size:2rem;font-weight:700;color:#f1f5f9}
  .card .sub{font-size:0.8rem;color:#64748b;margin-top:4px}
  .section{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px}
  .section h2{font-size:1rem;font-weight:600;color:#cbd5e1;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #334155}
  .bg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .bg-item{background:#0f172a;border-radius:8px;padding:12px;text-align:center}
  .bg-item .bg-label{font-size:1.1rem;font-weight:700;color:#e2e8f0}
  .bg-item .bg-units{font-size:1.5rem;font-weight:800;color:#22c55e;margin:4px 0}
  .bg-item .bg-pct{font-size:0.75rem;color:#64748b}
  .endpoint-list{list-style:none;display:flex;flex-direction:column;gap:10px}
  .ep{display:flex;align-items:center;gap:12px;background:#0f172a;border-radius:8px;padding:12px 16px}
  .method{font-size:0.7rem;font-weight:700;padding:3px 8px;border-radius:4px;min-width:42px;text-align:center}
  .get{background:#1d4ed8;color:#bfdbfe}
  .post{background:#15803d;color:#bbf7d0}
  .ep-path{font-family:monospace;font-size:0.9rem;color:#93c5fd;flex:1}
  .ep-desc{font-size:0.8rem;color:#64748b}
  a.try-btn{display:inline-block;text-decoration:none;background:#dc2626;color:#fff;padding:4px 10px;border-radius:6px;font-size:0.75rem;margin-left:8px}
  a.try-btn:hover{background:#b91c1c}
  table{width:100%;border-collapse:collapse;font-size:0.82rem}
  th{text-align:left;color:#64748b;text-transform:uppercase;font-size:0.7rem;letter-spacing:.06em;padding:8px 10px;border-bottom:1px solid #334155}
  td{padding:8px 10px;border-bottom:1px solid #1e293b;color:#cbd5e1}
  tr:hover td{background:#0f172a}
  .status-available{color:#22c55e;font-weight:600}
  .status-transfused{color:#3b82f6;font-weight:600}
  .status-expired{color:#ef4444;font-weight:600}
  .status-quarantine{color:#f59e0b;font-weight:600}
  .footer{text-align:center;font-size:0.78rem;color:#475569;margin-top:32px}
</style>
</head>
<body>
<h1>🩸 Blood Donation AI <span class="badge">LIVE</span></h1>
<p class="subtitle">Synthetic Tabular Dataset &amp; 42-Day Lifecycle Simulation Engine · NNM College Major Project</p>

<div id="app">
  <div class="grid" id="stats-grid">
    <div class="card"><h3>Cached Records</h3><div class="value" id="cached">—</div><div class="sub">in-memory pool</div></div>
    <div class="card"><h3>Total Safe Units (Today)</h3><div class="value" id="safe-units">—</div><div class="sub" id="target-date">loading…</div></div>
    <div class="card"><h3>Collected Today</h3><div class="value" id="collected">—</div><div class="sub">new units inflow</div></div>
    <div class="card"><h3>Transfused Today</h3><div class="value" id="transfused">—</div><div class="sub">daily outflow</div></div>
    <div class="card"><h3>Expired Today</h3><div class="value" id="expired" style="color:#ef4444">—</div><div class="sub">42-day lifecycle</div></div>
  </div>

  <div class="section">
    <h2>🩸 Live Blood Stock by Group</h2>
    <div class="bg-grid" id="bg-grid">Loading…</div>
  </div>

  <div class="section">
    <h2>📡 API Endpoints</h2>
    <ul class="endpoint-list">
      <li class="ep"><span class="method get">GET</span><span class="ep-path">/health</span><span class="ep-desc">Service health &amp; cached record count</span><a class="try-btn" href="/health" target="_blank">Try</a></li>
      <li class="ep"><span class="method get">GET</span><span class="ep-path">/api/daily-analytics?dayOffset=0</span><span class="ep-desc">Daily stock snapshot &amp; flow metrics</span><a class="try-btn" href="/api/daily-analytics?dayOffset=0" target="_blank">Try</a></li>
      <li class="ep"><span class="method get">GET</span><span class="ep-path">/api/sample-records?limit=50</span><span class="ep-desc">View synthesized clinical records</span><a class="try-btn" href="/api/sample-records?limit=50" target="_blank">Try</a></li>
      <li class="ep"><span class="method post">POST</span><span class="ep-path">/api/generate-dataset</span><span class="ep-desc">On-demand generation · body: { "count": 80000 }</span></li>
    </ul>
  </div>

  <div class="section">
    <h2>🧬 Sample Synthetic Records <span style="font-size:0.75rem;color:#64748b;font-weight:400">(first 15 from pool)</span></h2>
    <div style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>Unit ID</th><th>Blood Group</th><th>Component</th>
          <th>Gender</th><th>Age</th><th>Weight(kg)</th>
          <th>Hb (g/dL)</th><th>Temp (°C)</th><th>City</th>
          <th>Shelf Life</th><th>Collection</th><th>Expiry</th><th>Status</th>
        </tr></thead>
        <tbody id="records-tbody"><tr><td colspan="13" style="text-align:center;color:#64748b">Loading…</td></tr></tbody>
      </table>
    </div>
  </div>
</div>

<div class="footer">Author: Aditi Sandikar (NNM23IS006) · Department of Information Science &amp; Engineering, NNM College · MIT License</div>

<script>
const BG_COLORS = {'O+':'#22c55e','B+':'#3b82f6','A+':'#f97316','AB+':'#a855f7','O-':'#86efac','B-':'#93c5fd','A-':'#fed7aa','AB-':'#d8b4fe'};

async function fetchHealth(){
  const r = await fetch('/health');
  const d = await r.json();
  document.getElementById('cached').textContent = d.cachedRecords.toLocaleString();
}

async function fetchAnalytics(){
  const r = await fetch('/api/daily-analytics?dayOffset=0');
  const d = await r.json();
  document.getElementById('safe-units').textContent = d.totalSafeUnits.toLocaleString();
  document.getElementById('target-date').textContent = 'Date: ' + d.targetDate;
  document.getElementById('collected').textContent = d.collectedToday.toLocaleString();
  document.getElementById('transfused').textContent = d.transfusedToday.toLocaleString();
  document.getElementById('expired').textContent = d.expiredToday.toLocaleString();

  const grid = document.getElementById('bg-grid');
  const stock = d.stockByBloodGroup;
  const total = Object.values(stock).reduce((a,b)=>a+b,0);
  grid.innerHTML = Object.entries(stock).sort((a,b)=>b[1]-a[1]).map(([bg,units])=>`
    <div class="bg-item">
      <div class="bg-label" style="color:${BG_COLORS[bg]||'#e2e8f0'}">${bg}</div>
      <div class="bg-units" style="color:${BG_COLORS[bg]||'#22c55e'}">${units.toLocaleString()}</div>
      <div class="bg-pct">${(units/total*100).toFixed(1)}% of stock</div>
    </div>`).join('');
}

async function fetchRecords(){
  const r = await fetch('/api/sample-records?limit=15');
  const d = await r.json();
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = d.records.map(rec => {
    const statusClass = 'status-' + rec.status.replace('_','-');
    return `<tr>
      <td>${rec.unit_id}</td>
      <td><b style="color:${BG_COLORS[rec.blood_group]||'#e2e8f0'}">${rec.blood_group}</b></td>
      <td>${rec.component_type}</td>
      <td>${rec.donor_gender}</td>
      <td>${rec.donor_age}</td>
      <td>${rec.donor_weight_kg}</td>
      <td>${rec.hemoglobin_g_dl}</td>
      <td>${rec.storage_temp_c}</td>
      <td>${rec.city}</td>
      <td>${rec.shelf_life_days}d</td>
      <td>${rec.collection_date.split(' ')[0]}</td>
      <td>${rec.expiry_date.split(' ')[0]}</td>
      <td class="${statusClass}">${rec.status}</td>
    </tr>`;
  }).join('');
}

(async ()=>{ await Promise.all([fetchHealth(), fetchAnalytics(), fetchRecords()]); })();
</script>
</body>
</html>"""
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/health", methods=["GET"])
def health():
    """Service health check."""
    return jsonify({
        "status": "healthy",
        "service": "Blood Donation AI Dataset & Simulation Engine",
        "cachedRecords": len(lifecycle.inventory_df)
    })


@app.route("/api/generate-dataset", methods=["POST"])
def generate_dataset():
    """
    Synthesizes synthetic records on demand.
    Request body: { "count": 60000 }
    """
    data = request.get_json(silent=True) or {}
    count = int(data.get("count", 50000))
    count = max(100, min(count, 150000))  # guardrail between 100 and 150k

    t0 = time.time()
    df = generator.generate(count=count)
    exec_time = time.time() - t0

    # Also update the active simulation pool
    lifecycle.inventory_df = df

    # Prepare preview sample (first 25 rows)
    sample_records = df.head(25).to_dict(orient="records")

    return jsonify({
        "status": "success",
        "recordsGenerated": len(df),
        "executionTimeSec": round(exec_time, 4),
        "speedRecordsPerSec": round(len(df) / exec_time, 0),
        "sample": sample_records
    })


@app.route("/api/daily-analytics", methods=["GET"])
def daily_analytics():
    """
    Returns dynamic daily stock and flow analytics.
    Query Param: dayOffset (int, e.g. 0 for today, 1 for tomorrow)
    """
    try:
        day_offset = int(request.args.get("dayOffset", 0))
    except ValueError:
        day_offset = 0

    analytics = lifecycle.get_daily_analytics(day_offset=day_offset)
    return jsonify(analytics)


@app.route("/api/sample-records", methods=["GET"])
def sample_records():
    """
    Returns a sample of the synthesized inventory records for table displays.
    Query Param: limit (default: 50, max: 500)
    """
    try:
        limit = int(request.args.get("limit", 50))
    except ValueError:
        limit = 50
    limit = max(1, min(limit, 500))

    records = lifecycle.inventory_df.head(limit).to_dict(orient="records")
    return jsonify({
        "totalCached": len(lifecycle.inventory_df),
        "count": len(records),
        "records": records
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    print(f"\n🩸 Blood Donation AI Simulation Microservice starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
