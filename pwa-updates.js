// Worker metadata owns the release version. No second version constant lives in the UI.
function request(worker, message, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('The app worker did not respond.')); }, timeout);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    try { worker.postMessage(message, [channel.port2]); }
    catch (error) { clearTimeout(timer); channel.port1.close(); reject(error); }
  });
}

// A rejected app import can leave a partially initialized editor without its busy state.
export function createBootRecoveryGuard({ document, window }) {
  const isBusy = () => Boolean(document.querySelector('#main form') || document.body?.classList.contains('task-mode'));
  const openApp = () => {
    if (isBusy()) {
      const detail = document.querySelector('#boot-recovery [data-pwa="detail"]');
      if (detail) detail.textContent = 'App files are repaired, but this page contains an unfinished task. Keep it open and save or copy your input before opening the recovered app.';
      return;
    }
    window.location.replace(new URL('./', window.location.href).href);
  };
  return { isBusy, onRepaired: openApp, onReload: openApp };
}

export function createPwaUpdates({ isBusy, document, navigator, window, onRepaired, onReload }) {
  let registration, applying = false, checking = false, repairing = false, recovering = false, lock = '', lockTimer, retryAfter = 0, previousFocus;
  let hadController = Boolean(navigator.serviceWorker?.controller), reloaded = false;
  const state = { version: 'Not available', title: 'Preparing offline app', detail: 'Checking this browser’s app status.', offline: 'Not ready', cacheState: '', checked: '', pending: '', next: '' };
  const shell = [...document.querySelectorAll('.app-shell, .mobile-nav, #scroll-top')];

  function paint() {
    const values = { ...state, connection: navigator.onLine ? 'Browser reports online' : 'Browser reports offline', mode: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Installed app' : 'Browser tab' };
    document.querySelectorAll('[data-pwa]').forEach(element => { element.textContent = values[element.dataset.pwa]; });
    document.querySelectorAll('[data-pwa-check]').forEach(button => { button.disabled = checking || repairing || recovering || applying || !registration || !navigator.onLine; button.textContent = checking ? 'Checking…' : 'Check for updates'; });
    document.querySelectorAll('[data-pwa-repair]').forEach(button => { button.disabled = checking || repairing || recovering || applying || !registration?.active || !navigator.onLine || state.cacheState === 'complete'; button.textContent = repairing ? 'Repairing…' : 'Repair offline app'; });
    document.querySelectorAll('[data-pwa-recover]').forEach(button => { button.disabled = checking || repairing || recovering || applying || !registration || !navigator.onLine; button.textContent = recovering ? 'Downloading complete release…' : 'Install complete release'; });
    const banner = document.querySelector('#update-notice');
    banner.hidden = !state.pending;
    document.querySelector('#update-message').textContent = state.pending ? state.detail : '';
  }
  function status(title, detail) { state.title = title; state.detail = detail; paint(); }
  function unlock() {
    clearTimeout(lockTimer);
    lock = '';
    shell.forEach(element => { element.inert = false; });
    document.querySelector('#update-overlay').hidden = true;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function useMetadata(info) {
    state.version = 'v' + info.version;
    state.cacheState = info.cacheState || (info.offlineReady ? 'complete' : 'unverified');
    state.offline = info.offlineReady ? 'Ready on this device'
      : state.cacheState === 'repairable' ? 'Incomplete · repair available online'
      : state.cacheState === 'mismatch' ? 'Different server release · complete install required'
      : 'Integrity unavailable · complete install required';
  }
  async function metadata(worker) {
    if (!worker) return;
    try {
      const info = await request(worker, { type: 'GET_VERSION' });
      if (typeof info.version !== 'string') throw new Error('Release identity unavailable.');
      useMetadata(info);
    } catch {
      state.version = 'Release identity unavailable';
      state.cacheState = 'unverified';
      state.offline = 'Could not verify cached app · complete install available online';
    }
    paint();
  }
  async function reconsider() {
    if (!registration?.waiting || applying || lock || Date.now() < retryAfter) return;
    state.pending = 'ready';
    if (isBusy()) { status('Update ready', (state.next ? 'Version v' + state.next : 'A new version') + ' is ready. It will apply automatically after you save or finish your current task.'); return; }
    applying = true;
    status('Update ready', 'Checking that all open ConstructClaim pages have saved their work…');
    try {
      const result = await request(registration.waiting, { type: 'APPLY_UPDATE' }, 10000);
      if (!result.ok) {
        retryAfter = Date.now() + 10000;
        status('Update paused', 'Save work in your other ConstructClaim pages, or close older pages. The update will then apply automatically.');
      }
    } catch {
      unlock();
      retryAfter = Date.now() + 15000;
      status('Update delayed', 'The update could not finish. Your saved data is kept; the app will retry automatically.');
    } finally { applying = false; paint(); }
  }
  async function ready() {
    try { state.next = (await request(registration.waiting, { type: 'GET_VERSION' })).version || ''; }
    catch { state.next = ''; }
    return reconsider();
  }
  function watch(worker) {
    if (!worker) return;
    status(hadController ? 'Downloading update' : 'Preparing offline app', 'Downloading the complete app. You can continue working.');
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        if (hadController) ready();
      } else if (worker.state === 'redundant' && registration.active !== worker) {
        status('Download interrupted', 'The current app is still available. Reconnect to retry automatically, or check for updates.');
      }
    });
  }
  async function check() {
    if (!registration || checking || repairing || recovering || applying || lock) return;
    if (!navigator.onLine) { status('You are offline', 'The cached app remains available. Updates will be checked when you reconnect.'); return; }
    checking = true;
    status('Checking for updates', 'Looking for a newer version. Your work stays on this device.');
    try {
      await registration.update();
      state.checked = 'Last checked ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (registration.waiting) { retryAfter = 0; await ready(); }
      else if (!registration.installing) {
        await metadata(navigator.serviceWorker.controller || registration.active);
        status(state.cacheState === 'complete' ? 'Up to date' : 'Offline app needs recovery', state.cacheState === 'complete'
          ? 'Updates apply automatically when all open pages have saved their work.'
          : 'Repair missing files online, or install a complete release if verification is unavailable. Device records are kept.');
      }
    } catch { status('Could not check for updates', 'The current app is still available. Reconnect to retry automatically, or check again.'); }
    finally { checking = false; paint(); }
  }
  async function repair() {
    if (!registration?.active || checking || repairing || recovering || applying || lock) return;
    if (!navigator.onLine) { status('Repair needs a connection', 'Reconnect to verify missing app files. Your device records are kept.'); return; }
    repairing = true;
    status('Repairing offline app', 'Downloading missing files and verifying them against the installed release.');
    try {
      const result = await request(navigator.serviceWorker.controller || registration.active, { type: 'REPAIR_SHELL' }, 120000);
      if (typeof result.version === 'string') useMetadata(result);
      if (!result.ok || !result.offlineReady) {
        status('Offline repair incomplete', (result.error || 'Missing files could not be restored.') + ' Reconnect and retry, or install a complete release. Device records are kept.');
        return;
      }
      status('Offline app repaired', 'The complete installed release is verified on this device. Your saved records are unchanged.');
      if (onRepaired) onRepaired();
    } catch {
      await metadata(navigator.serviceWorker.controller || registration.active);
      status('Offline repair could not finish', 'The cache could not be confirmed complete. Reconnect and retry, or install a complete release. Your device records are kept.');
    } finally { repairing = false; paint(); }
  }
  async function recover() {
    if (!registration || checking || repairing || recovering || applying || lock) return;
    if (!navigator.onLine) { status('Complete install needs a connection', 'Reconnect to download the complete app. Your device records are kept.'); return; }
    recovering = true;
    status('Preparing complete release', 'Downloading a separate complete app snapshot. It will replace this release only after every open app page is ready.');
    try {
      // A distinct script identity forces a fresh install, even when sw.js bytes are unchanged.
      // Its isolated cache remains separate until the existing readiness protocol permits activation.
      const script = new URL('./sw.js', window.location.href);
      script.searchParams.set('recovery', crypto.randomUUID());
      registration = await navigator.serviceWorker.register(script.href, { scope: './', updateViaCache: 'none' });
      watch(registration.installing);
      if (registration.waiting) { retryAfter = 0; await ready(); }
    } catch {
      status('Complete install could not start', 'Reconnect and retry. The installed app and your device records have not been deleted.');
    } finally { recovering = false; paint(); }
  }
  async function start() {
    if (!navigator.serviceWorker || window.location.protocol === 'file:') { status('Offline app unavailable', 'Use HTTPS or localhost in a browser that supports offline apps.'); return; }
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.source !== registration?.waiting) return;
      const { type, attempt } = event.data || {};
      if (type === 'CANCEL_UPDATE' && lock === attempt) { unlock(); return; }
      if (type !== 'PREPARE_UPDATE' || !event.ports[0]) return;
      const ready = !isBusy() && (!lock || lock === attempt);
      if (ready) {
        lock = attempt;
        previousFocus = document.activeElement;
        shell.forEach(element => { element.inert = true; });
        document.querySelector('#update-overlay').hidden = false;
        lockTimer = setTimeout(() => { unlock(); status('Update delayed', 'The update is taking longer than expected. Your saved data is kept; the app will retry.'); }, 12000);
      }
      event.ports[0].postMessage({ ready });
    });
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;
      if (hadController) {
        // External/older pages may activate a worker. Never reload an unsaved editor.
        if (isBusy()) { unlock(); state.pending = 'reload'; status('Update ready', 'The new app is ready. This page will reload automatically after you save.'); return; }
        if (!reloaded) { reloaded = true; if (onReload) onReload(); else window.location.reload(); }
      } else {
        hadController = true;
        await metadata(controller);
        status('Offline app ready', 'Updates apply automatically when all open pages have saved their work.');
        if (onReload && !reloaded && !isBusy()) { reloaded = true; onReload(); }
      }
    });
    try {
      const existing = await navigator.serviceWorker.getRegistration('./');
      const scope = new URL('./', window.location.href).href;
      // Reuse the registration's newest worker; do not replace a staged recovery with the active script.
      registration = existing?.scope === scope ? existing
        : await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      registration.addEventListener('updatefound', () => watch(registration.installing));
      watch(registration.installing);
      await metadata(navigator.serviceWorker.controller || registration.active);
      if (registration.waiting) ready();
      else if (!registration.installing) check();
      window.setInterval(() => { if (!document.hidden) check(); }, 60 * 60 * 1000);
      window.setInterval(() => { if (!document.hidden) resume(); }, 15000);
      window.addEventListener('online', check);
      window.addEventListener('offline', () => { paint(); });
      let lastForegroundCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { resume(); if (Date.now() - lastForegroundCheck > 30000) { lastForegroundCheck = Date.now(); check(); } }
      });
    } catch { status('Offline app unavailable', 'The app could not prepare its offline cache. Reconnect and reopen to retry.'); }
    paint();
  }
  function resume() {
    if (state.pending === 'reload' && !isBusy() && !reloaded) { reloaded = true; if (onReload) onReload(); else window.location.reload(); }
    else reconsider();
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pwa-check]')) check();
    else if (event.target.closest('[data-pwa-repair]')) repair();
    else if (event.target.closest('[data-pwa-recover]')) recover();
  });
  return { start, paint, reconsider: resume };
}
