// Keep this entry independent of the app graph so a missing module has a usable recovery UI.
async function recovery() {
  let panel = document.querySelector('#boot-recovery');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'boot-recovery';
    panel.className = 'panel';
    panel.setAttribute('role', 'status');
    panel.innerHTML = '<h1>ConstructClaim could not load</h1><p>Recovery keeps device records. If a task is visible, keep this page open and save or copy its input before opening the recovered app.</p><p data-pwa="detail">Preparing recovery controls…</p><p data-pwa="offline"></p><div class="form-actions"><button class="button secondary" type="button" data-pwa-repair>Repair offline app</button><button class="button secondary" type="button" data-pwa-recover>Install complete release</button><a class="text-link" href="./index.html?recovery=1" target="_blank" rel="noopener">Open recovery in another page</a></div>';
    (document.querySelector('#main') || document.body).append(panel);
  }
  if (panel) {
    panel.hidden = false;
    const heading = panel.querySelector('h1');
    if (heading) heading.textContent = 'ConstructClaim could not load';
    const link = panel.querySelector('a');
    if (link) { link.target = '_blank'; link.rel = 'noopener'; }
  }
  try {
    let updates;
    try { updates = await import('./pwa-updates.js'); }
    catch {
      // The recovery policy has no app dependencies. A network-only URL can restore its
      // controls without admitting unverified runtime bytes to the installed app cache.
      updates = await import('./pwa-updates.js?recovery=1');
    }
    const guard = updates.createBootRecoveryGuard({ document, window });
    if (guard.isBusy()) {
      panel.querySelector('[data-pwa="detail"]').textContent = 'This page contains an unfinished task. Keep it open and save or copy your input. Recovery will not reload this page or authorize an update while the task remains.';
      const instruction = document.createElement('p');
      instruction.textContent = 'Keep this page open and save or copy the visible task input before opening the recovered app. This page will not authorize an update or reload while a form or task remains.';
      panel.append(instruction);
    }
    const pwa = updates.createPwaUpdates({ ...guard, document, navigator, window });
    await pwa.start();
  } catch {
    const detail = document.querySelector('#boot-recovery [data-pwa="detail"]');
    if (detail) detail.textContent = 'Recovery controls could not load. Reconnect and use Retry recovery online. Your device records have not been deleted.';
  }
}
if (new URL(window.location.href).searchParams.get('recovery') === '1') {
  await recovery();
} else {
  try { await import('./app.js'); }
  catch { await recovery(); }
}
