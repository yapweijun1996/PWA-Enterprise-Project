import { demoImages } from './demo-images.js';
import { sampleClaims } from './demo-claims.js';
import { savedEvidence } from './evidence-domain.js';

const legacyIds = new Set(['PCAR-DEMO-01', 'PCAP-DEMO-02']);
const lineHints = [/foundation|pile|site preparation|road formation/i, /frame|concrete|steel/i, null, null, /drain|stormwater/i, null, null, /external|facade|paving|asphalt/i];
const claimsByProject = new Map();
for (const claim of sampleClaims) {
  if (legacyIds.has(claim.id)) continue;
  if (!claimsByProject.has(claim.project)) claimsByProject.set(claim.project, []);
  claimsByProject.get(claim.project).push(claim);
}
for (const claims of claimsByProject.values()) claims.sort((left, right) => left.period.localeCompare(right.period));

// Bundled records never enter browser storage or acquire device-local authority.
export const sampleEvidence = demoImages.map(image => {
  const claims = claimsByProject.get(image.project);
  if (!claims?.length) throw new Error('Sample images require nonlegacy claims for ' + image.project + '.');
  const index = image.ordinal - 1;
  // Cover every claim, then enrich the September/October reviewed previews.
  const claim = index < claims.length ? claims[index] : claims[claims.length - 2 + (index - claims.length) % 2];
  const hint = lineHints[index];
  const line = hint ? claim.lines.find(item => hint.test(item.title)) : null;
  const note = 'Synthetic demo illustration: ' + image.caption + '. Fictional scene only; not a site photograph, inspection approval or delivery receipt.';
  const file = { ...image, sample: true, note };
  const record = savedEvidence({
    id: 'SAMPLE-EVIDENCE-' + image.project + '-' + String(image.ordinal).padStart(2, '0'),
    claim,
    lineId: line?.id || '',
    kind: image.kind,
    note,
    location: image.location,
    capturedAt: new Date(new Date(claim.updatedAt).valueOf() - (60 - image.ordinal) * 60000).toISOString(),
    file,
  }, claim.updatedAt);
  return { ...record, sample: true };
});
