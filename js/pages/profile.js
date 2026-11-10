// =============================================
// FleetPro – Profile Page
// =============================================

function renderProfile() {
  const o = DB.owner;
  const totalCars = DB.cars.length;
  const totalDrivers = DB.drivers.length;
  const totalTrips = DB.trips.length;
  const netProfit = netProfitAll();

  const html = `
    <div class="page" id="profile-page">
      <div class="profile-hero">
        <div class="profile-avatar-lg">${o.initials}</div>
        <div class="profile-name">${o.name}</div>
        <div class="profile-business">🏢 ${o.business}</div>
        <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;">
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${totalCars}</div>
            <div style="font-size:11px;color:var(--text-secondary);">Cars</div>
          </div>
          <div style="width:1px;background:var(--border-color);"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:800;color:var(--text-primary);">${totalDrivers}</div>
            <div style="font-size:11px;color:var(--text-secondary);">Drivers</div>
          </div>
          <div style="width:1px;background:var(--border-color);"></div>
          <div style="text-align:center;">
            <div style="font-size:20px;font-weight:800;color:var(--accent-green);">${formatCurrency(netProfit)}</div>
            <div style="font-size:11px;color:var(--text-secondary);">Net Profit</div>
          </div>
        </div>
      </div>

      <!-- Contact Info -->
      <div style="padding:0 20px;margin-bottom:24px;">
        <div class="section-title" style="margin-bottom:12px;">Business Info</div>
        <div class="card" style="padding:0;">
          <div class="menu-item" style="padding:14px 20px;">
            <div class="menu-icon" style="background:rgba(59,130,246,0.1);">📞</div>
            <div class="menu-text">
              <div class="menu-title">${o.phone}</div>
              <div class="menu-sub">Phone Number</div>
            </div>
          </div>
          <div class="menu-item" style="padding:14px 20px;">
            <div class="menu-icon" style="background:rgba(16,185,129,0.1);">📧</div>
            <div class="menu-text">
              <div class="menu-title">${o.email}</div>
              <div class="menu-sub">Email Address</div>
            </div>
          </div>
          <div class="menu-item" style="padding:14px 20px;border-bottom:none;">
            <div class="menu-icon" style="background:rgba(245,158,11,0.1);">📍</div>
            <div class="menu-text">
              <div class="menu-title">${o.city}</div>
              <div class="menu-sub">Location</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="profile-menu">
        <div class="section-title" style="margin-bottom:12px;">Quick Links</div>
        <div class="menu-item" onclick="showPage('fleet')">
          <div class="menu-icon" style="background:rgba(59,130,246,0.1);">🚗</div>
          <div class="menu-text">
            <div class="menu-title">Manage Fleet</div>
            <div class="menu-sub">${totalCars} cars registered</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" onclick="showPage('drivers')">
          <div class="menu-icon" style="background:rgba(139,92,246,0.1);">👨‍✈️</div>
          <div class="menu-text">
            <div class="menu-title">Manage Drivers</div>
            <div class="menu-sub">${totalDrivers} drivers registered</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" onclick="showPage('expenses')">
          <div class="menu-icon" style="background:rgba(245,158,11,0.1);">💸</div>
          <div class="menu-text">
            <div class="menu-title">Expenses & Approvals</div>
            <div class="menu-sub">${getPendingExpenses().length} pending approval</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" onclick="showPage('documents')">
          <div class="menu-icon" style="background:rgba(16,185,129,0.1);">📋</div>
          <div class="menu-text">
            <div class="menu-title">Documents & Renewals</div>
            <div class="menu-sub">Track permits, insurance & licenses</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" onclick="showPage('reports')">
          <div class="menu-icon" style="background:rgba(6,182,212,0.1);">📊</div>
          <div class="menu-text">
            <div class="menu-title">Analytics & Reports</div>
            <div class="menu-sub">P&L, earnings, driver performance</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" onclick="showEditProfileModal()">
          <div class="menu-icon" style="background:rgba(239,68,68,0.1);">⚙️</div>
          <div class="menu-text">
            <div class="menu-title">Edit Profile</div>
            <div class="menu-sub">Update business details</div>
          </div>
          <div class="menu-arrow">›</div>
        </div>
      </div>

      <!-- App Info -->
      <div style="text-align:center;padding:30px 20px 20px;">
        <div style="font-size:32px;margin-bottom:8px;">🚗</div>
        <div style="font-family:var(--font-heading);font-size:22px;font-weight:800;background:linear-gradient(135deg,#fff,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">FleetPro</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">v1.0.0 • Car Business Manager</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Member since ${o.memberSince}</div>
        ${fleetSupabase ? '<button class="btn btn-outline" style="margin-top:16px;" onclick="signOutFleet()">Sign out</button>' : ''}
      </div>
    </div>
  `;
  document.getElementById('page-container').innerHTML = html;
}

function showEditProfileModal() {
  const o = DB.owner;
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Edit Profile</h2>
      <div class="form-group">
        <label class="form-label">Owner Name</label>
        <input class="form-input" id="edit-owner-name" value="${o.name}" />
      </div>
      <div class="form-group">
        <label class="form-label">Business Name</label>
        <input class="form-input" id="edit-owner-biz" value="${o.business}" />
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="edit-owner-phone" value="${o.phone}" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" id="edit-owner-email" value="${o.email}" />
      </div>
      <div class="form-group">
        <label class="form-label">City</label>
        <input class="form-input" id="edit-owner-city" value="${o.city}" />
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="saveProfile()">Save</button>
      </div>
    </div>
  `);
}

function saveProfile() {
  DB.owner.name = document.getElementById('edit-owner-name').value.trim() || DB.owner.name;
  DB.owner.business = document.getElementById('edit-owner-biz').value.trim() || DB.owner.business;
  DB.owner.phone = document.getElementById('edit-owner-phone').value.trim() || DB.owner.phone;
  DB.owner.email = document.getElementById('edit-owner-email').value.trim() || DB.owner.email;
  DB.owner.city = document.getElementById('edit-owner-city').value.trim() || DB.owner.city;
  DB.owner.initials = getInitials(DB.owner.name);
  document.getElementById('owner-initials').textContent = DB.owner.initials;
  closeModal();
  showToast('Profile updated! ✓', 'success');
  renderProfile();
}
