// =============================================
// FleetPro – Trips Page
// =============================================

function renderTrips() {
  const filter = window.tripFilter || 'all';
  const search = (window.tripSearch || '').toLowerCase();

  let filtered = DB.trips;
  if (filter !== 'all') {
    filtered = filtered.filter(t => {
      const car = getCarById(t.carId);
      return car && car.id === filter;
    });
  }
  if (search) {
    filtered = filtered.filter(t =>
      t.from.toLowerCase().includes(search) ||
      t.to.toLowerCase().includes(search) ||
      (getDriverById(t.driverId)?.name || '').toLowerCase().includes(search)
    );
  }

  const totalFare = filtered.reduce((s, t) => s + t.fare, 0);
  const totalDist = filtered.reduce((s, t) => s + t.distance, 0);

  const html = `
    <div class="page" id="trips-page">
      <!-- Summary Strip -->
      <div style="display:flex;gap:10px;padding:0 20px 16px;overflow-x:auto;scrollbar-width:none;">
        <div style="flex-shrink:0;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px 16px;min-width:130px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Fare</div>
          <div style="font-size:18px;font-weight:800;color:var(--accent-green);">${formatCurrency(totalFare)}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:12px 16px;min-width:130px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Trips</div>
          <div style="font-size:18px;font-weight:800;color:var(--accent-blue);">${filtered.length}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:12px 16px;min-width:130px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Distance</div>
          <div style="font-size:18px;font-weight:800;color:var(--accent-purple);">${totalDist.toLocaleString()} km</div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" placeholder="Search route or driver…" value="${window.tripSearch || ''}" oninput="window.tripSearch=this.value;renderTrips()" />
      </div>

      <!-- Car Filter Tabs -->
      <div class="tabs">
        <button class="tab-btn ${filter==='all'?'active':''}" onclick="window.tripFilter='all';renderTrips()">All</button>
        ${DB.cars.map(c => `
          <button class="tab-btn ${filter===c.id?'active':''}" onclick="window.tripFilter='${c.id}';renderTrips()">${c.plate.split('-').slice(-2).join('-')}</button>
        `).join('')}
      </div>

      <!-- Trip List -->
      <div style="padding:0 20px;display:flex;flex-direction:column;gap:10px;">
        ${filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => {
          const driver = getDriverById(t.driverId);
          const car = getCarById(t.carId);
          return `
            <div class="card" style="padding:16px;cursor:pointer;" onclick="showTripDetail('${t.id}')">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
                <div>
                  <div style="font-size:16px;font-weight:700;color:var(--text-primary);">
                    📍 ${t.from} → ${t.to}
                  </div>
                  <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                    ${formatDate(t.date)} at ${t.time}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:18px;font-weight:800;color:var(--accent-green);">${formatCurrency(t.fare)}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${t.distance} km</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:26px;height:26px;border-radius:50%;background:var(--grad-purple);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;">${driver ? getInitials(driver.name) : '?'}</div>
                  <span style="font-size:13px;color:var(--text-secondary);font-weight:500;">${driver ? driver.name : 'Unknown'}</span>
                </div>
                <div style="width:1px;height:16px;background:var(--border-color);"></div>
                <div style="font-size:13px;color:var(--text-muted);">🚗 ${car ? car.plate : '–'}</div>
                ${t.notes ? `<div style="font-size:11px;color:var(--accent-blue);">📝 ${t.notes}</div>` : ''}
              </div>
            </div>
          `;
        }).join('') || `
          <div class="empty-state">
            <div class="empty-icon">🗺️</div>
            <div class="empty-title">No trips found</div>
            <div class="empty-text">Log your first trip to get started.</div>
            <button class="btn btn-primary" onclick="showAddTripModal()">+ Log Trip</button>
          </div>
        `}
      </div>
    </div>
    <button class="fab" onclick="showAddTripModal()" title="Log Trip">+</button>
  `;
  document.getElementById('page-container').innerHTML = html;
}

function showTripDetail(tripId) {
  const t = DB.trips.find(x => x.id === tripId);
  if (!t) return;
  const driver = getDriverById(t.driverId);
  const car = getCarById(t.carId);
  const commission = driver ? Math.round(t.fare * (driver.commissionPct / 100)) : 0;
  const netEarning = t.fare - commission;

  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Trip Details</h2>
      <div style="background:rgba(59,130,246,0.1);border-radius:16px;padding:20px;margin-bottom:20px;border:1px solid rgba(59,130,246,0.2);">
        <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;">📍 ${t.from} → ${t.to}</div>
        <div style="color:var(--text-muted);font-size:13px;">${formatDate(t.date)} at ${t.time}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div class="stat-card green">
          <div class="stat-label">Total Fare</div>
          <div class="stat-value green">${formatCurrency(t.fare)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Distance</div>
          <div class="stat-value blue">${t.distance} km</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-label">Driver Commission</div>
          <div class="stat-value orange">-${formatCurrency(commission)}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Net Earning</div>
          <div class="stat-value green">${formatCurrency(netEarning)}</div>
        </div>
      </div>
      ${driver ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">👨‍✈️</div>
          <div class="doc-info">
            <div class="doc-name">Driver</div>
            <div class="doc-exp">${driver.name} • ${driver.phone}</div>
          </div>
        </div>
      ` : ''}
      ${car ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">${car.emoji}</div>
          <div class="doc-info">
            <div class="doc-name">Vehicle</div>
            <div class="doc-exp">${car.plate} – ${car.make} ${car.model}</div>
          </div>
        </div>
      ` : ''}
      ${t.notes ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">📝</div>
          <div class="doc-info">
            <div class="doc-name">Notes</div>
            <div class="doc-exp">${t.notes}</div>
          </div>
        </div>
      ` : ''}
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
        <button class="btn btn-danger btn-full" onclick="deleteTripConfirm('${t.id}')">🗑️ Delete</button>
      </div>
    </div>
  `);
}

function deleteTripConfirm(tripId) {
  confirmAction('Delete this trip record?', () => {
    const idx = DB.trips.findIndex(t => t.id === tripId);
    if (idx > -1) DB.trips.splice(idx, 1);
    showToast('Trip deleted.', 'error');
    closeModal();
    renderTrips();
  });
}

function showAddTripModal() {
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Log New Trip</h2>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">From *</label>
          <input class="form-input" id="new-trip-from" placeholder="e.g. Patna" />
        </div>
        <div class="form-group">
          <label class="form-label">To *</label>
          <input class="form-input" id="new-trip-to" placeholder="e.g. Gaya" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Distance (km) *</label>
          <input class="form-input" id="new-trip-dist" type="number" placeholder="104" min="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Fare (₹) *</label>
          <input class="form-input" id="new-trip-fare" type="number" placeholder="3200" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Car *</label>
        <select class="form-select" id="new-trip-car">
          ${DB.cars.map(c => `<option value="${c.id}">${c.plate} – ${c.make} ${c.model}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Driver *</label>
        <select class="form-select" id="new-trip-driver">
          <option value="">– Select Driver –</option>
          ${DB.drivers.filter(d => d.status==='active').map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" id="new-trip-date" type="date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Time</label>
          <input class="form-input" id="new-trip-time" type="time" value="${new Date().toTimeString().slice(0,5)}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="new-trip-notes" placeholder="e.g. Wedding trip, Corporate booking" />
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="addNewTrip()">Log Trip</button>
      </div>
    </div>
  `);
}

function addNewTrip() {
  const from = document.getElementById('new-trip-from').value.trim();
  const to = document.getElementById('new-trip-to').value.trim();
  const dist = parseInt(document.getElementById('new-trip-dist').value);
  const fare = parseInt(document.getElementById('new-trip-fare').value);
  const carId = document.getElementById('new-trip-car').value;
  const driverId = document.getElementById('new-trip-driver').value;
  if (!from || !to || !dist || !fare || !carId) { showToast('Please fill all required fields', 'error'); return; }

  const trip = {
    id: generateId('t'),
    carId, driverId,
    from, to,
    distance: dist,
    fare,
    date: document.getElementById('new-trip-date').value,
    time: document.getElementById('new-trip-time').value,
    status: 'completed',
    notes: document.getElementById('new-trip-notes').value.trim(),
  };

  DB.trips.unshift(trip);

  // Update car earnings
  const car = getCarById(carId);
  if (car) car.totalEarnings += fare;

  closeModal();
  showToast('Trip logged successfully! 🗺️', 'success');
  renderTrips();
}
