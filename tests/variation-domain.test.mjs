import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVariation, validateVariation, savedVariation } from '../variation-domain.js';
import { contractSummary, claimBasis } from '../demo-contracts.js';

test('incomplete proposals save locally, while review validates scope and amount', () => {
  const draft = normalizeVariation(null, 'harbor', 'LOCAL-VO-test');
  assert.deepEqual(validateVariation(draft), []);
  assert.equal(validateVariation(draft, true).length, 3);
  for (const amount of ['-1', '1.001', '1e3']) { draft.amount = amount; assert.equal(validateVariation(draft)[0].field, 'amount'); }
  draft.title = 'Sample ramp'; draft.reason = 'Fictional scope extension'; draft.amount = '0.10';
  assert.deepEqual(validateVariation(draft, true), []);
});
test('local review cannot approve a variation or change the contract and claim basis', () => {
  const draft = normalizeVariation(null, 'harbor', 'LOCAL-VO-stable');
  Object.assign(draft, { title: 'Sample ramp', reason: 'Fictional', amount: '12000.00', status: 'Approved', approved: true, lineId: 'A02' });
  const summary = contractSummary('harbor');
  const saved = savedVariation(draft, true, '2026-10-13T00:00:00.000Z');
  assert.equal(saved.id, draft.id);
  assert.equal(saved.reviewedAt, saved.updatedAt);
  assert.equal('status' in saved, false); assert.equal('approved' in saved, false);
  assert.deepEqual(contractSummary('harbor'), summary);
  assert.ok(!claimBasis('harbor').some(line => line.id === saved.id));
  assert.equal(saved.sourceSnapshot.revised, 80000000);
  saved.sourceSnapshot.title = 'Changed local';
  assert.equal(claimBasis('harbor')[1].title, 'Concrete works');
});
test('proposal line links cannot cross projects and old source snapshots survive resave', () => {
  const draft = normalizeVariation(null, 'cedar', 'LOCAL-VO-cedar');
  draft.lineId = 'VO-007';
  assert.equal(validateVariation(draft)[0].field, 'lineId');
  draft.lineId = 'A02'; draft.sourceVersion = 'historical-source'; draft.sourceSnapshot = { id: 'A02', title: 'Historical title', revised: 12300 };
  const saved = savedVariation(draft, false);
  assert.equal(saved.sourceVersion, 'historical-source');
  assert.deepEqual(saved.sourceSnapshot, draft.sourceSnapshot);
});
