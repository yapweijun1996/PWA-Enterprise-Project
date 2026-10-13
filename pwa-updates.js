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

export function createPwaUpdates({ isBusy, document, navigator, window }) {
  let registration, applying = false, checking = false, lock = '', lockTimer, retryAfter = 0, previousFocus;
  let hadController = Boolean(navigator.serviceWorker?.controller), reloaded = false;
  const state = { version: 'Not available', title: 'Preparing offline app', detail: 'Checking this browser’s app status.', offline: 'Not ready', checked: '', pending: '', next: '' };
  const shell = [...document.querySelectorAll('.app-shell, .mobile-nav, #scroll-top')];

  function paint() {
    const values = { ...state, connection: navigator.onLine ? 'Browser reports online' : 'Browser reports offline', mode: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Installed app' : 'Browser tab' };
    document.querySelectorAll('[data-pwa]').forEach(element => { element.textContent = values[element.dataset.pwa]; });
    document.querySelectorAll('[data-pwa-check]').forEach(button => { button.disabled = checking || applying || !registration || !navigator.onLine; button.textContent = checking ? 'Checking…' : 'Check for updates'; });
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
  async function metadata(worker) {
    if (!worker) return;
    try {
      const info = await request(worker, { type: 'GET_VERSION' });
      if (typeof info.version !== 'string') throw new Error('Release identity unavailable.');
      state.version = 'v' + info.version;
      state.offline = info.offlineReady ? 'Ready on this device' : 'Cache incomplete · reconnect and reopen';
    } catch {
      state.version = 'Older release · reopen the app';
      state.offline = 'Could not verify cached app';
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
    if (!registration || checking || lock) return;
    if (!navigator.onLine) { status('You are offline', 'The cached app remains available. Updates will be checked when you reconnect.'); return; }
    checking = true;
    status('Checking for updates', 'Looking for a newer version. Your work stays on this device.');
    try {
      await registration.update();
      state.checked = 'Last checked ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (registration.waiting) { retryAfter = 0; await ready(); }
      else if (!registration.installing) status('Up to date', 'Updates apply automatically when all open pages have saved their work.');
    } catch { status('Could not check for updates', 'The current app is still available. Reconnect to retry automatically, or check again.'); }
    finally { checking = false; paint(); }
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
        if (!reloaded) { reloaded = true; window.location.reload(); }
      } else {
        hadController = true;
        await metadata(controller);
        status('Offline app ready', 'Updates apply automatically when all open pages have saved their work.');
      }
    });
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
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
    if (state.pending === 'reload' && !isBusy() && !reloaded) { reloaded = true; window.location.reload(); }
    else reconsider();
  }
  document.addEventListener('click', event => { if (event.target.closest('[data-pwa-check]')) check(); });
  return { start, paint, reconsider: resume };
}
