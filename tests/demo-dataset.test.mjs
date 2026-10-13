import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, sovLines, projectVariations, contractSummary } from '../demo-contracts.js';
import { sampleClaims } from '../demo-claims.js';
import { sampleCertificates } from '../demo-certificates.js';
import { sampleEvidence } from '../sample-evidence.js';
import { toCents, lineTotals } from '../demo-domain.js';
import { validateCertificate, assessmentTotals } from '../certificate-domain.js';
import { validateEvidence } from '../evidence-domain.js';

const originalContracts = { harbor: 100000000, cedar: 25000000, willow: 180000000, riverside: 75000000, elm: 360000000, meridian: 90000000 };

test('each project reconciles its agreed original basis and excludes unapproved scope', () => {
  for (const project of projects) {
    const lines = sovLines(project.id);
    const variations = projectVariations(project.id);
    const summary = contractSummary(project.id);
    assert.equal(summary.original, originalContracts[project.id], project.id);
    assert.equal(summary.revised, summary.original + summary.approved, project.id);
    assert.equal(summary.approved, variations.filter(item => item.status === 'Approved').reduce((sum, item) => sum + item.value, 0));
    for (const line of lines) {
      assert.equal(line.quantity * line.rate, line.revised, project.id + '/' + line.id);
      assert.equal(line.original + line.approved, line.revised);
    }
    for (const proposal of variations.filter(item => item.status !== 'Approved')) assert.ok(!lines.some(line => line.id === proposal.id));
  }
});

test('new claim snapshots have valid project ownership, bounded progress and no future approved scope', () => {
  const identifiers = new Set();
  for (const claim of sampleClaims) {
    assert.ok(!identifiers.has(claim.id), 'Duplicate claim route: ' + claim.id);
    identifiers.add(claim.id);
    assert.equal(toCents(claim.amount), lineTotals(claim.lines).current, claim.id);
    if (claim.sourceVersion === 'navigation-fixture-v1') continue;
    const project = projects.find(item => item.id === claim.project);
    assert.ok(project, claim.id);
    const basis = sovLines(claim.project);
    const variations = projectVariations(claim.project);
    for (const line of claim.lines) {
      assert.ok(basis.some(item => item.id === line.id), claim.id + '/' + line.id);
      assert.equal(line.basis.contract, project.contract);
      assert.ok(toCents(line.previous) + toCents(line.current || '0') <= toCents(line.basis.revised), claim.id + '/' + line.id);
      const variation = variations.find(item => item.id === line.id);
      if (variation) {
        assert.equal(variation.status, 'Approved');
        assert.ok(new Date(variation.approvedAt).valueOf() <= new Date(claim.updatedAt).valueOf(), 'Future scope in ' + claim.id);
      }
    }
  }
});

test('evidence and reviewed previews retain resolvable context and independent assessment state', () => {
  const evidenceIds = new Set();
  for (const image of sampleEvidence) {
    assert.ok(!evidenceIds.has(image.id), 'Duplicate evidence route: ' + image.id);
    evidenceIds.add(image.id);
    validateEvidence(image);
    const claim = sampleClaims.find(item => item.id === image.context.id);
    assert.equal(image.context.project, claim.project);
    assert.ok(!image.context.lineId || claim.lines.some(line => line.id === image.context.lineId));
  }
  const certificateIds = new Set();
  for (const certificate of sampleCertificates) {
    assert.ok(!certificateIds.has(certificate.id), 'Duplicate preview route: ' + certificate.id);
    certificateIds.add(certificate.id);
    assert.ok(sampleClaims.some(claim => claim.id === certificate.source.id && claim.project === certificate.source.project));
    assert.deepEqual(validateCertificate(certificate, true), [], certificate.id);
    const totals = assessmentTotals(certificate);
    assert.equal(totals.complete, true);
    assert.equal(totals.variance, totals.certified - totals.claimed);
    for (const image of certificate.source.attachments.filter(file => file.context)) {
      assert.equal(image.context.id, certificate.source.id);
      assert.equal(image.context.project, certificate.source.project);
    }
  }
});
