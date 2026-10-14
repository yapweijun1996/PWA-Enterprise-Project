import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceGallery, evidenceResults, evidenceDetail } from '../evidence-pages.js';
import { certificateDetail } from '../certificate-pages.js';
import { sampleCertificates } from '../demo-certificates.js';
import { webcrypto } from 'node:crypto';
import { createCertificateEditor } from '../certificate-editor.js';
import { createEvidenceEditor } from '../evidence-editor.js';
import { checkCertificateWrite } from '../certificate-domain.js';
import { checkEvidenceWrite } from '../evidence-domain.js';
import { prepareRecordWrite } from '../record-store.js';
import { sampleEvidence } from '../sample-evidence.js';

const record = { id: 'LOCAL-EVIDENCE-page', context: { id: 'LOCAL-claim', project: 'harbor', reference: '<b>Claim</b>', lineId: 'A02', lineTitle: 'Concrete', updatedAt: '2026-10-13T02:00:00Z' }, file: { name: 'fictional.png', type: 'image/png', content: '', width: 1, height: 1, size: 0 }, kind: 'progress', note: '<b>Fictional</b>', capturedAt: '2026-10-13T02:00:00Z', updatedAt: '2026-10-13T02:00:00Z' };
test('project galleries isolate evidence and document/photo filters preserve their owners', () => {
  const html = evidenceGallery({ records: [record], claims: [], currentClaims: [], projectId: 'cedar' });
  assert.ok(!html.includes('fictional.png'));
  assert.ok(!evidenceResults([record], [], [], '', 'Documents').includes('fictional.png'));
  assert.ok(evidenceResults([record], [], [], 'fictional', 'Photos').includes('fictional.png'));
  assert.ok(evidenceResults([record], [], []).includes('&lt;b&gt;Fictional&lt;/b&gt;'));
});
test('unavailable storage and source reads do not masquerade as empty or removed records', () => {
  const gallery = evidenceGallery({ records: [], claims: [], currentClaims: [], error: 'Synthetic unavailable', claimError: 'Synthetic unavailable' });
  assert.ok(gallery.includes('Some files unavailable'));
  assert.ok(!gallery.includes('No matching evidence'));
  const image = evidenceDetail(record, null, 'Synthetic unavailable');
  assert.ok(image.includes('Current source claim unavailable'));
  assert.ok(!image.includes('changed or was removed'));
  const certificate = certificateDetail(sampleCertificates.find(item => item.id === 'CCAP-DEMO-01'), null, 'Synthetic unavailable');
  assert.ok(certificate.includes('Current source claim unavailable'));
  assert.ok(!certificate.includes('changed or removed'));
});
test('claim ID search finds linked photos and documents even when their references differ', () => {
  const claim = { id: record.context.id, project: 'harbor', reference: 'A different visible reference', attachments: [{ name: 'measurements.txt', content: 'Fictional measurement' }] };
  const all = evidenceResults([record], [claim], [claim], '  local-CLAIM  ');
  assert.ok(all.includes('fictional.png'));
  assert.ok(all.includes('measurements.txt'));
  assert.ok(!evidenceResults([record], [claim], [], 'LOCAL-claim', 'Photos').includes('measurements.txt'));
  assert.ok(!evidenceResults([record], [claim], [], 'LOCAL-claim', 'Documents').includes('fictional.png'));
  assert.ok(!evidenceGallery({ records: [record], claims: [claim], currentClaims: [claim], projectId: 'cedar' }).includes('fictional.png'));
});

test('caption search finds its original image without relying on a duplicated note', () => {
  const captioned = { ...record, note: '', file: { ...record.file, caption: 'Podium foundation layout' } };
  const other = { ...record, id: 'LOCAL-EVIDENCE-other', file: { ...record.file, name: 'other.png' } };
  const html = evidenceResults([captioned, other], [], [], '  FOUNDATION  ', 'Photos');
  assert.ok(html.includes('href="#evidence/' + encodeURIComponent(captioned.id) + '"'));
  assert.ok(!html.includes('href="#evidence/' + encodeURIComponent(other.id) + '"'));
});

test('certificate detail distinguishes unassessed amounts from explicit zero in table and mobile rows', () => {
  for (const [value, expected] of [['', 'Not assessed'], ['   ', 'Not assessed'], ['0', 'SGD 0.00'], ['12.34', 'SGD 12.34']]) {
    const certificate = structuredClone(sampleCertificates.find(item => item.id === 'CCAP-DEMO-01'));
    certificate.reviewedAt = null;
    certificate.assessments[0].certified = value;
    const html = certificateDetail(certificate, certificate.source);
    const tableRow = /<tbody>(<tr>.*?<\/tr>)/.exec(html)[1];
    const mobileRow = /<div class="mobile-records">(<article.*?<\/article>)/.exec(html)[1];
    assert.ok(tableRow.includes('<td class="amount">' + expected + '</td>'), JSON.stringify(value));
    assert.ok(mobileRow.includes('<dt>Certified</dt><dd>' + expected + '</dd>'), JSON.stringify(value));
    if (!value.trim()) {
      assert.ok(tableRow.includes('<td class="amount">Not assessed</td>'));
      assert.ok(html.includes('<span class="label">Certified · Illustrative</span><p class="metric">No amount yet</p>'));
    }
  }
});

// Minimal DOM/browser boundaries; all snapshot validation and revision decisions use real domain/store code.
function editorFixture(t) {
  const nodes = new Map(), controls = new Set();
  let form;
  function node(key) {
    if (nodes.has(key)) return nodes.get(key);
    const handlers = {};
    const element = {
      name: '', value: '', checked: false, disabled: false, hidden: false, textContent: '', innerHTML: '',
      addEventListener(type, listener) { (handlers[type] ||= []).push(listener); },
      async fire(type, target = element) {
        const event = { target, preventDefault() {} };
        for (const listener of handlers[type] || []) await listener(event);
        if (element !== form && ['input', 'change'].includes(type)) await form.fire(type, target);
      },
      setAttribute() {}, removeAttribute() {}, focus() {},
      insertAdjacentHTML(position, html) { register(html); },
      querySelectorAll() { return [...controls]; },
      elements: { namedItem(name) { const field = node('[name="' + name + '"]'); field.name = name; controls.add(field); return field; } }
    };
    nodes.set(key, element);
    return element;
  }
  function register(html) {
    for (const match of html.matchAll(/<(input|select|textarea|button)\b([^>]*)>/g)) {
      const name = /name="([^"]+)"/.exec(match[2]);
      const data = /\b(data-[\w-]+)(?:="[^"]*")?/.exec(match[2]);
      const control = name ? form.elements.namedItem(name[1]) : data ? node('[' + data[1] + ']') : null;
      if (control) {
        controls.add(control);
        control.value = /value="([^"]*)"/.exec(match[2])?.[1] || '';
        control.hidden = /\bhidden\b/.test(match[2]);
      }
    }
  }
  form = node('form');
  const root = { querySelector: node, set innerHTML(html) { register(html); } };
  const originals = new Map(['crypto', 'FileReader', 'Image', 'confirm'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    crypto: { configurable: true, value: webcrypto },
    confirm: { configurable: true, value: () => false },
    FileReader: { configurable: true, value: class {
      async readAsDataURL(file) { this.result = 'data:' + file.type + ';base64,' + Buffer.from(await file.arrayBuffer()).toString('base64'); this.onload(); }
    } },
    Image: { configurable: true, value: class { naturalWidth = 1; naturalHeight = 1; async decode() {} } }
  });
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { root, node, form, field: name => form.elements.namedItem(name) };
}

function guardedMemory(check, initial) {
  const records = new Map(initial ? [[initial.id, structuredClone(initial)]] : []);
  const attempts = [];
  let failures = 0, aborts = 0, mutations = 0;
  return {
    records, attempts,
    failConfirmation(count) { failures = count; },
    abortWrite(count) { aborts = count; },
    get mutations() { return mutations; },
    async save(snapshot, revision, receipt) {
      attempts.push({ snapshot: structuredClone(snapshot), revision });
      if (aborts > 0) { aborts--; throw new Error('Transaction aborted'); }
      const prepared = prepareRecordWrite(records.get(snapshot.id), snapshot, revision, check);
      if (prepared.changed) { records.set(snapshot.id, structuredClone(prepared.record)); mutations++; }
      const persisted = structuredClone(records.get(snapshot.id));
      receipt(persisted);
      if (failures > 0) { failures--; throw new Error('Readback unavailable'); }
      return structuredClone(records.get(snapshot.id));
    }
  };
}
function editableCertificate() {
  const certificate = structuredClone(sampleCertificates.find(item => item.id === 'CCAP-DEMO-01'));
  delete certificate.sample;
  certificate.id = 'LOCAL-CERT-existing'; certificate.reviewedAt = null;
  certificate.assessments = certificate.source.lines.map(line => ({ certified: line.current, reason: '' }));
  return certificate;
}

for (const reviewed of [false, true]) {
  test('assessment retains committed ' + (reviewed ? 'reviewed' : 'draft') + ' mode through repeated failures and blocked edits', async t => {
    const ui = editorFixture(t), record = { ...editableCertificate(), storageRevision: 3, storageGeneration: 'existing-generation' };
    const storage = guardedMemory(checkCertificateWrite, record);
    storage.failConfirmation(2);
    const routes = [], details = [];
    const editor = createCertificateEditor({ root: ui.root, record, onSave: storage.save, onRouteChange: id => routes.push(id), onDone: id => details.push(id), announce() {} });
    ui.field('acknowledgement').checked = true;
    const save = reviewed ? () => ui.form.fire('submit') : () => ui.node('[data-save-cert]').fire('click');
    await save();
    const committed = structuredClone(storage.records.get(record.id));
    assert.equal(editor.dirty, true);
    assert.equal(routes.length, 0);
    assert.equal(ui.field('certified-0').disabled, true);
    assert.equal(ui.field('acknowledgement').disabled, true);
    assert.equal(ui.node(reviewed ? '[data-save-cert]' : '[data-review-cert]').disabled, true);
    ui.field('certified-0').value = '99999'; await ui.field('certified-0').fire('input');
    ui.field('reason-0').value = 'Must not change snapshot'; await ui.field('reason-0').fire('input');
    ui.field('acknowledgement').checked = false; await ui.field('acknowledgement').fire('change');
    if (reviewed) await ui.node('[data-save-cert]').fire('click'); else await ui.form.fire('submit');
    assert.equal(storage.attempts.length, 1);
    await save();
    assert.equal(editor.dirty, true);
    assert.deepEqual(storage.records.get(record.id), committed);
    await save();
    assert.equal(storage.mutations, 1);
    assert.deepEqual(storage.attempts.slice(1).map(attempt => attempt.snapshot), [committed, committed]);
    assert.deepEqual(storage.attempts.map(attempt => attempt.revision), [3, 4, 4]);
    assert.equal(editor.dirty, false);
    assert.deepEqual(routes, [record.id]);
    assert.deepEqual(details, reviewed ? [record.id] : []);
    if (!reviewed) {
      assert.equal(ui.field('certified-0').disabled, false);
      ui.field('certified-0').value = '100'; await ui.field('certified-0').fire('input');
      await save();
      assert.equal(storage.attempts.at(-1).revision, 4);
      assert.equal(storage.attempts.at(-1).snapshot.storageGeneration, committed.storageGeneration);
      assert.equal(storage.records.get(record.id).assessments[0].certified, '100');
      assert.equal(storage.mutations, 2);
    }
  });
}

test('aborted assessment writes permit corrections and stale saves recover as independent unreviewed assessments', async t => {
  const ui = editorFixture(t), record = { ...editableCertificate(), storageRevision: 7, storageGeneration: 'original-generation' };
  const storage = guardedMemory(checkCertificateWrite, record);
  storage.abortWrite(1);
  const editor = createCertificateEditor({ root: ui.root, record, onSave: storage.save, onRouteChange() {}, onDone() {}, announce() {} });
  await ui.node('[data-save-cert]').fire('click');
  assert.equal(ui.field('certified-0').disabled, false);
  assert.deepEqual(storage.records.get(record.id), record);
  ui.field('certified-0').value = '321'; await ui.field('certified-0').fire('input');
  ui.field('reason-0').value = 'Corrected assessment'; await ui.field('reason-0').fire('input');
  const newer = { ...structuredClone(record), storageRevision: 8, updatedAt: '2026-10-14T00:00:00Z' };
  storage.records.set(record.id, newer);
  await ui.node('[data-save-cert]').fire('click');
  assert.equal(editor.dirty, true);
  assert.deepEqual(storage.records.get(record.id), newer);
  assert.equal(ui.node('[data-new-cert]').hidden, false);
  await ui.node('[data-new-cert]').fire('click');
  const fork = storage.attempts.at(-1);
  assert.equal(fork.revision, null);
  assert.notEqual(fork.snapshot.id, record.id);
  assert.ok(fork.snapshot.id.startsWith('LOCAL-CERT-'));
  assert.equal(fork.snapshot.reviewedAt, null);
  assert.equal(fork.snapshot.storageGeneration, undefined);
  assert.deepEqual(fork.snapshot.source, record.source);
  assert.deepEqual(fork.snapshot.assessments[0], { certified: '321', reason: 'Corrected assessment' });
  assert.deepEqual(storage.records.get(record.id), newer);
  assert.equal(storage.records.size, 2);
  assert.equal(editor.dirty, false);
});

for (const reviewed of [false, true]) {
  test('deleted unconfirmed ' + (reviewed ? 'reviewed preview' : 'assessment draft') + ' recovers as a new unreviewed assessment', async t => {
    const ui = editorFixture(t), record = { ...editableCertificate(), storageRevision: 3, storageGeneration: 'existing-generation' };
    const storage = guardedMemory(checkCertificateWrite, record);
    storage.failConfirmation(1);
    const editor = createCertificateEditor({ root: ui.root, record, onSave: storage.save, onRouteChange() {}, onDone() {}, announce() {} });
    ui.field('acknowledgement').checked = true;
    const save = reviewed ? () => ui.form.fire('submit') : () => ui.node('[data-save-cert]').fire('click');
    await save();
    const committed = structuredClone(storage.records.get(record.id));
    storage.records.delete(record.id);
    await save();
    assert.equal(storage.records.has(record.id), false);
    assert.equal(editor.dirty, true);
    assert.equal(ui.node('[data-new-cert]').hidden, false);
    assert.equal(ui.node('[data-new-cert]').disabled, false);
    await ui.node('[data-new-cert]').fire('click');
    const recovered = [...storage.records.values()][0];
    assert.equal(storage.records.size, 1);
    assert.notEqual(recovered.id, record.id);
    assert.notEqual(recovered.storageGeneration, committed.storageGeneration);
    assert.equal(recovered.reviewedAt, null);
    assert.deepEqual(recovered.source, committed.source);
    assert.deepEqual(recovered.assessments, committed.assessments);
    assert.equal(editor.dirty, false);
  });
}

async function chooseEvidence(ui) {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  ui.field('photo').files = [{ name: 'fictional.png', type: 'image/png', size: bytes.length, async arrayBuffer() { return bytes.buffer; } }];
  ui.field('capturedAt').value = '2026-10-13T12:00';
  ui.field('kind').value = 'progress';
  await ui.field('photo').fire('change');
  ui.field('note').value = 'Original image context'; await ui.field('note').fire('input');
}

test('evidence keeps committed image/context identity and guarded retries until exact confirmation', async t => {
  const ui = editorFixture(t), claim = editableCertificate().source;
  const storage = guardedMemory(checkEvidenceWrite);
  storage.failConfirmation(2);
  const details = [];
  const editor = createEvidenceEditor({ root: ui.root, claims: [claim], context: { project: claim.project, claim: claim.id }, onSave: storage.save, onDone: id => details.push(id), announce() {} });
  await chooseEvidence(ui);
  await ui.form.fire('submit');
  const committed = structuredClone([...storage.records.values()][0]);
  assert.equal(editor.dirty, true);
  assert.equal(details.length, 0);
  for (const name of ['photo', 'project', 'claim', 'line', 'kind', 'note', 'location', 'capturedAt']) assert.equal(ui.field(name).disabled, true, name);
  assert.equal(ui.node('[data-save-image]').disabled, false);
  ui.field('note').value = 'Changed note'; await ui.field('note').fire('input');
  ui.field('project').value = 'harbor'; await ui.field('project').fire('change');
  await ui.field('photo').fire('change');
  await ui.form.fire('submit');
  assert.equal(editor.dirty, true);
  await ui.form.fire('submit');
  assert.equal(storage.mutations, 1);
  assert.deepEqual(storage.attempts.map(attempt => attempt.revision), [null, 1, 1]);
  assert.deepEqual(storage.attempts.slice(1).map(attempt => attempt.snapshot), [committed, committed]);
  assert.deepEqual(storage.records.get(committed.id), committed);
  assert.deepEqual(details, [committed.id]);
  assert.equal(editor.dirty, false);
});

test('aborted evidence writes permit correction without losing the valid image', async t => {
  const ui = editorFixture(t), claim = editableCertificate().source, storage = guardedMemory(checkEvidenceWrite);
  storage.abortWrite(1);
  const editor = createEvidenceEditor({ root: ui.root, claims: [claim], context: { project: claim.project, claim: claim.id }, onSave: storage.save, onDone() {}, announce() {} });
  await chooseEvidence(ui);
  await ui.form.fire('submit');
  assert.equal(ui.field('note').disabled, false);
  assert.equal(storage.records.size, 0);
  ui.field('note').value = 'Corrected context'; await ui.field('note').fire('input');
  await ui.form.fire('submit');
  assert.equal(storage.attempts.at(-1).revision, null);
  assert.equal([...storage.records.values()][0].note, 'Corrected context');
  assert.deepEqual(storage.attempts[0].snapshot.file, storage.attempts[1].snapshot.file);
  assert.equal(editor.dirty, false);
});

test('receipt revisions prevent deleted committed attempts from being resurrected by retry', async t => {
  const ui = editorFixture(t), claim = editableCertificate().source, storage = guardedMemory(checkEvidenceWrite);
  storage.failConfirmation(1);
  const details = [];
  const editor = createEvidenceEditor({ root: ui.root, claims: [claim], context: { project: claim.project, claim: claim.id }, onSave: storage.save, onDone: id => details.push(id), announce() {} });
  await chooseEvidence(ui);
  await ui.form.fire('submit');
  const id = [...storage.records.keys()][0];
  storage.records.delete(id);
  await ui.form.fire('submit');
  assert.equal(storage.attempts.at(-1).revision, 1);
  assert.equal(storage.records.size, 0);
  assert.equal(storage.mutations, 1);
  assert.equal(details.length, 0);
  assert.equal(editor.dirty, true);
  assert.equal(ui.field('note').disabled, true);
});

test('bundled and device whole-claim/line photos remain discoverable by claim ID and visible reference', () => {
  const wholeClaim = { ...record, id: 'LOCAL-EVIDENCE-whole', context: { ...record.context, lineId: '', lineTitle: 'Whole claim' } };
  for (const image of [...sampleEvidence, record, wholeClaim]) {
    for (const query of [image.context.id, image.context.reference]) {
      const html = evidenceResults([image], [], [], '  ' + query.toUpperCase() + '  ', 'Photos');
      assert.ok(html.includes('href="#evidence/' + encodeURIComponent(image.id) + '"'), image.id + ': ' + query);
    }
    const otherProject = image.context.project === 'harbor' ? 'cedar' : 'harbor';
    const scoped = evidenceGallery({ records: [image], claims: [], currentClaims: [], projectId: otherProject });
    assert.ok(!scoped.includes('href="#evidence/' + encodeURIComponent(image.id) + '"'));
  }
});

for (const claimed of ['', '   ', '0', '0.00', '10000.00']) {
  test('assessment editor zero variance agrees with review validation for claimed ' + JSON.stringify(claimed), async t => {
    const ui = editorFixture(t);
    const record = editableCertificate();
    record.source.lines[0].current = claimed;
    record.assessments[0] = { certified: claimed.trim() || '0', reason: '' };
    const storage = guardedMemory(checkCertificateWrite, record);
    const details = [];
    createCertificateEditor({ root: ui.root, record, onSave: storage.save, onRouteChange() {}, onDone: id => details.push(id), announce() {} });
    assert.equal(ui.node('[data-variance="0"]').textContent, 'SGD 0.00');
    ui.field('acknowledgement').checked = true;
    await ui.form.fire('submit');
    assert.equal(details.length, 1, JSON.stringify(claimed));
    assert.ok(storage.records.get(record.id).reviewedAt);
  });
}

test('assessment generation rejects delete/recreate with the same revision and recovery gets a fresh identity', async t => {
  const ui = editorFixture(t), record = { ...editableCertificate(), storageRevision: 1, storageGeneration: 'original-generation' };
  const replacement = { ...structuredClone(record), storageGeneration: 'replacement-generation', updatedAt: '2026-10-14T00:00:00Z' };
  const storage = guardedMemory(checkCertificateWrite, replacement);
  const editor = createCertificateEditor({ root: ui.root, record, onSave: storage.save, onRouteChange() {}, onDone() {}, announce() {} });
  ui.field('certified-0').value = '321'; await ui.field('certified-0').fire('input');
  await ui.node('[data-save-cert]').fire('click');
  assert.equal(storage.attempts[0].revision, 1);
  assert.equal(storage.attempts[0].snapshot.storageGeneration, 'original-generation');
  assert.deepEqual(storage.records.get(record.id), replacement);
  assert.equal(editor.dirty, true);
  assert.equal(ui.node('[data-new-cert]').hidden, false);
  await ui.node('[data-new-cert]').fire('click');
  const fork = storage.attempts.at(-1);
  assert.equal(fork.revision, null);
  assert.equal(fork.snapshot.storageGeneration, undefined);
  const created = storage.records.get(fork.snapshot.id);
  assert.notEqual(created.storageGeneration, record.storageGeneration);
  assert.notEqual(created.storageGeneration, replacement.storageGeneration);
  assert.equal(created.assessments[0].certified, '321');
  assert.deepEqual(created.source, record.source);
  assert.deepEqual(storage.records.get(record.id), replacement);
});

test('unconfirmed evidence receipt generation rejects a replacement at the same storage revision', async t => {
  const ui = editorFixture(t), claim = editableCertificate().source, storage = guardedMemory(checkEvidenceWrite);
  storage.failConfirmation(1);
  const details = [];
  const editor = createEvidenceEditor({ root: ui.root, claims: [claim], context: { project: claim.project, claim: claim.id }, onSave: storage.save, onDone: id => details.push(id), announce() {} });
  await chooseEvidence(ui);
  await ui.form.fire('submit');
  const committed = [...storage.records.values()][0];
  const replacement = { ...structuredClone(committed), storageGeneration: 'replacement-generation', note: 'Replacement image context' };
  storage.records.set(committed.id, replacement);
  await ui.form.fire('submit');
  assert.equal(storage.attempts.at(-1).revision, committed.storageRevision);
  assert.equal(storage.attempts.at(-1).snapshot.storageGeneration, committed.storageGeneration);
  assert.deepEqual(storage.records.get(committed.id), replacement);
  assert.equal(storage.mutations, 1);
  assert.equal(details.length, 0);
  assert.equal(editor.dirty, true);
});
