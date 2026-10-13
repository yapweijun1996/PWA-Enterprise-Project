import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_IMAGE_BYTES, validateImageBytes, imageContent, readImage, contextSnapshot, savedEvidence, linkedEvidence, checkEvidenceWrite } from '../evidence-domain.js';
import { sampleClaims } from '../demo-claims.js';

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=';
function input() { return { id: 'LOCAL-EVIDENCE-test', claim: structuredClone(sampleClaims[1]), lineId: 'A02', kind: 'progress', note: '<b>Fictional image</b>', location: '', capturedAt: '2026-10-13T02:00:00.000Z', file: { name: 'fictional.png', type: 'image/png', size: atob(png).length, content: 'data:image/png;base64,' + png, width: 1, height: 1 } }; }
test('saved evidence carries actual raster bytes and immutable project/claim/line context', () => {
  const source = input(), saved = savedEvidence(source);
  source.claim.lines[1].title = 'Changed'; source.file.content = 'changed';
  assert.equal(saved.context.project, 'cedar'); assert.equal(saved.context.id, 'PCAP-DEMO-02'); assert.equal(saved.context.lineId, 'A02'); assert.equal(saved.context.lineTitle, 'Concrete works');
  assert.equal(atob(saved.file.content.split(',')[1]).length, saved.file.size);
  assert.equal(saved.note, '<b>Fictional image</b>');
  const attached = linkedEvidence([saved], saved.context.id); attached[0].content = 'changed';
  assert.equal(saved.file.content.endsWith(png), true);
  assert.deepEqual(linkedEvidence([saved], 'other-claim'), []);
  assert.deepEqual(linkedEvidence([saved], saved.context.id, 'harbor'), []);
  assert.throws(() => contextSnapshot(source.claim, 'VO-007'), /belonging/);
});
test('raster preview rejects external URLs, SVG, mismatched bytes, limits and unknown metadata', async () => {
  const source = input();
  assert.equal(imageContent({ type: 'image/png', content: 'https://external.test/photo.png' }), '');
  assert.equal(imageContent({ type: 'image/svg+xml', content: 'data:image/svg+xml;base64,PHN2Zz4=' }), '');
  assert.throws(() => validateImageBytes('image/jpeg', Uint8Array.from(atob(png), x => x.charCodeAt(0))), /match/);
  assert.throws(() => validateImageBytes('image/png', new Uint8Array(MAX_IMAGE_BYTES + 1)), /3 MB/);
  let read = false;
  await assert.rejects(readImage({ type: 'image/png', size: MAX_IMAGE_BYTES + 1, arrayBuffer() { read = true; } }), /3 MB/);
  assert.equal(read, false);
  source.file.size++;
  assert.throws(() => savedEvidence(source), /size/);
  source.file.size--; source.kind = 'unknown'; assert.throws(() => savedEvidence(source), /type/);
  source.kind = 'progress'; source.note = 'x'.repeat(501); assert.throws(() => savedEvidence(source), /500/);
});
test('read-only evidence retries keep one snapshot and cannot claim upload or approval', () => {
  const source = input(); source.uploadedAt = 'forged'; source.status = 'Uploaded';
  const record = savedEvidence(source, '2026-10-13T02:00:00.000Z');
  assert.equal('uploadedAt' in record, false); assert.equal('status' in record, false);
  assert.doesNotThrow(() => checkEvidenceWrite(record, structuredClone(record)));
  assert.throws(() => checkEvidenceWrite(record, { ...record, note: 'changed' }), /read-only/);
});
