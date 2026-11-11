// =============================================
// FleetPro – Drivers Page
// =============================================

function renderDrivers() {
  const searchTerm = (window.driverSearch || '').toLowerCase();
  let filtered = DB.drivers;
  if (searchTerm) {
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(searchTerm) ||
      d.phone.includes(searchTerm)
    );
  }

  const html = `
    <div class="page" id="drivers-page">
      <div style="padding:0 20px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:14px;color:var(--text-muted);">${DB.drivers.length} drivers registered</div>
        <div>
          <span style="color:var(--accent-green);font-size:13px;font-weight:600;">● ${DB.drivers.filter(d=>d.status==='active').length} Active</span>
          <span style="color:var(--text-muted);font-size:13px;margin-left:8px;">● ${DB.drivers.filter(d=>d.status==='inactive').length} Inactive</span>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="driver-search-input" placeholder="Search by name or phone…" value="${window.driverSearch || ''}" oninput="window.driverSearch=this.value;renderDrivers()" />
      </div>

      <!-- Driver Cards -->
      <div style="padding:0 20px;display:flex;flex-direction:column;gap:12px;">
        ${filtered.map(d => {
          const car = getCarForDriver(d.id);
          const trips = getTripsByDriverId(d.id);
          return `
            <div class="driver-card" onclick="showDriverDetail('${d.id}')">
              <div class="driver-avatar">
                ${getInitials(d.name)}
                <div class="driver-status-dot ${d.status}"></div>
              </div>
              <div class="driver-info">
                <div class="driver-name">${d.name}</div>
                <div class="driver-phone">${d.phone}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
                  ${car ? `<div class="driver-car-tag">🚗 ${car.plate}</div>` : '<div class="driver-car-tag" style="color:var(--text-muted);">No car assigned</div>'}
                  <div style="font-size:11px;color:var(--text-muted);">⭐ ${d.rating} • ${trips.length} trips</div>
                </div>
              </div>
              <div style="text-align:right;">
                ${statusBadge(d.status)}
                <div style="font-size:13px;font-weight:700;color:var(--accent-green);margin-top:4px;">${formatCurrency(d.salary)}/mo</div>
              </div>
            </div>
          `;
        }).join('') || '<div class="empty-state"><div class="empty-icon">👨‍✈️</div><div class="empty-title">No drivers found</div></div>'}
      </div>
    </div>
    <button class="fab" onclick="showAddDriverModal()" title="Add Driver">+</button>
  `;
  document.getElementById('page-container').innerHTML = html;
}

function renderDriverDetailContent(driverId) {
  const driver = getDriverById(driverId);
  if (!driver) return;
  const car = getCarForDriver(driverId);
  const canInviteDriver = driver.status === 'active' && car?.status === 'active';
  const trips = getTripsByDriverId(driverId);
  const expenses = DB.expenses.filter(e => e.driverId === driverId);
  const totalTripFare = trips.reduce((s, t) => s + t.fare, 0);
  const commission = Math.round(totalTripFare * (driver.commissionPct / 100));
  const netSalary = driver.salary + commission - driver.advance;

  const licenseStatus = expiryStatus(driver.licenseExpiry);

  const tripsHtml = trips.slice(0, 5).map(t => {
    const car2 = getCarById(t.carId);
    return `
      <div class="trip-item">
        <div class="trip-icon">🗺️</div>
        <div class="trip-info">
          <div class="trip-route">${escapeHtml(t.from)} → ${escapeHtml(t.to)}</div>
          <div class="trip-meta">${car2 ? car2.plate : '–'} • ${t.distance}km • ${formatDateShort(t.date)}</div>
        </div>
        <div class="trip-fare">${formatCurrency(t.fare)}</div>
      </div>
    `;
  }).join('') || '<div class="empty-state" style="padding:30px;"><div class="empty-icon">🗺️</div><div class="empty-text">No trips yet</div></div>';

  const expHtml = expenses.map(e => `
    <div class="list-item" style="margin-bottom:8px;" onclick="showExpenseApproval('${e.id}')">
      <div class="list-avatar orange">💸</div>
      <div class="list-content">
        <div class="list-title">${e.category} – ${escapeHtml(e.description)}</div>
        <div class="list-sub">${formatDate(e.date)} • ${car ? car.plate : '–'}</div>
      </div>
      <div class="list-right">
        ${statusBadge(e.status)}
        <div class="list-amount negative">-${formatCurrency(e.amount)}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-state" style="padding:30px;"><div class="empty-icon">💸</div><div class="empty-text">No expenses submitted</div></div>';

  const html = `
    <div class="page" id="driver-detail-page">
      <div class="driver-detail-hero">
        <div class="driver-detail-avatar">${getInitials(driver.name)}</div>
        <div class="driver-detail-name">${driver.name}</div>
        <div class="driver-detail-phone">${driver.phone}</div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          ${statusBadge(driver.status)}
          <span class="badge badge-blue">⭐ ${driver.rating} Rating</span>
          <span class="badge badge-purple">${driver.totalTrips} Total Trips</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="car-detail-stats">
        <div class="stat-card blue">
          <div class="stat-icon blue">🗺️</div>
          <div class="stat-label">Trips</div>
          <div class="stat-value blue">${trips.length}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">💰</div>
          <div class="stat-label">Collected</div>
          <div class="stat-value green">${formatCurrency(totalTripFare)}</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon orange">📊</div>
          <div class="stat-label">Commission</div>
          <div class="stat-value orange">${driver.commissionPct}%</div>
        </div>
      </div>

      <!-- Salary Breakdown -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="section-title" style="margin-bottom:12px;">This Month's Salary</div>
        <div class="salary-card">
          <div class="salary-header">
            <div class="salary-driver">
              <div class="driver-mini-avatar" style="background:var(--grad-purple);">${getInitials(driver.name)}</div>
              <div>
                <div class="salary-name">${driver.name}</div>
                <div class="salary-car">${car ? car.plate : 'No Car'}</div>
              </div>
            </div>
            <div class="salary-total">${formatCurrency(netSalary)}</div>
          </div>
          <div class="salary-breakdown">
            <div class="salary-row">
              <div class="salary-row-label">Base Salary</div>
              <div class="salary-row-value green">${formatCurrency(driver.salary)}</div>
            </div>
            <div class="salary-row">
              <div class="salary-row-label">Commission (${driver.commissionPct}%)</div>
              <div class="salary-row-value green">+${formatCurrency(commission)}</div>
            </div>
            <div class="salary-row">
              <div class="salary-row-label">Advance Deducted</div>
              <div class="salary-row-value red">-${formatCurrency(driver.advance)}</div>
            </div>
            <div class="salary-row" style="background:rgba(59,130,246,0.1);">
              <div class="salary-row-label">Net Payable</div>
              <div class="salary-row-value" style="color:var(--accent-blue);">${formatCurrency(netSalary)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Car & License -->
      <div style="padding:0 20px;margin-bottom:20px;">
        <div class="section-title" style="margin-bottom:12px;">Details</div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">🚗</div>
          <div class="doc-info">
            <div class="doc-name">Assigned Car</div>
            <div class="doc-exp">${car ? `${car.plate} – ${car.make} ${car.model}` : 'Not assigned'}</div>
          </div>
          ${car ? `<button class="btn btn-sm btn-outline" onclick="showPage('fleet')">View</button>` : ''}
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">📋</div>
          <div class="doc-info">
            <div class="doc-name">Driving License</div>
            <div class="doc-exp ${licenseStatus.cls}">${driver.license} • ${licenseStatus.label}</div>
          </div>
          ${driver.licensePhoto ? `<button class="btn btn-sm btn-outline" onclick="showDriverLicensePhoto('${driverId}')">View Photo</button>` : ''}
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">🪪</div>
          <div class="doc-info">
            <div class="doc-name">Aadhaar Card</div>
            <div class="doc-exp">${driver.aadhaarNo ? `•••• •••• ${driver.aadhaarNo.slice(-4)}` : 'Number not provided'}</div>
          </div>
          ${driver.aadhaarCard ? `<button class="btn btn-sm btn-outline" onclick="showDriverAadhaarCard('${driverId}')">View</button>` : ''}
        </div>
        <div class="doc-card" style="margin-bottom:8px;">
          <div class="doc-icon">📍</div>
          <div class="doc-info">
            <div class="doc-name">Present Address</div>
            <div class="doc-exp">${driver.address}</div>
          </div>
        </div>
        <div class="doc-card">
          <div class="doc-icon">📅</div>
          <div class="doc-info">
            <div class="doc-name">Joined On</div>
            <div class="doc-exp">${formatDate(driver.joinDate)}</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="driver-detail-tabs">
        <button class="tab-btn active" onclick="switchDriverTab('trips')">Trips (${trips.length})</button>
        <button class="tab-btn" onclick="switchDriverTab('expenses')">Expenses (${expenses.length})</button>
      </div>

      <div id="driver-tab-content" style="padding:0 20px;">
        <div id="driver-tab-trips">
          <div class="card" style="padding:0;overflow:hidden;">${tripsHtml}</div>
        </div>
        <div id="driver-tab-expenses" class="hidden">${expHtml}</div>
      </div>

      <!-- Actions -->
      <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
        <button class="btn btn-outline btn-full" onclick="inviteDriverLogin('${driverId}')" ${canInviteDriver ? '' : 'disabled'}>
          📩 Invite / Send Login Code
        </button>
        <div style="display:flex;gap:12px;">
        <button class="btn btn-outline btn-full" onclick="showEditDriverModal('${driverId}')">✏️ Edit</button>
        <button class="btn btn-${driver.status==='active'?'ghost':'primary'} btn-full" onclick="toggleDriverStatus('${driverId}')">
          ${driver.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
        </button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);text-align:center;">
          Drivers sign in with their registered phone number and an SMS code.
        </div>
      </div>
    </div>
  `;
  document.getElementById('page-container').innerHTML = html;
  scrollToTop();
}

async function inviteDriverLogin(driverId) {
  if (!isFleetAdmin()) return;
  const driver = getDriverById(driverId);
  const car = driver ? getCarForDriver(driverId) : null;
  if (!driver || driver.status !== 'active' || !car || car.status !== 'active') {
    showToast('Assign this active Driver to an active car before inviting.', 'error');
    return;
  }
  if (!fleetSupabase || !fleetUser) {
    showToast('Sign in to the connected Admin account before inviting Drivers.', 'error');
    return;
  }

  const button = document.querySelector(`#driver-detail-page button[onclick="inviteDriverLogin('${driverId}')"]`);
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending login code…';
  }
  try {
    const { data, error } = await fleetSupabase.functions.invoke('invite-driver', {
      body: { driverId },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'The Driver invitation was not completed.');
    showToast(data.message, data.otpSent ? 'success' : 'error');
  } catch (error) {
    showToast(`Could not invite Driver: ${error.message}`, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '📩 Invite / Send Login Code';
    }
  }
}

function switchDriverTab(tab) {
  const tabs = document.querySelectorAll('#driver-detail-tabs .tab-btn');
  tabs.forEach((t, i) => t.classList.toggle('active', ['trips','expenses'][i] === tab));
  ['trips','expenses'].forEach(t => {
    const el = document.getElementById(`driver-tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
  });
}

function toggleDriverStatus(driverId) {
  const driver = getDriverById(driverId);
  driver.status = driver.status === 'active' ? 'inactive' : 'active';
  if (driver.status === 'inactive' && driver.carId) {
    const car = getCarById(driver.carId);
    if (car) car.driverId = null;
    driver.carId = null;
  }
  showToast(`Driver ${driver.status === 'active' ? 'activated' : 'deactivated'}.`, driver.status === 'active' ? 'success' : '');
  showDriverDetail(driverId);
}

function showAddDriverModal() {
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Add New Driver</h2>
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="new-drv-name" placeholder="Driver name" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone Number *</label>
        <input class="form-input" id="new-drv-phone" type="tel" placeholder="10-digit phone number" />
      </div>
      <div class="form-group">
        <label class="form-label" for="new-drv-aadhaar">Aadhaar Number</label>
        <input class="form-input" id="new-drv-aadhaar" type="text" inputmode="numeric" autocomplete="off" maxlength="12" pattern="[0-9]{12}" placeholder="12-digit Aadhaar number" />
      </div>
      <div class="form-group">
        <label class="form-label" for="new-drv-license">License No</label>
        <input class="form-input" id="new-drv-license" placeholder="Driver license number" />
      </div>
      <div class="form-group">
        <label class="form-label">Upload License Photo</label>
        <div class="upload-area" onclick="document.getElementById('drv-license-input').click()">
          <div class="upload-icon">📋</div>
          <div class="upload-text">Tap to <strong>upload license photo</strong> (image, max 5MB)</div>
          <input type="file" id="drv-license-input" accept="image/*" style="display:none" />
        </div>
        <div id="drv-license-preview"></div>
      </div>
      <div class="form-group">
        <label class="form-label">License Expiry</label>
        <input class="form-input" id="new-drv-lic-exp" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label" for="new-drv-address">Present Address</label>
        <input class="form-input" id="new-drv-address" placeholder="City, Area" />
      </div>
      <div class="form-group">
        <label class="form-label">Upload Aadhaar Card</label>
        <div class="upload-area" onclick="document.getElementById('drv-aadhaar-input').click()">
          <div class="upload-icon">🪪</div>
          <div class="upload-text">Tap to <strong>upload Aadhaar card</strong> (image or PDF, max 5MB)</div>
          <input type="file" id="drv-aadhaar-input" accept="image/*,application/pdf" style="display:none" />
        </div>
        <div id="drv-aadhaar-preview"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Base Salary (₹/mo)</label>
          <input class="form-input" id="new-drv-salary" type="number" placeholder="15000" />
        </div>
        <div class="form-group">
          <label class="form-label">Commission %</label>
          <input class="form-input" id="new-drv-comm" type="number" placeholder="10" min="0" max="100" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Upload Driver Photo</label>
        <div class="upload-area" onclick="document.getElementById('drv-photo-input').click()">
          <div class="upload-icon">📷</div>
          <div class="upload-text">Tap to <strong>upload photo</strong></div>
          <input type="file" id="drv-photo-input" accept="image/*" style="display:none" />
        </div>
        <div id="drv-photo-preview"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="addNewDriver()">Add Driver</button>
      </div>
    </div>
  `);

  window._drvPhotoB64 = null;
  window._drvLicensePhotoB64 = null;
  window._drvAadhaarCardB64 = null;

  // Handle photo upload preview
  const inp = document.getElementById('drv-photo-input');
  if (inp) {
    handleImageUpload(inp, (b64) => {
      window._drvPhotoB64 = b64;
      document.getElementById('drv-photo-preview').innerHTML = `
        <img src="${b64}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;margin-top:8px;border:2px solid var(--accent-blue);" />
      `;
    });
  }

  const licenseInput = document.getElementById('drv-license-input');
  if (licenseInput) {
    handleImageUpload(licenseInput, (b64) => {
      window._drvLicensePhotoB64 = b64;
      const preview = document.getElementById('drv-license-preview');
      if (preview) {
        preview.innerHTML = `
          <img src="${b64}" alt="Driving license photo preview" style="width:100%;border-radius:10px;margin-top:8px;max-height:180px;object-fit:contain;" />
        `;
      }
    });
  }

  const aadhaarInput = document.getElementById('drv-aadhaar-input');
  if (aadhaarInput) handleAadhaarCardUpload(aadhaarInput);
}

function showDriverLicensePhoto(driverId) {
  const driver = getDriverById(driverId);
  if (driver && driver.licensePhoto) viewImage(driver.licensePhoto, 'Driving License');
}

function handleAadhaarCardUpload(inputEl) {
  inputEl.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      window._drvAadhaarCardB64 = null;
      document.getElementById('drv-aadhaar-preview').innerHTML = '';
      showToast('Aadhaar card file too large (max 5MB)', 'error');
      inputEl.value = '';
      return;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      window._drvAadhaarCardB64 = null;
      document.getElementById('drv-aadhaar-preview').innerHTML = '';
      showToast('Please upload an image or PDF of the Aadhaar card', 'error');
      inputEl.value = '';
      return;
    }

    try {
      const b64 = await fileToBase64(file);
      window._drvAadhaarCardB64 = b64;
      const preview = document.getElementById('drv-aadhaar-preview');
      if (!preview) return;
      if (file.type === 'application/pdf') {
        preview.innerHTML = `
          <a href="${b64}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="margin-top:8px;">View uploaded Aadhaar PDF</a>
        `;
      } else {
        preview.innerHTML = `
          <img src="${b64}" alt="Aadhaar card preview" style="width:100%;border-radius:10px;margin-top:8px;max-height:180px;object-fit:contain;" />
        `;
      }
    } catch (error) {
      console.error('Failed to read Aadhaar card file.', error);
      window._drvAadhaarCardB64 = null;
      const preview = document.getElementById('drv-aadhaar-preview');
      if (preview) preview.innerHTML = '';
      showToast('Could not read Aadhaar card file. Please try again.', 'error');
    }
  });
}

function showDriverAadhaarCard(driverId) {
  const driver = getDriverById(driverId);
  if (!driver || !driver.aadhaarCard) return;

  if (driver.aadhaarCard.startsWith('data:application/pdf')) {
    openModal(`
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="modal-title">Aadhaar Card</h2>
        <iframe src="${driver.aadhaarCard}" title="Aadhaar card PDF" style="width:100%;height:65vh;border:0;border-radius:10px;"></iframe>
        <button class="btn btn-ghost btn-full" onclick="closeModal()" style="margin-top:12px;">Close</button>
      </div>
    `);
    return;
  }

  viewImage(driver.aadhaarCard, 'Aadhaar Card');
}

function normalizeDriverPhone(value) {
  let normalized = value.replace(/\D/g, '');
  if (normalized.length === 12 && normalized.startsWith('91')) normalized = normalized.slice(2);
  if (normalized.length === 11 && normalized.startsWith('0')) normalized = normalized.slice(1);
  return normalized || value.trim().toLowerCase();
}

function findDuplicateDriverIdentity({ phone, aadhaarNo, license }, excludeDriverId = '') {
  const identities = [
    { field: 'phone', label: 'Phone number', value: normalizeDriverPhone(phone), normalize: normalizeDriverPhone },
    { field: 'aadhaarNo', label: 'Aadhaar number', value: aadhaarNo.replace(/\D/g, ''), normalize: value => value.replace(/\D/g, '') },
    { field: 'license', label: 'License number', value: license.replace(/[^a-z0-9]/gi, '').toUpperCase(), normalize: value => value.replace(/[^a-z0-9]/gi, '').toUpperCase() },
  ].filter(identity => identity.value);

  for (const identity of identities) {
    const duplicate = DB.drivers.find(driver =>
      driver.id !== excludeDriverId &&
      identity.normalize(driver[identity.field] || '') === identity.value
    );
    if (duplicate) return identity.label;
  }
  return '';
}

function addNewDriver() {
  const name = document.getElementById('new-drv-name').value.trim();
  const phone = document.getElementById('new-drv-phone').value.trim();
  if (!name || !phone) { showToast('Name and phone are required', 'error'); return; }
  const aadhaarNo = document.getElementById('new-drv-aadhaar').value.trim();
  if (aadhaarNo && !/^\d{12}$/.test(aadhaarNo)) {
    showToast('Aadhaar number must be exactly 12 digits', 'error');
    return;
  }
  const license = document.getElementById('new-drv-license').value.trim();
  const duplicateField = findDuplicateDriverIdentity({ phone, aadhaarNo, license });
  if (duplicateField) {
    showToast(`${duplicateField} is already registered to another driver.`, 'error');
    return;
  }
  const driver = {
    id: generateId('d'),
    name,
    phone,
    aadhaarNo,
    aadhaarCard: window._drvAadhaarCardB64 || null,
    license,
    licensePhoto: window._drvLicensePhotoB64 || null,
    licenseExpiry: document.getElementById('new-drv-lic-exp').value || '2030-01-01',
    address: document.getElementById('new-drv-address').value.trim(),
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active',
    carId: null,
    salary: parseInt(document.getElementById('new-drv-salary').value) || 15000,
    commissionPct: parseInt(document.getElementById('new-drv-comm').value) || 10,
    advance: 0,
    initials: getInitials(name),
    rating: 5.0,
    totalTrips: 0,
    totalEarned: 0,
    photo: window._drvPhotoB64 || null,
  };
  DB.drivers.push(driver);
  window._drvPhotoB64 = null;
  window._drvLicensePhotoB64 = null;
  window._drvAadhaarCardB64 = null;
  closeModal();
  showToast(`${name} added as driver! 👨‍✈️`, 'success');
  renderDrivers();
}

function showEditDriverModal(driverId) {
  const d = getDriverById(driverId);
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Edit Driver</h2>
      <div class="form-group">
        <label class="form-label">Base Salary (₹/mo)</label>
        <input class="form-input" id="edit-drv-salary" type="number" value="${d.salary}" />
      </div>
      <div class="form-group">
        <label class="form-label">Commission %</label>
        <input class="form-input" id="edit-drv-comm" type="number" value="${d.commissionPct}" />
      </div>
      <div class="form-group">
        <label class="form-label">Advance Given (₹)</label>
        <input class="form-input" id="edit-drv-advance" type="number" value="${d.advance}" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="edit-drv-phone" value="${d.phone}" />
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="saveDriverEdit('${driverId}')">Save</button>
      </div>
    </div>
  `);
}

function saveDriverEdit(driverId) {
  const d = getDriverById(driverId);
  const phone = document.getElementById('edit-drv-phone').value.trim() || d.phone;
  if (phone !== d.phone) {
    const duplicateField = findDuplicateDriverIdentity({
      phone,
      aadhaarNo: '',
      license: '',
    }, driverId);
    if (duplicateField) {
      showToast(`${duplicateField} is already registered to another driver.`, 'error');
      return;
    }
  }
  d.salary = parseInt(document.getElementById('edit-drv-salary').value) || d.salary;
  d.commissionPct = parseInt(document.getElementById('edit-drv-comm').value) || d.commissionPct;
  d.advance = parseInt(document.getElementById('edit-drv-advance').value) || 0;
  d.phone = phone;
  closeModal();
  showToast('Driver updated!', 'success');
  showDriverDetail(driverId);
}
