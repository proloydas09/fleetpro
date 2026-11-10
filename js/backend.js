// =============================================
// FleetPro – Supabase authentication and sync
// =============================================

let fleetSupabase = null;
let fleetUser = null;
let fleetSaveTimer = null;
let fleetSaveInProgress = false;
let fleetSavePending = false;
let fleetTrackingEnabled = false;
const fleetProxyCache = new WeakMap();

function isBackendConfigured() {
  const config = window.FLEETPRO_SUPABASE_CONFIG;
  return Boolean(config && config.url && config.anonKey && window.supabase?.createClient);
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
  setAuthMessage(message);
}

function setAuthMessage(message, isError = false) {
  const element = document.getElementById('auth-message');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function showFleetApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('owner-initials').textContent = DB.owner.initials;
  updateNotifBadge();
  showPage('dashboard');
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
    .select('payload')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    replaceFleetData(data.payload);
  } else {
    replaceFleetData(createEmptyFleetData(fleetUser));
    const { error: insertError } = await fleetSupabase
      .from('fleet_data')
      .insert({ owner_id: userId, payload: JSON.parse(JSON.stringify(DB)) });
    if (insertError) throw insertError;
  }

  enableFleetTracking();
}

async function startFleetSession(user) {
  fleetUser = user;
  setAuthMessage('');
  try {
    await loadFleetData(user.id);
    setConnectionStatus('Connected — changes sync to your private account.', 'connected');
    showFleetApp();
  } catch (error) {
    fleetUser = null;
    showAuthScreen(`Could not load fleet data: ${error.message}`);
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

async function signOutFleet() {
  try {
    await flushFleetSave();
    const { error } = await fleetSupabase.auth.signOut();
    if (error) throw error;
    fleetTrackingEnabled = false;
    fleetUser = null;
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
      const { error } = await fleetSupabase
        .from('fleet_data')
        .update({ payload, updated_at: new Date().toISOString() })
        .eq('owner_id', fleetUser.id)
        .select('owner_id')
        .single();
      if (error) throw error;
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
    const config = window.FLEETPRO_SUPABASE_CONFIG;
    const message = config?.url && config?.anonKey
      ? 'Demo mode — the Supabase client could not load. Changes are not saved.'
      : 'Demo mode — add your Supabase URL and publishable key to enable sign-in and cloud saving.';
    setConnectionStatus(message, 'demo');
    showFleetApp();
    return;
  }

  fleetSupabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      fleetTrackingEnabled = false;
      fleetUser = null;
      showAuthScreen();
    }
  });

  const { data, error } = await fleetSupabase.auth.getSession();
  if (error) {
    showAuthScreen(`Could not check your session: ${error.message}`);
    return;
  }

  if (data.session) {
    await startFleetSession(data.session.user);
  } else {
    showAuthScreen();
  }
}
