import test from 'node:test';
import assert from 'node:assert/strict';
import { sovLines, projectVariations, contractSummary, claimBasis, SOURCE_VERSION } from '../demo-contracts.js';

test('only approved fictional variations enter revised contract and claim basis', () => {
  assert.deepEqual(contractSummary('harbor'), { original: 100000000, approved: 5000000, revised: 105000000, claimed: 5000000, certified: 4200000 });
  assert.deepEqual(sovLines('harbor').map(line => line.id), ['A01', 'A02', 'VO-007']);
  for (const item of projectVariations('harbor').filter(item => item.status !== 'Approved')) assert.ok(!claimBasis('harbor').some(line => line.id === item.id));
});
test('project sources are isolated and basis amounts reconcile', () => {
  assert.equal(contractSummary('cedar').revised, 25000000);
  assert.equal(contractSummary('cedar').approved, 0);
  assert.deepEqual(projectVariations('cedar'), []);
  assert.deepEqual(sovLines('unknown'), []);
  for (const project of ['harbor', 'cedar']) for (const line of sovLines(project)) {
    assert.equal(line.quantity * line.rate, line.revised);
    assert.equal(line.original + line.approved, line.revised);
  }
});
test('returned fixtures and claim snapshots cannot mutate the source', () => {
  const snapshot = claimBasis('harbor');
  assert.equal(snapshot[1].basis.version, SOURCE_VERSION);
  assert.equal(snapshot[1].basis.rate, '400.00');
  snapshot[1].title = 'Changed draft'; snapshot[1].basis.revised = '1';
  const variation = projectVariations('harbor'); variation[0].status = 'Rejected';
  assert.equal(claimBasis('harbor')[1].title, 'Concrete works');
  assert.equal(contractSummary('harbor').approved, 5000000);
});
