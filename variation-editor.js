import { projects, sovLines, contractSummary } from './demo-contracts.js';
import { normalizeVariation, validateVariation, savedVariation } from './variation-domain.js';
import { toCents, fromCents } from './demo-domain.js';
import { escapeHtml as e, money, icon } from './ui.js';

export function createVariationEditor({ root, record, projectId, onSave, onRouteChange, onDone, announce }) {
  let draft = normalizeVariation(record, projectId, 'LOCAL-VO-' + crypto.randomUUID());
  let baseRevision = record ? record.storageRevision ?? 0 : null;
  let baseGeneration = record?.storageGeneration;
  let pendingAttempt = null;
  let conflict = false;
  const project = projects.find(item => item.id === draft.project);
  let dirty = false, busy = false, saved = Boolean(record), alive = true;
  const back = '#project/' + project.id + '/variations';
  root.innerHTML = '<div class="editor-breadcrumb"><a class="text-link" href="' + back + '">' + icon('back') + 'Back to variations</a><span class="meta">Device-local proposal</span></div><div class="page-head"><div><h1>' + (saved ? 'Edit' : 'New') + ' variation proposal</h1><p class="subtitle">' + e(project.name + ' · ' + project.contract) + ' · Synthetic</p></div><span class="status warning">Not approved</span></div><form class="form variation-form" novalidate><div class="grid editor-columns"><section class="panel"><h2>Variation scope</h2><div class="form"><label>Scope title<input name="title" maxlength="100" value="' + e(draft.title) + '" aria-describedby="vo-feedback"></label><label>Reason / instruction note<textarea name="reason" maxlength="500" aria-describedby="vo-feedback">' + e(draft.reason) + '</textarea></label><label>Affected SOV line<select name="lineId"><option value="">New scope</option>' + sovLines(project.id).map(line => '<option value="' + e(line.id) + '" ' + (line.id === draft.lineId ? 'selected' : '') + '>' + e(line.id + ' · ' + line.title) + '</option>').join('') + '</select><span class="hint">A link records proposal context; it does not modify the SOV.</span></label><label>Proposed value · SGD<input name="amount" type="text" inputmode="decimal" maxlength="16" value="' + e(draft.amount) + '" aria-describedby="vo-feedback"><span class="hint">Non-negative amount, up to two decimals. A positive amount is required to review.</span></label></div></section><aside class="panel"><h2>Contract position · Sample</h2><p class="metric">' + money(fromCents(contractSummary(project.id).revised)) + '</p><p class="meta">Existing revised contract. This proposal is excluded from contract totals and claim lines.</p><h3>Proposed change</h3><p id="vo-amount-summary"></p><p class="meta">Source: ' + e(draft.sourceVersion) + '. Saved proposals retain their source snapshot.</p><p class="meta">Save incomplete work, or check the title, reason and amount before local review.</p></aside></div><div class="panel section-gap"><h2>Local review</h2><label class="acknowledgement"><input name="acknowledgement" type="checkbox"><span>I checked this fictional proposal and understand it remains unsubmitted and unapproved on this device.</span></label></div><div id="vo-feedback" class="notice error" role="alert" tabindex="-1" hidden></div><footer class="editor-actions"><span class="save-status" data-vo-status role="status"></span><div class="editor-action-buttons"><button class="button secondary" type="button" data-save-vo>Save draft</button><button class="button" type="submit" data-review-vo disabled>Save local review</button></div></footer></form>';
  const form = root.querySelector('form');
  const acknowledgement = root.querySelector('[name=acknowledgement]');
  const feedback = root.querySelector('#vo-feedback');
  const recovery = document.createElement('button');
  recovery.type = 'button';
  recovery.className = 'button secondary';
  recovery.dataset.saveNewProposal = '';
  recovery.textContent = 'Save as new proposal';
  recovery.hidden = true;
  feedback.after(recovery);
  recovery.addEventListener('click', () => {
    if (busy || !conflict) return;
    draft.id = 'LOCAL-VO-' + crypto.randomUUID();
    draft.reviewedAt = null;
    delete draft.storageRevision;
    delete draft.storageGeneration;
    baseRevision = null;
    baseGeneration = undefined;
    pendingAttempt = null;
    acknowledgement.checked = false;
    saved = false;
    dirty = true;
    conflict = false;
    persist(false);
  });
  function update() {
    root.querySelector('[data-vo-status]').textContent = busy ? 'Saving on this device…' : dirty ? 'Unsaved changes' : saved ? 'Saved on this device · Not approved' : 'Not saved yet';
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input,select,textarea,button').forEach(el => { el.disabled = busy; });
    root.querySelector('[data-review-vo]').disabled = busy || !acknowledgement.checked;
    recovery.hidden = !conflict;
    const cents = toCents(draft.amount);
    root.querySelector('#vo-amount-summary').textContent = cents === null ? draft.amount.trim() ? 'Correct the proposed amount' : 'No amount yet' : money(fromCents(cents));
  }
  function error(message, field) {
    feedback.hidden = false; feedback.textContent = message;
    const control = field ? form.elements.namedItem(field) : feedback;
    control?.setAttribute('aria-invalid', 'true'); control?.focus(); announce(message);
  }
  for (const field of ['title', 'reason', 'lineId', 'amount']) form.elements.namedItem(field).addEventListener(field === 'lineId' ? 'change' : 'input', event => {
    draft[field] = event.target.value;
    pendingAttempt = null;
    if (field === 'lineId') draft.sourceSnapshot = null;
    draft.reviewedAt = null; acknowledgement.checked = false; dirty = true;
    feedback.hidden = true; feedback.textContent = ''; event.target.removeAttribute('aria-invalid'); update();
  });
  form.addEventListener('focusin', event => {
    const box = event.target.getBoundingClientRect();
    const actions = root.querySelector('.editor-actions').getBoundingClientRect();
    if (box.bottom > actions.top - 12 && !event.target.closest('.editor-actions')) event.target.scrollIntoView({ block: 'center' });
  });
  acknowledgement.addEventListener('change', update);
  async function persist(reviewed) {
    if (busy) return;
    if (!pendingAttempt) {
      if (reviewed && !acknowledgement.checked) return;
      const errors = validateVariation(draft, reviewed);
      if (errors.length) { error(errors[0].message, errors[0].field); return; }
      pendingAttempt = { snapshot: savedVariation(draft, reviewed), reviewed };
      if (baseGeneration !== undefined) pendingAttempt.snapshot.storageGeneration = baseGeneration;
    }
    busy = true; feedback.hidden = true; update();
    try {
      const attempt = pendingAttempt;
      const persisted = await onSave(attempt.snapshot, baseRevision, committed => {
        baseRevision = committed.storageRevision;
        baseGeneration = committed.storageGeneration;
        attempt.snapshot = committed;
      });
      draft = persisted;
      baseRevision = persisted.storageRevision;
      baseGeneration = persisted.storageGeneration;
      reviewed = attempt.reviewed;
      pendingAttempt = null;
      conflict = false;
      saved = true; dirty = false; busy = false;
      onRouteChange(draft.id); update();
      root.querySelector('h1').textContent = 'Edit variation proposal';
      document.title = 'Edit variation proposal — ConstructClaim Demo';
      announce(reviewed ? 'Local review saved. Proposal remains unsubmitted and unapproved.' : 'Variation draft saved on this device.');
      if (reviewed) onDone(draft.id);
    } catch (failure) {
      busy = false;
      dirty = true;
      conflict = failure.code === 'RECORD_CONFLICT';
      if (alive) {
        update();
        error(conflict
          ? 'This proposal changed or was deleted on this device. Your inputs remain here. Save as new proposal to keep a separate unreviewed copy; the newer record will not be overwritten.'
          : 'Local save could not be confirmed: ' + failure.message + '. Your inputs remain here. Retry before leaving.');
      }
    }
  }
  root.querySelector('[data-save-vo]').addEventListener('click', () => persist(false));
  form.addEventListener('submit', event => { event.preventDefault(); persist(true); });
  update();
  return { get dirty() { return dirty; }, get busy() { return busy; }, canLeave() { if (busy) { announce('Wait for the local save to finish.'); return false; } if (!dirty) return true; if (!confirm('Leave without saving your variation proposal changes?')) return false; dirty = false; return true; }, dispose() { alive = false; } };
}
