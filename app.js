import { listDrafts, saveDraft, removeDraft, clearDrafts } from './storage.js';

const projects = [
  { id: 'harbor', name: 'Harbor Exchange', place: 'Demo City', description: 'Example commercial development · contract and SOV preview' },
  { id: 'cedar', name: 'Cedar Station', place: 'Demo City', description: 'Example public works project · payable workflow preview' }
];
const sampleClaims = [
  { id: 'PCAR-DEMO-01', project: 'harbor', direction: 'Receivable', period: '2026-04', amount: '48000.00', status: 'Sample: Draft', certificate: 'Not issued' },
  { id: 'PCAP-DEMO-02', project: 'cedar', direction: 'Payable', period: '2026-05', amount: '18500.00', status: 'Sample: Reviewed', certificate: 'Sample CCAP-DEMO-01 (illustrative only)' }
];
const pages = [
  ['home', 'Dashboard', '⌂'], ['projects', 'Projects', '▥'], ['claims', 'Claims', '▤'],
  ['inbox', 'Inbox', '✉'], ['evidence', 'Evidence', '▣'], ['offline', 'Device drafts', '⇄'], ['settings', 'Settings', '⚙']
];
const mobilePages = [['home', 'Home', '⌂'], ['projects', 'Projects', '▥'], ['claims', 'Claims', '▤'], ['inbox', 'Inbox', '✉'], ['more', 'More', '☰']];
const main = document.querySelector('#main');
const live = document.querySelector('#live-status');
const state = { drafts: [], storageError: '', filter: '', direction: 'All' };

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const projectName = id => projects.find(project => project.id === id)?.name || 'Unknown demo project';
const money = value => value ? `Demo amount ${escapeHtml(value)}` : 'No amount entered';
const announce = message => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = message; }); };
const heading = (title, subtitle, action = '') => `<div class="page-head"><div><p class="eyebrow">ConstructClaim · Local demo</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</div>`;
const notice = (text, type = '') => `<div class="notice ${type}" role="${type === 'error' ? 'alert' : 'note'}">${text}</div>`;
const pageLink = (route, text) => `<a href="#${route}">${text}</a>`;
const navLink = ([route, label, icon], active) => `<a class="nav-item" href="#${route}" ${active === route ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</a>`;
const mobileLink = ([route, label, icon], active) => `<a href="#${route}" ${active === route || (route === 'more' && ['offline', 'evidence', 'settings'].includes(active)) ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`;
const displayDate = value => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';

async function refreshDrafts() {
  try {
    state.drafts = await listDrafts();
    state.storageError = '';
  } catch (error) {
    state.storageError = error.message || 'Device storage unavailable.';
    state.drafts = [];
  }
  document.querySelector('#draft-count').textContent = String(state.drafts.length);
}

function layoutHome() {
  return heading('Your project workspace', 'Explore synthetic records and save claim drafts on this device.', '<a class="button" href="#new">+ New local draft</a>') +
    `<div class="grid cards"><div class="card"><p class="label">Projects</p><p class="metric">${projects.length}</p>${pageLink('projects', 'Explore projects →')}</div><div class="card"><p class="label">Example claims</p><p class="metric">${sampleClaims.length}</p>${pageLink('claims', 'Explore claims →')}</div><div class="card"><p class="label">Device-only drafts</p><p class="metric">${state.drafts.length}</p>${pageLink('offline', 'Review local work →')}</div></div>` +
    `<div class="grid columns section-gap"><section class="panel"><h2>Recent projects</h2><ul class="row-list">${projects.map(p => `<li><a class="row-link" href="#project/${p.id}"><span><strong>${p.name}</strong><small>${p.description}</small></span><span class="arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul></section><section class="panel"><h2>Next steps</h2><p>This is a walk-through, not an approval inbox. Try a local claim draft, refresh the page, then review it under Device drafts.</p>${pageLink('new', 'Start a draft →')}</section></div>`;
}
function layoutProjects() {
  return heading('Projects', 'Two synthetic project records for layout and navigation testing.') + `<div class="grid cards">${projects.map(p => `<article class="card"><p class="eyebrow">Sample project · ${p.place}</p><h2>${p.name}</h2><p>${p.description}</p>${pageLink(`project/${p.id}`, 'Open project →')}</article>`).join('')}</div>`;
}
function layoutProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return layoutMissing();
  const related = sampleClaims.filter(c => c.project === id);
  return heading(project.name, `Synthetic project · ${project.place}`) + `<div class="grid columns"><section class="panel"><h2>Project 360 · preview</h2><p>${project.description}</p><div class="key-values"><div><dt>Contract / SOV</dt><dd>Illustrative only</dd></div><div><dt>Approved variations</dt><dd>No live records</dd></div></div><p class="meta">Production contract totals and permissions are not available in this demo.</p></section><section class="panel"><h2>Example claims</h2><ul class="row-list">${related.map(c => `<li><a class="row-link" href="#claim/${c.id}"><span><strong>${c.id}</strong><small>${c.direction} · ${c.status}</small></span>→</a></li>`).join('')}</ul><a class="button secondary" href="#new">New device draft</a></section></div>`;
}
function allClaims() { return [...sampleClaims, ...state.drafts.map(d => ({ ...d, status: 'Device-only draft', certificate: 'None' }))]; }
function claimRecords() {
  const query = state.filter.toLocaleLowerCase();
  const records = allClaims().filter(c => (state.direction === 'All' || c.direction === state.direction) && (`${c.id} ${projectName(c.project)} ${c.period}`).toLocaleLowerCase().includes(query));
  if (!records.length) return notice('No matching example claims or device drafts. Clear the filters or create a local draft.');
  const table = `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Document</th><th scope="col">Project</th><th scope="col">Period</th><th scope="col">Requested (illustrative)</th><th scope="col">State</th></tr></thead><tbody>${records.map(c => `<tr><td>${pageLink(`claim/${escapeHtml(encodeURIComponent(c.id))}`, escapeHtml(c.id))}</td><td>${projectName(c.project)}</td><td>${escapeHtml(c.period)}</td><td>${money(c.amount)}</td><td><span class="status ${c.status === 'Device-only draft' ? 'local' : ''}">${c.status}</span></td></tr>`).join('')}</tbody></table></div>`;
  const mobile = `<div class="mobile-records">${records.map(c => `<a href="#claim/${escapeHtml(encodeURIComponent(c.id))}"><span class="record-top"><strong>${escapeHtml(c.id)}</strong><span class="status ${c.status === 'Device-only draft' ? 'local' : ''}">${c.status}</span></span><span class="meta">${projectName(c.project)} · ${escapeHtml(c.period)}<br>${money(c.amount)}</span></a>`).join('')}</div>`;
  return table + mobile;
}
function layoutClaims() {
  return heading('Claims', 'Compare sample receivable/payable claims with device-only drafts.', '<a class="button" href="#new">+ New local draft</a>') +
    `<section class="panel"><div class="filters"><label>Search claims<input id="claim-search" type="search" placeholder="Document or project" value="${escapeHtml(state.filter)}"></label><label>Direction<select id="direction-filter"><option>All</option><option ${state.direction === 'Receivable' ? 'selected' : ''}>Receivable</option><option ${state.direction === 'Payable' ? 'selected' : ''}>Payable</option></select></label></div><div id="claim-results">${claimRecords()}</div></section>`;
}
function layoutClaim(id) {
  const claim = allClaims().find(c => c.id === id);
  if (!claim) return layoutMissing();
  const local = claim.status === 'Device-only draft';
  return heading(escapeHtml(claim.id), `${projectName(claim.project)} · ${escapeHtml(claim.direction)}`) +
    notice(local ? 'This draft exists only in this browser. It has not been submitted, synchronized or certified.' : 'This is a synthetic example. The pictured claim and certificate are not issued business documents.') +
    `<div class="grid columns"><section class="panel"><h2>Claim details</h2><dl class="key-values"><div><dt>Period</dt><dd>${escapeHtml(claim.period)}</dd></div><div><dt>Requested value</dt><dd>${money(claim.amount)}</dd></div><div><dt>Claim state</dt><dd>${escapeHtml(claim.status)}</dd></div><div><dt>Certificate</dt><dd>${escapeHtml(claim.certificate)}</dd></div></dl>${local ? `<p><strong>Notes:</strong> ${escapeHtml(claim.notes || 'None')}</p><p class="meta">Device save: ${displayDate(claim.updatedAt)}</p><button class="button danger" id="delete-draft" type="button" data-id="${escapeHtml(claim.id)}">Delete local draft</button>` : '<p class="meta">Contract/SOV, variation, retention, evidence, invoice and payment records are not authoritative in this demo.</p>'}</section><aside class="panel"><h2>Workflow boundaries</h2><p>Claim, certificate, invoice, and payment are separate stages. This static demo cannot issue, approve or post any of them.</p><a class="button secondary" href="#claims">Back to claims</a></aside></div>`;
}
function layoutNew() {
  return heading('New claim draft', 'Save a local example on this device. There is no server submission.', '<a class="button secondary" href="#claims">Back to claims</a>') +
    notice('Use fictional information only. Browser storage can be cleared or evicted; this draft is not a secure record or a backup.') +
    `<section class="panel form-panel"><h2>1 · Draft details</h2><form id="draft-form" class="form" novalidate><label>Project <select name="project" required>${projects.map(p => `<option value="${p.id}">${p.name} (demo)</option>`).join('')}</select></label><label>Claim direction <select name="direction" required><option>Receivable</option><option>Payable</option></select></label><label>Period <input name="period" type="month" required aria-describedby="form-feedback"></label><label>Requested amount (illustrative only) <input name="amount" type="text" inputmode="decimal" placeholder="e.g. 1250.00" maxlength="16" required aria-describedby="amount-hint form-feedback"><span class="hint" id="amount-hint">Demo input only. No tax, retention or certification calculation.</span></label><label>Notes (optional) <textarea name="notes" maxlength="500" placeholder="Fictional site progress note"></textarea></label><div id="form-feedback" role="alert" tabindex="-1"></div><div class="form-actions"><button class="button" type="submit">Save on this device</button><span class="meta">Never sends data to a server</span></div></form></section>`;
}
function layoutOffline() {
  const content = state.drafts.length ? `<ul class="row-list">${state.drafts.map(d => `<li><a class="row-link" href="#claim/${escapeHtml(encodeURIComponent(d.id))}"><span><strong>${escapeHtml(d.id)}</strong><small>${projectName(d.project)} · Saved ${displayDate(d.updatedAt)}</small></span><span class="status local">Device only</span></a></li>`).join('')}</ul>` : notice('No device-only drafts yet. Create a fictional draft to try reload and offline recovery.');
  return heading('Device drafts', 'Review work stored in this browser; no synchronization exists.') +
    notice(navigator.onLine ? 'Browser reports a network connection. This demo still has no API or sync target.' : 'Browser reports offline. Previously cached app files may open; saved drafts remain device-only.') +
    (state.storageError ? notice(`Local storage error: ${escapeHtml(state.storageError)}. Drafts may not be saved.`, 'error') : '') +
    `<div class="grid columns"><section class="panel"><h2>Local work · ${state.drafts.length}</h2>${content}</section><aside class="panel"><h2>What this is not</h2><p>No command queue, server acceptance, conflict resolution, upload or multi-device recovery is implemented. Data may disappear if site data is cleared or storage is evicted.</p><a class="button secondary" href="#new">New local draft</a></aside></div>`;
}
function layoutInbox() { return heading('Inbox', 'An illustrative empty state; no account or approval service is connected.') + `<section class="panel">${notice('No actionable approvals. This is not permission evidence or a real inbox.')}<p>In production, permitted actions must be checked by the server for each project and document. This demo does not support approval or issue.</p></section>`; }
function layoutEvidence() { return heading('Evidence', 'Layout preview only: no photo or document upload in this static demo.') + `<section class="panel">${notice('No evidence files are stored or uploaded. Do not enter real site data.')}<p>The production workflow needs authorized access, file retention, a content hash and recoverable upload states. None are simulated as complete here.</p></section>`; }
function layoutMore() { return heading('More', 'Additional demo destinations and boundaries.') + `<div class="grid cards">${[['evidence','Evidence'],['offline','Device drafts'],['settings','Settings'],['inbox','Inbox']].map(([r,l]) => `<div class="card"><h2>${l}</h2>${pageLink(r, 'Open →')}</div>`).join('')}</div>`; }
function layoutSettings() { return heading('Settings', 'Local demo controls only; there is no user account or organization policy.') + `<section class="panel"><h2>Device data</h2><p>Delete all local drafts in this browser. This action cannot be undone. It does not affect the synthetic example records.</p><button class="button danger" id="clear-drafts" type="button" ${state.drafts.length ? '' : 'disabled'}>Delete all device drafts</button><h2 class="section-gap">Production features not connected</h2><p>Identity, tenant permissions, offline download policies, AI assistance and real synchronization require separately approved backend services.</p></section>`; }
function layoutMissing() { return heading('Page not found', 'No demo record exists for this address.') + `<a class="button secondary" href="#home">Back to dashboard</a>`; }
function route() {
  const raw = location.hash.slice(1) || 'home';
  let path;
  try { path = decodeURIComponent(raw).split('/'); } catch { path = ['missing']; }
  const active = path[0];
  const section = ['new', 'claim'].includes(active) ? 'claims' : active === 'project' ? 'projects' : active;
  document.querySelector('#desktop-nav').innerHTML = pages.map(page => navLink(page, section)).join('');
  document.querySelector('#mobile-nav').innerHTML = mobilePages.map(page => mobileLink(page, section)).join('');
  const views = { home: layoutHome, projects: layoutProjects, claims: layoutClaims, new: layoutNew, offline: layoutOffline, inbox: layoutInbox, evidence: layoutEvidence, more: layoutMore, settings: layoutSettings };
  main.innerHTML = active === 'project' ? layoutProject(path[1]) : active === 'claim' ? layoutClaim(path[1]) : views[active]?.() || layoutMissing();
  document.title = `${main.querySelector('h1')?.textContent || 'Demo'} — ConstructClaim Demo`;
  bindPage();
}
function bindPage() {
  const search = document.querySelector('#claim-search');
  search?.addEventListener('input', () => { state.filter = search.value; document.querySelector('#claim-results').innerHTML = claimRecords(); });
  document.querySelector('#direction-filter')?.addEventListener('change', event => { state.direction = event.target.value; document.querySelector('#claim-results').innerHTML = claimRecords(); });
  document.querySelector('#draft-form')?.addEventListener('submit', submitDraft);
  document.querySelector('#delete-draft')?.addEventListener('click', async event => {
    const id = event.currentTarget.dataset.id;
    if (!confirm('Permanently delete this device-only draft?')) return;
    try { await removeDraft(id); await refreshDrafts(); location.hash = '#offline'; route(); announce('Device draft deleted.'); }
    catch (error) { const message = `Deletion failed: ${error.message}`; main.insertAdjacentHTML('afterbegin', notice(escapeHtml(message), 'error')); announce(message); }
  });
  document.querySelector('#clear-drafts')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only drafts?')) return;
    try { await clearDrafts(); await refreshDrafts(); route(); announce('All device drafts deleted.'); }
    catch (error) { const message = `Deletion failed: ${error.message}`; main.insertAdjacentHTML('afterbegin', notice(escapeHtml(message), 'error')); announce(message); }
  });
}
async function submitDraft(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector('#form-feedback');
  const fields = new FormData(form);
  const amount = String(fields.get('amount') || '').trim();
  const period = String(fields.get('period') || '');
  const amountInvalid = !/^\d{1,11}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0;
  const periodInvalid = !/^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  form.elements.period.setAttribute('aria-invalid', String(periodInvalid));
  form.elements.amount.setAttribute('aria-invalid', String(amountInvalid));
  if (amountInvalid || periodInvalid) {
    feedback.innerHTML = `<p class="form-error">${periodInvalid ? 'Select a valid month. ' : ''}${amountInvalid ? 'Enter a positive illustrative amount with up to two decimal places.' : ''}</p>`;
    (periodInvalid ? form.elements.period : form.elements.amount).focus();
    return;
  }
  const submit = form.querySelector('button[type=submit]');
  submit.disabled = true;
  feedback.textContent = 'Saving on this device…';
  const draft = { id: `LOCAL-${crypto.randomUUID()}`, project: String(fields.get('project')), direction: String(fields.get('direction')), period, amount, notes: String(fields.get('notes') || '').trim(), updatedAt: new Date().toISOString() };
  try {
    await saveDraft(draft);
    await refreshDrafts();
    if (state.storageError) throw new Error('Could not confirm the saved draft.');
    location.hash = `#claim/${draft.id}`;
    route();
    announce('Draft saved on this device only. Not submitted or synchronized.');
  } catch (error) {
    feedback.innerHTML = `<p class="form-error">Local save failed: ${escapeHtml(error.message)}. Nothing was submitted. Your inputs remain here; try again or copy them before leaving.</p>`;
    feedback.focus();
    submit.disabled = false;
  }
}

let updateRequested = false;
async function setupWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    const showUpdate = () => {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      const banner = document.querySelector('#update-notice');
      banner.hidden = false;
      document.querySelector('#update-button').onclick = () => {
        if (updateRequested) return;
        updateRequested = true;
        document.querySelector('#update-button').disabled = true;
        document.querySelector('#update-overlay').hidden = false;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => {
          if (!document.hidden && updateRequested) {
            document.querySelector('#update-overlay').hidden = true;
            banner.textContent = 'Update could not finish. Reload when ready to retry.';
            updateRequested = false;
          }
        }, 10000);
      };
    };
    if (registration.waiting) showUpdate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', showUpdate));
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateRequested) location.reload(); });
  } catch (error) { console.warn('Offline shell unavailable:', error); }
}
window.addEventListener('hashchange', () => { route(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); });
window.addEventListener('online', route);
window.addEventListener('offline', route);
let previousScroll = 0;
window.addEventListener('scroll', () => {
  const current = window.scrollY;
  document.querySelector('#scroll-top').hidden = current < window.innerHeight;
  if (Math.abs(current - previousScroll) > 14) {
    document.querySelector('.topbar').classList.toggle('is-hidden', current > previousScroll && current > 120);
    previousScroll = current;
  }
}, { passive: true });
document.querySelector('#scroll-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
await refreshDrafts();
route();
setupWorker();
