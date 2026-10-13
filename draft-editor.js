import { SOURCE_VERSION } from './demo-contracts.js';
import { imageContent } from './evidence-domain.js';
import { escapeHtml, icon, money, displayDate, draftLabel } from './ui.js';
import { STEPS, normalizeDraft, sampleLines, lineTotals, toCents, fromCents, validateDraft, savedRecord, EVIDENCE_KINDS, sampleAttachment } from './demo-domain.js';

const amount = cents => money(fromCents(cents));
const fieldValue = value => escapeHtml(value ?? '');
export function evidenceCards(attachments, pending = false, editable = false) {
  if (!attachments.length) return '<p class="meta">No evidence attached.</p>';
  return '<div class="evidence-list">' + attachments.map((file, index) => {
    const preview = imageContent(file);
    const sample = file.sample === true;
    const origin = sample ? 'Bundled sample · Read-only' : pending ? 'Ready to save' : 'Saved on this device';
    return '<article class="evidence-card"><div class="evidence-file">' + icon(preview ? 'evidence' : 'file') + '<div><strong>' + fieldValue(file.name) + '</strong><small class="meta">' + fieldValue(file.lineId || 'Whole claim') + ' · ' + Number(file.size || 0) + ' bytes · ' + (preview ? 'Image' : 'Synthetic text') + '</small></div></div><span class="status ' + (!sample && pending ? 'warning' : 'local') + '">' + origin + '</span>' + (preview ? '<details><summary>Preview image</summary><img class="evidence-photo" loading="lazy" decoding="async" src="' + fieldValue(preview) + '" alt="' + fieldValue(file.note || file.name) + '"><p class="meta">' + fieldValue(file.note || '') + '</p><p class="meta">' + (sample ? 'Sample claim snapshot: ' : 'Linked claim saved: ') + fieldValue(file.context?.updatedAt || 'Sample fixture') + '</p></details>' : '<details><summary>Preview sample content</summary><pre>' + fieldValue(file.type === 'text/plain' ? file.content : 'Preview unavailable') + '</pre></details>') +
    (editable && !sample ? '<button class="text-link remove-file" type="button" data-remove-evidence="' + index + '">' + icon('trash') + 'Remove sample</button>' : '') + '</article>';
  }).join('') + '</div>';
}

export function createDraftEditor({ root, record, context, projects, linkedAttachments = [], linkedImageError = '', onSave, onDone, onRouteChange, announce }) {
  let draft = normalizeDraft(record, context, 'LOCAL-' + crypto.randomUUID());
  if (!projects.some(project => project.id === draft.project)) draft.project = projects[0].id;
  let dirty = false;
  let busy = false;
  let acknowledged = false;
  let selectedLine = 0;
  let alive = true;
  let feedback = '';
  let saved = Boolean(record);
  const project = () => projects.find(item => item.id === draft.project);
  const saveStatus = () => busy ? 'Saving on this device…' : dirty ? 'Unsaved changes' : saved ? 'Saved on this device · Not submitted' : 'Not saved yet';
  const markDirty = () => {
    dirty = true;
    draft.reviewedAt = null;
    acknowledged = false;
    feedback = '';
    updateSummary();
    updateStatus();
  };
  function summaryMarkup() {
    const totals = lineTotals(draft.lines);
    return '<h2>Draft summary</h2><dl class="summary-values"><div><dt>Project</dt><dd>' + project().name + '</dd></div><div><dt>Direction</dt><dd>' + draft.direction + '</dd></div><div><dt>Contract</dt><dd>' + project().contract + ' · Sample</dd></div><div><dt>Period</dt><dd>' + fieldValue(draft.period || 'Not set') + '</dd></div></dl>' +
      '<div class="summary-totals"><div><span>This period</span><strong>' + (draft.lines.length ? totals.valid ? amount(totals.current) : 'Correct amounts' : 'No lines yet') + '</strong></div><div><span>Previous · Sample</span><strong>' + (draft.lines.length ? amount(totals.previous) : '—') + '</strong></div><div><span>Cumulative</span><strong>' + (draft.lines.length && totals.valid ? amount(totals.cumulative) : '—') + '</strong></div></div><p class="meta">Synthetic SOV basis · No tax or retention calculation.</p><div class="summary-cert"><span class="meta">Certification</span><strong>Not yet certified</strong></div><p class="meta">' + draft.attachments.length + ' sample file' + (draft.attachments.length === 1 ? '' : 's') + ' · No upload or submission</p>';
  }
  function updateSummary() {
    const summary = root.querySelector('#draft-summary');
    if (summary) summary.innerHTML = summaryMarkup();
    const subtitle = root.querySelector('#editor-context');
    if (subtitle) subtitle.textContent = project().name + ' · ' + draft.direction + ' · ' + project().contract + (draft.period ? ' · ' + draft.period : '');
  }
  function updateStatus() {
    const headingStatus = root.querySelector('.editor-heading > .status');
    if (headingStatus) headingStatus.textContent = draft.reviewedAt ? 'Reviewed on device' : 'Draft';
    root.querySelectorAll('[data-save-status]').forEach(el => { el.textContent = saveStatus(); el.classList.toggle('is-saved', saved && !dirty && !busy); });
    const alert = root.querySelector('#editor-feedback');
    if (alert) { alert.textContent = feedback; alert.hidden = !feedback; }
    root.querySelectorAll('button, input, select, textarea').forEach(el => { el.disabled = busy; });
    root.querySelector('#draft-editor-form')?.setAttribute('aria-busy', String(busy));
    const previous = root.querySelector('[data-line-prev]');
    const next = root.querySelector('[data-line-next]');
    if (previous) previous.disabled = busy || selectedLine === 0;
    if (next) next.disabled = busy || selectedLine >= draft.lines.length - 1;
    root.querySelectorAll('.evidence-card .status').forEach(el => {
      if (el.closest('[data-linked-images]')) return;
      el.textContent = dirty || !saved ? 'Ready to save' : 'Saved on this device';
      el.classList.toggle('warning', dirty || !saved);
      el.classList.toggle('local', saved && !dirty);
    });
    const finish = root.querySelector('[data-finish]');
    if (finish) finish.disabled = busy || !acknowledged;
    const checkbox = root.querySelector('[name=acknowledgement]');
    if (checkbox) checkbox.checked = acknowledged;
    const imageLink = root.querySelector('[data-add-image]');
    if (imageLink) imageLink.hidden = !saved || dirty || busy;
    const imageHint = root.querySelector('[data-image-save-hint]');
    if (imageHint) imageHint.textContent = !saved ? 'Save this claim first to add an image with its saved context.' : dirty ? 'Save your changes before adding another image.' : '';
  }
  function detailsMarkup() {
    return '<h2>Claim details</h2><p class="meta">Project and direction carry forward from your starting point.</p><div class="details-fields"><label>Project<select name="project">' + projects.map(item => '<option value="' + item.id + '" ' + (item.id === draft.project ? 'selected' : '') + '>' + item.name + '</option>').join('') + '</select></label><label>Direction<select name="direction"><option ' + (draft.direction === 'Receivable' ? 'selected' : '') + '>Receivable</option><option ' + (draft.direction === 'Payable' ? 'selected' : '') + '>Payable</option></select></label><div class="context-field"><span>Contract · Sample</span><strong>' + project().contract + ' · ' + project().party + '</strong></div><label>Claim period <span class="required-label">Required to continue</span><input name="period" type="month" value="' + fieldValue(draft.period) + '" aria-describedby="editor-feedback"></label><label>Reference (optional)<input name="reference" maxlength="60" placeholder="e.g. SITE-OCT-01" value="' + fieldValue(draft.reference) + '"></label><label class="full-field">Period note (optional)<textarea name="notes" maxlength="500" placeholder="Fictional progress measured this period">' + fieldValue(draft.notes) + '</textarea><span class="hint"><span id="note-count">' + draft.notes.length + '</span> / 500</span></label></div>';
  }
  function linesMarkup() {
    const legacy = draft.sourceVersion === 'legacy-demo-amount';
    return '<div class="panel-head"><h2>Claim lines</h2><span class="meta">SGD · Illustrative</span></div><p class="meta">' + (legacy ? 'Your previous demo amount is preserved as one editable line.' : 'Source ' + fieldValue(draft.sourceVersion) + ' · Saved line basis. Previous amounts are read-only samples.') + '</p>' +
      '<div class="line-pager"><button class="button secondary" type="button" data-line-prev aria-label="Previous claim line" ' + (selectedLine === 0 ? 'disabled' : '') + '>' + icon('back') + '</button><div><strong>' + fieldValue(draft.lines[selectedLine]?.id) + ' · ' + fieldValue(draft.lines[selectedLine]?.title) + '</strong><span class="meta">Line ' + (selectedLine + 1) + ' of ' + draft.lines.length + '</span></div><button class="button secondary" type="button" data-line-next aria-label="Next claim line" ' + (selectedLine >= draft.lines.length - 1 ? 'disabled' : '') + '>' + icon('arrow') + '</button></div>' +
      '<div class="line-grid-head" aria-hidden="true"><span>Item</span><span>Previous</span><span>This period</span><span>Cumulative</span></div>' +
      draft.lines.map((line, index) => '<section class="claim-line ' + (index === selectedLine ? 'is-selected' : '') + '" data-line-row="' + index + '" aria-label="' + fieldValue(line.id + ' · ' + line.title) + '"><div class="line-values"><div class="line-name"><strong>' + fieldValue(line.id) + ' · ' + fieldValue(line.title) + '</strong>' + (line.basis ? '<small class="meta">' + fieldValue(line.basis.source + ' · ' + line.basis.quantity + ' ' + line.basis.unit) + ' × ' + money(line.basis.rate) + '<br>Revised basis: ' + money(line.basis.revised) + '</small>' : '<small class="meta">Historical sample basis preserved</small>') + '</div><div class="line-previous"><span class="mobile-field-label">Previous · Sample</span><strong>' + amount(toCents(line.previous) ?? 0) + '</strong></div><label class="line-current"><span class="mobile-field-label">This period · SGD</span><span class="sr-only">This period for ' + fieldValue(line.id) + ' (SGD)</span><input id="line-' + index + '" data-line-amount="' + index + '" type="text" inputmode="decimal" maxlength="16" value="' + fieldValue(line.current) + '" placeholder="0.00" aria-describedby="editor-feedback"></label><div class="line-cumulative"><span class="mobile-field-label">Cumulative</span><strong data-cumulative="' + index + '">' + (toCents(line.current || '0') === null ? '—' : amount((toCents(line.previous) ?? 0) + toCents(line.current || '0'))) + '</strong></div></div><label class="line-note">Progress note (optional)<textarea id="line-note-' + index + '" data-line-note="' + index + '" maxlength="300" placeholder="Fictional measured progress">' + fieldValue(line.note) + '</textarea></label></section>').join('') +
      '<p class="meta">Enter non-negative amounts with up to two decimal places. A positive total is required to continue.</p>';
  }
  function linkedImagesMarkup() {
    const images = linkedAttachments.filter(file => file.context.project === draft.project);
    return '<section data-linked-images><h3 class="section-gap">Linked images · Saved separately</h3>' + (linkedImageError ? '<div class="notice error" role="alert">Linked images unavailable: ' + fieldValue(linkedImageError) + '</div>' : evidenceCards(images)) + '<p class="meta">These device-local files retain their original claim context. Editing or saving this draft does not replace them.</p><p class="meta" data-image-save-hint></p><a class="text-link" data-add-image href="#evidence-new?project=' + encodeURIComponent(draft.project) + '&claim=' + encodeURIComponent(draft.id) + '">Add image ' + icon('plus') + '</a></section>';
  }
  function evidenceMarkup() {
    return '<h2>Evidence</h2><p class="meta">Add a synthetic text file to try local evidence save and recovery. File content and metadata are saved together with the draft.</p><div class="evidence-picker"><label>Sample document<select id="evidence-kind">' + EVIDENCE_KINDS.map(item => '<option value="' + item.id + '">' + item.name + '</option>').join('') + '</select></label><label>Attach to<select id="evidence-line"><option value="">Whole claim</option>' + draft.lines.map(line => '<option value="' + fieldValue(line.id) + '">' + fieldValue(line.id + ' · ' + line.title) + '</option>').join('') + '</select></label><button class="button secondary" type="button" data-add-evidence>' + icon('plus') + 'Add sample file</button></div>' +
      evidenceCards(draft.attachments, dirty || !saved, true) + linkedImagesMarkup() + '<p class="meta">Evidence is optional in this demo. Server uploads and production evidence requirements are not connected.</p>';
  }
  function reviewMarkup() {
    const totals = lineTotals(draft.lines);
    return '<div class="panel-head"><h2>Review draft</h2><button type="button" class="text-link" data-go-step="0">Edit details</button></div><dl class="key-values"><div><dt>Project / contract</dt><dd>' + project().name + ' · ' + project().contract + '</dd></div><div><dt>Direction / period</dt><dd>' + draft.direction + ' · ' + fieldValue(draft.period) + '</dd></div><div><dt>Reference</dt><dd>' + fieldValue(draft.reference || draftLabel(draft)) + '</dd></div><div><dt>This period · Illustrative</dt><dd>' + amount(totals.current) + '</dd></div></dl><p class="review-note">' + fieldValue(draft.notes || 'No period note') + '</p>' +
      '<div class="panel-head section-gap"><h3>Claim lines</h3><button type="button" class="text-link" data-go-step="1">Edit lines</button></div><ul class="row-list">' + draft.lines.map(line => '<li class="review-line"><span>' + fieldValue(line.id + ' · ' + line.title) + '</span><strong>' + amount(toCents(line.current || '0') ?? 0) + '</strong></li>').join('') + '</ul>' +
      '<div class="panel-head section-gap"><h3>Sample evidence · ' + draft.attachments.length + '</h3><button type="button" class="text-link" data-go-step="2">Edit evidence</button></div>' + evidenceCards(draft.attachments, dirty || !saved) + linkedImagesMarkup() +
      '<div class="notice"><strong>Local review only</strong><p>Saving this review does not submit, synchronize or certify the claim. Real evidence rules and server acceptance are not connected.</p></div><label class="acknowledgement"><input name="acknowledgement" type="checkbox"><span>I have reviewed this fictional draft and understand it remains on this device.</span></label>';
  }
function render(focus = false) {
    root.innerHTML = '<div class="editor-breadcrumb ' + (draft.step > 0 ? 'has-previous' : '') + '"><a class="text-link editor-exit" href="#claims">' + icon('back') + 'Back to claims</a>' + (draft.step > 0 ? '<button class="text-link editor-back-step" type="button" data-prev>' + icon('back') + 'Back to ' + STEPS[draft.step - 1].toLowerCase() + '</button><a class="text-link editor-close" href="#claims" aria-label="Close editor and return to claims">Close</a>' : '') + '<span class="meta">Device-local draft</span></div><div class="page-head editor-heading"><div><h1>' + (saved ? 'Edit ' : 'New ') + draft.direction.toLowerCase() + ' claim</h1><p class="subtitle" id="editor-context"></p></div><span class="status local">' + (draft.reviewedAt ? 'Reviewed on device' : 'Draft') + '</span></div>' +
      '<nav class="stepper" aria-label="Draft steps"><p class="mobile-step-label">' + (draft.step + 1) + ' of 4 · ' + STEPS[draft.step] + '</p><ol>' + STEPS.map((name, index) => '<li class="' + (index < draft.step ? 'is-complete' : '') + '"><button type="button" data-go-step="' + index + '" ' + (index === draft.step ? 'aria-current="step"' : '') + '><span class="step-number">' + (index < draft.step ? icon('check') : index + 1) + '</span><span class="step-name">' + name + '</span></button></li>').join('') + '</ol></nav>' +
      '<form id="draft-editor-form" class="form editor-form" novalidate><div class="grid editor-columns"><section class="panel editor-panel" id="editor-step" tabindex="-1">' + [detailsMarkup, linesMarkup, evidenceMarkup, reviewMarkup][draft.step]() + '</section><aside class="panel draft-summary" id="draft-summary"></aside></div><div id="editor-feedback" class="notice error" role="alert" tabindex="-1" hidden></div><footer class="editor-actions"><button class="text-link editor-prev" type="button" data-prev ' + (draft.step === 0 ? 'hidden' : '') + '>' + icon('back') + 'Back to ' + STEPS[draft.step - 1] + '</button><span class="save-status" data-save-status role="status" aria-live="polite"></span><div class="editor-action-buttons"><button class="button secondary" type="button" data-save>Save draft</button><button class="button" type="submit" ' + (draft.step === 3 ? 'data-finish' : '') + '>' + (draft.step === 3 ? 'Save reviewed draft' : '<span class="desktop-next">Continue to ' + STEPS[draft.step + 1].toLowerCase() + '</span><span class="mobile-next">Continue</span>' + icon('arrow')) + '</button></div></footer></form>';
    updateSummary();
    updateStatus();
    bind();
    if (focus) { root.querySelector('#editor-step').focus({ preventScroll: true }); root.querySelector('.stepper').scrollIntoView({ block: 'start' }); }
  }
  function showErrors(errors) {
    feedback = errors.map(error => error.message).join(' ');
    updateStatus();
    root.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const error = errors[0];
    let field = root.querySelector('[name="' + error.field + '"]') || root.querySelector('#' + error.field);
    if (error.field.startsWith('line-')) {
      selectedLine = Number(error.field.replace('line-note-', '').replace('line-', ''));
      root.querySelectorAll('[data-line-row]').forEach(el => el.classList.toggle('is-selected', Number(el.dataset.lineRow) === selectedLine));
    }
    if (field && getComputedStyle(field).display !== 'none') { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    else root.querySelector('#editor-feedback').focus();
    announce(feedback);
  }
  function goStep(step) {
    if (busy || step === draft.step) return;
    if (step > draft.step) {
      const errors = validateDraft(draft, { requireDetails: true, requireLines: step > 1 });
      if (errors.length) { showErrors(errors); return; }
      if (step >= 1 && !draft.lines.length) { draft.lines = sampleLines(draft.project); draft.sourceVersion = SOURCE_VERSION; markDirty(); }
    }
    draft.step = step;
    feedback = '';
    render(true);
  }
  function changeContext(field, value, control) {
    if (value === draft[field]) return;
    if ((draft.lines.length || draft.attachments.length) && !confirm('Changing project or direction replaces the synthetic line basis and removes sample evidence from this draft. Continue?')) {
      control.value = draft[field];
      return;
    }
    draft[field] = value;
    draft.lines = [];
    draft.attachments = [];
    draft.sourceVersion = SOURCE_VERSION;
    selectedLine = 0;
    markDirty();
    render();
    root.querySelector('[name="' + field + '"]').focus();
  }
  async function persist(reviewed) {
    if (busy) return;
    const errors = validateDraft(draft, { requireDetails: reviewed, requireLines: reviewed });
    if (errors.length) { showErrors(errors); return; }
    if (reviewed && !acknowledged) return;
    busy = true;
    feedback = '';
    updateStatus();
    try {
      const snapshot = savedRecord(draft, reviewed);
      await onSave(snapshot);
      draft = snapshot;
      saved = true;
      dirty = false;
      busy = false;
      feedback = '';
      onRouteChange(draft.id);
      updateSummary();
      updateStatus();
      announce(reviewed ? 'Reviewed draft saved on this device. Not submitted.' : 'Draft saved on this device. Not submitted.');
      if (reviewed) onDone(draft.id);
      else {
        root.querySelector('h1').textContent = 'Edit ' + draft.direction.toLowerCase() + ' claim';
        document.title = 'Edit ' + draft.direction.toLowerCase() + ' claim — ConstructClaim Demo';
      }
    } catch (error) {
      busy = false;
      feedback = 'Local save could not be confirmed: ' + error.message + '. Your inputs remain here. Retry or copy them before leaving. Nothing was submitted.';
      if (alive) { updateStatus(); root.querySelector('#editor-feedback').focus(); announce(feedback); }
    }
  }
  function bind() {
    root.querySelector('#draft-editor-form').addEventListener('submit', event => { event.preventDefault(); draft.step === 3 ? persist(true) : goStep(draft.step + 1); });
    root.querySelector('[data-save]').addEventListener('click', () => persist(false));
    root.querySelectorAll('[data-prev]').forEach(el => el.addEventListener('click', () => goStep(draft.step - 1)));
    root.querySelectorAll('[data-go-step]').forEach(el => el.addEventListener('click', () => goStep(Number(el.dataset.goStep))));
    for (const field of ['project', 'direction']) root.querySelector('[name="' + field + '"]')?.addEventListener('change', event => changeContext(field, event.target.value, event.target));
    for (const field of ['period', 'reference', 'notes']) root.querySelector('[name="' + field + '"]')?.addEventListener('input', event => {
      draft[field] = event.target.value;
      event.target.removeAttribute('aria-invalid');
      markDirty();
      if (field === 'notes') root.querySelector('#note-count').textContent = draft.notes.length;
    });
    root.querySelectorAll('[data-line-amount]').forEach(el => el.addEventListener('input', () => {
      const index = Number(el.dataset.lineAmount);
      draft.lines[index].current = el.value;
      el.removeAttribute('aria-invalid');
      const cents = toCents(el.value || '0');
      root.querySelector('[data-cumulative="' + index + '"]').textContent = cents === null ? '—' : amount((toCents(draft.lines[index].previous) ?? 0) + cents);
      markDirty();
    }));
    root.querySelectorAll('[data-line-note]').forEach(el => el.addEventListener('input', () => { draft.lines[Number(el.dataset.lineNote)].note = el.value; markDirty(); }));
    root.querySelector('[data-line-prev]')?.addEventListener('click', () => { if (selectedLine > 0) { selectedLine--; render(); root.querySelector('#line-' + selectedLine).focus(); } });
    root.querySelector('[data-line-next]')?.addEventListener('click', () => { if (selectedLine < draft.lines.length - 1) { selectedLine++; render(); root.querySelector('#line-' + selectedLine).focus(); } });
    root.querySelector('[data-add-evidence]')?.addEventListener('click', () => {
      if (draft.attachments.length >= 6) { feedback = 'This demo supports up to six sample files per draft.'; updateStatus(); return; }
      const file = sampleAttachment(root.querySelector('#evidence-kind').value, draft, root.querySelector('#evidence-line').value);
      if (draft.attachments.some(item => item.id === file.id)) { feedback = 'That sample is already attached to this line. Choose another sample or line.'; updateStatus(); return; }
      draft.attachments.push(file);
      markDirty();
      render();
      announce('Sample content added. Save the draft to keep it on this device.');
    });
    root.querySelectorAll('[data-remove-evidence]').forEach(el => el.addEventListener('click', () => { draft.attachments.splice(Number(el.dataset.removeEvidence), 1); markDirty(); render(); announce('Sample evidence removed from the draft. Save to keep this change.'); }));
    root.querySelector('[name=acknowledgement]')?.addEventListener('change', event => { acknowledged = event.target.checked; updateStatus(); });
  }
  render();
  return {
    get dirty() { return dirty; },
    get busy() { return busy; },
    canLeave() {
      if (busy) { announce('Wait for the local save to finish before leaving.'); return false; }
      if (!dirty) return true;
      if (!confirm('Leave without saving your draft changes on this device?')) return false;
      dirty = false;
      return true;
    },
    dispose() { alive = false; }
  };
}
