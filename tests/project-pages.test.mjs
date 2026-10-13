import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProjectPage, bindProjectPages } from '../project-pages.js';
test('unavailable saved records show an error instead of claiming an empty history', () => {
  const html = renderProjectPage('harbor', 'sov', 'A02', [], [], '', 'Storage denied');
  assert.match(html, /Saved claim drafts could not be read: Storage denied/);
  assert.ok(!html.includes('No saved device drafts reference this line'));
  const detail = renderProjectPage('harbor', 'variations', 'LOCAL-VO-example', [], [], 'Storage denied');
  assert.match(detail, /Proposal unavailable/);
});
test('proposal detail and both list layouts distinguish unknown amounts from entered zero', () => {
  for (const [value, expected] of [['', 'No amount yet'], ['   ', 'No amount yet'], ['0', 'SGD 0.00'], ['12.34', 'SGD 12.34']]) {
    const proposal = { id: 'LOCAL-VO-amount', project: 'cedar', title: 'Scope', amount: value, reviewedAt: null };
    const list = renderProjectPage('cedar', 'variations', undefined, [], [proposal]);
    const detail = renderProjectPage('cedar', 'variations', proposal.id, [], [proposal]);
    assert.match(detail, new RegExp('<dt>Proposed value</dt><dd>' + expected.replace('.', '\\.') + '</dd>'));
    assert.ok(list.includes(expected));
    if (!value.trim()) assert.equal((list.match(/No amount yet/g) || []).length, 2);
  }
});
test('live proposal searches find displayed references, suffixes, IDs and scopes without project leakage', () => {
  const locals = [
    { id: 'LOCAL-VO-ae11a36f-cedar', project: 'cedar', title: 'Searchable fictional scope', amount: '1' },
    { id: 'LOCAL-VO-ae11a36f-harbor', project: 'harbor', title: 'Other project scope', amount: '1' }
  ];
  const handlers = {};
  const search = { value: '', addEventListener: (event, callback) => { handlers[event] = callback; } };
  const state = { value: 'All', addEventListener() {} };
  const results = { innerHTML: '' };
  const root = { querySelector: selector => ({ '#vo-search': search, '#vo-state': state, '#vo-results': results })[selector] || null };
  bindProjectPages(root, 'cedar', locals);
  for (const query of [' Proposal AE11A36F ', 'ae11a36f', 'LOCAL-VO-ae11a36f-cedar', 'fictional scope']) {
    search.value = query;
    handlers.input();
    assert.ok(results.innerHTML.includes('#project/cedar/variations/LOCAL-VO-ae11a36f-cedar'));
    assert.ok(!results.innerHTML.includes('Other project scope'));
  }
  search.value = 'LOCAL-VO-ae11a36f-harbor';
  handlers.input();
  assert.ok(!results.innerHTML.includes('#project/cedar/variations/LOCAL-VO-ae11a36f-cedar'));
});
