import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceGallery, evidenceResults, evidenceDetail } from '../evidence-pages.js';
import { certificateDetail } from '../certificate-pages.js';
import { sampleCertificate } from '../certificate-domain.js';

const record = { id: 'LOCAL-EVIDENCE-page', context: { id: 'LOCAL-claim', project: 'harbor', reference: '<b>Claim</b>', lineId: 'A02', lineTitle: 'Concrete', updatedAt: '2026-10-13T02:00:00Z' }, file: { name: 'fictional.png', type: 'image/png', content: '', width: 1, height: 1, size: 0 }, kind: 'progress', note: '<b>Fictional</b>', capturedAt: '2026-10-13T02:00:00Z', updatedAt: '2026-10-13T02:00:00Z' };
test('project galleries isolate evidence and document/photo filters preserve their owners', () => {
  const html = evidenceGallery({ records: [record], claims: [], currentClaims: [], projectId: 'cedar' });
  assert.ok(!html.includes('fictional.png'));
  assert.ok(!evidenceResults([record], [], [], '', 'Documents').includes('fictional.png'));
  assert.ok(evidenceResults([record], [], [], 'fictional', 'Photos').includes('fictional.png'));
  assert.ok(evidenceResults([record], [], []).includes('&lt;b&gt;Fictional&lt;/b&gt;'));
});
test('unavailable storage and source reads do not masquerade as empty or removed records', () => {
  const gallery = evidenceGallery({ records: [], claims: [], currentClaims: [], error: 'Synthetic unavailable', claimError: 'Synthetic unavailable' });
  assert.ok(gallery.includes('Some files unavailable'));
  assert.ok(!gallery.includes('No matching evidence'));
  const image = evidenceDetail(record, null, 'Synthetic unavailable');
  assert.ok(image.includes('Current source claim unavailable'));
  assert.ok(!image.includes('changed or was removed'));
  const certificate = certificateDetail(sampleCertificate, null, 'Synthetic unavailable');
  assert.ok(certificate.includes('Current source claim unavailable'));
  assert.ok(!certificate.includes('changed or removed'));
});
