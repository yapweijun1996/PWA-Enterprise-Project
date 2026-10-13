import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createDraftEditor } from '../draft-editor.js';
import { createVariationEditor } from '../variation-editor.js';
import { projects } from '../demo-contracts.js';
import { prepareRecordWrite } from '../record-store.js';
import { sampleLines } from '../demo-domain.js';

// A small event surface keeps these tests focused on editor consumer behavior.
function fixture() {
  const nodes = new Map();
  let focused = null;
  function node(key = '') {
    if (nodes.has(key)) return nodes.get(key);
    const handlers = {};
    const attributes = new Map();
    const classes = new Set();
    const element = {
      value: '', checked: false, hidden: false, disabled: false, textContent: '', innerHTML: '', dataset: {},
      classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) },
      addEventListener(type, callback) { (handlers[type] ||= []).push(callback); },
      async fire(type) { for (const callback of handlers[type] || []) await callback({ target: element, preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); },
      setAttribute(name, value) { attributes.set(name, value); }, removeAttribute(name) { attributes.delete(name); },
      getAttribute: name => attributes.get(name), focus() { focused = key; }, scrollIntoView() {},
      querySelector: selector => node(key + ' ' + selector), querySelectorAll: () => [],
      after(child) { if ('saveNewDraft' in child.dataset) nodes.set('[data-save-new-draft]', child); if ('saveNewProposal' in child.dataset) nodes.set('[data-save-new-proposal]', child); },
      elements: { namedItem: name => node('[name="' + name + '"]') }
    };
    nodes.set(key, element);
    return element;
  }
  const rows = [0, 1].map(index => { const row = node('row' + index); row.dataset.lineRow = String(index); return row; });
  const amounts = [0, 1].map(index => { const input = node('#line-' + index); input.dataset.lineAmount = String(index); return input; });
  const notes = [0, 1].map(index => { const input = node('#line-note-' + index); input.dataset.lineNote = String(index); return input; });
  const root = {
    innerHTML: '',
    querySelector(selector) {
      if (selector === '[data-save-new-draft]' || selector === '[data-save-new-proposal]') return nodes.get(selector) || null;
      if (selector === '[name=acknowledgement]') return node('[name="acknowledgement"]');
      if (/^\[name="line-(?:note-)?\d+"\]$/.test(selector)) return null;
      return node(selector);
    },
    querySelectorAll(selector) {
      return ({ '[data-line-row]': rows, '[data-line-amount]': amounts, '[data-line-note]': notes })[selector] || [];
    }
  };
  return { root, node, rows, focused: () => focused, createElement: () => node('created-' + nodes.size) };
}
function environment(t, ui) {
  const originals = Object.fromEntries(['document', 'crypto', 'getComputedStyle', 'confirm'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { createElement: ui.createElement, title: '' } },
    crypto: { configurable: true, value: webcrypto },
    getComputedStyle: { configurable: true, value: () => ({ display: 'block' }) },
    confirm: { configurable: true, value: () => false }
  });
  t.after(() => { for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
}
const kinds = [
  { name: 'claim', create: createDraftEditor, save: '[data-save]', recover: '[data-save-new-draft]', input: '[name="reference"]', field: 'reference', record: () => ({ id: 'LOCAL-original', project: 'cedar', period: '2026-10', lines: sampleLines('cedar'), attachments: [], reference: 'Original', reviewedAt: '2026-10-01' }) },
  { name: 'proposal', create: createVariationEditor, save: '[data-save-vo]', recover: '[data-save-new-proposal]', input: '[name="title"]', field: 'title', record: () => ({ id: 'LOCAL-VO-original', project: 'cedar', title: 'Original', reason: 'Fictional reason', amount: '1', lineId: 'A01', reviewedAt: '2026-10-01' }) }
];
function memoryStore(records = []) {
  const existing = new Map(records.map(record => [record.id, structuredClone(record)]));
  let writes = 0;
  let failConfirmation = false;
  function commit(record, revision) {
    const result = prepareRecordWrite(existing.get(record.id), structuredClone(record), revision);
    if (result.changed) { existing.set(record.id, structuredClone(result.record)); writes++; }
    return result.record;
  }
  return {
    existing, commit, get writes() { return writes; },
    failNextConfirmation() { failConfirmation = true; },
    async save(record, revision, receipt) {
      const persisted = commit(record, revision);
      receipt(persisted);
      if (failConfirmation) { failConfirmation = false; throw new Error('Readback unavailable'); }
      return structuredClone(existing.get(record.id));
    }
  };
}
for (const kind of kinds) {
  test(kind.name + ' confirms an unconfirmed committed save without creating another write', async t => {
    const ui = fixture(); environment(t, ui);
    const store = memoryStore([kind.record()]);
    store.failNextConfirmation();
    let routes = 0;
    const editor = kind.create({ root: ui.root, record: kind.record(), context: {}, projectId: 'cedar', projects, announce() {}, onDone() {}, onRouteChange() { routes++; }, onSave: store.save });
    await ui.node(kind.save).fire('click');
    const committed = structuredClone(store.existing.get(kind.record().id));
    assert.equal(store.writes, 1);
    assert.equal(editor.dirty, true);
    assert.equal(routes, 0);
    await ui.node(kind.save).fire('click');
    assert.equal(store.writes, 1);
    assert.equal(store.existing.size, 1);
    assert.deepEqual(store.existing.get(committed.id), committed);
    assert.equal(editor.dirty, false);
    assert.equal(routes, 1);
  });
  for (const interleaving of ['newer update', 'deleted', 'same-revision replacement']) {
    test(kind.name + ' preserves ' + interleaving + ' and explicitly forks conflicted input', async t => {
      const ui = fixture(); environment(t, ui);
      const store = memoryStore();
      const record = store.commit(kind.record(), null);
      const editor = kind.create({ root: ui.root, record, context: {}, projectId: 'cedar', projects, announce() {}, onDone() {}, onRouteChange() {}, onSave: store.save });
      if (interleaving === 'newer update') store.commit({ ...record, [kind.field]: 'Newer other-tab input' }, record.storageRevision);
      else {
        store.existing.delete(record.id);
        if (interleaving === 'same-revision replacement') store.commit({ ...kind.record(), [kind.field]: 'Recreated other-tab input' }, null);
      }
      const competing = structuredClone(store.existing.get(record.id));
      const beforeWrites = store.writes;
      const input = ui.node(kind.input); input.value = 'Preserved conflict input'; await input.fire('input');
      await ui.node(kind.save).fire('click');
      assert.equal(store.writes, beforeWrites);
      assert.deepEqual(store.existing.get(record.id), competing);
      assert.equal(editor.dirty, true);
      const recovery = ui.root.querySelector(kind.recover);
      assert.equal(recovery.hidden, false);
      await recovery.fire('click');
      const fork = [...store.existing.values()].find(item => item.id !== record.id);
      assert.ok(fork);
      assert.equal(store.existing.size, competing ? 2 : 1);
      assert.deepEqual(store.existing.get(record.id), competing);
      assert.equal(fork[kind.field], 'Preserved conflict input');
      assert.equal(fork.reviewedAt, null);
      assert.notEqual(fork.storageGeneration, record.storageGeneration);
      if (kind.name === 'claim') {
        assert.deepEqual(fork.lines, record.lines);
        assert.deepEqual(fork.attachments, record.attachments);
      } else {
        assert.equal(fork.lineId, record.lineId);
        assert.equal(fork.reason, record.reason);
        assert.equal(fork.amount, record.amount);
      }
      assert.equal(editor.dirty, false);
    });
  }
}
test('claim validation synchronizes pager, row and buttons before focusing an off-screen invalid line', async t => {
  const ui = fixture(); environment(t, ui);
  const record = { id: 'LOCAL-lines', project: 'cedar', period: '2026-10', step: 1, lines: sampleLines('cedar'), attachments: [] };
  record.lines[0].current = 'x'; record.lines[1].current = '1';
  const store = memoryStore([record]);
  createDraftEditor({ root: ui.root, record, context: {}, projects, onSave: store.save, onRouteChange() {}, onDone() {}, announce() {} });
  await ui.node('[data-line-next]').fire('click');
  await ui.node('#draft-editor-form').fire('submit');
  assert.equal(ui.node('.line-pager strong').textContent, record.lines[0].id + ' · ' + record.lines[0].title);
  assert.equal(ui.node('.line-pager .meta').textContent, 'Line 1 of 2');
  assert.equal(ui.node('[data-line-prev]').disabled, true);
  assert.equal(ui.node('[data-line-next]').disabled, false);
  assert.equal(ui.rows[0].classList.contains('is-selected'), true);
  assert.equal(ui.rows[1].classList.contains('is-selected'), false);
  assert.equal(ui.focused(), '#line-0');
  const correction = ui.node('#line-0'); correction.value = '2'; await correction.fire('input');
  await ui.node('[data-save]').fire('click');
  assert.equal(store.existing.get(record.id).lines[0].current, '2');
  assert.equal(store.existing.get(record.id).lines[1].current, '1');
});
for (const kind of kinds) {
  test(kind.name + ' deliberately edited unconfirmed commit uses its received revision for the replacement', async t => {
    const ui = fixture(); environment(t, ui);
    const store = memoryStore([kind.record()]);
    store.failNextConfirmation();
    const editor = kind.create({ root: ui.root, record: kind.record(), context: {}, projectId: 'cedar', projects, announce() {}, onDone() {}, onRouteChange() {}, onSave: store.save });
    await ui.node(kind.save).fire('click');
    const input = ui.node(kind.input); input.value = 'Deliberately revised after commit'; await input.fire('input');
    await ui.node(kind.save).fire('click');
    const replacement = store.existing.get(kind.record().id);
    assert.equal(store.writes, 2);
    assert.equal(store.existing.size, 1);
    assert.equal(replacement[kind.field], 'Deliberately revised after commit');
    assert.equal(replacement.reviewedAt, null);
    assert.equal(replacement.id, kind.record().id);
    assert.equal(editor.dirty, false);
  });
}
test('claim note validation selects the matching pager identity and preserves other line input', async t => {
  const ui = fixture(); environment(t, ui);
  const lines = sampleLines('cedar');
  lines[0].current = '2'; lines[1].current = '3'; lines[0].note = 'n'.repeat(301);
  const record = { id: 'LOCAL-note', project: 'cedar', period: '2026-10', step: 1, lines, attachments: [] };
  const store = memoryStore([record]);
  createDraftEditor({ root: ui.root, record, context: {}, projects, announce() {}, onRouteChange() {}, onDone() {}, onSave: store.save });
  await ui.node('[data-line-next]').fire('click');
  await ui.node('#draft-editor-form').fire('submit');
  assert.equal(ui.focused(), '#line-note-0');
  assert.equal(ui.node('.line-pager strong').textContent, lines[0].id + ' · ' + lines[0].title);
  assert.equal(ui.node('.line-pager .meta').textContent, 'Line 1 of 2');
  assert.equal(ui.node('[data-line-prev]').disabled, true);
  assert.equal(ui.node('[data-line-next]').disabled, false);
  const note = ui.node('#line-note-0'); note.value = 'Corrected fictional progress'; await note.fire('input');
  await ui.node('[data-save]').fire('click');
  const persisted = store.existing.get(record.id);
  assert.equal(persisted.lines[0].note, note.value);
  assert.equal(persisted.lines[0].current, '2');
  assert.equal(persisted.lines[1].current, '3');
});
for (const kind of kinds) {
  for (const interleaving of ['deleted', 'recreated']) {
    test(kind.name + ' unconfirmed retry does not resurrect or overwrite an intervening ' + interleaving + ' record', async t => {
      const ui = fixture(); environment(t, ui);
      const store = memoryStore([kind.record()]);
      store.failNextConfirmation();
      const editor = kind.create({ root: ui.root, record: kind.record(), context: {}, projectId: 'cedar', projects, announce() {}, onDone() {}, onRouteChange() {}, onSave: store.save });
      await ui.node(kind.save).fire('click');
      store.existing.delete(kind.record().id);
      if (interleaving === 'recreated') store.commit({ ...kind.record(), [kind.field]: 'Replacement must survive retry' }, null);
      const replacement = structuredClone(store.existing.get(kind.record().id));
      const beforeWrites = store.writes;
      await ui.node(kind.save).fire('click');
      assert.equal(store.writes, beforeWrites);
      assert.deepEqual(store.existing.get(kind.record().id), replacement);
      assert.equal(editor.dirty, true);
      assert.equal(ui.root.querySelector(kind.recover).hidden, false);
    });
  }
}
