import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRecordWrite, RecordConflictError } from '../record-store.js';
import { practiceRecords } from '../demo-practice.js';
import { checkCertificateWrite } from '../certificate-domain.js';
import { savedEvidence, checkEvidenceWrite } from '../evidence-domain.js';
import { sampleCertificates } from '../demo-certificates.js';

function mutableFamilies() {
  const records = practiceRecords();
  return [
    { name: 'claim draft', record: records.drafts[0], edit: record => { record.notes = 'Edited in another tab'; } },
    { name: 'variation proposal', record: records.variations[0], edit: record => { record.reason = 'Edited proposal reason'; } },
    { name: 'incomplete assessment', record: records.certificates[0], check: checkCertificateWrite, edit: record => { record.assessments[0].reason = 'Edited assessment reason'; } }
  ];
}

function conflict(operation, reason, attempted) {
  let caught;
  assert.throws(operation, error => {
    caught = error;
    return error instanceof RecordConflictError && error.code === 'RECORD_CONFLICT' && error.reason === reason;
  });
  assert.deepEqual(caught.record, attempted);
  assert.notEqual(caught.record, attempted);
  return caught;
}

test('all mutable families require explicit revision tokens and advance legacy records without changing their inputs', () => {
  for (const family of mutableFamilies()) {
    const original = structuredClone(family.record);
    const legacyRetry = prepareRecordWrite(family.record, structuredClone(family.record), 0, family.check);
    assert.equal(legacyRetry.changed, false, family.name);
    assert.equal(legacyRetry.record, family.record, family.name);
    assert.equal('storageGeneration' in legacyRetry.record, false, family.name);
    for (const expected of [undefined, -1, 0.5, '0', NaN]) {
      assert.throws(() => prepareRecordWrite(undefined, family.record, expected, family.check), TypeError, family.name);
      assert.throws(() => prepareRecordWrite(family.record, family.record, expected, family.check), TypeError, family.name);
    }
    const created = prepareRecordWrite(undefined, family.record, null, family.check);
    assert.equal(created.changed, true, family.name);
    assert.equal(created.record.storageRevision, 1, family.name);
    assert.equal(typeof created.record.storageGeneration, 'string', family.name);
    assert.ok(created.record.storageGeneration.length > 0, family.name);
    const edited = structuredClone(family.record);
    family.edit(edited);
    const legacyUpdate = prepareRecordWrite(family.record, edited, 0, family.check);
    assert.equal(legacyUpdate.changed, true, family.name);
    assert.equal(legacyUpdate.record.storageRevision, 1, family.name);
    assert.equal(typeof legacyUpdate.record.storageGeneration, 'string', family.name);
    assert.notEqual(legacyUpdate.record.storageGeneration, created.record.storageGeneration, family.name);
    assert.deepEqual(family.record, original, family.name);
    assert.equal('storageRevision' in edited, false, family.name);
    assert.equal('storageGeneration' in edited, false, family.name);
  }
});

test('create collisions, stale tab edits and deleted-record updates retain recoverable input for all mutable families', () => {
  for (const family of mutableFamilies()) {
    const first = prepareRecordWrite(undefined, family.record, null, family.check).record;
    const secondInput = structuredClone(first);
    family.edit(secondInput);
    const newer = prepareRecordWrite(first, secondInput, 1, family.check).record;
    assert.equal(newer.storageRevision, 2, family.name);
    assert.equal(newer.storageGeneration, first.storageGeneration, family.name);
    const staleInput = structuredClone(first);
    staleInput.updatedAt = '2026-10-13T05:00:00.000Z';
    const stale = conflict(() => prepareRecordWrite(newer, staleInput, 1, family.check), 'stale', staleInput);
    assert.equal(stale.expectedRevision, 1);
    assert.equal(stale.actualRevision, 2);
    assert.deepEqual(newer, { ...secondInput, storageRevision: 2 }, family.name);
    conflict(() => prepareRecordWrite(first, family.record, null, family.check), 'collision', family.record);
    conflict(() => prepareRecordWrite(undefined, staleInput, 1, family.check), 'deleted', staleInput);
    conflict(() => prepareRecordWrite(undefined, family.record, 0, family.check), 'deleted', family.record);
  }
});

test('exact committed retries return the persisted revision without another mutation, then reject changed or deleted state', () => {
  for (const family of mutableFamilies()) {
    const persisted = prepareRecordWrite(undefined, family.record, null, family.check).record;
    for (const expected of [null, 0, 1]) {
      const retry = prepareRecordWrite(persisted, structuredClone(persisted), expected, family.check);
      assert.equal(retry.changed, false, family.name);
      assert.equal(retry.record, persisted, family.name);
      assert.equal(retry.record.storageRevision, 1, family.name);
    }
    const changedInput = structuredClone(persisted);
    family.edit(changedInput);
    const newer = prepareRecordWrite(persisted, changedInput, 1, family.check).record;
    conflict(() => prepareRecordWrite(newer, persisted, 1, family.check), 'stale', persisted);
    conflict(() => prepareRecordWrite(undefined, persisted, 1, family.check), 'deleted', persisted);
  }
});

test('delete and recreate cannot admit old editor tokens even when the storage revision is reused', () => {
  for (const family of mutableFamilies()) {
    const oldRecord = prepareRecordWrite(undefined, family.record, null, family.check).record;
    const recreated = prepareRecordWrite(undefined, family.record, null, family.check).record;
    assert.equal(recreated.storageRevision, oldRecord.storageRevision, family.name);
    assert.notEqual(recreated.storageGeneration, oldRecord.storageGeneration, family.name);
    const oldAttempt = structuredClone(oldRecord);
    family.edit(oldAttempt);
    const stale = conflict(() => prepareRecordWrite(recreated, oldAttempt, oldRecord.storageRevision, family.check), 'stale', oldAttempt);
    assert.equal(stale.expectedGeneration, oldRecord.storageGeneration);
    assert.equal(stale.actualGeneration, recreated.storageGeneration);
    const withoutGeneration = structuredClone(recreated);
    delete withoutGeneration.storageGeneration;
    family.edit(withoutGeneration);
    conflict(() => prepareRecordWrite(recreated, withoutGeneration, recreated.storageRevision, family.check), 'stale', withoutGeneration);
    const inheritedAttempt = { ...family.record, storageGeneration: oldRecord.storageGeneration };
    const recovered = prepareRecordWrite(undefined, inheritedAttempt, null, family.check).record;
    assert.notEqual(recovered.storageGeneration, oldRecord.storageGeneration, family.name);
    const legacyAttempt = structuredClone(family.record);
    family.edit(legacyAttempt);
    conflict(() => prepareRecordWrite(recreated, legacyAttempt, 0, family.check), 'stale', legacyAttempt);
    const retry = prepareRecordWrite(recreated, structuredClone(recreated), recreated.storageRevision, family.check);
    assert.equal(retry.changed, false, family.name);
    assert.equal(retry.record.storageGeneration, recreated.storageGeneration, family.name);
  }
});

test('reviewed certificate and image retries remain immutable while identical retries still pass domain validation', () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=';
  const claim = practiceRecords().drafts[0];
  const evidence = savedEvidence({
    id: 'LOCAL-EVIDENCE-revision', claim, lineId: claim.lines[0].id, kind: 'progress', note: 'Fictional site image', location: '',
    capturedAt: '2026-10-13T04:00:00.000Z',
    file: { name: 'fictional.png', type: 'image/png', size: atob(png).length, content: 'data:image/png;base64,' + png, width: 1, height: 1 }
  }, '2026-10-13T04:00:00.000Z');
  const certificate = structuredClone(sampleCertificates.find(record => record.reviewedAt));
  for (const [record, check, edit] of [
    [certificate, checkCertificateWrite, next => { next.assessments[0].reason = 'Changed after review'; }],
    [evidence, checkEvidenceWrite, next => { next.note = 'Changed after save'; }]
  ]) {
    const persisted = prepareRecordWrite(undefined, record, null, check).record;
    const retry = prepareRecordWrite(persisted, structuredClone(persisted), 1, check);
    assert.equal(retry.changed, false);
    assert.equal(retry.record, persisted);
    const changed = structuredClone(persisted);
    edit(changed);
    assert.throws(() => prepareRecordWrite(persisted, changed, 1, check), /read-only/);
    conflict(() => prepareRecordWrite(undefined, persisted, 1, check), 'deleted', persisted);
  }
  const invalidImage = { ...evidence, kind: 'unknown' };
  assert.throws(() => prepareRecordWrite(invalidImage, structuredClone(invalidImage), 0, checkEvidenceWrite), /type/);
  const invalidPreview = structuredClone(certificate);
  invalidPreview.assessments[0].certified = '';
  assert.throws(() => prepareRecordWrite(invalidPreview, structuredClone(invalidPreview), 0, checkCertificateWrite), /invalid/);
});
