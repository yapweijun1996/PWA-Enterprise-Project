import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProjectPage } from '../project-pages.js';
test('incomplete proposal value stays unknown in both desktop and mobile records', () => {
  const html = renderProjectPage('cedar', 'variations', undefined, [], [{ id: 'LOCAL-VO-partial', project: 'cedar', title: 'Partial scope', amount: '', reviewedAt: null }]);
  assert.equal((html.match(/No amount yet/g) || []).length, 2);
  assert.match(html, /Device draft/);
});
test('unavailable saved records show an error instead of claiming an empty history', () => {
  const html = renderProjectPage('harbor', 'sov', 'A02', [], [], '', 'Storage denied');
  assert.match(html, /Saved claim drafts could not be read: Storage denied/);
  assert.ok(!html.includes('No saved device drafts reference this line'));
  const detail = renderProjectPage('harbor', 'variations', 'LOCAL-VO-example', [], [], 'Storage denied');
  assert.match(detail, /Proposal unavailable/);
});
