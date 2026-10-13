import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, lineTotals, sampleLines, normalizeDraft, validateDraft, savedRecord, sampleAttachment } from '../demo-domain.js';

test('decimal input preserves cents and rejects unsupported financial forms', () => {
  assert.equal(toCents('0.10'), 10);
  assert.equal(toCents('99999999999.99'), 9999999999999);
  for (const value of ['-1', '1e3', '1,000', '1.005', 'Infinity', '', '100000000000']) assert.equal(toCents(value), null);
});
test('independent synthetic current, previous and cumulative values reconcile', () => {
  const lines = sampleLines();
  lines[0].current = '10000'; lines[1].current = '15000.00';
  assert.deepEqual(lineTotals(lines), { previous: 5000000, current: 2500000, cumulative: 7500000, valid: true });
  assert.equal(lineTotals([{ previous: '0', current: '0.10' }, { previous: '0', current: '0.20' }]).current, 30);
  lines[1].current = '15.555';
  assert.equal(lineTotals(lines).valid, false);
});
test('old draft resumes without changing its identifier, amount or note', () => {
  const draft = normalizeDraft({ id: 'LOCAL-old', project: 'cedar', direction: 'Payable', period: '2026-10', amount: '12.30', notes: '<b>Fictional</b>' });
  assert.equal(draft.id, 'LOCAL-old');
  assert.equal(draft.direction, 'Payable');
  assert.equal(draft.lines[0].current, '12.30');
  assert.equal(draft.notes, '<b>Fictional</b>');
  assert.equal(savedRecord(draft, false).amount, '12.30');
});
test('incomplete drafts may be saved, but review requires valid details and positive lines', () => {
  const draft = normalizeDraft(null, {}, 'LOCAL-new');
  assert.deepEqual(validateDraft(draft), []);
  assert.equal(validateDraft(draft, { requireDetails: true, requireLines: true }).length, 2);
  draft.period = '2026-13';
  assert.equal(validateDraft(draft)[0].field, 'period');
  draft.period = '2026-10'; draft.lines = sampleLines(); draft.lines[0].current = '1.01';
  assert.deepEqual(validateDraft(draft, { requireDetails: true, requireLines: true }), []);
});
test('save snapshots preserve input and review is a local property, not a submitted state', () => {
  const draft = normalizeDraft(null, { project: 'cedar', direction: 'Payable' }, 'LOCAL-stable');
  draft.lines = sampleLines(); draft.lines[0].current = '0.10'; draft.lines[1].current = '0.20';
  const record = savedRecord(draft, true, '2026-10-13T00:00:00.000Z');
  assert.equal(record.amount, '0.30');
  assert.equal(record.reviewedAt, record.updatedAt);
  record.lines[0].current = '99';
  assert.equal(draft.lines[0].current, '0.10');
  assert.equal('submittedAt' in record, false);
  assert.equal(savedRecord(record, false).reviewedAt, record.reviewedAt);
  record.reviewedAt = null;
  assert.equal(savedRecord(record, false).reviewedAt, null);
});
test('sample evidence stores actual content bytes with its contextual metadata', () => {
  const attachment = sampleAttachment('measurement', { project: 'cedar', direction: 'Payable', period: '2026-10' }, 'A02');
  assert.match(attachment.content, /SYNTHETIC DEMO EVIDENCE/);
  assert.match(attachment.content, /Project: cedar/);
  assert.match(attachment.content, /Line: A02/);
  assert.equal(attachment.size, new TextEncoder().encode(attachment.content).length);
  assert.throws(() => sampleAttachment('unknown', {}));
});
