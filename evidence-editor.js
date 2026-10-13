import { escapeHtml as e, icon, draftLabel } from './ui.js';
import { projects } from './demo-contracts.js';
import { readImage, savedEvidence, EVIDENCE_TYPES } from './evidence-domain.js';

async function demoImage() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#EAF1FC'; ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#CBD6E6'; ctx.fillRect(0, 340, 640, 140);
  ctx.strokeStyle = '#52637A'; ctx.lineWidth = 5;
  for (const x of [100, 300, 500]) { ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x, 380); ctx.stroke(); }
  for (const y of [140, 240, 340]) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(550, y); ctx.stroke(); }
  ctx.fillStyle = '#155EEF'; ctx.fillRect(270, 180, 60, 190);
  ctx.fillStyle = '#14243B'; ctx.font = 'bold 27px sans-serif'; ctx.fillText('FICTIONAL SITE ILLUSTRATION', 65, 60);
  ctx.font = '20px sans-serif'; ctx.fillText('Demo only — no site photo or inspection', 70, 430);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Demo illustration could not be created.');
  return new File([blob], 'fictional-site-demo.png', { type: 'image/png' });
}
export function createEvidenceEditor({ root, claims, context, onSave, onDone, announce }) {
  let projectId = context.project || projects[0].id;
  let claimId = context.claim || claims.find(claim => claim.project === projectId)?.id || '';
  let lineId = context.line || '', file = null, dirty = false, busy = false, alive = true, attempted = null;
  const id = 'LOCAL-EVIDENCE-' + crypto.randomUUID();
  const date = new Date(); const localTime = new Date(date.valueOf() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const back = '#project/' + projectId + '/evidence';
  root.innerHTML = '<div class="editor-breadcrumb"><a class="text-link" href="' + back + '">' + icon('back') + 'Back to evidence</a><span class="meta">Device-local file</span></div><div class="page-head"><div><h1>Add evidence</h1><p class="subtitle">Preview an image and add its claim context. Use fictional images only.</p></div><span class="status warning">Not saved yet</span></div><form class="form capture-form" novalidate><div class="grid columns"><section class="panel"><h2>Image preview</h2><div class="capture-preview" data-image-preview><div class="empty-state">' + icon('evidence') + '<h3>Choose an image</h3><p>PNG, JPEG or WebP · Up to 3 MB and 24 megapixels</p></div></div><label class="file-picker">Choose / retake image<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"><span class="hint">On supported phones, your picker may offer the camera. No camera or location opens automatically.</span></label><button class="button secondary" type="button" data-demo-image>Load demo illustration</button><p class="meta" data-file-details>No file selected.</p></section><section class="panel"><h2>Evidence details</h2><div class="form"><label>Project<select name="project">' + projects.map(p => '<option value="' + p.id + '" ' + (p.id === projectId ? 'selected' : '') + '>' + e(p.name) + '</option>').join('') + '</select></label><label>Claim<select name="claim"></select></label><label>Claim line<select name="line"></select><span class="hint">Links retain the selected saved claim context; they do not change the claim.</span></label><label>Type<select name="kind">' + EVIDENCE_TYPES.map(type => '<option value="' + type.id + '">' + type.name + '</option>').join('') + '</select></label><label>Captured time · User supplied<input name="capturedAt" type="datetime-local" value="' + localTime + '"></label><label>Note<textarea name="note" rows="3" maxlength="500" placeholder="Describe the fictional evidence"></textarea><span class="hint" data-note-count>0 / 500</span></label><label>Location · Optional<input name="location" maxlength="120" placeholder="Fictional site / area"><span class="hint">Manual text only. No device location is requested.</span></label><div class="notice warning" role="status" data-capture-ready>Select an image to preview; no file is saved yet.</div></div></section></div><div id="capture-feedback" class="notice error" role="alert" tabindex="-1" hidden></div><footer class="editor-actions"><span class="save-status" role="status" data-capture-status>Not saved yet · Not uploaded</span><div class="editor-action-buttons"><a class="button secondary" href="' + back + '">Cancel</a><button class="button" type="submit" data-save-image>Save on this device</button></div></footer></form>';
  const form = root.querySelector('form'), feedback = root.querySelector('#capture-feedback');
  function currentClaim() { return claims.find(claim => claim.id === claimId && claim.project === projectId); }
  function setLines() {
    const lines = currentClaim()?.lines || [];
    if (!lines.some(line => line.id === lineId)) lineId = '';
    form.elements.namedItem('line').innerHTML = '<option value="">Whole claim</option>' + lines.map(line => '<option value="' + e(line.id) + '" ' + (line.id === lineId ? 'selected' : '') + '>' + e(line.id + ' · ' + line.title) + '</option>').join('');
  }
  function setClaims() {
    const options = claims.filter(claim => claim.project === projectId);
    if (!options.some(claim => claim.id === claimId)) claimId = options[0]?.id || '';
    form.elements.namedItem('claim').innerHTML = options.length ? options.map(claim => '<option value="' + e(claim.id) + '" ' + (claim.id === claimId ? 'selected' : '') + '>' + e(claim.reference || (claim.id.startsWith('LOCAL-') ? draftLabel(claim) : claim.id)) + '</option>').join('') : '<option value="">No saved claims available</option>';
    setLines();
  }
  function update() {
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input,select,textarea,button').forEach(el => { el.disabled = busy; });
    root.querySelector('[data-save-image]').disabled = busy || !file || !currentClaim();
    root.querySelector('[data-capture-status]').textContent = busy ? 'Reading / saving on this device…' : dirty ? 'Unsaved evidence · Not uploaded' : 'Not saved yet · Not uploaded';
    root.querySelector('[data-note-count]').textContent = form.elements.namedItem('note').value.length + ' / 500';
    const ready = root.querySelector('[data-capture-ready]'); ready.textContent = file ? 'Ready to save. The image and details have not been saved yet.' : 'Select an image to preview; no file is saved yet.';
    const link = '#project/' + projectId + '/evidence';
    root.querySelector('.editor-breadcrumb a').href = link; root.querySelector('.editor-actions a').href = link;
  }
  function error(message) { feedback.hidden = false; feedback.textContent = message; feedback.focus(); announce(message); }
  function changed() { dirty = true; attempted = null; feedback.hidden = true; update(); }
  form.addEventListener('input', event => { if (['note', 'location', 'capturedAt'].includes(event.target.name)) changed(); });
  form.addEventListener('change', event => {
    if (event.target.name === 'project') { projectId = event.target.value; claimId = ''; lineId = ''; setClaims(); changed(); }
    if (event.target.name === 'claim') { claimId = event.target.value; lineId = ''; setLines(); changed(); }
    if (event.target.name === 'line') { lineId = event.target.value; changed(); }
    if (['kind', 'capturedAt'].includes(event.target.name)) changed();
  });
  form.addEventListener('focusin', event => { if (!event.target.closest('.editor-actions') && event.target.getBoundingClientRect().bottom > root.querySelector('.editor-actions').getBoundingClientRect().top - 12) event.target.scrollIntoView({ block: 'center' }); });
  async function selectImage(selected) {
    if (!selected || busy) return;
    busy = true; feedback.hidden = true; update();
    try {
      const image = await readImage(typeof selected === 'function' ? await selected() : selected);
      if (!alive) return;
      file = image; dirty = true; attempted = null;
      root.querySelector('[data-image-preview]').innerHTML = '<img class="evidence-photo" src="' + e(file.content) + '" alt="Selected image preview">';
      root.querySelector('[data-file-details]').textContent = file.name + ' · ' + file.width + ' × ' + file.height + ' · ' + file.size + ' bytes';
      root.querySelector('.page-head .status').textContent = 'Ready to save'; announce('Image preview ready. Save to keep the file and details on this device.');
    } catch (failure) { if (alive) error('Image selection failed: ' + failure.message + (file ? ' The previous valid preview is retained.' : '')); }
    finally { busy = false; if (alive) update(); }
  }
  form.elements.namedItem('photo').addEventListener('change', event => { selectImage(event.target.files[0]); event.target.value = ''; });
  root.querySelector('[data-demo-image]').addEventListener('click', () => selectImage(demoImage));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !file || !currentClaim()) return;
    busy = true; feedback.hidden = true; update();
    try {
      attempted ||= savedEvidence({ id, claim: currentClaim(), lineId, file, kind: form.elements.namedItem('kind').value, note: form.elements.namedItem('note').value, location: form.elements.namedItem('location').value, capturedAt: form.elements.namedItem('capturedAt').value ? new Date(form.elements.namedItem('capturedAt').value).toISOString() : '' });
      await onSave(attempted); dirty = false; busy = false; announce('Image and context saved on this device. Not uploaded.'); onDone(id);
    } catch (failure) { busy = false; if (alive) { update(); error('Local save could not be confirmed: ' + failure.message + ' The preview and details remain here; retry before leaving.'); } }
  });
  if (context.error) root.querySelector('.page-head').insertAdjacentHTML('afterend', '<div class="notice error" role="alert">Local claim drafts unavailable: ' + e(context.error) + '. Only readable sample claims can be selected.</div>');
  setClaims(); update();
  return { get dirty() { return dirty; }, get busy() { return busy; }, canLeave() { if (busy) { announce('Wait for the image read or save to finish.'); return false; } if (dirty && !confirm('Leave without saving the image and evidence details?')) return false; dirty = false; return true; }, dispose() { alive = false; } };
}
