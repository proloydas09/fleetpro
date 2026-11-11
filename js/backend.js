// =============================================
// FleetPro – Supabase authentication and sync
// =============================================

let fleetSupabase = null;
let fleetUser = null;
let fleetRole = null;
let fleetDriverId = null;
let fleetUpdatedAt = null;
let fleetSyncedPayload = null;
let fleetSaveTimer = null;
let fleetSaveInProgress = false;
let fleetSavePending = false;
let fleetTrackingEnabled = false;
let fleetPasswordSetupPending = false;
let fleetAuthMode = 'admin';
const fleetProxyCache = new WeakMap();

function isBackendConfigured() {
  const config = window.FLEETPRO_SUPABASE_CONFIG;
  return Boolean(config && config.url && config.anonKey && window.supabase?.createClient);
}

function isFleetAdmin() {
  return fleetRole === 'admin';
}

function isFleetDriver() {
  return fleetRole === 'driver';
}

function initializeFleetBackend() {
  if (!isBackendConfigured()) return false;
  const { url, anonKey } = window.FLEETPRO_SUPABASE_CONFIG;
  fleetSupabase = window.supabase.createClient(url, anonKey);
  return true;
}

function setConnectionStatus(message, state = '') {
  const status = document.getElementById('connection-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
  if (state === 'error') {
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'connection-retry';
    retryButton.textContent = 'Retry save';
    retryButton.addEventListener('click', retryFleetSave);
    status.append(' ', retryButton);
  }
}

function showAuthScreen(message = '') {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-login-form').classList.remove('hidden');
  document.getElementById('auth-driver-form').classList.add('hidden');
  document.getElementById('auth-password-form').classList.add('hidden');
  document.getElementById('auth-mode-toggle').classList.remove('hidden');
  resetDriverSignInForm();
  setFleetAuthMode(fleetAuthMode);
  setAuthMessage(fleetAuthMode === 'admin' ? message : '');
  setDriverAuthMessage(fleetAuthMode === 'driver' ? message : '');
  setPasswordMessage('');
}

function showPasswordSetupScreen(message = '') {
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-mode-toggle').classList.add('hidden');
  document.getElementById('auth-login-form').classList.add('hidden');
  document.getElementById('auth-driver-form').classList.add('hidden');
  document.getElementById('auth-password-form').classList.remove('hidden');
  setPasswordMessage(message);
}

function setFleetAuthMode(mode) {
  if (!['admin', 'driver'].includes(mode)) return;
  if (fleetAuthMode !== mode) resetDriverSignInForm();
  fleetAuthMode = mode;
  const passwordForm = document.getElementById('auth-password-form');
  if (!passwordForm || !passwordForm.classList.contains('hidden')) return;

  const isDriver = mode === 'driver';
  document.getElementById('auth-login-form').classList.toggle('hidden', isDriver);
  document.getElementById('auth-driver-form').classList.toggle('hidden', !isDriver);
  document.getElementById('auth-mode-admin').classList.toggle('active', !isDriver);
  document.getElementById('auth-mode-admin').setAttribute('aria-selected', String(!isDriver));
  document.getElementById('auth-mode-driver').classList.toggle('active', isDriver);
  document.getElementById('auth-mode-driver').setAttribute('aria-selected', String(isDriver));
  setAuthMessage('');
  setDriverAuthMessage('');
}

function toggleAuthPasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input || !button) return;
  const showPassword = input.type === 'password';
  input.type = showPassword ? 'text' : 'password';
  button.classList.toggle('is-visible', showPassword);
  button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
}

function resetDriverSignInForm() {
  const phoneInput = document.getElementById('auth-driver-phone');
  const passwordInput = document.getElementById('auth-driver-password');
  if (phoneInput) phoneInput.disabled = false;
  if (passwordInput) passwordInput.value = '';
}

function setAuthMessage(message, isError = false) {
  const element = document.getElementById('auth-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function setDriverAuthMessage(message, isError = false) {
  const element = document.getElementById('auth-driver-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function setPasswordMessage(message, isError = false) {
  const element = document.getElementById('auth-password-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function showFleetApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('owner-initials').textContent = DB.owner.initials;
  updateNavigationForRole();
  updateNotifBadge();
  showPage(isFleetDriver() ? 'trips' : 'dashboard');
}

function isValidFleetPayload(payload) {
  return payload &&
    typeof payload === 'object' &&
    payload.owner &&
    Array.isArray(payload.cars) &&
    Array.isArray(payload.drivers) &&
    Array.isArray(payload.trips) &&
    Array.isArray(payload.expenses) &&
    Array.isArray(payload.maintenance) &&
    Array.isArray(payload.notifications) &&
    Array.isArray(payload.monthlyData);
}

function replaceFleetData(payload) {
  if (!isValidFleetPayload(payload)) {
    throw new Error('The saved fleet data is incomplete or invalid. Your data was not changed.');
  }
  Object.keys(payload).forEach(key => {
    DB[key] = payload[key];
  });
}

function observeFleetValue(value) {
  if (!value || typeof value !== 'object') return value;
  const cachedProxy = fleetProxyCache.get(value);
  if (cachedProxy) return cachedProxy;

  Object.keys(value).forEach(key => {
    value[key] = observeFleetValue(value[key]);
  });

  const proxy = new Proxy(value, {
    set(target, property, nextValue) {
      const observedValue = observeFleetValue(nextValue);
      if (Object.is(target[property], observedValue)) return true;
      Reflect.set(target, property, observedValue);
      if (fleetTrackingEnabled) scheduleFleetSave();
      return true;
    },
    deleteProperty(target, property) {
      if (!Reflect.has(target, property)) return true;
      Reflect.deleteProperty(target, property);
      if (fleetTrackingEnabled) scheduleFleetSave();
      return true;
    },
  });

  fleetProxyCache.set(value, proxy);
  fleetProxyCache.set(proxy, proxy);
  return proxy;
}

function enableFleetTracking() {
  Object.keys(DB).forEach(key => {
    DB[key] = observeFleetValue(DB[key]);
  });
  fleetTrackingEnabled = true;
}

function createEmptyFleetData(user) {
  const ownerName = 'Fleet Owner';
  const today = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    return {
      month: month.toLocaleDateString('en-IN', { month: 'short' }),
      earnings: 0,
      expenses: 0,
    };
  });

  return {
    owner: {
      name: ownerName,
      business: 'My Fleet',
      phone: 'Not provided',
      email: user.email || '',
      city: 'Not provided',
      gstin: '',
      initials: getInitials(ownerName),
      memberSince: String(today.getFullYear()),
    },
    cars: [],
    drivers: [],
    trips: [],
    expenses: [],
    maintenance: [],
    notifications: [],
    monthlyData,
  };
}

async function loadFleetData(userId) {
  const { data, error } = await fleetSupabase
    .from('fleet_data')
    .select('payload, updated_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    replaceFleetData(data.payload);
    fleetUpdatedAt = data.updated_at;
  } else {
    replaceFleetData(createEmptyFleetData(fleetUser));
    const { data: inserted, error: insertError } = await fleetSupabase
      .from('fleet_data')
      .insert({ owner_id: userId, payload: JSON.parse(JSON.stringify(DB)) })
      .select('payload, updated_at')
      .single();
    if (insertError) throw insertError;
    fleetUpdatedAt = inserted.updated_at;
  }

  fleetSyncedPayload = JSON.parse(JSON.stringify(DB));
  enableFleetTracking();
}

async function loadDriverFleetData() {
  const { data, error } = await fleetSupabase.rpc('driver_fleet_context');
  if (error) throw error;
  replaceFleetData(data);
}

async function startFleetSession(user) {
  fleetUser = user;
  setAuthMessage('');
  try {
    const { data: access, error } = await fleetSupabase
      .from('fleet_access')
      .select('owner_id, role, driver_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!access || !['admin', 'driver'].includes(access.role)) {
      throw new Error('This account has no FleetPro role. Ask the administrator to configure access.');
    }

    fleetRole = access.role;
    fleetDriverId = access.role === 'driver' ? access.driver_id : null;
    if (isFleetAdmin()) {
      if (access.owner_id !== user.id || access.driver_id) {
        throw new Error('The administrator account is not linked to its own fleet.');
      }
      await loadFleetData(user.id);
      setConnectionStatus('Connected — changes sync to your private account.', 'connected');
    } else {
      if (!fleetDriverId || access.owner_id === user.id) {
        throw new Error('This driver account is not linked to a fleet driver record.');
      }
      await loadDriverFleetData();
      setConnectionStatus('Driver account — only your assigned car, trips, and expenses are available.', 'connected');
    }
    showFleetApp();
  } catch (error) {
    fleetUser = null;
    fleetRole = null;
    fleetDriverId = null;
    const message = `Could not load FleetPro access: ${error.message}`;
    try {
      const { error: signOutError } = await fleetSupabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (signOutError) {
      showAuthScreen(`${message} Sign out failed: ${signOutError.message}`);
      return;
    }
    showAuthScreen(message);
  }
}

async function signIn(event) {
  event.preventDefault();
  const button = document.getElementById('auth-submit');
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  button.disabled = true;
  setAuthMessage('Signing in…');

  try {
    const { data, error } = await fleetSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    await startFleetSession(data.user);
  } catch (error) {
    setAuthMessage(`Sign-in failed: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

function normalizeFleetPhone(value) {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(`+${digits}`) ? `+${digits}` : '';
  }
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return '';
}

function driverLoginEmail(phone) {
  return `driver-${phone.replace(/\D/g, '')}@login.fleetpro.invalid`;
}

async function signInDriver(event) {
  event.preventDefault();
  const phone = normalizeFleetPhone(document.getElementById('auth-driver-phone').value);
  if (!phone) {
    setDriverAuthMessage('Enter a valid phone number. Indian numbers can use 10 digits or the +91 country code.', true);
    return;
  }

  const password = document.getElementById('auth-driver-password').value;
  const button = document.getElementById('auth-driver-submit');
  button.disabled = true;
  setDriverAuthMessage('Signing in…');
  try {
    const { data, error } = await fleetSupabase.auth.signInWithPassword({
      email: driverLoginEmail(phone),
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Sign-in succeeded but no account was returned.');
    await startFleetSession(data.user);
  } catch (error) {
    setDriverAuthMessage(`Sign-in failed: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

async function sendPasswordRecovery() {
  const emailInput = document.getElementById('auth-email');
  const email = emailInput.value.trim();
  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  const button = document.querySelector('.auth-link');
  button.disabled = true;
  setAuthMessage('Sending password setup link…');

  try {
    const { error } = await fleetSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) {
      setAuthMessage(`Could not send password setup link: ${error.message}`, true);
      return;
    }

    setAuthMessage('If that email belongs to an account, a password setup link has been sent.');
  } catch (error) {
    setAuthMessage(`Could not send password setup link: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

async function setFleetPassword(event) {
  event.preventDefault();
  const password = document.getElementById('auth-new-password').value;
  const confirmation = document.getElementById('auth-confirm-password').value;
  if (password !== confirmation) {
    setPasswordMessage('The passwords do not match.', true);
    return;
  }

  const button = document.getElementById('auth-password-submit');
  button.disabled = true;
  setPasswordMessage('Saving password…');

  try {
    const { data, error } = await fleetSupabase.auth.updateUser({ password });
    if (error) {
      setPasswordMessage(`Could not save password: ${error.message}`, true);
      return;
    }
    if (!data.user) {
      setPasswordMessage('Password update returned no account. Request a new setup link and try again.', true);
      return;
    }

    fleetPasswordSetupPending = false;
    window.history.replaceState(null, document.title, window.location.pathname);
    await startFleetSession(data.user);
  } catch (error) {
    setPasswordMessage(`Could not save password: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

async function signOutFleet() {
  try {
    await flushFleetSave();
    const { error } = await fleetSupabase.auth.signOut();
    if (error) throw error;
    fleetTrackingEnabled = false;
    fleetUser = null;
    fleetRole = null;
    fleetDriverId = null;
    fleetUpdatedAt = null;
    fleetSyncedPayload = null;
    showAuthScreen('You have been signed out.');
  } catch (error) {
    showToast(`Could not sign out safely: ${error.message}`, 'error');
  }
}

function scheduleFleetSave() {
  if (!fleetSupabase || !fleetUser) return;
  fleetSavePending = true;
  setConnectionStatus('Saving changes…', 'saving');
  clearTimeout(fleetSaveTimer);
  fleetSaveTimer = setTimeout(() => {
    flushFleetSave().catch(error => {
      setConnectionStatus(`Save failed: ${error.message}`, 'error');
      showToast('Could not save your changes. Check your connection and try again.', 'error');
    });
  }, 650);
}

async function reconcileDriverChanges() {
  const { data, error } = await fleetSupabase
    .from('fleet_data')
    .select('payload, updated_at')
    .eq('owner_id', fleetUser.id)
    .single();
  if (error) throw error;

  const latest = data.payload;
  const previous = fleetSyncedPayload;
  if (!previous) throw new Error('Fleet save state is missing. Reload before saving.');

  const previousTripIds = new Set(previous.trips.map(trip => trip.id));
  const previousExpenseIds = new Set(previous.expenses.map(expense => expense.id));
  const newDriverTrips = latest.trips.filter(trip =>
    trip.createdBy === 'driver' && !previousTripIds.has(trip.id)
  );
  const newDriverExpenses = latest.expenses.filter(expense =>
    expense.submittedBy === 'driver' && !previousExpenseIds.has(expense.id)
  );
  const newExpenseIds = new Set(newDriverExpenses.map(expense => expense.id));
  const newNotifications = latest.notifications.filter(notification =>
    newExpenseIds.has(notification.refId)
  );

  const latestWithoutDriverChanges = JSON.parse(JSON.stringify(latest));
  const addedTripIds = new Set(newDriverTrips.map(trip => trip.id));
  const addedExpenseIds = new Set(newDriverExpenses.map(expense => expense.id));
  const addedNotificationIds = new Set(newNotifications.map(notification => notification.id));
  latestWithoutDriverChanges.trips = latestWithoutDriverChanges.trips.filter(trip => !addedTripIds.has(trip.id));
  latestWithoutDriverChanges.expenses = latestWithoutDriverChanges.expenses.filter(expense => !addedExpenseIds.has(expense.id));
  latestWithoutDriverChanges.notifications = latestWithoutDriverChanges.notifications.filter(notification => !addedNotificationIds.has(notification.id));

  const driverEarningsByCar = new Map();
  newDriverTrips.forEach(trip => {
    driverEarningsByCar.set(
      trip.carId,
      (driverEarningsByCar.get(trip.carId) || 0) + Number(trip.fare)
    );
  });
  latestWithoutDriverChanges.cars.forEach(car => {
    if (!driverEarningsByCar.has(car.id)) return;
    const previousCar = previous.cars.find(item => item.id === car.id);
    if (!previousCar) return;
    const expectedEarnings = Number(previousCar.totalEarnings) + driverEarningsByCar.get(car.id);
    if (Math.abs(Number(car.totalEarnings) - expectedEarnings) > 0.000001) return;
    car.totalEarnings = previousCar.totalEarnings;
  });

  const normalize = value => Array.isArray(value)
    ? value.map(normalize)
    : value && typeof value === 'object'
      ? Object.keys(value).sort().reduce((result, key) => {
        result[key] = normalize(value[key]);
        return result;
      }, {})
      : value;
  if (JSON.stringify(normalize(latestWithoutDriverChanges)) !== JSON.stringify(normalize(previous))) {
    throw new Error('Fleet data also changed in another Admin session. Reload the app before saving to avoid overwriting newer changes.');
  }

  const existingTripIds = new Set(DB.trips.map(trip => trip.id));
  const tripsToAdd = newDriverTrips.filter(trip => !existingTripIds.has(trip.id));
  if (tripsToAdd.length) DB.trips.unshift(...tripsToAdd);

  const existingExpenseIds = new Set(DB.expenses.map(expense => expense.id));
  newDriverExpenses.forEach(expense => {
    if (!existingExpenseIds.has(expense.id)) DB.expenses.push(expense);
  });

  const existingNotificationIds = new Set(DB.notifications.map(notification => notification.id));
  newNotifications.forEach(notification => {
    if (!existingNotificationIds.has(notification.id)) DB.notifications.push(notification);
  });

  newDriverTrips.forEach(trip => {
    const car = getCarById(trip.carId);
    if (car) car.totalEarnings += Number(trip.fare) || 0;
  });

  fleetUpdatedAt = data.updated_at;
  fleetSyncedPayload = JSON.parse(JSON.stringify(latest));
  fleetSavePending = true;
}

async function retryFleetSave() {
  try {
    await flushFleetSave();
  } catch (error) {
    setConnectionStatus(`Save failed: ${error.message}`, 'error');
    showToast('Could not save your changes. Check your connection and try again.', 'error');
  }
}

async function flushFleetSave() {
  clearTimeout(fleetSaveTimer);
  if (fleetSaveInProgress) {
    await new Promise(resolve => {
      const waitForSave = () => {
        if (fleetSaveInProgress) {
          setTimeout(waitForSave, 50);
        } else {
          resolve();
        }
      };
      waitForSave();
    });
  }

  while (fleetSavePending && fleetSupabase && fleetUser) {
    fleetSavePending = false;
    fleetSaveInProgress = true;
    try {
      const payload = JSON.parse(JSON.stringify(DB));
      if (!fleetUpdatedAt) throw new Error('Fleet save state is missing. Reload before saving.');
      const { data, error } = await fleetSupabase
        .from('fleet_data')
        .update({ payload, updated_at: new Date().toISOString() })
        .eq('owner_id', fleetUser.id)
        .eq('updated_at', fleetUpdatedAt)
        .select('updated_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        await reconcileDriverChanges();
        continue;
      }
      fleetUpdatedAt = data.updated_at;
      fleetSyncedPayload = payload;
      setConnectionStatus('Connected — all changes saved.', 'connected');
    } catch (error) {
      fleetSavePending = true;
      throw error;
    } finally {
      fleetSaveInProgress = false;
    }
  }
}

async function initializeFleetApp() {
  if (!initializeFleetBackend()) {
    fleetRole = 'admin';
    fleetDriverId = null;
    const config = window.FLEETPRO_SUPABASE_CONFIG;
    const message = config?.url && config?.anonKey
      ? 'Demo mode — the Supabase client could not load. Changes are not saved.'
      : 'Demo mode — add your Supabase URL and publishable key to enable sign-in and cloud saving.';
    setConnectionStatus(message, 'demo');
    showFleetApp();
    return;
  }

  const hashType = new URLSearchParams(window.location.hash.slice(1)).get('type');
  const queryType = new URLSearchParams(window.location.search).get('type');
  fleetPasswordSetupPending =
    ['invite', 'recovery'].includes(hashType) ||
    ['invite', 'recovery'].includes(queryType);

  fleetSupabase.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') {
      fleetPasswordSetupPending = true;
      showPasswordSetupScreen();
    } else if (event === 'SIGNED_OUT') {
      fleetTrackingEnabled = false;
      fleetUser = null;
      fleetRole = null;
      fleetDriverId = null;
      fleetUpdatedAt = null;
      fleetSyncedPayload = null;
      showAuthScreen();
    }
  });

  const { data, error } = await fleetSupabase.auth.getSession();
  if (error) {
    showAuthScreen(`Could not check your session: ${error.message}`);
    return;
  }

  if (data.session && fleetPasswordSetupPending) {
    showPasswordSetupScreen();
    return;
  }

  if (data.session) {
    await startFleetSession(data.session.user);
  } else {
    showAuthScreen();
  }
}
