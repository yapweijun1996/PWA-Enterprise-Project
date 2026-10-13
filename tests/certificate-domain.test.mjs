import test from 'node:test';
import assert from 'node:assert/strict';
import { canAssess, normalizeCertificate, assessmentTotals, validateCertificate, savedCertificate, checkCertificateWrite } from '../certificate-domain.js';
import { normalizeDraft, savedRecord, sampleLines } from '../demo-domain.js';

function source() {
  const claim = normalizeDraft(null, { project: 'harbor' }, 'LOCAL-claim');
  claim.period = '2026-10'; claim.lines = sampleLines();
  claim.lines[0].current = '0.10'; claim.lines[1].current = '0.20';
  return savedRecord(claim, true, '2026-10-13T00:00:00.000Z');
}
test('assessment requires a reviewed valid source and keeps exact signed variance separate', () => {
  const claim = source();
  assert.equal(canAssess({ ...claim, reviewedAt: null }), false);
  const certificate = normalizeCertificate(null, claim, 'LOCAL-CERT-test');
  certificate.assessments = [{ certified: '0.10', reason: '' }, { certified: '0.15', reason: 'Fictional measurement difference' }, { certified: '0.00', reason: '' }];
  assert.deepEqual(assessmentTotals(certificate), { claimed: 30, certified: 25, variance: -5, complete: true });
  assert.deepEqual(validateCertificate(certificate, true), []);
  assert.equal(claim.amount, '0.30');
});
test('incomplete assessments stay unknown; local review requires each amount and variance reason', () => {
  const certificate = normalizeCertificate(null, source(), 'LOCAL-CERT-test');
  assert.equal(assessmentTotals(certificate).complete, false);
  assert.deepEqual(validateCertificate(certificate), []);
  assert.equal(validateCertificate(certificate, true).length, 3);
  certificate.assessments[0].certified = '0.05';
  assert.ok(validateCertificate(certificate, true).some(error => error.field === 'reason-0'));
  for (const value of ['-1', '1e3', '0.001']) { certificate.assessments[0].certified = value; assert.ok(validateCertificate(certificate).length); }
});
test('source and reviewed snapshots survive later claim edits and reject mutable issued state', () => {
  const claim = source(), certificate = normalizeCertificate(null, claim, 'LOCAL-CERT-test');
  certificate.assessments = certificate.source.lines.map(line => ({ certified: line.current || '0.00', reason: '' }));
  certificate.status = 'Issued'; certificate.issuedAt = 'forged';
  const saved = savedCertificate(certificate, true, '2026-10-13T01:00:00.000Z');
  claim.lines[0].current = '999'; certificate.assessments[0].certified = '888';
  assert.equal(saved.source.lines[0].current, '0.10');
  assert.equal(saved.assessments[0].certified, '0.10');
  assert.equal('issuedAt' in saved, false); assert.equal('status' in saved, false);
  assert.doesNotThrow(() => checkCertificateWrite(saved, structuredClone(saved)));
  assert.throws(() => checkCertificateWrite(saved, { ...saved, updatedAt: 'changed' }), /read-only/);
  assert.throws(() => savedCertificate(saved, false), /read-only/);
});
