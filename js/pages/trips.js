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
      ${(t.startKm !== undefined && t.startKm !== null) || (t.endKm !== undefined && t.endKm !== null) ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">🛣️</div>
          <div class="doc-info">
            <div class="doc-name">Odometer Readings</div>
            <div class="doc-exp">Start: ${t.startKm ?? '–'} km${t.endKm !== undefined && t.endKm !== null ? ` • End: ${t.endKm} km` : ''}</div>
          </div>
        </div>
      ` : ''}
      ${t.status === 'current' ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">📍</div>
          <div class="doc-info">
            <div class="doc-name">Current Trip</div>
            <div class="doc-exp">In progress • Live GPS location is not available</div>
          </div>
        </div>
      ` : ''}
      ${(t.startOdometerPhoto || t.endOdometerPhoto) ? `
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          ${t.startOdometerPhoto ? `<button class="btn btn-outline btn-full" onclick="showTripOdometerPhoto('${t.id}', 'start')">View Start Odometer</button>` : ''}
          ${t.endOdometerPhoto ? `<button class="btn btn-outline btn-full" onclick="showTripOdometerPhoto('${t.id}', 'end')">View End Odometer</button>` : ''}
        </div>
      ` : ''}
      ${driver ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">👨‍✈️</div>
          <div class="doc-info">
            <div class="doc-name">Driver</div>
            <div class="doc-exp">${driver.name} • ${driver.phone}</div>
          </div>
          <a class="btn btn-sm btn-outline" href="tel:${driver.phone.replace(/[^\d+]/g, '')}">Call</a>
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
      ${t.customerName || t.customerPhone || t.customerAadhaarNo ? `
        <div class="doc-card" style="margin-bottom:10px;">
          <div class="doc-icon">👤</div>
          <div class="doc-info">
            <div class="doc-name">Customer</div>
            <div class="doc-exp">${escapeHtml(t.customerName || 'Name not provided')}${t.customerPhone ? ` • ${escapeHtml(t.customerPhone)}` : ''}${t.customerAadhaarNo ? ` • Aadhaar: ${escapeHtml(t.customerAadhaarNo)}` : ''}</div>
          </div>
        </div>
      ` : ''}
      ${t.customerAadhaarPath ? `
        <button class="btn btn-outline btn-full" onclick="viewTripCustomerAadhaar('${t.id}')" style="margin-top:10px;">View customer Aadhaar attachment</button>
      ` : ''}
      ${t.status === 'current' ? `
        <button class="btn btn-success btn-full" onclick="completeCurrentTrip('${t.id}')" style="margin-top:16px;">Complete Trip</button>
      ` : ''}
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
        <button class="btn btn-danger btn-full" onclick="deleteTripConfirm('${t.id}')">🗑️ Delete</button>
      </div>
    </div>
  `);
}

function completeCurrentTrip(tripId) {
  const trip = DB.trips.find(item => item.id === tripId);
  if (!trip || trip.status !== 'current') return;

  trip.status = 'completed';
  closeModal();
  showToast('Trip marked as completed.', 'success');
  if (document.getElementById('dashboard-page')) renderDashboard();
  else renderTrips();
}

function showTripOdometerPhoto(tripId, readingType) {
  const trip = DB.trips.find(item => item.id === tripId);
  const photo = readingType === 'start' ? trip?.startOdometerPhoto : trip?.endOdometerPhoto;
  if (photo) viewImage(photo, `${readingType === 'start' ? 'Start' : 'End'} Odometer`);
}

async function viewTripCustomerAadhaar(tripId) {
  const trip = DB.trips.find(item => item.id === tripId);
  if (!trip?.customerAadhaarPath || !fleetSupabase) return;

  let signedUrl;
  try {
    const { data, error } = await fleetSupabase.storage
      .from('trip-customer-aadhaar')
      .createSignedUrl(trip.customerAadhaarPath, 60);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('No secure document link was returned.');
    signedUrl = data.signedUrl;
  } catch (error) {
    showToast(`Could not open Aadhaar attachment: ${error.message}`, 'error');
    return;
  }

  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Customer Aadhaar attachment</h2>
      ${trip.customerAadhaarPath.endsWith('.pdf')
        ? `<iframe src="${escapeHtml(signedUrl)}" title="Customer Aadhaar document" style="width:100%;height:65vh;border:0;border-radius:10px;"></iframe>`
        : `<img src="${escapeHtml(signedUrl)}" alt="Customer Aadhaar document" style="width:100%;max-height:65vh;object-fit:contain;border-radius:10px;" />`}
      <button class="btn btn-ghost btn-full" onclick="closeModal()" style="margin-top:12px;">Close</button>
    </div>
  `);
}

function deleteTripConfirm(tripId) {
  confirmAction('Delete this trip record?', () => deleteTrip(tripId));
}

async function deleteTrip(tripId) {
  const index = DB.trips.findIndex(trip => trip.id === tripId);
  if (index < 0) return;
  const trip = DB.trips[index];

  if (trip.customerAadhaarPath && fleetSupabase) {
    try {
      const { error } = await fleetSupabase.storage
        .from('trip-customer-aadhaar')
        .remove([trip.customerAadhaarPath]);
      if (error) throw error;
    } catch (error) {
      showToast(`Could not delete the Aadhaar attachment: ${error.message}`, 'error');
      return;
    }
  }

  DB.trips.splice(index, 1);
  showToast('Trip deleted.', 'error');
  closeModal();
  renderTrips();
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
          <label class="form-label">Start KM *</label>
          <input class="form-input" id="new-trip-start-km" type="number" placeholder="54320" min="0" step="any" required />
        </div>
        <div class="form-group">
          <label class="form-label">End KM (optional)</label>
          <input class="form-input" id="new-trip-end-km" type="number" placeholder="54424" min="0" step="any" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Odometer (optional)</label>
          <div class="upload-area" onclick="document.getElementById('new-trip-start-odo-photo').click()">
            <div class="upload-icon">📷</div>
            <div class="upload-text">Tap to <strong>upload start odometer</strong> photo (max 5MB)</div>
            <input type="file" id="new-trip-start-odo-photo" accept="image/*" style="display:none" />
          </div>
          <div id="new-trip-start-odo-preview"></div>
        </div>
        <div class="form-group">
          <label class="form-label">End Odometer (optional)</label>
          <div class="upload-area" onclick="document.getElementById('new-trip-end-odo-photo').click()">
            <div class="upload-icon">📷</div>
            <div class="upload-text">Tap to <strong>upload end odometer</strong> photo (max 5MB)</div>
            <input type="file" id="new-trip-end-odo-photo" accept="image/*" style="display:none" />
          </div>
          <div id="new-trip-end-odo-preview"></div>
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
        <select class="form-select" id="new-trip-car" onchange="syncTripDriverToCar()">
          ${DB.cars.map(c => `<option value="${c.id}">${c.plate} – ${c.make} ${c.model}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Driver *</label>
        <select class="form-select" id="new-trip-driver" onchange="syncTripCarToDriver()">
          <option value="">– Select Driver –</option>
          ${DB.drivers.filter(d => d.status==='active').map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="new-trip-customer-name">Customer Name (optional)</label>
          <input class="form-input" id="new-trip-customer-name" placeholder="Customer name" autocomplete="name" />
        </div>
        <div class="form-group">
          <label class="form-label" for="new-trip-customer-phone">Customer Phone No (optional)</label>
          <input class="form-input" id="new-trip-customer-phone" type="tel" inputmode="tel" placeholder="Customer phone number" autocomplete="tel" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="new-trip-customer-aadhaar">Customer Aadhaar No (optional)</label>
          <input class="form-input" id="new-trip-customer-aadhaar" type="text" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="12-digit Aadhaar number" />
        </div>
        <div class="form-group">
          <label class="form-label" for="new-trip-customer-aadhaar-file">Aadhaar image or PDF (optional)</label>
          <input class="form-input" id="new-trip-customer-aadhaar-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onchange="updateTripAadhaarFileName()" />
          <div id="new-trip-customer-aadhaar-file-name" style="font-size:12px;color:var(--text-muted);margin-top:6px;">Private upload, max 5 MB</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin:-8px 0 16px;">Trip details are prepared as WhatsApp drafts for the assigned driver and, if a phone is provided, the customer. Aadhaar details are stored privately and are never included in WhatsApp messages.</div>
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

  syncTripDriverToCar();
  window._newTripOdometerPhotos = { start: null, end: null };
  ['start', 'end'].forEach(readingType => {
    const input = document.getElementById(`new-trip-${readingType}-odo-photo`);
    if (!input) return;
    handleImageUpload(input, (b64) => {
      window._newTripOdometerPhotos[readingType] = b64;
      const preview = document.getElementById(`new-trip-${readingType}-odo-preview`);
      if (preview) {
        preview.innerHTML = `
          <img src="${b64}" alt="${readingType} odometer preview" style="width:100%;border-radius:10px;margin-top:8px;max-height:140px;object-fit:contain;" />
        `;
      }
    });
  });
}

function syncTripDriverToCar() {
  const carSelect = document.getElementById('new-trip-car');
  const driverSelect = document.getElementById('new-trip-driver');
  if (!carSelect || !driverSelect) return;

  const assignedDriverId = getCarById(carSelect.value)?.driverId || '';
  driverSelect.value = [...driverSelect.options].some(option => option.value === assignedDriverId)
    ? assignedDriverId
    : '';
}

function syncTripCarToDriver() {
  const carSelect = document.getElementById('new-trip-car');
  const driverSelect = document.getElementById('new-trip-driver');
  if (!carSelect || !driverSelect) return;

  const assignedCarId = getCarForDriver(driverSelect.value)?.id || '';
  carSelect.value = [...carSelect.options].some(option => option.value === assignedCarId)
    ? assignedCarId
    : '';
}

function updateTripAadhaarFileName() {
  const file = document.getElementById('new-trip-customer-aadhaar-file').files[0];
  document.getElementById('new-trip-customer-aadhaar-file-name').textContent =
    file ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : 'Private upload, max 5 MB';
}

async function addNewTrip() {
  const from = document.getElementById('new-trip-from').value.trim();
  const to = document.getElementById('new-trip-to').value.trim();
  const dist = parseInt(document.getElementById('new-trip-dist').value);
  const fare = parseInt(document.getElementById('new-trip-fare').value);
  const startKmValue = document.getElementById('new-trip-start-km').value;
  const endKmValue = document.getElementById('new-trip-end-km').value;
  const startKm = startKmValue === '' ? NaN : Number(startKmValue);
  const endKm = endKmValue === '' ? null : Number(endKmValue);
  const carId = document.getElementById('new-trip-car').value;
  const driverId = document.getElementById('new-trip-driver').value;
  const customerName = document.getElementById('new-trip-customer-name').value.trim();
  const customerPhone = document.getElementById('new-trip-customer-phone').value.trim();
  const rawCustomerAadhaarNo = document.getElementById('new-trip-customer-aadhaar').value.trim();
  const customerAadhaarNo = rawCustomerAadhaarNo.replace(/[\s-]/g, '');
  const customerAadhaarFile = document.getElementById('new-trip-customer-aadhaar-file').files[0];
  const driver = getDriverById(driverId);
  const car = getCarById(carId);
  if (!from || !to || !Number.isFinite(dist) || dist <= 0 || !Number.isFinite(fare) || fare <= 0 || !carId || !driverId || !Number.isFinite(startKm) || startKm < 0) {
    showToast('Please fill all required fields, including a valid Start KM', 'error');
    return;
  }
  if (endKm !== null && (!Number.isFinite(endKm) || endKm < startKm)) {
    showToast('End KM must be greater than or equal to Start KM', 'error');
    return;
  }
  if (customerAadhaarNo && !/^\d{12}$/.test(customerAadhaarNo)) {
    showToast('Enter a valid 12-digit Aadhaar number', 'error');
    return;
  }
  if (customerAadhaarFile) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(customerAadhaarFile.type)) {
      showToast('Aadhaar upload must be a JPEG, PNG, WebP image, or PDF', 'error');
      return;
    }
    if (customerAadhaarFile.size > 5 * 1024 * 1024) {
      showToast('Aadhaar upload must be 5 MB or smaller', 'error');
      return;
    }
    if (!fleetSupabase || !fleetUser) {
      showToast('Sign in to your private account before uploading Aadhaar documents', 'error');
      return;
    }
  }

  const driverWhatsAppPhone = getWhatsAppPhoneNumber(driver.phone);
  if (!driverWhatsAppPhone) {
    showToast('The selected driver needs a valid phone number for WhatsApp', 'error');
    return;
  }
  const customerWhatsAppPhone = customerPhone ? getWhatsAppPhoneNumber(customerPhone) : null;
  if (customerPhone && !customerWhatsAppPhone) {
    showToast('Enter a valid customer phone number with country code', 'error');
    return;
  }

  const date = document.getElementById('new-trip-date').value;
  const time = document.getElementById('new-trip-time').value;
  const carDescription = car ? `${car.make} ${car.model} (${car.plate})` : 'Not specified';
  const driverMessage = [
    'New trip assigned.',
    customerName ? `Customer: ${customerName}` : '',
    customerPhone ? `Customer phone: ${customerPhone}` : '',
    `Route: ${from} to ${to}`,
    `Date and time: ${formatDate(date)} at ${time}`,
    `Distance: ${dist} km`,
    `Fare: ${formatCurrency(fare)}`,
  ].filter(Boolean).join('\n');
  const customerMessage = [
    'Your trip has been booked.',
    customerName ? `Customer: ${customerName}` : '',
    `Route: ${from} to ${to}`,
    `Date and time: ${formatDate(date)} at ${time}`,
    `Car: ${carDescription}`,
    `Driver: ${driver.name}`,
    `Driver phone: ${driver.phone}`,
  ].filter(Boolean).join('\n');

  const trip = {
    id: generateId('t'),
    carId, driverId,
    from, to,
    distance: dist,
    fare,
    customerName,
    customerPhone,
    customerAadhaarNo,
    startKm,
    endKm,
    startOdometerPhoto: window._newTripOdometerPhotos.start,
    endOdometerPhoto: window._newTripOdometerPhotos.end,
    date,
    time,
    status: 'current',
    notes: document.getElementById('new-trip-notes').value.trim(),
  };

  const submitButton = document.querySelector('#modal-container .btn-primary');
  submitButton.disabled = true;
  submitButton.textContent = customerAadhaarFile ? 'Uploading securely…' : 'Logging trip…';
  let driverChat = null;
  let customerChat = null;

  if (customerAadhaarFile) {
    driverChat = window.open('about:blank', '_blank');
    if (customerWhatsAppPhone) customerChat = window.open('about:blank', '_blank');
  }

  if (customerAadhaarFile) {
    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    }[customerAadhaarFile.type];
    trip.customerAadhaarPath = `${fleetUser.id}/trips/${trip.id}/customer-aadhaar.${extension}`;
    try {
      const { error } = await fleetSupabase.storage
        .from('trip-customer-aadhaar')
        .upload(trip.customerAadhaarPath, customerAadhaarFile, {
          contentType: customerAadhaarFile.type,
          upsert: false,
        });
      if (error) throw error;
    } catch (error) {
      driverChat?.close();
      customerChat?.close();
      submitButton.disabled = false;
      submitButton.textContent = 'Log Trip';
      showToast(`Could not upload Aadhaar securely: ${error.message}`, 'error');
      return;
    }
  }

  DB.trips.unshift(trip);

  // Update car earnings
  if (car) car.totalEarnings += fare;

  const driverWhatsAppOpened = customerAadhaarFile
    ? openWhatsAppDraft(driverWhatsAppPhone, driverMessage, driverChat)
    : openWhatsAppDraft(driverWhatsAppPhone, driverMessage);
  const customerWhatsAppOpened = customerWhatsAppPhone
    ? openWhatsAppDraft(customerWhatsAppPhone, customerMessage, customerChat)
    : true;

  window._newTripOdometerPhotos = { start: null, end: null };
  closeModal();
  showToast(
    driverWhatsAppOpened && customerWhatsAppOpened
      ? 'Trip logged. WhatsApp drafts opened; tap Send in each chat.'
      : 'Trip logged, but a WhatsApp draft was blocked. Allow pop-ups and try again.',
    driverWhatsAppOpened && customerWhatsAppOpened ? 'success' : 'error'
  );
  renderTrips();
}

function getWhatsAppPhoneNumber(phone) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function openWhatsAppDraft(phone, message, chat = null) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const target = chat || window.open(url, '_blank');
  if (!target) return false;
  try {
    target.location = url;
    target.opener = null;
    return true;
  } catch {
    return false;
  }
}
