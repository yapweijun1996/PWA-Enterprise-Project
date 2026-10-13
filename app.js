import { listVariations, saveVariation, removeVariation, clearVariations } from './variation-storage.js';
import { createVariationEditor } from './variation-editor.js';
import { projects } from './demo-contracts.js';
import { projectTabs, contractCards, renderProjectPage, bindProjectPages } from './project-pages.js';
import { listDrafts, saveDraft, removeDraft, clearDrafts } from './storage.js';
import { escapeHtml, icon, money, displayDate, draftLabel } from './ui.js';
import { createDraftEditor, evidenceCards } from './draft-editor.js';
import { lineTotals, fromCents } from './demo-domain.js';

const sampleClaims = [
  { id: 'PCAR-DEMO-01', project: 'harbor', direction: 'Receivable', period: '2026-04', amount: '48000.00', status: 'Sample draft', certificate: 'Not yet certified' },
  { id: 'PCAP-DEMO-02', project: 'cedar', direction: 'Payable', period: '2026-05', amount: '18500.00', status: 'Sample reviewed', certificate: 'CCAP-DEMO-01 · Illustrative' }
];
const pages = [
  ['home', 'Overview', 'home'], ['projects', 'Projects', 'projects'], ['claims', 'Claims', 'claims'],
  ['inbox', 'Inbox', 'inbox'], ['parties', 'Parties', 'parties'], ['reports', 'Reports', 'reports'], ['settings', 'Settings', 'settings']
];
const mobilePages = [['home', 'Home', 'home'], ['projects', 'Projects', 'projects'], ['claims', 'Claims', 'claims'], ['inbox', 'Inbox', 'inbox'], ['more', 'More', 'more']];
const main = document.querySelector('#main');
const live = document.querySelector('#live-status');
const state = { drafts: [], storageError: '', variations: [], variationError: '', filter: '', direction: 'All', snapshotDirection: 'Receivable' };

const projectName = id => projects.find(project => project.id === id)?.name || 'Unknown demo project';
const announce = message => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = message; }); };
const heading = (title, subtitle, action = '') => '<div class="page-head"><div><h1>' + title + '</h1><p class="subtitle">' + subtitle + '</p></div>' + action + '</div>';
const notice = (text, type = '') => '<div class="notice ' + type + '" role="' + (type === 'error' ? 'alert' : 'note') + '">' + text + '</div>';
const pageLink = (route, text) => '<a class="text-link" href="#' + route + '">' + text + icon('arrow') + '</a>';
const newLink = (query = '') => '<a class="button" href="#new' + query + '">' + icon('plus') + 'New draft</a>';
const navLink = ([route, label, glyph], active) => '<a class="nav-item" href="#' + route + '" aria-label="' + label + '" title="' + label + '" ' + (active === route ? 'aria-current="page"' : '') + '>' + icon(glyph) + '<span class="nav-label">' + label + '</span></a>';
const mobileLink = ([route, label, glyph], active) => '<a href="#' + route + '" ' + (active === route || (route === 'more' && ['offline', 'evidence', 'settings', 'parties', 'reports'].includes(active)) ? 'aria-current="page"' : '') + '>' + icon(glyph) + label + '</a>';
const claimTitle = claim => claim.local ? draftLabel(claim) : claim.id;
let activeEditor = null;
let currentHash = location.hash || '#home';

async function refreshDrafts() {
  const results = await Promise.allSettled([listDrafts(), listVariations()]);
  for (const [index, records, error] of [[0, 'drafts', 'storageError'], [1, 'variations', 'variationError']]) {
    state[records] = results[index].status === 'fulfilled' ? results[index].value : [];
    state[error] = results[index].status === 'rejected' ? results[index].reason.message || 'Device storage unavailable.' : '';
  }
  const count = state.drafts.length + state.variations.length;
  const unavailable = state.storageError || state.variationError;
  document.querySelector('#draft-count').textContent = unavailable ? '—' : String(count);
  document.querySelector('#draft-count').parentElement.setAttribute('aria-label', unavailable ? 'Some device drafts unavailable' : count + ' device draft' + (count === 1 ? '' : 's'));
}
function snapshotControls() {
  return '<div class="segmented" role="group" aria-label="Financial direction">' + ['Receivable', 'Payable'].map(direction => '<button type="button" data-financial-direction="' + direction + '" aria-pressed="' + (state.snapshotDirection === direction) + '">' + direction + '</button>').join('') + '</div>';
}
function snapshotValues() {
  const values = state.snapshotDirection === 'Receivable' ? [120000, 100000, 90000, 60000] : [75000, 60000, 50000, 40000];
  return '<div class="financial-grid">' + ['Claimed', 'Certified', 'Invoiced', 'Paid'].map((label, index) => '<div><span class="label">' + label + '</span><p class="metric">' + values[index].toLocaleString('en-SG') + '</p><small class="meta">SGD · Sample</small></div>').join('') + '</div>';
}
function snapshotPanel() {
  return '<section class="panel section-gap"><div class="panel-head"><h2>Financial position</h2>' + snapshotControls() + '</div><div id="snapshot-values">' + snapshotValues() + '</div><p class="meta">Independent synthetic snapshot · October 2026. These are separate stages; do not add the figures together.</p></section>';
}
function layoutHome() {
  const latest = [...state.drafts].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  return heading('Overview', 'Welcome back, Alex. Pick up your project work.', newLink()) +
    (state.storageError ? notice('Device storage unavailable: ' + escapeHtml(state.storageError), 'error') : '') +
    '<div class="grid home-work"><section class="panel"><div class="panel-head"><h2>My work</h2><span class="status">Demo tasks</span></div><ul class="row-list"><li><a class="row-link" href="#claim/PCAR-DEMO-01"><span class="task-label"><span class="task-icon">' + icon('claims') + '</span><span><strong>Explore a receivable claim</strong><small>Harbor Exchange · Sample draft</small></span></span>' + icon('arrow') + '</a></li><li><a class="row-link" href="#new?project=cedar&direction=Payable"><span class="task-label"><span class="task-icon">' + icon('plus') + '</span><span><strong>Prepare a payable draft</strong><small>Cedar Station · SC-014</small></span></span>' + icon('arrow') + '</a></li></ul></section><section class="panel"><h2>Continue work</h2>' +
    (latest ? '<span class="status local">Saved on this device</span><h3 class="section-gap">' + escapeHtml(draftLabel(latest)) + '</h3><p class="meta">' + projectName(latest.project) + ' · ' + escapeHtml(latest.direction) + '<br>Saved ' + displayDate(latest.updatedAt) + '</p>' + pageLink('edit/' + encodeURIComponent(latest.id), 'Resume draft') : '<p class="meta">Your saved draft will appear here. Start with fictional project information.</p>' + pageLink('new', 'Start a draft')) +
    '</section></div>' + snapshotPanel() +
    '<section class="panel section-gap"><div class="panel-head"><h2>Recent projects</h2>' + pageLink('projects', 'View all') + '</div><ul class="row-list">' + projects.map(p => '<li><a class="row-link" href="#project/' + p.id + '"><span><strong>' + p.name + '</strong><small>' + p.description + ' · ' + p.contract + '</small></span><span class="text-link">Open project ' + icon('arrow') + '</span></a></li>').join('') + '</ul></section>';
}
function layoutProjects() {
  return heading('Projects', 'Your assigned demo projects.') + '<div class="grid cards">' + projects.map(p => '<article class="card"><p class="eyebrow">' + p.contract + ' · ' + p.place + '</p><h2>' + p.name + '</h2><p>' + p.description + '</p><p class="meta">Next action · Prepare a local claim draft</p>' + pageLink('project/' + p.id, 'Open project') + '</article>').join('') + '</div>';
}
function layoutProject(id, view = 'overview') {
  const project = projects.find(p => p.id === id);
  if (!project || !['overview', 'claims', 'evidence'].includes(view)) return layoutMissing();
  const related = allClaims().filter(c => c.project === id);
  const claims = '<section class="panel"><h2>Project claims</h2><ul class="row-list">' + related.map(c => '<li><a class="row-link" href="#claim/' + encodeURIComponent(c.id) + '"><span><strong>' + escapeHtml(claimTitle(c)) + '</strong><small>' + escapeHtml(c.direction) + ' · ' + escapeHtml(c.status) + '</small></span>' + icon('arrow') + '</a></li>').join('') + '</ul></section>';
  const evidence = state.drafts.filter(draft => draft.project === id && draft.attachments?.length);
  return heading(view === 'overview' ? project.name : view === 'claims' ? 'Project claims' : 'Project evidence', project.name + ' · ' + project.contract + ' · Synthetic', newLink('?project=' + id + '&direction=' + (id === 'cedar' ? 'Payable' : 'Receivable'))) + projectTabs(id, view) + (state.storageError ? notice('Local claim drafts could not be read: ' + escapeHtml(state.storageError), 'error') : '') +
    (view === 'claims' ? claims : view === 'evidence' ? '<section class="panel"><h2>Saved sample evidence</h2>' + (evidence.length ? evidence.map(draft => '<h3>' + escapeHtml(draftLabel(draft)) + '</h3>' + evidenceCards(draft.attachments) + '<a class="text-link" href="#claim/' + encodeURIComponent(draft.id) + '">Open draft</a>').join('') : notice(state.storageError ? 'Saved evidence is unavailable while device storage cannot be read.' : 'No sample evidence saved for this project. Add a sample file in a claim draft.')) + '</section>' :
      contractCards(id) + '<div class="grid columns section-gap"><section class="panel"><h2>Project overview</h2><dl class="key-values"><div><dt>Contract</dt><dd>' + project.contract + ' · Sample</dd></div><div><dt>Counterparty</dt><dd>' + project.party + '</dd></div></dl><a class="text-link" href="#project/' + id + '/sov">Explore SOV ' + icon('arrow') + '</a><br><a class="text-link" href="#project/' + id + '/variations">Explore variations ' + icon('arrow') + '</a><p class="meta">Only sample approved variations enter the illustrative revised contract. Device drafts do not change these fixtures.</p></section>' + claims + '</div>');
}
function allClaims() {
  return [...sampleClaims, ...state.drafts.map(d => ({ ...d, local: true, status: d.reviewedAt ? 'Reviewed on device' : 'Device-only draft', certificate: 'Not yet certified' }))];
}
function claimRecords() {
  const query = state.filter.toLocaleLowerCase();
  const records = allClaims().filter(c => (state.direction === 'All' || c.direction === state.direction) && (c.id + ' ' + claimTitle(c) + ' ' + projectName(c.project) + ' ' + c.period).toLocaleLowerCase().includes(query));
  if (!records.length) return notice('No matching claims. Clear the filters or create a local draft.');
  return '<div class="records"><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Document</th><th scope="col">Project / period</th><th class="amount" scope="col">Claimed · SGD</th><th scope="col">Claim state</th><th scope="col">Certification</th></tr></thead><tbody>' + records.map(c => '<tr><td>' + pageLink('claim/' + encodeURIComponent(c.id), escapeHtml(claimTitle(c))) + '<span class="meta">' + escapeHtml(c.direction) + '</span></td><td>' + projectName(c.project) + '<span class="meta">' + escapeHtml(c.period || 'Period not set') + '</span></td><td class="amount">' + money(c.amount) + '</td><td><span class="status ' + (c.local ? 'local' : '') + '">' + escapeHtml(c.status) + '</span></td><td>' + escapeHtml(c.certificate) + '</td></tr>').join('') +
    '</tbody></table></div><div class="mobile-records">' + records.map(c => '<a href="#claim/' + encodeURIComponent(c.id) + '"><span class="record-top"><strong>' + escapeHtml(claimTitle(c)) + '</strong><span class="status ' + (c.local ? 'local' : '') + '">' + escapeHtml(c.status) + '</span></span><span class="meta">' + projectName(c.project) + ' · ' + escapeHtml(c.period || 'Period not set') + ' · ' + escapeHtml(c.direction) + '</span><span class="record-amount"><span>Claimed</span><strong>' + money(c.amount) + '</strong></span><span class="meta">' + escapeHtml(c.certificate) + '</span></a>').join('') + '</div></div>';
}
function layoutClaims() {
  return heading('Claims', 'Receivable and payable claims across your demo projects.', newLink(state.direction === 'Payable' ? '?direction=Payable' : '')) +
    (state.storageError ? notice('Local drafts unavailable: ' + escapeHtml(state.storageError), 'error') : '') + '<section class="panel"><div class="filters"><label>Search claims<input id="claim-search" type="search" placeholder="Document or project" value="' + escapeHtml(state.filter) + '"></label><label>Direction<select id="direction-filter"><option>All</option><option ' + (state.direction === 'Receivable' ? 'selected' : '') + '>Receivable</option><option ' + (state.direction === 'Payable' ? 'selected' : '') + '>Payable</option></select></label></div><div id="claim-results">' + claimRecords() + '</div></section>';
}
function layoutClaim(id) {
  const claim = allClaims().find(c => c.id === id);
  if (!claim) return layoutMissing();
  const totals = lineTotals(claim.lines || []);
  return heading(escapeHtml(claimTitle(claim)), projectName(claim.project) + ' · ' + escapeHtml(claim.direction) + ' · ' + escapeHtml(claim.period || 'Period not set'), claim.local ? '<a class="button" href="#edit/' + encodeURIComponent(claim.id) + '">' + icon('claims') + 'Edit draft</a>' : '<a class="button secondary" href="#claims">' + icon('back') + 'Back to claims</a>') +
    '<div class="grid columns"><section class="panel"><h2>Claim details</h2><dl class="key-values"><div><dt>This period · Illustrative</dt><dd>' + money(claim.amount) + '</dd></div><div><dt>Claim state</dt><dd><span class="status ' + (claim.local ? 'local' : '') + '">' + escapeHtml(claim.status) + '</span></dd></div><div><dt>Certification</dt><dd>' + escapeHtml(claim.certificate) + '</dd></div><div><dt>Period</dt><dd>' + escapeHtml(claim.period || 'Not set') + '</dd></div></dl>' +
    (claim.local ? '<p class="review-note"><strong>Period note:</strong> ' + escapeHtml(claim.notes || 'None') + '</p><p class="meta">Saved on this device · ' + displayDate(claim.updatedAt) + '</p>' +
      (claim.reviewedAt ? '<p class="meta">Local review · ' + displayDate(claim.reviewedAt) + ' · Not submitted</p>' : '') +
      (claim.lines?.length ? '<h2 class="section-gap">Claim lines</h2><ul class="row-list">' + claim.lines.map(line => '<li class="review-line"><span>' + escapeHtml(line.id + ' · ' + line.title) + '<small class="meta">' + escapeHtml(line.note || '') + '</small></span><strong>' + money(line.current || '0') + '</strong></li>').join('') + '</ul><p class="meta">Previous: ' + money(fromCents(totals.previous)) + ' · Cumulative: ' + money(fromCents(totals.cumulative)) + ' · Synthetic source</p>' : '') +
      '<h2 class="section-gap">Sample evidence</h2>' + evidenceCards(claim.attachments || []) +
      '<details class="section-gap"><summary>Technical reference</summary><p class="meta">' + escapeHtml(claim.id) + '</p><p class="meta">Source: ' + escapeHtml(claim.sourceVersion || 'Legacy demo amount') + '</p></details><button class="button danger section-gap" id="delete-draft" type="button" data-id="' + escapeHtml(claim.id) + '">Delete local draft</button>' : '<p class="meta">Synthetic record for navigation and layout review.</p>') +
    '</section><aside class="panel"><h2>' + (claim.local ? 'Saved on this device' : 'Sample workflow') + '</h2><p class="meta">' + (claim.local ? 'Not submitted or synchronized. Device storage is not a backup.' : 'Claim, certificate, invoice and payment are separate stages. These examples are not issued business documents.') + '</p><a class="text-link" href="#claims">' + icon('back') + 'Back to claims</a></aside></div>';
}

function layoutOffline() {
  const content = state.drafts.length ? '<ul class="row-list">' + state.drafts.map(d => '<li><a class="row-link" href="#edit/' + encodeURIComponent(d.id) + '"><span><strong>' + escapeHtml(draftLabel(d)) + '</strong><small>' + projectName(d.project) + ' · Saved ' + displayDate(d.updatedAt) + '</small></span><span class="status local">Device only</span></a></li>').join('') + '</ul>' : notice('No device drafts yet. Start a draft to try reload and offline recovery.');
  return heading('Device drafts', 'Work stored in this browser. No synchronization is connected.', newLink()) +
    '<p class="meta" data-connection-description></p>' + (state.storageError ? notice('Local storage error: ' + escapeHtml(state.storageError), 'error') : '') +
    '<section class="panel section-gap"><h2>Variation proposals · ' + state.variations.length + '</h2>' + (state.variationError ? notice('Proposal storage error: ' + escapeHtml(state.variationError), 'error') : state.variations.length ? '<ul class="row-list">' + state.variations.map(item => '<li><a class="row-link" href="#variation-edit/' + encodeURIComponent(item.id) + '"><span><strong>' + escapeHtml(item.title || 'Untitled proposal') + '</strong><small>' + projectName(item.project) + ' · Not approved</small></span>' + icon('arrow') + '</a></li>').join('') + '</ul>' : notice('No local variation proposals. Open a project’s Variations page to create one.')) + '</section><div class="grid columns section-gap"><section class="panel"><h2>Claim drafts · ' + state.drafts.length + '</h2>' + content + '</section><aside class="panel"><h2>Recovery on this device</h2><p class="meta">Cached app files can open offline after the first successful visit. Site data clearing or storage eviction may remove drafts. No cross-device backup or server acceptance exists.</p></aside></div>';
}
function layoutInbox() { return heading('Inbox', 'Your review tasks and decisions.') + '<section class="panel"><h2>No review tasks</h2><p class="meta">The demo has no connected account or approval service. You can review a fictional draft on this device.</p>' + pageLink('claims', 'Explore claims') + '</section>'; }
function layoutEvidence() {
  const records = state.drafts.filter(draft => draft.attachments?.length);
  return heading('Evidence', 'Synthetic file content saved with device drafts.') + (state.storageError ? notice('Device storage unavailable: ' + escapeHtml(state.storageError), 'error') : '') +
    (records.length ? records.map(draft => '<section class="panel section-gap"><div class="panel-head"><h2>' + escapeHtml(draftLabel(draft)) + '</h2>' + pageLink('claim/' + encodeURIComponent(draft.id), 'Open draft') + '</div><p class="meta">' + projectName(draft.project) + ' · ' + escapeHtml(draft.direction) + '</p>' + evidenceCards(draft.attachments) + '</section>').join('') : '<section class="panel"><h2>No evidence yet</h2><p class="meta">Open a draft to add synthetic text documents. No real file capture or upload is connected.</p>' + pageLink('new', 'Start a draft') + '</section>');
}
function layoutMore() { return heading('More', 'Tools and workspace settings.') + '<div class="grid cards">' + [['parties','Parties'],['reports','Reports'],['evidence','Evidence'],['offline','Device drafts'],['settings','Settings']].map(([r,l]) => '<div class="card"><h2>' + l + '</h2>' + pageLink(r, 'Open') + '</div>').join('') + '</div>'; }
function layoutParties() { return heading('Parties', 'Synthetic counterparties for the demo projects.') + '<div class="grid cards">' + projects.map(p => '<article class="card"><h2>' + p.party + '</h2><p>' + p.name + ' · ' + p.contract + '</p><span class="status">Sample counterparty</span></article>').join('') + '</div>'; }
function layoutReports() { return heading('Reports', 'Independent synthetic financial positions.') + snapshotPanel() + '<p class="meta">This snapshot is not calculated from device drafts. No financial ledger or production reporting service is connected.</p>'; }
function layoutSettings() { return heading('Settings', 'Local demo controls.') + '<section class="panel"><h2>Device data</h2><p class="meta">Delete claim drafts or variation proposals in this browser. This cannot be undone and does not affect synthetic examples.</p><button class="button danger" id="clear-drafts" type="button" ' + (state.drafts.length ? '' : 'disabled') + '>Delete all claim drafts</button><button class="button danger" id="clear-variations" type="button" ' + (state.variations.length ? '' : 'disabled') + '>Delete all variation proposals</button><h2 class="section-gap">Demo scope</h2><p class="meta">Use fictional information. Identity, project permissions, submission, certification, invoicing, payment and synchronization are not connected. Browser storage is not a secure business record or backup.</p></section>'; }
function layoutMissing() { return heading('Page not found', 'No demo record exists for this address.') + '<a class="button secondary" href="#home">Back to overview</a>'; }
function updateConnectivity() {
  document.querySelectorAll('[data-connectivity]').forEach(el => { el.textContent = navigator.onLine ? 'Online' : 'Offline'; el.classList.toggle('is-offline', !navigator.onLine); el.setAttribute('aria-label', (navigator.onLine ? 'Online' : 'Offline') + ' · Open device drafts'); });
  document.querySelectorAll('[data-connection-description]').forEach(el => { el.textContent = navigator.onLine ? 'Browser reports online. Drafts remain on this device only.' : 'Browser reports offline. Cached app and saved drafts remain available on this device.'; });
}
function route() {
  activeEditor?.dispose();
  activeEditor = null;
  const raw = location.hash.slice(1) || 'home';
  currentHash = location.hash || '#home';
  let path;
  try { path = decodeURIComponent(raw.split('?')[0]).split('/'); } catch { path = ['missing']; }
  const active = path[0];
  const section = ['new', 'claim', 'edit'].includes(active) ? 'claims' : ['project', 'variation-new', 'variation-edit'].includes(active) ? 'projects' : active;
  document.querySelector('#desktop-nav').innerHTML = pages.map(page => navLink(page, section)).join('');
  document.querySelector('#mobile-nav').innerHTML = mobilePages.map(page => mobileLink(page, section)).join('');
  const claimTask = active === 'new' || active === 'edit';
  const variationTask = active === 'variation-new' || active === 'variation-edit';
  const focusedTask = claimTask || variationTask;
  document.body.classList.toggle('task-mode', focusedTask);
  if (claimTask) {
    const record = active === 'edit' ? state.drafts.find(draft => draft.id === path[1]) : null;
    if (active === 'edit' && !record) {
      main.innerHTML = state.storageError ? heading('Draft unavailable', 'Device storage could not be read.') + notice(escapeHtml(state.storageError), 'error') + pageLink('offline', 'Open device drafts') : layoutMissing();
    } else {
      const query = new URLSearchParams(raw.split('?')[1] || '');
      const context = { project: projects.some(project => project.id === query.get('project')) ? query.get('project') : 'harbor', direction: query.get('direction') === 'Payable' ? 'Payable' : 'Receivable' };
      activeEditor = createDraftEditor({
        root: main, record, context, projects, announce,
        onSave: async draft => {
          await saveDraft(draft);
          await refreshDrafts();
          if (state.storageError || !state.drafts.some(item => item.id === draft.id && item.updatedAt === draft.updatedAt)) throw new Error('Device read-back failed after the write.');
        },
        onRouteChange: id => { currentHash = '#edit/' + encodeURIComponent(id); history.replaceState(null, '', currentHash); },
        onDone: id => { location.hash = '#claim/' + encodeURIComponent(id); }
      });
    }
  } else if (variationTask) {
    const record = active === 'variation-edit' ? state.variations.find(item => item.id === path[1]) : null;
    const projectId = record?.project || path[1];
    if ((active === 'variation-edit' && !record) || !projects.some(item => item.id === projectId)) {
      main.innerHTML = state.variationError ? heading('Proposal unavailable', 'Device storage could not be read.') + notice(escapeHtml(state.variationError), 'error') + pageLink('offline', 'Open device drafts') : layoutMissing();
    } else {
      activeEditor = createVariationEditor({
        root: main, record, projectId, announce,
        onSave: async proposal => {
          await saveVariation(proposal);
          await refreshDrafts();
          if (state.variationError || !state.variations.some(item => item.id === proposal.id && item.updatedAt === proposal.updatedAt)) throw new Error('Device read-back failed after the write.');
        },
        onRouteChange: id => { currentHash = '#variation-edit/' + encodeURIComponent(id); history.replaceState(null, '', currentHash); },
        onDone: id => { location.hash = '#project/' + projectId + '/variations/' + encodeURIComponent(id); }
      });
    }
  } else {
    const views = { home: layoutHome, projects: layoutProjects, claims: layoutClaims, offline: layoutOffline, inbox: layoutInbox, evidence: layoutEvidence, more: layoutMore, parties: layoutParties, reports: layoutReports, settings: layoutSettings };
    main.innerHTML = active === 'project' ? (['sov', 'variations'].includes(path[2]) ? renderProjectPage(path[1], path[2], path[3], state.drafts, state.variations, state.variationError, state.storageError) || layoutMissing() : layoutProject(path[1], path[2])) : active === 'claim' ? layoutClaim(path[1]) : views[active]?.() || layoutMissing();
    bindPage();
    if (active === 'project') bindProjectPages(main, path[1], state.variations);
  }
  document.title = (main.querySelector('h1')?.textContent || 'Demo') + ' — ConstructClaim Demo';
  updateConnectivity();
}
function bindPage() {
  document.querySelector('#delete-variation')?.addEventListener('click', async event => {
    const { id, project } = event.currentTarget.dataset;
    if (!confirm('Permanently delete this device-only variation proposal?')) return;
    try { await removeVariation(id); await refreshDrafts(); if (state.variationError || state.variations.some(item => item.id === id)) throw new Error('Device read-back failed after deletion.'); location.hash = '#project/' + project + '/variations'; announce('Local proposal deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
  });
  document.querySelector('#clear-variations')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only variation proposals?')) return;
    try { await clearVariations(); await refreshDrafts(); if (state.variationError || state.variations.length) throw new Error('Device read-back failed after deletion.'); route(); announce('Local variation proposals deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
  });
  document.querySelectorAll('[data-financial-direction]').forEach(button => button.addEventListener('click', () => {
    state.snapshotDirection = button.dataset.financialDirection;
    document.querySelectorAll('[data-financial-direction]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    document.querySelector('#snapshot-values').innerHTML = snapshotValues();
  }));
  const search = document.querySelector('#claim-search');
  search?.addEventListener('input', () => { state.filter = search.value; document.querySelector('#claim-results').innerHTML = claimRecords(); });
  document.querySelector('#direction-filter')?.addEventListener('change', event => { state.direction = event.target.value; document.querySelector('#claim-results').innerHTML = claimRecords(); document.querySelector('.page-head .button').href = '#new' + (state.direction === 'Payable' ? '?direction=Payable' : ''); });
  document.querySelector('#delete-draft')?.addEventListener('click', async event => {
    const id = event.currentTarget.dataset.id;
    if (!confirm('Permanently delete this device-only draft?')) return;
    try { await removeDraft(id); await refreshDrafts(); if (state.storageError) throw new Error('Device read-back failed after deletion.'); location.hash = '#offline'; announce('Device draft deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
  });
  document.querySelector('#clear-drafts')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only claim drafts?')) return;
    try { await clearDrafts(); await refreshDrafts(); if (state.storageError) throw new Error('Device read-back failed after deletion.'); route(); announce('All device claim drafts deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
  });
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
        if (activeEditor?.dirty || activeEditor?.busy) { announce('Save your draft before updating the app.'); const message = document.querySelector('#update-notice > span'); if (message) message.textContent = 'Save your draft before updating the app.'; return; }
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
function collapseNavigation() {
  document.body.classList.remove('nav-expanded');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
  document.querySelector('#menu-toggle').setAttribute('aria-label', 'Expand navigation');
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains('skip-link') || link.hash === currentHash || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
  if (activeEditor && !activeEditor.canLeave()) event.preventDefault();
});
window.addEventListener('hashchange', () => {
  if ((location.hash || '#home') === currentHash) return;
  if (activeEditor && !activeEditor.canLeave()) { history.replaceState(null, '', currentHash); return; }
  collapseNavigation();
  route();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
window.addEventListener('beforeunload', event => {
  if (activeEditor?.dirty || activeEditor?.busy) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('online', updateConnectivity);
window.addEventListener('offline', updateConnectivity);
window.addEventListener('scroll', () => { document.querySelector('#scroll-top').hidden = window.scrollY < window.innerHeight; }, { passive: true });
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus({ preventScroll: true }); main.scrollIntoView(); });
const menu = document.querySelector('#menu-toggle');
menu.innerHTML = icon('menu');
menu.addEventListener('click', () => {
  const expanded = document.body.classList.toggle('nav-expanded');
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
});
window.addEventListener('keydown', event => { if (event.key === 'Escape') collapseNavigation(); });
window.addEventListener('resize', collapseNavigation);
document.querySelector('#scroll-top').innerHTML = icon('up');
document.querySelector('#scroll-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
await refreshDrafts();
route();
setupWorker();
