// =============================================
// FleetPro – Reports Page
// =============================================

function renderReports() {
  const period = window.reportPeriod || 'monthly';
  const totalEarnings = totalEarningsAll();
  const totalExpenses = totalExpensesAll();
  const netProfit = netProfitAll();
  const margin = totalEarnings > 0 ? Math.round((netProfit / totalEarnings) * 100) : 0;

  // Per-car profit breakdown
  const carBreakdown = DB.cars.map(c => ({
    car: c,
    profit: c.totalEarnings - c.totalExpenses,
    margin: c.totalEarnings > 0 ? Math.round(((c.totalEarnings - c.totalExpenses) / c.totalEarnings) * 100) : 0,
  })).sort((a, b) => b.profit - a.profit);

  // Expense categories
  const cats = ['Fuel', 'Maintenance', 'Insurance', 'Permit', 'Toll', 'Washing', 'Other'];
  const catData = cats.map(cat => ({
    cat,
    total: DB.expenses.filter(e => e.category === cat && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const catColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

  // Top driver by earnings
  const driverPerf = DB.drivers.map(d => ({
    driver: d,
    trips: getTripsByDriverId(d.id).length,
    earned: getTripsByDriverId(d.id).reduce((s, t) => s + t.fare, 0)
  })).sort((a, b) => b.earned - a.earned);

  const html = `
    <div class="page" id="reports-page">
      <!-- Period Selector -->
      <div class="report-period-selector">
        <button class="period-btn ${period==='weekly'?'active':''}" onclick="window.reportPeriod='weekly';renderReports()">Weekly</button>
        <button class="period-btn ${period==='monthly'?'active':''}" onclick="window.reportPeriod='monthly';renderReports()">Monthly</button>
        <button class="period-btn ${period==='yearly'?'active':''}" onclick="window.reportPeriod='yearly';renderReports()">Yearly</button>
        <button class="period-btn ${period==='all'?'active':''}" onclick="window.reportPeriod='all';renderReports()">All Time</button>
      </div>

      <!-- P&L Summary -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="hero-summary">
          <div class="hero-label">📊 Profit & Loss Summary</div>
          <div class="hero-amount">${formatCurrency(netProfit)}</div>
          <div class="hero-sub">Net Profit • ${margin}% margin</div>
          <div class="hero-stats">
            <div class="hero-stat">
              <div class="hero-stat-label">💰 Total Revenue</div>
              <div class="hero-stat-value green">${formatCurrency(totalEarnings)}</div>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-label">💸 Total Expenses</div>
              <div class="hero-stat-value red">${formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Earnings Chart -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="mini-chart-container">
          <div class="chart-title">Monthly Earnings vs Expenses</div>
          <div class="chart-subtitle">Last 6 months (all cars)</div>
          <canvas id="report-line-chart"></canvas>
        </div>
      </div>

      <!-- Per-Car Breakdown -->
      <div class="section-header">
        <div class="section-title">Per-Car Performance</div>
      </div>
      <div style="padding:0 20px;margin-bottom:20px;">
        ${carBreakdown.map((item, i) => `
          <div class="profit-bar" style="margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;width:100px;flex-shrink:0;">
              <span style="font-size:16px;">${item.car.emoji}</span>
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${item.car.plate.split('-').slice(-2).join('-')}</div>
                <div style="font-size:10px;color:var(--text-muted);">${item.car.make}</div>
              </div>
            </div>
            <div class="profit-bar-track" style="flex:1;">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px;">
                <span>${item.margin}% margin</span>
                <span>${formatCurrency(item.profit)}</span>
              </div>
              <div class="progress-bar" style="height:10px;">
                <div class="progress-fill ${item.profit >= 0 ? 'green' : 'red'}" style="width:${Math.max(5, item.margin)}%;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:3px;">
                <span>Rev: ${formatCurrency(item.car.totalEarnings)}</span>
                <span>Exp: ${formatCurrency(item.car.totalExpenses)}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Expense Donut -->
      <div class="section-header">
        <div class="section-title">Expense Breakdown</div>
      </div>
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="mini-chart-container" style="display:flex;align-items:center;gap:20px;">
          <div style="flex-shrink:0;">
            <canvas id="report-donut-chart" style="display:block;"></canvas>
          </div>
          <div style="flex:1;">
            ${catData.map((c, i) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="width:10px;height:10px;border-radius:2px;background:${catColors[i]};flex-shrink:0;"></div>
                <div style="flex:1;font-size:12px;color:var(--text-secondary);">${c.cat}</div>
                <div style="font-size:12px;font-weight:700;color:var(--text-primary);">${formatCurrency(c.total)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Driver Performance -->
      <div class="section-header">
        <div class="section-title">Driver Performance</div>
        <button class="section-link" onclick="showPage('drivers')">View All →</button>
      </div>
      <div style="padding:0 20px;margin-bottom:20px;">
        ${driverPerf.map((dp, i) => `
          <div class="list-item" style="margin-bottom:10px;" onclick="showDriverDetail('${dp.driver.id}')">
            <div class="list-avatar ${['blue','green','orange','purple'][i % 4]}" style="position:relative;">
              ${getInitials(dp.driver.name)}
              ${i === 0 ? '<span style="position:absolute;top:-6px;right:-6px;font-size:14px;">🏆</span>' : ''}
            </div>
            <div class="list-content">
              <div class="list-title">${dp.driver.name}</div>
              <div class="list-sub">⭐ ${dp.driver.rating} • ${dp.trips} trips this period</div>
            </div>
            <div class="list-right">
              <div class="list-amount positive">${formatCurrency(dp.earned)}</div>
              <div style="font-size:11px;color:var(--text-muted);">${dp.driver.commissionPct}% commission</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Salary Summary -->
      <div class="section-header">
        <div class="section-title">Salary Overview</div>
      </div>
      <div style="padding:0 20px 20px;">
        ${DB.drivers.filter(d => d.status === 'active').map(d => {
          const trips = getTripsByDriverId(d.id);
          const earned = trips.reduce((s, t) => s + t.fare, 0);
          const commission = Math.round(earned * (d.commissionPct / 100));
          const net = d.salary + commission - d.advance;
          return `
            <div class="salary-card">
              <div class="salary-header">
                <div class="salary-driver">
                  <div class="driver-mini-avatar" style="background:var(--grad-purple);">${getInitials(d.name)}</div>
                  <div>
                    <div class="salary-name">${d.name}</div>
                    <div class="salary-car">${getCarForDriver(d.id)?.plate || 'No car'}</div>
                  </div>
                </div>
                <div class="salary-total">${formatCurrency(net)}</div>
              </div>
              <div class="salary-breakdown">
                <div class="salary-row"><div class="salary-row-label">Base</div><div class="salary-row-value green">${formatCurrency(d.salary)}</div></div>
                <div class="salary-row"><div class="salary-row-label">Commission</div><div class="salary-row-value green">+${formatCurrency(commission)}</div></div>
                <div class="salary-row"><div class="salary-row-label">Advance</div><div class="salary-row-value red">-${formatCurrency(d.advance)}</div></div>
                <div class="salary-row" style="background:rgba(59,130,246,0.1);"><div class="salary-row-label">Net Pay</div><div class="salary-row-value" style="color:var(--accent-blue);">${formatCurrency(net)}</div></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('page-container').innerHTML = html;

  setTimeout(() => {
    // Line chart
    const labels = DB.monthlyData.map(d => d.month);
    drawLineChart('report-line-chart', labels, [
      { data: DB.monthlyData.map(d => d.earnings), color: '#10b981', fill: 'rgba(16,185,129,0.2)', label: 'Earnings' },
      { data: DB.monthlyData.map(d => d.expenses), color: '#ef4444', fill: 'rgba(239,68,68,0.1)', label: 'Expenses' },
    ], { height: 180 });

    // Donut
    if (catData.length > 0) {
      drawDonutChart('report-donut-chart', catData.map(c => ({ value: c.total })), catColors, {
        size: 140,
        centerText: formatCurrency(catData.reduce((s, c) => s + c.total, 0)).replace('₹', ''),
        centerSub: 'Total Expenses'
      });
    }
  }, 100);
}
