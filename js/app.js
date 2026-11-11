// =============================================
// FleetPro – Main App Controller
// =============================================

const navStack = [];
let currentPage = 'dashboard';
const THEME_STORAGE_KEY = 'fleetpro-theme';

function setTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.dataset.theme = isLight ? 'light' : 'dark';

  const themeToggle = document.getElementById('theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const nextTheme = isLight ? 'dark' : 'light';
  const label = `Switch to ${nextTheme} mode`;

  if (themeToggle) {
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  }
  if (themeColor) themeColor.content = isLight ? '#f3f6fb' : '#080d1a';

  localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
  window.dispatchEvent(new Event('fleetpro-theme-change'));
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
}

function showPage(pageId) {
  if (isFleetDriver() && !['trips', 'expenses'].includes(pageId)) {
    pageId = 'trips';
  }
  if (currentPage !== pageId) navStack.push(currentPage);
  currentPage = pageId;
  _updateHeader(pageId);
  _updateNavBar(pageId);
  _renderPage(pageId);
  scrollToTop();
}

function _updateHeader(pageId) {
  const detailPages = ['expenses', 'documents', 'profile'];
  const brand = document.getElementById('header-brand');
  const titleEl = document.getElementById('page-title');
  const backBtn = document.getElementById('back-btn');

  const titles = {
    expenses: isFleetDriver() ? '💸 My Expenses' : '💸 Expenses & Approvals',
    documents: '📋 Documents',
    profile: '👤 My Profile',
  };

  if (detailPages.includes(pageId)) {
    brand.style.display = 'none';
    titleEl.style.display = 'block';
    titleEl.textContent = titles[pageId] || '';
    backBtn.style.display = 'flex';
  } else {
    brand.style.display = 'flex';
    titleEl.style.display = 'none';
    backBtn.style.display = 'none';
  }
}

function _updateNavBar(pageId) {
  const navMap = {
    dashboard: 'nav-dashboard',
    fleet: 'nav-fleet',
    drivers: 'nav-drivers',
    trips: 'nav-trips',
    reports: 'nav-reports',
    expenses: 'nav-expenses',
  };
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navId = navMap[pageId];
  if (navId) {
    const el = document.getElementById(navId);
    if (el) el.classList.add('active');
  }
}

function _renderPage(pageId) {
  if (isFleetDriver() && !['trips', 'expenses'].includes(pageId)) {
    pageId = 'trips';
  }
  const renderers = {
    dashboard: renderDashboard,
    fleet: renderFleet,
    drivers: renderDrivers,
    trips: renderTrips,
    reports: renderReports,
    expenses: renderExpenses,
    documents: renderDocuments,
    profile: renderProfile,
  };
  const fn = renderers[pageId];
  if (fn) fn();
}

function updateNavigationForRole() {
  const isDriver = isFleetDriver();
  document.querySelectorAll('.admin-only').forEach(element => {
    element.style.display = isDriver ? 'none' : '';
  });
  const expensesNav = document.getElementById('nav-expenses');
  if (expensesNav) expensesNav.style.display = isDriver ? '' : 'none';
  const driverSignOut = document.getElementById('driver-signout');
  if (driverSignOut) driverSignOut.style.display = isDriver ? '' : 'none';
}

function goBack() {
  if (navStack.length > 0) {
    const previousPage = navStack.pop();
    const prev = isFleetDriver() && !['trips', 'expenses'].includes(previousPage)
      ? 'trips'
      : previousPage;
    currentPage = prev;
    _updateHeader(prev);
    _updateNavBar(prev);
    _renderPage(prev);
    scrollToTop();
  } else {
    showPage('dashboard');
  }
}

// ---- Car Detail Navigation ----
function showCarDetail(carId) {
  if (!isFleetAdmin()) return;
  navStack.push(currentPage);
  currentPage = 'car-detail';
  document.getElementById('header-brand').style.display = 'none';
  document.getElementById('page-title').style.display = 'block';
  document.getElementById('page-title').textContent = '🚗 Car Details';
  document.getElementById('back-btn').style.display = 'flex';
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-fleet');
  if (el) el.classList.add('active');
  _renderCarDetail(carId);
  scrollToTop();
}

function showDriverDetail(driverId) {
  if (!isFleetAdmin()) return;
  navStack.push(currentPage);
  currentPage = 'driver-detail';
  document.getElementById('header-brand').style.display = 'none';
  document.getElementById('page-title').style.display = 'block';
  document.getElementById('page-title').textContent = '👨‍✈️ Driver Profile';
  document.getElementById('back-btn').style.display = 'flex';
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-drivers');
  if (el) el.classList.add('active');
  _renderDriverDetail(driverId);
  scrollToTop();
}

// These are thin wrappers that call the page-specific render functions
// defined in fleet.js and drivers.js
function _renderCarDetail(carId) {
  renderCarDetailContent(carId);
}

function _renderDriverDetail(driverId) {
  renderDriverDetailContent(driverId);
}

// ---- Notifications ----
function showNotifications() {
  if (!isFleetAdmin()) return;
  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 class="modal-title" style="margin:0;">Notifications</h2>
        <button class="btn btn-sm btn-ghost" onclick="markAllRead()">Mark all read</button>
      </div>
      <div>
        ${DB.notifications.length > 0 ? DB.notifications.map(n => `
          <div class="notif-item">
            <div class="notif-dot ${n.read ? 'read' : ''}"></div>
            <div class="notif-content">
              <div class="notif-title">${escapeHtml(n.title)}</div>
              <div class="notif-text">${escapeHtml(n.text)}</div>
              <div class="notif-time">${escapeHtml(n.time)}</div>
            </div>
          </div>
        `).join('') : '<div class="empty-state" style="padding:30px;"><div class="empty-icon">🔔</div><div class="empty-text">No notifications</div></div>'}
      </div>
    </div>
  `;
  openModal(html);
}

function markAllRead() {
  DB.notifications.forEach(n => n.read = true);
  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
  closeModal();
  showToast('All notifications marked as read', 'success');
}

// ---- Initialize App ----
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  setTheme(savedTheme === 'light' ? 'light' : 'dark');

  const splash = document.getElementById('splash-screen');

  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      initializeFleetApp().catch(error => {
        document.getElementById('auth-screen').classList.remove('hidden');
        setAuthMessage(`Could not start FleetPro: ${error.message}`, true);
      });
    }, 600);
  }, 2000);
});
