import { listVariations, saveVariation, removeVariation, clearVariations } from './variation-storage.js';
import { createVariationEditor } from './variation-editor.js';
import { projects } from './demo-contracts.js';
import { projectTabs, contractCards, renderProjectPage, bindProjectPages } from './project-pages.js';
import { listDrafts, saveDraft, removeDraft, clearDrafts } from './storage.js';
import { escapeHtml, icon, money, displayDate, draftLabel } from './ui.js';
import { createDraftEditor, evidenceCards } from './draft-editor.js';
import { lineTotals, fromCents } from './demo-domain.js';
import { sampleClaims } from './demo-claims.js';
import { listCertificates, saveCertificate, removeCertificate, clearCertificates } from './certificate-storage.js';
import { createCertificateEditor } from './certificate-editor.js';
import { canAssess } from './certificate-domain.js';
import { sampleCertificates } from './demo-certificates.js';
import { sampleEvidence } from './sample-evidence.js';
import { loadPracticeRecords, resetPracticeRecords } from './demo-practice.js';
import { certificateRecords, certificateDetail } from './certificate-pages.js';
import { listEvidence, saveEvidence, removeEvidence, clearEvidence } from './evidence-storage.js';
import { createEvidenceEditor } from './evidence-editor.js';
import { linkedEvidence } from './evidence-domain.js';
import { captureLink, evidenceGallery, bindEvidenceGallery, evidenceDetail } from './evidence-pages.js';
import { settingsPage } from './settings-page.js';
import { createPwaUpdates } from './pwa-updates.js';

const pages = [
  ['home', 'Overview', 'home'], ['projects', 'Projects', 'projects'], ['claims', 'Claims', 'claims'],
  ['inbox', 'Inbox', 'inbox'], ['parties', 'Parties', 'parties'], ['reports', 'Reports', 'reports'], ['settings', 'Settings', 'settings']
];
const mobilePages = [['home', 'Home', 'home'], ['projects', 'Projects', 'projects'], ['claims', 'Claims', 'claims'], ['inbox', 'Inbox', 'inbox'], ['more', 'More', 'more']];
const main = document.querySelector('#main');
const live = document.querySelector('#live-status');
const state = { drafts: [], storageError: '', variations: [], variationError: '', certificates: [], certificateError: '', evidence: [], evidenceError: '', filter: '', direction: 'All', snapshotDirection: 'Receivable', practiceFeedback: '' };

const projectName = id => projects.find(project => project.id === id)?.name || 'Unknown demo project';
const announce = message => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = message; pwa.reconsider(); }); };
const heading = (title, subtitle, action = '') => '<div class="page-head"><div><h1>' + title + '</h1><p class="subtitle">' + subtitle + '</p></div>' + action + '</div>';
const notice = (text, type = '') => '<div class="notice ' + type + '" role="' + (type === 'error' ? 'alert' : 'note') + '">' + text + '</div>';
const pageLink = (route, text) => '<a class="text-link" href="#' + route + '">' + text + icon('arrow') + '</a>';
const newLink = (query = '') => '<a class="button" href="#new' + query + '">' + icon('plus') + 'New draft</a>';
const navLink = ([route, label, glyph], active) => '<a class="nav-item" href="#' + route + '" aria-label="' + label + '" title="' + label + '" ' + (active === route ? 'aria-current="page"' : '') + '>' + icon(glyph) + '<span class="nav-label">' + label + '</span></a>';
const mobileLink = ([route, label, glyph], active) => '<a href="#' + route + '" ' + (active === route || (route === 'more' && ['offline', 'evidence', 'settings', 'parties', 'reports'].includes(active)) ? 'aria-current="page"' : '') + '>' + icon(glyph) + label + '</a>';
const claimTitle = claim => claim.local ? draftLabel(claim) : claim.id;
let activeEditor = null;
let currentHash = location.hash || '#home';
let deviceChanges = 0;
const pwa = createPwaUpdates({ isBusy: () => Boolean(activeEditor?.dirty || activeEditor?.busy || deviceChanges), document, navigator, window });
function beginDeviceChange() {
  deviceChanges++;
  return () => { deviceChanges--; pwa.reconsider(); };
}

async function refreshDrafts() {
  const results = await Promise.allSettled([listDrafts(), listVariations(), listCertificates(), listEvidence()]);
  for (const [index, records, error] of [[0, 'drafts', 'storageError'], [1, 'variations', 'variationError'], [2, 'certificates', 'certificateError'], [3, 'evidence', 'evidenceError']]) {
    state[records] = results[index].status === 'fulfilled' ? results[index].value : [];
    state[error] = results[index].status === 'rejected' ? results[index].reason.message || 'Device storage unavailable.' : '';
  }
  const count = state.drafts.length + state.variations.length + state.certificates.length + state.evidence.length;
  const unavailable = state.storageError || state.variationError || state.certificateError || state.evidenceError;
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
  if (view === 'evidence') return layoutEvidence(id);
  const related = allClaims().filter(c => c.project === id);
  const claims = '<section class="panel"><h2>Project claims</h2><ul class="row-list">' + related.map(c => '<li><a class="row-link" href="#claim/' + encodeURIComponent(c.id) + '"><span><strong>' + escapeHtml(claimTitle(c)) + '</strong><small>' + escapeHtml(c.direction) + ' · ' + escapeHtml(c.status) + '</small></span>' + icon('arrow') + '</a></li>').join('') + '</ul></section>';
  return heading(view === 'overview' ? project.name : view === 'claims' ? 'Project claims' : 'Project evidence', project.name + ' · ' + project.contract + ' · Synthetic', newLink('?project=' + id + '&direction=' + project.defaultDirection)) + projectTabs(id, view) + (state.storageError ? notice('Local claim drafts could not be read: ' + escapeHtml(state.storageError), 'error') : '') +
    (view === 'claims' ? claims :
      contractCards(id) + '<div class="grid columns section-gap"><section class="panel"><h2>Project overview</h2><dl class="key-values"><div><dt>Contract</dt><dd>' + project.contract + ' · Sample</dd></div><div><dt>Counterparty</dt><dd>' + project.party + '</dd></div></dl><a class="text-link" href="#project/' + id + '/sov">Explore SOV ' + icon('arrow') + '</a><br><a class="text-link" href="#project/' + id + '/variations">Explore variations ' + icon('arrow') + '</a><p class="meta">Only sample approved variations enter the illustrative revised contract. Device drafts do not change these fixtures.</p></section>' + claims + '</div>');
}
function allClaims() {
  const samples = sampleClaims.map(claim => {
    const preview = sampleCertificates.find(item => item.source.id === claim.id);
    return { ...claim, sample: true, certificate: preview ? preview.id + ' · Illustrative' : claim.certificate || 'Not yet certified' };
  });
  return [...samples, ...state.drafts.map(d => ({ ...d, local: true, status: d.reviewedAt ? 'Reviewed on device' : 'Device-only draft', certificate: state.certificateError ? 'Preview storage unavailable' : state.certificates.some(item => item.source.id === d.id) ? 'Local preview · Not issued' : 'Not yet certified' }))];
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
    pageLink('certificates', 'Open certificate previews') + (state.storageError ? notice('Local drafts unavailable: ' + escapeHtml(state.storageError), 'error') : '') + '<section class="panel section-gap"><div class="filters"><label>Search claims<input id="claim-search" type="search" placeholder="Document or project" value="' + escapeHtml(state.filter) + '"></label><label>Direction<select id="direction-filter"><option>All</option><option ' + (state.direction === 'Receivable' ? 'selected' : '') + '>Receivable</option><option ' + (state.direction === 'Payable' ? 'selected' : '') + '>Payable</option></select></label></div><div id="claim-results">' + claimRecords() + '</div></section>';
}
function layoutClaim(id) {
  const claim = allClaims().find(c => c.id === id);
  if (!claim) return layoutMissing();
  const totals = lineTotals(claim.lines || []);
  return heading(escapeHtml(claimTitle(claim)), projectName(claim.project) + ' · ' + escapeHtml(claim.direction) + ' · ' + escapeHtml(claim.period || 'Period not set'), claim.local ? '<a class="button" href="#edit/' + encodeURIComponent(claim.id) + '">' + icon('claims') + 'Edit draft</a>' : '<a class="button secondary" href="#claims">' + icon('back') + 'Back to claims</a>') +
    '<div class="grid columns"><section class="panel"><h2>Claim details</h2><dl class="key-values"><div><dt>This period · Illustrative</dt><dd>' + money(claim.amount) + '</dd></div><div><dt>Claim state</dt><dd><span class="status ' + (claim.local ? 'local' : '') + '">' + escapeHtml(claim.status) + '</span></dd></div><div><dt>Certification</dt><dd>' + escapeHtml(claim.certificate) + '</dd></div><div><dt>Period</dt><dd>' + escapeHtml(claim.period || 'Not set') + '</dd></div></dl>' +
    '<p class="review-note"><strong>Period note:</strong> ' + escapeHtml(claim.notes || 'None') + '</p><p class="meta">' + (claim.local ? 'Saved on this device' : 'Bundled fictional sample') + (claim.updatedAt ? ' · ' + displayDate(claim.updatedAt) : '') + '</p>' +
    (claim.reviewedAt ? '<p class="meta">' + (claim.local ? 'Local review' : 'Sample review') + ' · ' + displayDate(claim.reviewedAt) + ' · Not submitted</p>' : '') +
    (claim.lines?.length ? '<h2 class="section-gap">Claim lines</h2><ul class="row-list">' + claim.lines.map(line => '<li class="review-line"><span>' + escapeHtml(line.id + ' · ' + line.title) + '<small class="meta">' + escapeHtml(line.note || '') + '</small></span><strong>' + money(line.current || '0') + '</strong></li>').join('') + '</ul><p class="meta">Previous: ' + money(fromCents(totals.previous)) + ' · Cumulative: ' + money(fromCents(totals.cumulative)) + ' · Synthetic source</p>' : '') +
    '<h2 class="section-gap">Evidence</h2>' + evidenceCards(claim.attachments || []) +
    '<details class="section-gap"><summary>Technical reference</summary><p class="meta">' + escapeHtml(claim.id) + '</p><p class="meta">Source: ' + escapeHtml(claim.sourceVersion || 'Legacy demo amount') + '</p></details>' + (claim.local ? '<button class="button danger section-gap" id="delete-draft" type="button" data-id="' + escapeHtml(claim.id) + '">Delete local draft</button>' : '') +
    '<h2 class="section-gap">Linked images</h2>' + (state.evidenceError ? notice('Device image storage unavailable: ' + escapeHtml(state.evidenceError), 'error') : '') + evidenceCards(linkedEvidence([...sampleEvidence, ...state.evidence], id, claim.project)) + captureLink(claim.project, id) + '</section><aside class="panel"><h2>Certification</h2><p class="meta">Independent previews. The claim amount remains unchanged.</p>' + (canAssess(claim) ? '<a class="button" href="#certificate-new/' + encodeURIComponent(id) + '">Start assessment</a>' : '<p class="meta">Locally review a valid claim before starting an assessment.</p>') + certificateRecords(state.certificates.filter(item => item.source.id === id), state.certificateError) + (sampleCertificates.some(item => item.source.id === id) ? '<h3 class="section-gap">Sample previews</h3>' + certificateRecords(sampleCertificates.filter(item => item.source.id === id)) : '') + '<h3 class="section-gap">' + (claim.local ? 'Saved on this device' : 'Sample workflow') + '</h3><p class="meta">' + (claim.local ? 'Not submitted or synchronized. Device storage is not a backup.' : 'Claim, certificate, invoice and payment are separate stages. These examples are not issued business documents.') + '</p><a class="text-link" href="#claims">' + icon('back') + 'Back to claims</a></aside></div>';
}

function layoutCertificates() {
  return heading('Certificate previews', 'Sample and device-local assessments · Not issued') + '<section class="panel"><h2>Local assessments</h2>' + certificateRecords(state.certificates, state.certificateError) + '</section><section class="panel section-gap"><h2>Illustrative examples · ' + sampleCertificates.length + '</h2>' + certificateRecords(sampleCertificates) + '</section>';
}

function layoutOffline() {
  const content = state.drafts.length ? '<ul class="row-list">' + state.drafts.map(d => '<li><a class="row-link" href="#edit/' + encodeURIComponent(d.id) + '"><span><strong>' + escapeHtml(draftLabel(d)) + '</strong><small>' + projectName(d.project) + ' · Saved ' + displayDate(d.updatedAt) + '</small></span><span class="status local">Device only</span></a></li>').join('') + '</ul>' : notice('No device drafts yet. Start a draft to try reload and offline recovery.');
  const images = state.evidenceError ? notice('Image storage unavailable: ' + escapeHtml(state.evidenceError), 'error') : state.evidence.length ? '<ul class="row-list">' + state.evidence.map(item => '<li><a class="row-link" href="#evidence/' + encodeURIComponent(item.id) + '"><span><strong>' + escapeHtml(item.file.name) + '</strong><small>' + projectName(item.context.project) + ' · ' + escapeHtml(item.context.reference) + ' · Not uploaded</small></span>' + icon('arrow') + '</a></li>').join('') + '</ul>' : notice('No device-local images yet. Open Evidence to add one.');
  return heading('Device drafts', 'Work stored in this browser. No synchronization is connected.', newLink()) + '<section class="panel"><h2>Device evidence · ' + state.evidence.length + '</h2>' + images + '</section>' +
    '<p class="meta" data-connection-description></p>' + (state.storageError ? notice('Local storage error: ' + escapeHtml(state.storageError), 'error') : '') + '<section class="panel section-gap"><h2>Certificate previews · ' + state.certificates.length + '</h2>' + certificateRecords(state.certificates, state.certificateError) + '</section>' +
    '<section class="panel section-gap"><h2>Variation proposals · ' + state.variations.length + '</h2>' + (state.variationError ? notice('Proposal storage error: ' + escapeHtml(state.variationError), 'error') : state.variations.length ? '<ul class="row-list">' + state.variations.map(item => '<li><a class="row-link" href="#variation-edit/' + encodeURIComponent(item.id) + '"><span><strong>' + escapeHtml(item.title || 'Untitled proposal') + '</strong><small>' + projectName(item.project) + ' · Not approved</small></span>' + icon('arrow') + '</a></li>').join('') + '</ul>' : notice('No local variation proposals. Open a project’s Variations page to create one.')) + '</section><div class="grid columns section-gap"><section class="panel"><h2>Claim drafts · ' + state.drafts.length + '</h2>' + content + '</section><aside class="panel"><h2>Recovery on this device</h2><p class="meta">Cached app files can open offline after the first successful visit. Site data clearing or storage eviction may remove drafts. No cross-device backup or server acceptance exists.</p></aside></div>';
}
function layoutInbox() { return heading('Inbox', 'Your review tasks and decisions.') + '<section class="panel"><h2>No review tasks</h2><p class="meta">The demo has no connected account or approval service. You can review a fictional draft on this device.</p>' + pageLink('claims', 'Explore claims') + '</section>'; }
function evidenceData(projectId = '') {
  return { records: [...sampleEvidence, ...state.evidence], claims: [...sampleClaims, ...state.drafts], currentClaims: allClaims(), projectId, error: state.evidenceError, claimError: state.storageError };
}
function layoutEvidence(projectId = '') {
  return evidenceGallery(evidenceData(projectId));
}
function layoutMore() { return heading('More', 'Tools and workspace settings.') + '<div class="grid cards">' + [['parties','Parties'],['reports','Reports'],['evidence','Evidence'],['offline','Device drafts'],['settings','Settings']].map(([r,l]) => '<div class="card"><h2>' + l + '</h2>' + pageLink(r, 'Open') + '</div>').join('') + '</div>'; }
function layoutParties() { return heading('Parties', 'Synthetic counterparties for the demo projects.') + '<div class="grid cards">' + projects.map(p => '<article class="card"><h2>' + p.party + '</h2><p>' + p.name + ' · ' + p.contract + '</p><span class="status">Sample counterparty</span></article>').join('') + '</div>'; }
function layoutReports() { return heading('Reports', 'Independent synthetic financial positions.') + snapshotPanel() + '<p class="meta">This snapshot is not calculated from device drafts. No financial ledger or production reporting service is connected.</p>'; }
function layoutSettings() { return settingsPage(state); }
function layoutMissing() { return heading('Page not found', 'No demo record exists for this address.') + '<a class="button secondary" href="#home">Back to overview</a>'; }
function updateConnectivity() {
  document.querySelectorAll('[data-connectivity]').forEach(el => { el.textContent = navigator.onLine ? 'Online' : 'Offline'; el.classList.toggle('is-offline', !navigator.onLine); el.setAttribute('aria-label', (navigator.onLine ? 'Online' : 'Offline') + ' · Open device drafts'); });
  document.querySelectorAll('[data-connection-description]').forEach(el => { el.textContent = navigator.onLine ? 'Browser reports online. Drafts remain on this device only.' : 'Browser reports offline. Cached app and saved drafts remain available on this device.'; });
  pwa.paint();
}
function route() {
  activeEditor?.dispose();
  activeEditor = null;
  const raw = location.hash.slice(1) || 'home';
  currentHash = location.hash || '#home';
  let path;
  try { path = decodeURIComponent(raw.split('?')[0]).split('/'); } catch { path = ['missing']; }
  const active = path[0];
  const section = ['new', 'claim', 'edit', 'certificates', 'certificate', 'certificate-new', 'certificate-edit'].includes(active) ? 'claims' : ['project', 'variation-new', 'variation-edit'].includes(active) ? 'projects' : active === 'evidence-new' ? 'evidence' : active;
  document.querySelector('#desktop-nav').innerHTML = pages.map(page => navLink(page, section)).join('');
  document.querySelector('#mobile-nav').innerHTML = mobilePages.map(page => mobileLink(page, section)).join('');
  const claimTask = active === 'new' || active === 'edit';
  const variationTask = active === 'variation-new' || active === 'variation-edit';
  const certificateTask = active === 'certificate-new' || active === 'certificate-edit';
  const evidenceTask = active === 'evidence-new';
  const focusedTask = claimTask || variationTask || certificateTask || evidenceTask;
  document.body.classList.toggle('task-mode', focusedTask);
  if (claimTask) {
    const record = active === 'edit' ? state.drafts.find(draft => draft.id === path[1]) : null;
    if (active === 'edit' && !record) {
      main.innerHTML = state.storageError ? heading('Draft unavailable', 'Device storage could not be read.') + notice(escapeHtml(state.storageError), 'error') + pageLink('offline', 'Open device drafts') : layoutMissing();
    } else {
      const query = new URLSearchParams(raw.split('?')[1] || '');
      const selectedProject = projects.find(project => project.id === query.get('project')) || projects[0];
      const direction = query.get('direction');
      const context = { project: selectedProject.id, direction: ['Payable', 'Receivable'].includes(direction) ? direction : selectedProject.defaultDirection };
      activeEditor = createDraftEditor({
        root: main, record, context, projects, linkedAttachments: record ? linkedEvidence(state.evidence, record.id, record.project) : [], linkedImageError: state.evidenceError, announce,
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
  } else if (certificateTask) {
    const record = active === 'certificate-edit' ? state.certificates.find(item => item.id === path[1]) : null;
    const sourceClaim = allClaims().find(item => item.id === path[1]);
    const claim = sourceClaim ? { ...sourceClaim, attachments: [...(sourceClaim.attachments || []), ...linkedEvidence([...sampleEvidence, ...state.evidence], sourceClaim.id, sourceClaim.project)] } : null;
    if (record?.reviewedAt) main.innerHTML = certificateDetail(record, allClaims().find(item => item.id === record.source.id), record.source.id.startsWith('LOCAL-') ? state.storageError : '');
    else if ((active === 'certificate-edit' && !record) || (!record && (!canAssess(claim) || state.evidenceError))) main.innerHTML = heading('Assessment unavailable', 'Open a locally reviewed claim with readable evidence to start an assessment.') + (state.certificateError || state.storageError || state.evidenceError ? notice(escapeHtml(state.certificateError || state.storageError || state.evidenceError), 'error') : '') + pageLink('claims', 'Open claims');
    else activeEditor = createCertificateEditor({ root: main, record, claim, announce,
      onSave: async preview => { await saveCertificate(preview); await refreshDrafts(); if (state.certificateError || !state.certificates.some(item => item.id === preview.id && item.updatedAt === preview.updatedAt)) throw new Error('Device read-back failed after the write.'); },
      onRouteChange: id => { currentHash = '#certificate-edit/' + encodeURIComponent(id); history.replaceState(null, '', currentHash); },
      onDone: id => { location.hash = '#certificate/' + encodeURIComponent(id); }
    });
    if (!activeEditor) { document.body.classList.remove('task-mode'); bindPage(); }
  } else if (evidenceTask) {
    const query = new URLSearchParams(raw.split('?')[1] || '');
    const claim = allClaims().find(item => item.id === query.get('claim'));
    const projectId = query.get('project') || claim?.project || 'harbor';
    if (!projects.some(project => project.id === projectId) || (query.get('claim') && (!claim || claim.project !== projectId))) {
      main.innerHTML = heading('Evidence context unavailable', 'Choose a known project and saved claim.') + (state.storageError ? notice(escapeHtml(state.storageError), 'error') : '') + pageLink('evidence', 'Open evidence');
      document.body.classList.remove('task-mode');
    } else activeEditor = createEvidenceEditor({ root: main, claims: allClaims(), context: { project: projectId, claim: claim?.id || '', line: query.get('line') || '', error: state.storageError }, announce,
      onSave: async image => { await saveEvidence(image); await refreshDrafts(); if (state.evidenceError || !state.evidence.some(item => item.id === image.id && item.updatedAt === image.updatedAt)) throw new Error('Device read-back failed after the write.'); },
      onDone: id => { location.hash = '#evidence/' + encodeURIComponent(id); }
    });
  } else {
    const views = { home: layoutHome, projects: layoutProjects, claims: layoutClaims, certificates: layoutCertificates, offline: layoutOffline, inbox: layoutInbox, evidence: layoutEvidence, more: layoutMore, parties: layoutParties, reports: layoutReports, settings: layoutSettings };
    main.innerHTML = active === 'project' ? (['sov', 'variations'].includes(path[2]) ? renderProjectPage(path[1], path[2], path[3], state.drafts, state.variations, state.variationError, state.storageError) || layoutMissing() : layoutProject(path[1], path[2])) : active === 'claim' ? layoutClaim(path[1]) : views[active]?.() || layoutMissing();
    if (active === 'certificate') {
      const record = sampleCertificates.find(item => item.id === path[1]) || state.certificates.find(item => item.id === path[1]);
      main.innerHTML = record ? certificateDetail(record, allClaims().find(item => item.id === record.source.id), record.source.id.startsWith('LOCAL-') ? state.storageError : '') : state.certificateError ? heading('Preview unavailable', 'Device storage could not be read.') + notice(escapeHtml(state.certificateError), 'error') : layoutMissing();
    }
    if (active === 'evidence' && path[1]) {
      const record = sampleEvidence.find(item => item.id === path[1]) || state.evidence.find(item => item.id === path[1]);
      main.innerHTML = record ? evidenceDetail(record, allClaims().find(item => item.id === record.context.id), record.context.id.startsWith('LOCAL-') ? state.storageError : '') : state.evidenceError ? heading('Evidence unavailable', 'Device storage could not be read.') + notice(escapeHtml(state.evidenceError), 'error') : layoutMissing();
    }
    bindPage();
    if ((active === 'evidence' && !path[1]) || (active === 'project' && path[2] === 'evidence')) bindEvidenceGallery(main, evidenceData(active === 'project' ? path[1] : ''));
    if (active === 'project') bindProjectPages(main, path[1], state.variations);
  }
  document.title = (main.querySelector('h1')?.textContent || 'Demo') + ' — ConstructClaim Demo';
  updateConnectivity();
  pwa.reconsider();
}
function bindPage() {
  for (const [id, action, reset] of [['load-practice', loadPracticeRecords, false], ['reset-practice', resetPracticeRecords, true]]) {
    document.querySelector('#' + id)?.addEventListener('click', async () => {
      if (deviceChanges) return;
      if (reset && !confirm('Delete only the 16 reserved practice records, including your edits to them? Other device records and bundled samples are kept.')) return;
      const finish = beginDeviceChange();
      const controls = main.querySelectorAll('#load-practice, #reset-practice');
      controls.forEach(button => { button.disabled = true; });
      let message;
      try {
        const result = await action();
        message = reset ? result.removed + ' practice records removed. Other records kept.' : result.created + ' practice records loaded; ' + result.kept + ' existing practice records kept without changes.';
      } catch (error) {
        message = 'Practice ' + (reset ? 'reset' : 'load') + ' incomplete: ' + error.message;
      } finally {
        await refreshDrafts();
        finish();
      }
      state.practiceFeedback = message;
      if (currentHash === '#settings') route();
      announce(message);
    });
  }
  document.querySelector('#delete-evidence')?.addEventListener('click', async event => {
    const { id, project } = event.currentTarget.dataset;
    if (!confirm('Permanently delete this device-only image? Claims and saved certificate snapshots are kept.')) return;
    const finish = beginDeviceChange();
    try { await removeEvidence(id); await refreshDrafts(); if (state.evidenceError || state.evidence.some(item => item.id === id)) throw new Error('Device read-back failed after deletion.'); location.hash = '#project/' + project + '/evidence'; announce('Local image deleted. Other records kept.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#clear-evidence')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only images? Claim documents and certificate snapshots are kept.')) return;
    const finish = beginDeviceChange();
    try { await clearEvidence(); await refreshDrafts(); if (state.evidenceError || state.evidence.length) throw new Error('Device read-back failed after deletion.'); route(); announce('Local images deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#delete-certificate')?.addEventListener('click', async event => {
    const id = event.currentTarget.dataset.id;
    if (!confirm('Permanently delete this device-only certificate preview? Its source claim is kept.')) return;
    const finish = beginDeviceChange();
    try { await removeCertificate(id); await refreshDrafts(); if (state.certificateError || state.certificates.some(item => item.id === id)) throw new Error('Device read-back failed after deletion.'); location.hash = '#certificates'; announce('Local preview deleted. Source claim kept.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#clear-certificates')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only certificate previews? Claims and proposals are kept.')) return;
    const finish = beginDeviceChange();
    try { await clearCertificates(); await refreshDrafts(); if (state.certificateError || state.certificates.length) throw new Error('Device read-back failed after deletion.'); route(); announce('Local previews deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#delete-variation')?.addEventListener('click', async event => {
    const { id, project } = event.currentTarget.dataset;
    if (!confirm('Permanently delete this device-only variation proposal?')) return;
    const finish = beginDeviceChange();
    try { await removeVariation(id); await refreshDrafts(); if (state.variationError || state.variations.some(item => item.id === id)) throw new Error('Device read-back failed after deletion.'); location.hash = '#project/' + project + '/variations'; announce('Local proposal deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#clear-variations')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only variation proposals?')) return;
    const finish = beginDeviceChange();
    try { await clearVariations(); await refreshDrafts(); if (state.variationError || state.variations.length) throw new Error('Device read-back failed after deletion.'); route(); announce('Local variation proposals deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
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
    const finish = beginDeviceChange();
    try { await removeDraft(id); await refreshDrafts(); if (state.storageError) throw new Error('Device read-back failed after deletion.'); location.hash = '#offline'; announce('Device draft deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
  document.querySelector('#clear-drafts')?.addEventListener('click', async () => {
    if (!confirm('Permanently delete all device-only claim drafts?')) return;
    const finish = beginDeviceChange();
    try { await clearDrafts(); await refreshDrafts(); if (state.storageError) throw new Error('Device read-back failed after deletion.'); route(); announce('All device claim drafts deleted.'); }
    catch (error) { main.insertAdjacentHTML('afterbegin', notice('Deletion failed: ' + escapeHtml(error.message), 'error')); }
    finally { finish(); }
  });
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
pwa.start();
