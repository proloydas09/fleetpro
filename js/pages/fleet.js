// =============================================
// FleetPro – Fleet Page
// =============================================

function renderFleet() {
  const statusFilter = window.fleetFilter || 'all';
  const filtered = statusFilter === 'all' ? DB.cars : DB.cars.filter(c => c.status === statusFilter);

  const carCards = filtered.map(car => {
    const driver = getDriverForCar(car.id);
    const profit = car.totalEarnings - car.totalExpenses;
    const trips = getTripsByCarId(car.id).length;
    return `
      <div class="car-card" onclick="showCarDetail('${car.id}')">
        <div class="car-card-header">
          <div class="car-number">${car.plate}</div>
          <div class="car-model">${car.year} ${car.make} ${car.model}</div>
          <div>${statusBadge(car.status)}</div>
          <div class="car-emoji">${car.emoji}</div>
        </div>
        <div class="car-card-body">
          <div class="car-stats">
            <div class="car-stat">
              <div class="car-stat-label">Earned</div>
              <div class="car-stat-value green">${formatCurrency(car.totalEarnings)}</div>
            </div>
            <div class="car-stat">
              <div class="car-stat-label">Spent</div>
              <div class="car-stat-value red">${formatCurrency(car.totalExpenses)}</div>
            </div>
            <div class="car-stat">
              <div class="car-stat-label">Profit</div>
              <div class="car-stat-value ${profit >= 0 ? 'green' : 'red'}">${formatCurrency(profit)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-size:12px;color:var(--text-muted);">🗺️ ${trips} trips • ${car.kmReading.toLocaleString()} km</div>
            <div style="font-size:12px;color:var(--text-muted);">${car.fuelType}</div>
          </div>
          ${driver ? `
            <div class="car-driver-row">
              <div class="driver-mini-avatar">${getInitials(driver.name)}</div>
              <div>
                <div class="driver-mini-name">${driver.name}</div>
                <div class="driver-mini-label">Assigned Driver</div>
              </div>
              <div style="margin-left:auto;">
                <div style="font-size:12px;color:var(--accent-green);font-weight:600;">⭐ ${driver.rating}</div>
              </div>
            </div>
          ` : `
            <div class="car-driver-row" style="cursor:pointer;" onclick="event.stopPropagation();showAssignDriverModal('${car.id}')">
              <div style="width:30px;height:30px;border-radius:50%;border:2px dashed var(--border-color);display:flex;align-items:center;justify-content:center;font-size:16px;">+</div>
              <div>
                <div class="driver-mini-name" style="color:var(--accent-blue);">Assign Driver</div>
                <div class="driver-mini-label">No driver assigned</div>
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <div class="page" id="fleet-page">
      <div style="padding:0 20px 16px;">
        <div style="font-size:14px;color:var(--text-muted);">${DB.cars.length} vehicles total • ${DB.cars.filter(c=>c.status==='active').length} active</div>
      </div>

      <!-- Filter Tabs -->
      <div class="tabs">
        <button class="tab-btn ${statusFilter==='all'?'active':''}" onclick="window.fleetFilter='all';renderFleet()">All (${DB.cars.length})</button>
        <button class="tab-btn ${statusFilter==='active'?'active':''}" onclick="window.fleetFilter='active';renderFleet()">Active</button>
        <button class="tab-btn ${statusFilter==='maintenance'?'active':''}" onclick="window.fleetFilter='maintenance';renderFleet()">In Service</button>
        <button class="tab-btn ${statusFilter==='inactive'?'active':''}" onclick="window.fleetFilter='inactive';renderFleet()">Inactive</button>
      </div>

      <div class="fleet-grid">
        ${carCards || '<div class="empty-state"><div class="empty-icon">🚗</div><div class="empty-title">No cars found</div><div class="empty-text">No cars match this filter.</div></div>'}
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" onclick="showAddCarModal()" title="Add New Car">+</button>
  `;

  document.getElementById('page-container').innerHTML = html;
}

function renderCarDetailContent(carId) {
  const car = getCarById(carId);
  if (!car) return;
  const driver = getDriverForCar(carId);
  const trips = getTripsByCarId(carId);
  const expenses = getExpensesByCarId(carId);
  const maints = getMaintenanceForCar(carId);
  const profit = car.totalEarnings - car.totalExpenses;
  const totalTripEarnings = trips.reduce((s, t) => s + t.fare, 0);
  const totalExpAmt = expenses.reduce((s, e) => s + e.amount, 0);

  // Insurance/permit/pollution
  const ins = expiryStatus(car.insurance.expiry);
  const perm = expiryStatus(car.permit.expiry);
  const poll = car.pollution?.expiry ? expiryStatus(car.pollution.expiry) : null;
  const cf = car.cf?.expiry ? expiryStatus(car.cf.expiry) : null;
  const tax = car.tax?.expiry ? expiryStatus(car.tax.expiry) : null;

  const tripsHtml = trips.slice(0, 5).map(t => {
    const d = getDriverById(t.driverId);
    return `
      <div class="trip-item">
        <div class="trip-icon">🗺️</div>
        <div class="trip-info">
          <div class="trip-route">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</div>
          <div class="trip-meta">${d ? d.name : '–'} • ${t.distance}km • ${formatDateShort(t.date)}</div>
        </div>
        <div class="trip-fare">${formatCurrency(t.fare)}</div>
      </div>
    `;
  }).join('') || '<div class="empty-state" style="padding:30px;"><div class="empty-icon">🗺️</div><div class="empty-text">No trips yet</div></div>';

  const expHtml = expenses.slice(0, 5).map(e => `
    <div class="list-item" style="margin-bottom:8px;" onclick="showExpenseApproval('${e.id}')">
      <div class="list-avatar orange">💸</div>
      <div class="list-content">
        <div class="list-title">${e.category} – ${escapeHtml(e.description)}</div>
        <div class="list-sub">${formatDate(e.date)}</div>
      </div>
      <div class="list-right">
        ${statusBadge(e.status)}
        <div class="list-amount negative">-${formatCurrency(e.amount)}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state" style="padding:30px;"><div class="empty-icon">💸</div><div class="empty-text">No expenses yet</div></div>';

  const maintHtml = maints.map(m => `
    <div class="maint-card">
      <div class="maint-header">
        <div>
          <div class="maint-type">${m.type}</div>
          <div class="maint-car">Last at ${m.lastKm.toLocaleString()} km • Next at ${m.nextKm.toLocaleString()} km</div>
        </div>
        <div class="maint-due ${m.status}">${m.status === 'ok' ? '✓ OK' : m.status === 'soon' ? '⚠ Soon' : '🔴 Overdue'}</div>
      </div>
      <div class="maint-progress">
        <div class="maint-progress-label">
          <span>Progress to next service</span>
          <span>${Math.min(100, Math.round((car.kmReading - m.lastKm) / (m.nextKm - m.lastKm) * 100))}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${m.status==='ok'?'green':m.status==='soon'?'orange':'red'}" style="width:${Math.min(100, Math.round((car.kmReading - m.lastKm) / (m.nextKm - m.lastKm) * 100))}%"></div>
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-state" style="padding:30px;"><div class="empty-icon">🔧</div><div class="empty-text">No maintenance records</div></div>';

  const html = `
    <div class="page" id="car-detail-page">
      <div class="car-detail-hero">
        <div class="car-detail-emoji">${car.emoji}</div>
        <div class="car-detail-info">
          <div class="car-detail-plate">${car.plate}</div>
          <div class="car-detail-model">${car.year} ${car.make} ${car.model}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${statusBadge(car.status)}
            <span class="badge badge-blue">${car.color}</span>
            <span class="badge badge-purple">${car.fuelType}</span>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="car-detail-stats">
        <div class="stat-card green">
          <div class="stat-icon green">💰</div>
          <div class="stat-label">Earned</div>
          <div class="stat-value green">${formatCurrency(car.totalEarnings)}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">💸</div>
          <div class="stat-label">Spent</div>
          <div class="stat-value red">${formatCurrency(car.totalExpenses)}</div>
        </div>
        <div class="stat-card ${profit >= 0 ? 'green' : 'red'}">
          <div class="stat-icon ${profit >= 0 ? 'green' : 'red'}">📊</div>
          <div class="stat-label">Net Profit</div>
          <div class="stat-value ${profit >= 0 ? 'green' : 'red'}">${formatCurrency(profit)}</div>
        </div>
      </div>

      <!-- Driver Assignment -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="section-title" style="margin-bottom:12px;">Assigned Driver</div>
        ${driver ? `
          <div class="driver-card" onclick="showDriverDetail('${driver.id}')">
            <div class="driver-avatar">
              ${getInitials(driver.name)}
              <div class="driver-status-dot ${driver.status}"></div>
            </div>
            <div class="driver-info">
              <div class="driver-name">${driver.name}</div>
              <div class="driver-phone">${driver.phone}</div>
              <div class="driver-car-tag">⭐ ${driver.rating} • ${driver.totalTrips} trips</div>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();showAssignDriverModal('${car.id}')">Change</button>
          </div>
        ` : `
          <div class="card" style="text-align:center;padding:20px;">
            <div style="font-size:36px;margin-bottom:8px;">👨‍✈️</div>
            <div style="color:var(--text-muted);font-size:14px;margin-bottom:12px;">No driver assigned to this car</div>
            <button class="btn btn-primary btn-sm" onclick="showAssignDriverModal('${car.id}')">+ Assign Driver</button>
          </div>
        `}
      </div>

      <!-- Vehicle Identification -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="section-title" style="margin-bottom:12px;">Vehicle Identification</div>
        <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <div class="stat-label">Engine No.</div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-top:4px;">${escapeHtml(car.engineNo || '–')}</div>
          </div>
          <div>
            <div class="stat-label">Chassis No.</div>
            <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-top:4px;">${escapeHtml(car.chassisNo || '–')}</div>
          </div>
        </div>
      </div>

      <!-- Documents Section -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="section-title" style="margin-bottom:12px;">Documents</div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">🛡️</div>
          <div class="doc-info">
            <div class="doc-name">Insurance</div>
            <div class="doc-exp ${ins.cls}">${ins.label}</div>
          </div>
          ${car.insurance.photo ? `<button class="btn btn-sm btn-outline" onclick="showCarDocumentPhoto('${carId}', 'insurance')">View Photo</button>` : ''}
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">📋</div>
          <div class="doc-info">
            <div class="doc-name">Registration Certificate (RC)</div>
            <div class="doc-exp">${formatDate(car.rc.expiry)}</div>
          </div>
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">📄</div>
          <div class="doc-info">
            <div class="doc-name">Permit</div>
            <div class="doc-exp ${perm.cls}">${perm.label}</div>
          </div>
          ${car.permit.photo ? `<button class="btn btn-sm btn-outline" onclick="showCarDocumentPhoto('${carId}', 'permit')">View Photo</button>` : ''}
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">🌿</div>
          <div class="doc-info">
            <div class="doc-name">Pollution Certificate (PUC)</div>
            <div class="doc-exp ${poll?.cls || ''}">${poll?.label || 'Expiry date not set'}</div>
          </div>
          ${car.pollution?.photo ? `<button class="btn btn-sm btn-outline" onclick="showCarDocumentPhoto('${carId}', 'pollution')">View Photo</button>` : ''}
        </div>
        <div class="doc-card" style="margin-top:8px;">
          <div class="doc-icon">✅</div>
          <div class="doc-info">
            <div class="doc-name">Fitness Certificate (CF)</div>
            <div class="doc-exp ${cf?.cls || ''}">${cf?.label || 'Expiry date not set'}</div>
          </div>
          ${car.cf?.photo ? `<button class="btn btn-sm btn-outline" onclick="showCarDocumentPhoto('${carId}', 'cf')">View Photo</button>` : ''}
        </div>
        <div class="doc-card" style="margin-top:8px;">
          <div class="doc-icon">💳</div>
          <div class="doc-info">
            <div class="doc-name">Tax</div>
            <div class="doc-exp ${tax?.cls || ''}">${tax?.label || 'Expiry date not set'}</div>
          </div>
          ${car.tax?.photo ? `<button class="btn btn-sm btn-outline" onclick="showCarDocumentPhoto('${carId}', 'tax')">View Photo</button>` : ''}
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="car-detail-tabs">
        <button class="tab-btn active" onclick="switchCarDetailTab('trips', '${carId}')">Trips (${trips.length})</button>
        <button class="tab-btn" onclick="switchCarDetailTab('expenses', '${carId}')">Expenses (${expenses.length})</button>
        <button class="tab-btn" onclick="switchCarDetailTab('maintenance', '${carId}')">Maintenance</button>
      </div>

      <div id="car-detail-tab-content" style="padding:0 20px;">
        <div id="car-tab-trips">
          <div class="card" style="padding:0;overflow:hidden;">
            ${tripsHtml}
          </div>
        </div>
        <div id="car-tab-expenses" class="hidden">
          ${expHtml}
        </div>
        <div id="car-tab-maintenance" class="hidden">
          ${maintHtml}
        </div>
      </div>

      <!-- Actions -->
      <div style="padding:20px;display:flex;gap:12px;">
        <button class="btn btn-outline btn-full" onclick="showEditCarModal('${carId}')">✏️ Edit Car</button>
        <button class="btn btn-danger btn-full" onclick="deleteCarConfirm('${carId}')">🗑️ Remove</button>
      </div>
    </div>
  `;

  document.getElementById('page-container').innerHTML = html;
  scrollToTop();
}

function switchCarDetailTab(tab, carId) {
  const tabs = document.querySelectorAll('#car-detail-tabs .tab-btn');
  tabs.forEach((t, i) => {
    t.classList.toggle('active', ['trips','expenses','maintenance'][i] === tab);
  });
  ['trips','expenses','maintenance'].forEach(t => {
    const el = document.getElementById(`car-tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
  });
}

function showAssignDriverModal(carId) {
  const car = getCarById(carId);
  const availableDrivers = DB.drivers.filter(d => d.status === 'active');
  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Assign Driver to ${car.plate}</h2>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${availableDrivers.map(d => `
          <div class="driver-card" onclick="assignDriver('${carId}', '${d.id}')" style="cursor:pointer;">
            <div class="driver-avatar" style="background:var(--grad-purple);">${getInitials(d.name)}</div>
            <div class="driver-info">
              <div class="driver-name">${d.name}</div>
              <div class="driver-phone">${d.phone}</div>
              <div class="driver-car-tag">${d.carId ? `Currently on ${getCarById(d.carId)?.plate || '–'}` : '✓ Available'}</div>
            </div>
            <div style="color:var(--accent-green);font-size:12px;font-weight:600;">⭐ ${d.rating}</div>
          </div>
        `).join('')}
        ${car.driverId ? `
          <button class="btn btn-danger btn-full" onclick="assignDriver('${carId}', null)">Remove Current Driver</button>
        ` : ''}
      </div>
    </div>
  `;
  openModal(html);
}

function showCarDocumentPhoto(carId, documentType) {
  const car = getCarById(carId);
  const documentNames = {
    cf: 'CF Photo',
    insurance: 'Insurance Photo',
    permit: 'Permit Photo',
    pollution: 'Pollution Photo',
    tax: 'Tax Photo',
  };
  const photo = car?.[documentType]?.photo;
  if (photo && documentNames[documentType]) viewImage(photo, documentNames[documentType]);
}

function assignDriver(carId, driverId) {
  const car = getCarById(carId);
  // Remove from previous car
  if (car.driverId) {
    const prevDriver = getDriverById(car.driverId);
    if (prevDriver) prevDriver.carId = null;
  }
  // Unassign driver from their previous car
  if (driverId) {
    const newDriver = getDriverById(driverId);
    if (newDriver && newDriver.carId) {
      const prevCar = getCarById(newDriver.carId);
      if (prevCar) prevCar.driverId = null;
    }
    if (newDriver) newDriver.carId = carId;
  }
  car.driverId = driverId;
  closeModal();
  showToast(driverId ? 'Driver assigned successfully!' : 'Driver removed.', 'success');
  showCarDetail(carId);
}

function showAddCarModal() {
  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Add New Car</h2>
      <div class="section-title" style="margin:8px 0 12px;">Optional Document Photos</div>
      <div class="form-group">
        <label class="form-label">CF Photo (Optional)</label>
        <div class="upload-area" onclick="document.getElementById('new-car-cf-photo').click()">
          <div class="upload-icon">✅</div>
          <div class="upload-text">Tap to <strong>upload CF photo</strong> (image, max 5MB)</div>
          <input type="file" id="new-car-cf-photo" accept="image/*" style="display:none" />
        </div>
        <div id="new-car-cf-photo-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Insurance Photo (Optional)</label>
        <div class="upload-area" onclick="document.getElementById('new-car-insurance-photo').click()">
          <div class="upload-icon">🛡️</div>
          <div class="upload-text">Tap to <strong>upload insurance photo</strong> (image, max 5MB)</div>
          <input type="file" id="new-car-insurance-photo" accept="image/*" style="display:none" />
        </div>
        <div id="new-car-insurance-photo-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Permit Photo (Optional)</label>
        <div class="upload-area" onclick="document.getElementById('new-car-permit-photo').click()">
          <div class="upload-icon">📄</div>
          <div class="upload-text">Tap to <strong>upload permit photo</strong> (image, max 5MB)</div>
          <input type="file" id="new-car-permit-photo" accept="image/*" style="display:none" />
        </div>
        <div id="new-car-permit-photo-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Pollution Photo (Optional)</label>
        <div class="upload-area" onclick="document.getElementById('new-car-pollution-photo').click()">
          <div class="upload-icon">🌿</div>
          <div class="upload-text">Tap to <strong>upload pollution certificate photo</strong> (image, max 5MB)</div>
          <input type="file" id="new-car-pollution-photo" accept="image/*" style="display:none" />
        </div>
        <div id="new-car-pollution-photo-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Tax Photo (Optional)</label>
        <div class="upload-area" onclick="document.getElementById('new-car-tax-photo').click()">
          <div class="upload-icon">💳</div>
          <div class="upload-text">Tap to <strong>upload tax photo</strong> (image, max 5MB)</div>
          <input type="file" id="new-car-tax-photo" accept="image/*" style="display:none" />
        </div>
        <div id="new-car-tax-photo-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Number Plate *</label>
        <input class="form-input" id="new-car-plate" placeholder="e.g. BR-01-XY-1234" maxlength="20" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Make *</label>
          <input class="form-input" id="new-car-make" placeholder="e.g. Toyota" />
        </div>
        <div class="form-group">
          <label class="form-label">Model *</label>
          <input class="form-input" id="new-car-model" placeholder="e.g. Innova" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Year</label>
          <input class="form-input" id="new-car-year" type="number" placeholder="2024" min="2000" max="2030" />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="new-car-type">
            <option>Sedan</option><option>SUV</option><option>Hatchback</option><option>Van</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fuel Type</label>
          <select class="form-select" id="new-car-fuel">
            <option>Diesel</option><option>Petrol</option><option>CNG</option><option>Electric</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <input class="form-input" id="new-car-color" placeholder="e.g. White" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Engine No.</label>
          <input class="form-input" id="new-car-engine-no" placeholder="Engine number" maxlength="40" />
        </div>
        <div class="form-group">
          <label class="form-label">Chassis No.</label>
          <input class="form-input" id="new-car-chassis-no" placeholder="Chassis number" maxlength="40" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Insurance Expiry</label>
        <input class="form-input" id="new-car-ins-exp" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">Permit Expiry</label>
        <input class="form-input" id="new-car-permit-exp" type="date" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Pollution Expiry</label>
          <input class="form-input" id="new-car-pollution-exp" type="date" />
        </div>
        <div class="form-group">
          <label class="form-label">CF Expiry</label>
          <input class="form-input" id="new-car-cf-exp" type="date" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tax Expiry</label>
        <input class="form-input" id="new-car-tax-exp" type="date" />
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="addNewCar()">Add Car</button>
      </div>
    </div>
  `;
  openModal(html);

  window._newCarDocumentPhotos = {};
  const documentTypes = ['cf', 'insurance', 'permit', 'pollution', 'tax'];
  documentTypes.forEach(documentType => {
    const input = document.getElementById(`new-car-${documentType}-photo`);
    if (!input) return;
    handleImageUpload(input, (b64) => {
      window._newCarDocumentPhotos[documentType] = b64;
      const preview = document.getElementById(`new-car-${documentType}-photo-preview`);
      if (preview) {
        preview.innerHTML = `
          <img src="${b64}" alt="${documentType} document photo preview" style="width:100%;border-radius:10px;margin-top:8px;max-height:180px;object-fit:contain;" />
        `;
      }
    });
  });
}

function addNewCar() {
  const plate = document.getElementById('new-car-plate').value.trim().toUpperCase();
  const make = document.getElementById('new-car-make').value.trim();
  const model = document.getElementById('new-car-model').value.trim();
  if (!plate || !make || !model) { showToast('Please fill required fields', 'error'); return; }
  const emojis = { 'Sedan': '🚗', 'SUV': '🚙', 'Hatchback': '🚘', 'Van': '🚐' };
  const type = document.getElementById('new-car-type').value;
  const car = {
    id: generateId('c'),
    plate,
    make,
    model,
    year: parseInt(document.getElementById('new-car-year').value) || new Date().getFullYear(),
    color: document.getElementById('new-car-color').value || 'White',
    engineNo: document.getElementById('new-car-engine-no').value.trim(),
    chassisNo: document.getElementById('new-car-chassis-no').value.trim(),
    type,
    emoji: emojis[type] || '🚗',
    status: 'active',
    driverId: null,
    fuelType: document.getElementById('new-car-fuel').value,
    kmReading: 0,
    insurance: { expiry: document.getElementById('new-car-ins-exp').value || '2026-01-01', photo: window._newCarDocumentPhotos.insurance || null },
    rc: { expiry: '2039-01-01' },
    permit: { expiry: document.getElementById('new-car-permit-exp').value || '2026-01-01', photo: window._newCarDocumentPhotos.permit || null },
    pollution: { expiry: document.getElementById('new-car-pollution-exp').value, photo: window._newCarDocumentPhotos.pollution || null },
    cf: { expiry: document.getElementById('new-car-cf-exp').value, photo: window._newCarDocumentPhotos.cf || null },
    tax: { expiry: document.getElementById('new-car-tax-exp').value, photo: window._newCarDocumentPhotos.tax || null },
    lastService: new Date().toISOString().split('T')[0],
    nextService: 10000,
    totalEarnings: 0,
    totalExpenses: 0,
  };
  DB.cars.push(car);
  window._newCarDocumentPhotos = {};
  closeModal();
  showToast('Car added successfully! 🚗', 'success');
  renderFleet();
}

function showEditCarModal(carId) {
  const car = getCarById(carId);
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Edit Car</h2>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="edit-car-status">
          <option value="active" ${car.status==='active'?'selected':''}>Active</option>
          <option value="maintenance" ${car.status==='maintenance'?'selected':''}>In Maintenance</option>
          <option value="inactive" ${car.status==='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Current KM Reading</label>
        <input class="form-input" id="edit-car-km" type="number" value="${car.kmReading}" />
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <input class="form-input" id="edit-car-color" value="${car.color}" />
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="saveCarEdit('${carId}')">Save Changes</button>
      </div>
    </div>
  `);
}

function saveCarEdit(carId) {
  const car = getCarById(carId);
  car.status = document.getElementById('edit-car-status').value;
  car.kmReading = parseInt(document.getElementById('edit-car-km').value) || car.kmReading;
  car.color = document.getElementById('edit-car-color').value || car.color;
  closeModal();
  showToast('Car updated!', 'success');
  showCarDetail(carId);
}

function deleteCarConfirm(carId) {
  const car = getCarById(carId);
  confirmAction(`Remove <b>${car.plate}</b> from fleet? This cannot be undone.`, () => {
    const idx = DB.cars.findIndex(c => c.id === carId);
    if (idx > -1) DB.cars.splice(idx, 1);
    showToast('Car removed.', 'error');
    showPage('fleet');
  });
}
