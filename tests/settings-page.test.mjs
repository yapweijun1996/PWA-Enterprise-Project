import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsPage } from '../settings-page.js';

const empty = { drafts: [], variations: [], certificates: [], evidence: [] };
test('settings distinguishes unreadable device data from known empty categories', () => {
  const html = settingsPage({ ...empty, storageError: 'Storage <unavailable>' });
  assert.ok(html.includes('Count unavailable · Storage &lt;unavailable&gt;'));
  assert.equal((html.match(/0 saved on this device/g) || []).length, 3);
  assert.match(html, /id="clear-drafts" type="button" disabled/);
});
test('settings keeps deletion controls and counts attached to their independent record families', () => {
  const html = settingsPage({ ...empty, drafts: [{}], evidence: [{}, {}] });
  assert.ok(html.includes('1 saved on this device'));
  assert.ok(html.includes('2 saved on this device'));
  assert.match(html, /id="clear-variations" type="button" disabled/);
  assert.doesNotMatch(html, /id="clear-evidence" type="button" disabled/);
});
