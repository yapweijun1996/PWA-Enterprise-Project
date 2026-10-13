import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceRecords, practiceRecordIds } from '../demo-practice.js';
import { savedEvidence } from '../evidence-domain.js';
import { validateCertificate } from '../certificate-domain.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=';
function image(claim, id) {
  return savedEvidence({
    id, claim, lineId: claim.lines[0].id, kind: 'progress', note: 'Fictional practice evidence', location: '',
    capturedAt: '2026-10-13T04:00:00.000Z',
    file: { name: 'practice.png', type: 'image/png', size: atob(png).length, content: 'data:image/png;base64,' + png, width: 1, height: 1 }
  }, '2026-10-13T04:00:00.000Z');
}

test('practice source snapshots merge only device images belonging to the same project and claim', () => {
  const initial = practiceRecords();
  const harbor = initial.drafts.find(record => record.id === 'LOCAL-PRACTICE-CLAIM-HARBOR-1');
  const cedar = initial.drafts.find(record => record.id === 'LOCAL-PRACTICE-CLAIM-CEDAR-1');
  const linked = image(harbor, 'LOCAL-EVIDENCE-practice-linked');
  const otherClaim = image(cedar, 'LOCAL-EVIDENCE-practice-other-claim');
  const otherProject = structuredClone(linked);
  otherProject.id = 'LOCAL-EVIDENCE-practice-other-project';
  otherProject.context.project = 'cedar';
  const evidence = [linked, otherClaim, otherProject];
  const records = practiceRecords(evidence);
  const snapshot = records.certificates.find(record => record.source.id === harbor.id);
  const original = initial.certificates.find(record => record.source.id === harbor.id);
  assert.deepEqual(snapshot.source.attachments.filter(file => file.type === 'text/plain'), original.source.attachments);
  assert.deepEqual(snapshot.source.attachments.filter(file => file.type.startsWith('image/')).map(file => file.id), [linked.id]);
  const copiedImage = snapshot.source.attachments.find(file => file.id === linked.id);
  assert.equal(copiedImage.content, linked.file.content);
  assert.deepEqual(copiedImage.context, linked.context);
  assert.equal(copiedImage.lineId, harbor.lines[0].id);
  assert.deepEqual(validateCertificate(snapshot), []);
  const cedarSnapshot = records.certificates.find(record => record.source.id === cedar.id);
  assert.deepEqual(cedarSnapshot.source.attachments.filter(file => file.type.startsWith('image/')).map(file => file.id), [otherClaim.id]);
  assert.deepEqual(records.drafts, initial.drafts);
  assert.deepEqual(records.variations, initial.variations);
});

test('practice assessment image and text snapshots survive source deletion and later edits', () => {
  const initial = practiceRecords();
  const claim = initial.drafts.find(record => record.id === 'LOCAL-PRACTICE-CLAIM-HARBOR-1');
  const evidence = [image(claim, 'LOCAL-EVIDENCE-practice-retained')];
  const records = practiceRecords(evidence);
  const snapshot = records.certificates.find(record => record.source.id === claim.id);
  const before = structuredClone(snapshot.source.attachments);
  evidence[0].file.content = 'changed after assessment creation';
  evidence[0].context.lineTitle = 'changed after assessment creation';
  evidence.length = 0;
  const source = records.drafts.find(record => record.id === claim.id);
  for (const file of source.attachments) file.content = 'changed after assessment creation';
  source.attachments.length = 0;
  assert.deepEqual(snapshot.source.attachments, before);
  assert.equal(snapshot.source.attachments.some(file => file.id === 'LOCAL-EVIDENCE-practice-retained'), true);
  assert.deepEqual(validateCertificate(snapshot), []);
});

test('practice insertion records retain reserved identity, revisionless shape and unfinished assessment state', () => {
  const records = practiceRecords();
  const ids = practiceRecordIds();
  assert.deepEqual(practiceRecords([]), records);
  for (const family of ['drafts', 'variations', 'certificates']) {
    assert.deepEqual(records[family].map(record => record.id), ids[family]);
    for (const record of records[family]) assert.equal('storageRevision' in record, false);
  }
  for (const certificate of records.certificates) {
    assert.equal(certificate.reviewedAt, null);
    assert.equal(certificate.assessments.at(-1).certified, '');
    assert.deepEqual(validateCertificate(certificate), []);
    assert.equal(certificate.source.attachments.every(file => file.type === 'text/plain'), true);
  }
});
