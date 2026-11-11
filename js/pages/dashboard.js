// =============================================
// FleetPro – Dashboard Page
// =============================================

function renderDashboard() {
  const today = new Date();
  const greetHour = today.getHours();
  const greet = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totalEarnings = totalEarningsAll();
  const totalExpenses = totalExpensesAll();
  const netProfit = netProfitAll();
  const activeCars = DB.cars.filter(c => c.status === 'active').length;
  const activeDrivers = DB.drivers.filter(d => d.status === 'active').length;
  const pendingCount = getPendingExpenses().length;

  // Alerts
  const expiringSoon = [];
  DB.cars.forEach(car => {
    const d1 = daysUntil(car.insurance.expiry);
    const d2 = daysUntil(car.permit.expiry);
    const d3 = daysUntil(car.pollution.expiry);
    if (d1 <= 30) expiringSoon.push(`<b>${escapeHtml(car.plate)}</b> insurance expires in ${d1} days`);
    if (d2 <= 30) expiringSoon.push(`<b>${escapeHtml(car.plate)}</b> permit expires in ${d2} days`);
    if (d3 <= 30) expiringSoon.push(`<b>${escapeHtml(car.plate)}</b> pollution cert expires in ${d3} days`);
  });
  DB.drivers.forEach(d => {
    const dl = daysUntil(d.licenseExpiry);
    if (dl <= 60) expiringSoon.push(`<b>${escapeHtml(d.name)}</b>'s license expires in ${dl} days`);
  });

  const alertsHtml = expiringSoon.slice(0, 3).map(a => `
    <div class="alert-card warning">
      <div class="alert-icon">⚠️</div>
      <div class="alert-text">${a}</div>
    </div>
  `).join('');

  const overdueMaints = DB.maintenance.filter(m => m.status === 'overdue');
  const maintAlerts = overdueMaints.map(m => {
    const car = getCarById(m.carId);
    return `
      <div class="alert-card danger">
        <div class="alert-icon">🔧</div>
        <div class="alert-text"><b>${m.type}</b> overdue for ${car ? car.plate : '–'}</div>
      </div>
    `;
  }).join('');

  const recentTrips = DB.trips.slice(0, 4).map(t => {
    const driver = getDriverById(t.driverId);
    const car = getCarById(t.carId);
    return `
      <div class="trip-item" onclick="showPage('trips')">
        <div class="trip-icon">🗺️</div>
        <div class="trip-info">
          <div class="trip-route">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</div>
          <div class="trip-meta">${driver ? escapeHtml(driver.name) : '–'} • ${car ? escapeHtml(car.plate) : '–'} • ${formatDateShort(t.date)}</div>
        </div>
        <div class="trip-fare">${formatCurrency(t.fare)}</div>
      </div>
    `;
  }).join('');

  const currentTrips = DB.trips.filter(t => t.status === 'current');
  const currentTripsHtml = currentTrips.map(t => {
    const driver = getDriverById(t.driverId);
    const car = getCarById(t.carId);
    return `
      <div class="list-item" onclick="showTripDetail('${t.id}')" style="margin-bottom:10px;">
        <div class="list-avatar orange">🗺️</div>
        <div class="list-content">
          <div class="list-title">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</div>
          <div class="list-sub">${car ? `${escapeHtml(car.plate)} • ` : ''}${driver ? escapeHtml(driver.name) : 'No driver assigned'} • ${t.distance} km</div>
          <div style="font-size:11px;color:var(--accent-orange);font-weight:600;margin-top:3px;">● CURRENT TRIP</div>
        </div>
        ${driver?.phone ? `<a class="btn btn-sm btn-outline" href="tel:${driver.phone.replace(/[^\d+]/g, '')}" onclick="event.stopPropagation()" aria-label="Call ${escapeHtml(driver.name)}">Call</a>` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <div class="page" id="dashboard-page">
      <div class="greeting-bar">
        <div>
          <div class="greeting-text">${greet},</div>
          <div class="greeting-name">${DB.owner.name.split(' ')[0]} 👋</div>
          <div class="greeting-date">${dateStr}</div>
        </div>
        ${pendingCount > 0 ? `<div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:8px 12px;text-align:center;cursor:pointer;" onclick="showPage('expenses')">
          <div style="font-size:20px;font-weight:800;color:var(--accent-orange);">${pendingCount}</div>
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">PENDING</div>
        </div>` : ''}
      </div>

      <!-- Hero Summary -->
      <div class="hero-summary">
        <div class="hero-label">Total Fleet Earnings</div>
        <div class="hero-amount">${formatCurrency(totalEarnings)}</div>
        <div class="hero-sub">Net Profit: <span style="color:#4ade80;font-weight:700;">${formatCurrency(netProfit)}</span></div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-label">💰 Earnings</div>
            <div class="hero-stat-value green">${formatCurrency(totalEarnings)}</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label">💸 Expenses</div>
            <div class="hero-stat-value red">${formatCurrency(totalExpenses)}</div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" style="padding:0 20px;margin:20px 0;">
        <div class="stat-card blue" onclick="showPage('fleet')">
          <div class="stat-icon blue">🚗</div>
          <div class="stat-label">Active Cars</div>
          <div class="stat-value blue">${activeCars}/${DB.cars.length}</div>
        </div>
        <div class="stat-card green" onclick="showPage('drivers')">
          <div class="stat-icon green">👨‍✈️</div>
          <div class="stat-label">Active Drivers</div>
          <div class="stat-value green">${activeDrivers}/${DB.drivers.length}</div>
        </div>
        <div class="stat-card orange" onclick="showPage('trips')">
          <div class="stat-icon orange">🗺️</div>
          <div class="stat-label">Total Trips</div>
          <div class="stat-value orange">${totalTripsAll()}</div>
        </div>
        <div class="stat-card purple" onclick="showPage('expenses')">
          <div class="stat-icon purple">📋</div>
          <div class="stat-label">Pending</div>
          <div class="stat-value purple">${pendingCount}</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section-header">
        <div class="section-title">Quick Actions</div>
      </div>
      <div class="quick-actions">
        <button class="quick-action" onclick="showAddCarModal()">
          <div class="qa-icon blue">🚗</div>
          <div class="qa-label">Add Car</div>
        </button>
        <button class="quick-action" onclick="showAddDriverModal()">
          <div class="qa-icon green">👨‍✈️</div>
          <div class="qa-label">Add Driver</div>
        </button>
        <button class="quick-action" onclick="showAddTripModal()">
          <div class="qa-icon orange">🗺️</div>
          <div class="qa-label">Log Trip</div>
        </button>
        <button class="quick-action" onclick="showAddExpenseModal()">
          <div class="qa-icon purple">💸</div>
          <div class="qa-label">Add Expense</div>
        </button>
      </div>

      <!-- Current Trips -->
      <div class="section-header">
        <div class="section-title">Current Trips (${currentTrips.length})</div>
        <button class="section-link" onclick="showPage('trips')">All Trips →</button>
      </div>
      <div style="padding:0 20px 4px;">
        ${currentTripsHtml || '<div class="card" style="margin-bottom:16px;color:var(--text-muted);font-size:14px;">No current trips. New trips you log will appear here.</div>'}
        ${currentTrips.length ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Live GPS location is not available yet.</div>' : ''}
      </div>

      <!-- Earnings Chart -->
      <div class="section-header">
        <div class="section-title">Earnings Overview</div>
        <button class="section-link" onclick="showPage('reports')">Reports →</button>
      </div>
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="mini-chart-container">
          <div class="chart-title">Monthly Earnings vs Expenses</div>
          <div class="chart-subtitle">Last 6 months • All cars combined</div>
          <canvas id="dashboard-chart"></canvas>
        </div>
      </div>

      <!-- Alerts -->
      ${(alertsHtml || maintAlerts) ? `
        <div class="section-header">
          <div class="section-title">⚠️ Alerts</div>
          <button class="section-link" onclick="showPage('documents')">Manage →</button>
        </div>
        <div class="alerts-section">
          ${alertsHtml}${maintAlerts}
        </div>
      ` : ''}

      <!-- Recent Trips -->
      <div class="section-header">
        <div class="section-title">Recent Trips</div>
        <button class="section-link" onclick="showPage('trips')">See All →</button>
      </div>
      <div class="card" style="margin:0 20px 20px;padding:0;overflow:hidden;">
        ${recentTrips}
      </div>

      <!-- Car Overview -->
      <div class="section-header">
        <div class="section-title">Fleet Status</div>
        <button class="section-link" onclick="showPage('fleet')">Manage →</button>
      </div>
      <div style="padding:0 20px 20px;">
        ${DB.cars.map(car => {
          const driver = getDriverForCar(car.id);
          const profit = car.totalEarnings - car.totalExpenses;
          return `
            <div class="list-item" onclick="showCarDetail('${car.id}')" style="margin-bottom:10px;">
              <div class="list-avatar blue">${car.emoji}</div>
              <div class="list-content">
                <div class="list-title">${escapeHtml(car.plate)}</div>
                <div class="list-sub">${escapeHtml(car.make)} ${escapeHtml(car.model)} • ${driver ? escapeHtml(driver.name) : 'No Driver'}</div>
              </div>
              <div class="list-right">
                ${statusBadge(car.status)}
                <div class="list-amount positive">${formatCurrency(profit)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('page-container').innerHTML = html;

  // Render chart after DOM update
  setTimeout(() => {
    const labels = DB.monthlyData.map(d => d.month);
    drawBarChart('dashboard-chart', labels, [
      {
        data: DB.monthlyData.map(d => d.earnings),
        label: 'Earnings',
        colorTop: 'rgba(16,185,129,0.9)',
        colorBot: 'rgba(16,185,129,0.3)'
      },
      {
        data: DB.monthlyData.map(d => d.expenses),
        label: 'Expenses',
        colorTop: 'rgba(239,68,68,0.9)',
        colorBot: 'rgba(239,68,68,0.3)'
      }
    ], { height: 180, legend: true });
  }, 100);
}
