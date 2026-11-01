// =============================================
// FleetPro – Utility Functions
// =============================================

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function daysUntil(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function expiryStatus(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 0) return { cls: 'expired', label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 30) return { cls: 'expiring', label: `Expires in ${days} days` };
  return { cls: 'ok', label: `Valid till ${formatDate(dateStr)}` };
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function statusBadge(status) {
  const map = {
    'active': '<span class="badge badge-active">● Active</span>',
    'inactive': '<span class="badge badge-inactive">● Inactive</span>',
    'maintenance': '<span class="badge badge-pending">🔧 Maintenance</span>',
    'pending': '<span class="badge badge-pending">⏳ Pending</span>',
    'approved': '<span class="badge badge-approved">✓ Approved</span>',
    'rejected': '<span class="badge badge-rejected">✗ Rejected</span>',
    'completed': '<span class="badge badge-approved">✓ Completed</span>',
  };
  return map[status] || `<span class="badge badge-inactive">${status}</span>`;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.className = `toast show ${type}`;
  t.textContent = msg;
  setTimeout(() => { t.className = 'toast hidden'; }, 2800);
}

function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  container.innerHTML = html;
  overlay.classList.remove('hidden');
  container.classList.remove('hidden');
  container.style.animation = 'slideUp 0.3s ease';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-container').classList.add('hidden');
}

function confirmAction(msg, onConfirm) {
  openModal(`
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-title">Confirm Action</h2>
      <p style="color:var(--text-secondary);font-size:15px;margin-bottom:24px;">${msg}</p>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger btn-full" id="confirm-yes-btn">Confirm</button>
      </div>
    </div>
  `);
  document.getElementById('confirm-yes-btn').onclick = () => { closeModal(); onConfirm(); };
}

function viewImage(src, title) {
  const viewer = document.createElement('div');
  viewer.className = 'img-viewer-overlay';
  viewer.innerHTML = `
    <button class="img-viewer-close" onclick="this.parentElement.remove()">✕</button>
    <div style="text-align:center;">
      <img src="${src}" class="img-viewer-img" alt="${title}" />
      <p style="color:var(--text-secondary);margin-top:12px;font-size:14px;">${title}</p>
    </div>
  `;
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.remove(); });
  document.body.appendChild(viewer);
}

// File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

function handleImageUpload(inputEl, callback) {
  inputEl.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', 'error'); return; }
    const b64 = await fileToBase64(file);
    callback(b64);
  });
}

// Update notification badge
function updateNotifBadge() {
  const count = getUnreadCount();
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Set active nav
function setActiveNav(pageId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${pageId}`);
  if (navEl) navEl.classList.add('active');
}

// Page scroll to top
function scrollToTop() {
  const pc = document.getElementById('page-container');
  if (pc) pc.scrollTop = 0;
}
