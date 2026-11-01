// =============================================
// FleetPro – Expenses Page (with Approval Flow)
// =============================================

function renderExpenses() {
  const tab = window.expenseTab || 'pending';
  let expenses = DB.expenses;
  if (tab !== 'all') expenses = expenses.filter(e => e.status === tab);

  const pending = DB.expenses.filter(e => e.status === 'pending');
  const totalAmount = DB.expenses.reduce((s, e) => s + e.amount, 0);

  const html = `
    <div class="page" id="expenses-page">
      <!-- Summary -->
      <div style="display:flex;gap:10px;padding:0 20px 16px;overflow-x:auto;scrollbar-width:none;">
        <div style="flex-shrink:0;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:12px 16px;min-width:110px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Pending</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-orange);">${pending.length}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px 16px;min-width:130px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Spent</div>
          <div style="font-size:18px;font-weight:800;color:var(--accent-red);">${formatCurrency(totalAmount)}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px 16px;min-width:110px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Approved</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-green);">${DB.expenses.filter(e=>e.status==='approved').length}</div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div style="padding:0 20px;margin-bottom:16px;">
        <div class="section-title" style="margin-bottom:12px;">By Category</div>
        ${renderExpenseCategories()}
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn ${tab==='pending'?'active':''}" onclick="window.expenseTab='pending';renderExpenses()">Pending (${pending.length})</button>
        <button class="tab-btn ${tab==='approved'?'active':''}" onclick="window.expenseTab='approved';renderExpenses()">Approved</button>
        <button class="tab-btn ${tab==='rejected'?'active':''}" onclick="window.expenseTab='rejected';renderExpenses()">Rejected</button>
        <button class="tab-btn ${tab==='all'?'active':''}" onclick="window.expenseTab='all';renderExpenses()">All</button>
      </div>

      <!-- Expense List -->
      <div style="padding:0 20px;display:flex;flex-direction:column;gap:0;">
        ${expenses.sort((a,b) => new Date(b.date)-new Date(a.date)).map(e => renderExpenseCard(e)).join('')
          || '<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-title">No expenses</div><div class="empty-text">Nothing to show here.</div></div>'}
      </div>
    </div>
    <button class="fab" onclick="showAddExpenseModal()" title="Add Expense">+</button>
  `;
  document.getElementById('page-container').innerHTML = html;
}

function renderExpenseCategories() {
  const cats = ['Fuel', 'Maintenance', 'Insurance', 'Permit', 'Toll', 'Washing', 'Other'];
  const catTotals = cats.map(cat => ({
    cat,
    total: DB.expenses.filter(e => e.category === cat && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0);

  const emojis = { Fuel: '⛽', Maintenance: '🔧', Insurance: '🛡️', Permit: '📄', Toll: '🚦', Washing: '🫧', Other: '📦' };

  return `
    <div class="expense-category-grid">
      ${catTotals.map(c => `
        <button class="expense-cat" onclick="window.expenseTab='all';renderExpenses()">
          <div class="expense-cat-icon">${emojis[c.cat] || '📦'}</div>
          <div class="expense-cat-label">${c.cat}</div>
          <div class="expense-cat-total">${formatCurrency(c.total)}</div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderExpenseCard(e) {
  const car = getCarById(e.carId);
  const driver = getDriverById(e.driverId);
  const emojis = { Fuel: '⛽', Maintenance: '🔧', Insurance: '🛡️', Permit: '📄', Toll: '🚦', Washing: '🫧', Other: '📦' };

  return `
    <div class="approval-card ${e.status}" onclick="showExpenseApproval('${e.id}')">
      <div class="approval-header">
        <div>
          <div class="approval-title">${emojis[e.category] || '💸'} ${e.category} – ${e.description}</div>
          <div class="approval-meta">
            ${car ? car.plate : '–'} • ${driver ? driver.name : 'Owner'} • ${formatDate(e.date)}
          </div>
          <div style="margin-top:6px;">${statusBadge(e.status)}</div>
        </div>
        <div class="approval-amount">${formatCurrency(e.amount)}</div>
      </div>
      ${e.hasImage ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--accent-blue);">📎 Has attachment</div>` : ''}
      ${e.status === 'pending' ? `
        <div class="approval-actions" style="margin-top:10px;" onclick="event.stopPropagation()">
          <button class="btn btn-success btn-sm btn-full" onclick="approveExpense('${e.id}')">✓ Approve</button>
          <button class="btn btn-danger btn-sm btn-full" onclick="rejectExpense('${e.id}')">✗ Reject</button>
        </div>
      ` : ''}
    </div>
  `;
}

function showExpenseApproval(expId) {
  const e = DB.expenses.find(x => x.id === expId);
  if (!e) return;
  const car = getCarById(e.carId);
  const driver = getDriverById(e.driverId);
  const emojis = { Fuel: '⛽', Maintenance: '🔧', Insurance: '🛡️', Permit: '📄', Toll: '🚦', Washing: '🫧', Other: '📦' };

  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">${emojis[e.category] || '💸'} ${e.category} Expense</h2>
      <div style="background:var(--bg-elevated);border-radius:14px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--text-primary);">${e.description}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${formatDate(e.date)}</div>
          </div>
          <div style="font-size:26px;font-weight:900;color:var(--accent-orange);">${formatCurrency(e.amount)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="doc-card" style="padding:10px 12px;">
            <div class="doc-icon">${car ? car.emoji : '🚗'}</div>
            <div class="doc-info">
              <div class="doc-name" style="font-size:12px;">Car</div>
              <div class="doc-exp">${car ? car.plate : '–'}</div>
            </div>
          </div>
          <div class="doc-card" style="padding:10px 12px;">
            <div class="doc-icon">👨‍✈️</div>
            <div class="doc-info">
              <div class="doc-name" style="font-size:12px;">Submitted By</div>
              <div class="doc-exp">${driver ? driver.name : 'Owner'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Section -->
      ${e.hasImage && e.imageUrl ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Attachment / Receipt</div>
          <img src="${e.imageUrl}" class="approval-img" onclick="viewImage('${e.imageUrl}', '${e.category} Receipt')" />
        </div>
      ` : e.hasImage ? `
        <div style="background:rgba(59,130,246,0.08);border:1px dashed rgba(59,130,246,0.3);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
          <div style="font-size:14px;color:var(--text-muted);">📎 Attachment submitted but preview unavailable</div>
        </div>
      ` : ''}

      <!-- Upload Section (for owner to add images) -->
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Add/Replace Image</div>
        <div class="upload-area" onclick="document.getElementById('exp-img-${e.id}').click()">
          <div class="upload-icon">📷</div>
          <div class="upload-text">Tap to <strong>upload receipt/photo</strong></div>
          <input type="file" id="exp-img-${e.id}" accept="image/*" style="display:none" />
        </div>
        <div id="exp-img-preview-${e.id}"></div>
      </div>

      <!-- Status -->
      <div style="margin-bottom:20px;">${statusBadge(e.status)}</div>

      ${e.status === 'pending' ? `
        <div style="display:flex;gap:12px;">
          <button class="btn btn-danger btn-full" onclick="rejectExpense('${e.id}');closeModal()">✗ Reject</button>
          <button class="btn btn-success btn-full" onclick="approveExpense('${e.id}');closeModal()">✓ Approve</button>
        </div>
      ` : `
        <div style="display:flex;gap:12px;">
          <button class="btn btn-ghost btn-full" onclick="closeModal()">Close</button>
          ${e.status === 'approved' ? `<button class="btn btn-danger btn-full" onclick="rejectExpense('${e.id}');closeModal()">Revoke Approval</button>` : `<button class="btn btn-success btn-full" onclick="approveExpense('${e.id}');closeModal()">Re-Approve</button>`}
        </div>
      `}
    </div>
  `);

  // Handle image upload for this expense
  setTimeout(() => {
    const inp = document.getElementById(`exp-img-${e.id}`);
    if (inp) {
      handleImageUpload(inp, (b64) => {
        e.imageUrl = b64;
        e.hasImage = true;
        document.getElementById(`exp-img-preview-${e.id}`).innerHTML = `
          <img src="${b64}" style="width:100%;border-radius:10px;margin-top:8px;max-height:200px;object-fit:cover;" onclick="viewImage('${b64}', '${e.category} Receipt')" />
        `;
        showToast('Image uploaded!', 'success');
      });
    }
  }, 200);
}

function approveExpense(expId) {
  const e = DB.expenses.find(x => x.id === expId);
  if (e) {
    if (e.status !== 'approved') {
      const car = getCarById(e.carId);
      if (car) car.totalExpenses += e.amount;
    }
    e.status = 'approved';
    showToast('Expense approved! ✓', 'success');
    updateNotifBadge();
    // Remove related notification
    const notif = DB.notifications.find(n => n.refId === expId);
    if (notif) notif.read = true;
    renderExpenses();
  }
}

function rejectExpense(expId) {
  const e = DB.expenses.find(x => x.id === expId);
  if (e) {
    if (e.status === 'approved') {
      const car = getCarById(e.carId);
      if (car) car.totalExpenses -= e.amount;
    }
    e.status = 'rejected';
    showToast('Expense rejected.', 'error');
    updateNotifBadge();
    renderExpenses();
  }
}

function showAddExpenseModal() {
  window._newExpImgB64 = null;
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Add Expense</h2>
      <div class="form-group">
        <label class="form-label">Category *</label>
        <select class="form-select" id="new-exp-cat">
          <option>Fuel</option><option>Maintenance</option><option>Insurance</option>
          <option>Permit</option><option>Toll</option><option>Washing</option><option>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-input" id="new-exp-amount" type="number" placeholder="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Description *</label>
        <input class="form-input" id="new-exp-desc" placeholder="Brief description" />
      </div>
      <div class="form-group">
        <label class="form-label">Car *</label>
        <select class="form-select" id="new-exp-car">
          ${DB.cars.map(c => `<option value="${c.id}">${c.plate} – ${c.make} ${c.model}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="new-exp-date" type="date" value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label class="form-label">Upload Receipt / Photo</label>
        <div class="upload-area" onclick="document.getElementById('new-exp-img').click()">
          <div class="upload-icon">📷</div>
          <div class="upload-text">Tap to <strong>upload image</strong> (optional)</div>
          <input type="file" id="new-exp-img" accept="image/*" style="display:none" />
        </div>
        <div id="new-exp-img-preview"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="addNewExpense()">Add Expense</button>
      </div>
    </div>
  `);
  setTimeout(() => {
    const inp = document.getElementById('new-exp-img');
    if (inp) {
      handleImageUpload(inp, (b64) => {
        window._newExpImgB64 = b64;
        document.getElementById('new-exp-img-preview').innerHTML = `
          <img src="${b64}" style="width:100%;border-radius:10px;margin-top:8px;max-height:180px;object-fit:cover;" />
        `;
      });
    }
  }, 200);
}

function addNewExpense() {
  const cat = document.getElementById('new-exp-cat').value;
  const amount = parseFloat(document.getElementById('new-exp-amount').value);
  const desc = document.getElementById('new-exp-desc').value.trim();
  const carId = document.getElementById('new-exp-car').value;
  if (!amount || !desc || !carId) { showToast('Please fill required fields', 'error'); return; }

  const expense = {
    id: generateId('e'),
    carId,
    driverId: null,
    category: cat,
    amount,
    date: document.getElementById('new-exp-date').value,
    description: desc,
    status: 'approved', // Owner-added expenses are auto-approved
    hasImage: !!window._newExpImgB64,
    imageUrl: window._newExpImgB64 || null,
    submittedBy: 'owner',
  };

  DB.expenses.push(expense);
  // Update car expenses
  const car = getCarById(carId);
  if (car) car.totalExpenses += amount;

  window._newExpImgB64 = null;
  closeModal();
  showToast('Expense added! 💸', 'success');
  renderExpenses();
}
