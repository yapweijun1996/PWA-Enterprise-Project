import { normalizeCertificate, assessmentTotals, savedCertificate } from './certificate-domain.js';
import { escapeHtml as e, money, icon } from './ui.js';
import { toCents, fromCents } from './demo-domain.js';
import { evidenceCards } from './draft-editor.js';
import { projects } from './demo-contracts.js';

export function createCertificateEditor({ root, record, claim, onSave, onRouteChange, onDone, announce }) {
  let draft = normalizeCertificate(record, claim, 'LOCAL-CERT-' + crypto.randomUUID());
  let dirty = false, busy = false, saved = Boolean(record), alive = true;
  // Preserve the exact snapshot and save mode until a committed write is confirmed.
  let attempted = null, pendingReviewed = null, knownCommit = false, conflict = false;
  let baseRevision = record ? record.storageRevision ?? 0 : null;
  let baseGeneration = record?.storageGeneration ?? null;
  const source = draft.source;
  root.innerHTML = '<div class="editor-breadcrumb"><a class="text-link" href="#claim/' + encodeURIComponent(source.id) + '">' + icon('back') + 'Back to claim</a><span class="meta">Independent assessment · Device only</span></div><div class="page-head"><div><h1>Review certificate</h1><p class="subtitle">' + e(projects.find(p => p.id === source.project)?.name + ' · ' + source.direction + ' · ' + source.period) + '</p></div><span class="status warning">Not issued</span></div><form class="form assessment-form" novalidate><div class="grid editor-columns"><section class="panel"><div class="panel-head"><h2>Line assessment</h2><span class="meta">SGD · Illustrative</span></div><p class="meta">Assess the saved claim snapshot. Variance = certified minus claimed; every difference needs a reason.</p><div class="assessment-lines">' + source.lines.map((line, index) => '<article class="assessment-card"><h3>' + e(line.id + ' · ' + line.title) + '</h3><div class="assessment-fields"><div><span class="label">Claimed</span><strong>' + money(line.current || '0') + '</strong></div><label>Certified · SGD<input name="certified-' + index + '" type="text" inputmode="decimal" maxlength="16" value="' + e(draft.assessments[index].certified) + '"></label><div><span class="label">Variance</span><strong data-variance="' + index + '"></strong></div></div><label>Variance reason<textarea name="reason-' + index + '" maxlength="300" rows="2">' + e(draft.assessments[index].reason) + '</textarea></label></article>').join('') + '</div><h2 class="section-gap">Supporting evidence · Snapshot</h2>' + evidenceCards(source.attachments || []) + '</section><aside class="panel"><h2>Certificate summary</h2><dl class="key-values"><div><dt>Claimed</dt><dd data-claimed></dd></div><div><dt>Certified</dt><dd data-certified></dd></div><div><dt>Variance</dt><dd data-total-variance></dd></div></dl><p class="meta">Retention, tax, deductions and net payable are not calculated. Contract rules remain undecided.</p><h3>Source snapshot</h3><p class="meta">' + e(source.reference || source.id) + '<br>' + e(source.sourceVersion) + '<br>Saved claim: ' + e(source.updatedAt) + '</p><p class="meta">This assessment does not change the claim, contract, invoice or payment.</p></aside></div><section class="panel section-gap"><h2>Local review</h2><label class="acknowledgement"><input name="acknowledgement" type="checkbox"><span>I checked this fictional assessment and its evidence. Saving the review makes this preview read-only on this device; it does not issue a certificate.</span></label></section><div id="cert-feedback" class="notice error" role="alert" tabindex="-1" hidden></div><footer class="editor-actions"><span class="save-status" role="status" data-cert-status></span><div class="editor-action-buttons"><button class="button secondary" type="button" data-save-cert>Save draft</button><button class="button" type="submit" data-review-cert disabled>Save reviewed preview</button></div></footer></form>';
  const form = root.querySelector('form'), ack = form.elements.namedItem('acknowledgement'), feedback = root.querySelector('#cert-feedback');
  root.querySelector('.editor-action-buttons').insertAdjacentHTML('beforeend', '<button class="button secondary" type="button" data-new-cert hidden>Save as new assessment</button>');
  const recovery = root.querySelector('[data-new-cert]');
  function update() {
    const totals = assessmentTotals(draft);
    root.querySelector('[data-claimed]').textContent = money(fromCents(totals.claimed));
    root.querySelector('[data-certified]').textContent = totals.complete ? money(fromCents(totals.certified)) : 'Not fully assessed';
    root.querySelector('[data-total-variance]').textContent = totals.complete ? money(fromCents(totals.variance)) : 'Not fully assessed';
    source.lines.forEach((line, index) => { const cents = toCents(draft.assessments[index].certified); root.querySelector('[data-variance="' + index + '"]').textContent = cents === null ? 'Not assessed' : money(fromCents(cents - (toCents(line.current || '0') ?? 0))); });
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input,textarea,button').forEach(el => { el.disabled = busy || knownCommit; });
    const saveDraft = root.querySelector('[data-save-cert]'), review = root.querySelector('[data-review-cert]');
    saveDraft.disabled = busy || (knownCommit && pendingReviewed);
    review.disabled = busy || (knownCommit ? !pendingReviewed : !ack.checked);
    saveDraft.textContent = attempted && !pendingReviewed ? 'Retry draft confirmation' : 'Save draft';
    review.textContent = attempted && pendingReviewed ? 'Retry reviewed preview confirmation' : 'Save reviewed preview';
    recovery.hidden = !conflict;
    recovery.disabled = busy;
    root.querySelector('[data-cert-status]').textContent = busy ? 'Saving on this device…' : knownCommit ? 'Saved write · Confirmation pending · Editing locked' : dirty ? 'Unsaved changes' : saved ? 'Saved on this device · Not issued' : 'Not saved yet';
  }
  form.addEventListener('input', event => {
    if (busy || knownCommit) return;
    const match = /^(certified|reason)-(\d+)$/.exec(event.target.name);
    if (!match) return;
    draft.assessments[Number(match[2])][match[1]] = event.target.value;
    attempted = null; pendingReviewed = null; dirty = true; ack.checked = false; feedback.hidden = true; event.target.removeAttribute('aria-invalid'); update();
  });
  ack.addEventListener('change', () => { if (!busy && !knownCommit) update(); });
  form.addEventListener('focusin', event => { if (!event.target.closest('.editor-actions') && event.target.getBoundingClientRect().bottom > root.querySelector('.editor-actions').getBoundingClientRect().top - 12) event.target.scrollIntoView({ block: 'center' }); });
  async function persist(reviewed) {
    if (busy || (knownCommit && pendingReviewed !== reviewed) || (reviewed && !knownCommit && !ack.checked)) return;
    busy = true; feedback.hidden = true; update();
    try {
      if (!attempted || pendingReviewed !== reviewed) {
        attempted = savedCertificate(draft, reviewed);
        if (baseGeneration !== null) attempted.storageGeneration = baseGeneration;
        pendingReviewed = reviewed;
      }
      dirty = true;
      const persisted = await onSave(attempted, baseRevision, committed => { attempted = committed; baseRevision = committed.storageRevision; baseGeneration = committed.storageGeneration ?? null; knownCommit = true; });
      draft = persisted; baseRevision = persisted.storageRevision; baseGeneration = persisted.storageGeneration ?? null; attempted = null; pendingReviewed = null; knownCommit = false; conflict = false; saved = true; dirty = false; busy = false;
      if (!alive) return;
      onRouteChange(draft.id); update(); announce(reviewed ? 'Reviewed preview saved. No certificate was issued.' : 'Assessment draft saved on this device.');
      if (reviewed) onDone(draft.id);
    } catch (failure) {
      busy = false; conflict = failure.code === 'RECORD_CONFLICT';
      if (alive) { update(); feedback.hidden = false; feedback.textContent = 'Save could not be confirmed: ' + failure.message + (conflict ? ' The saved assessment changed or was removed. Your inputs remain here; save as a new assessment to keep them without overwriting it.' : knownCommit ? ' The write committed. Editing and save mode are locked; retry the original action to confirm it.' : ' Your inputs remain here; retry or correct them before leaving.'); feedback.focus(); announce(feedback.textContent); }
    }
  }
  root.querySelector('[data-save-cert]').addEventListener('click', () => persist(false));
  recovery.addEventListener('click', () => {
    if (busy || !conflict) return;
    draft = { ...draft, id: 'LOCAL-CERT-' + crypto.randomUUID(), updatedAt: null, reviewedAt: null };
    baseRevision = null; baseGeneration = null; attempted = null; pendingReviewed = null; knownCommit = false; conflict = false; saved = false; dirty = true; ack.checked = false;
    return persist(false);
  });
  form.addEventListener('submit', event => { event.preventDefault(); return persist(true); });
  update();
  return { get dirty() { return dirty; }, get busy() { return busy; }, canLeave() { if (busy) { announce('Wait for the save to finish.'); return false; } if (dirty && !confirm('Leave without saving your assessment changes?')) return false; dirty = false; return true; }, dispose() { alive = false; } };
}
