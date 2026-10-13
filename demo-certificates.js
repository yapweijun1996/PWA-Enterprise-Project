import { projects } from './demo-contracts.js';
import { sampleClaims } from './demo-claims.js';
import { sampleEvidence } from './sample-evidence.js';
import { linkedEvidence } from './evidence-domain.js';
import { normalizeCertificate, savedCertificate } from './certificate-domain.js';
import { toCents, fromCents, savedRecord } from './demo-domain.js';

function sourceClaim(project, period) {
  const claim = sampleClaims.find(item => item.project === project && item.period === period && item.reviewedAt);
  if (!claim) throw new Error('Missing reviewed sample claim: ' + project + ' / ' + period);
  return { ...structuredClone(claim), attachments: [...structuredClone(claim.attachments || []), ...linkedEvidence(sampleEvidence, claim.id, project)] };
}

function preview(claim, id, scenario, now) {
  let source = claim;
  if (scenario === 'historical') {
    const earlier = structuredClone(claim);
    earlier.notes = 'Earlier fictional measurement snapshot. The current sample claim includes a later correction.';
    const line = earlier.lines.find(item => toCents(item.current) > 10000);
    if (line) line.current = fromCents(toCents(line.current) - 10000);
    source = savedRecord(earlier, true, new Date(new Date(claim.updatedAt).valueOf() - 300000).toISOString());
  }
  const record = normalizeCertificate(null, source, id);
  let adjusted = false;
  record.assessments = record.source.lines.map(line => {
    const claimed = toCents(line.current || '0.00');
    if (!adjusted && claimed > 0 && scenario !== 'equal') {
      adjusted = true;
      const certified = scenario === 'zero' ? 0 : Math.max(0, claimed - 125000);
      return { certified: fromCents(certified), reason: scenario === 'zero' ? 'Fictional inspection is incomplete; this item is assessed at zero, not left blank.' : 'Fictional measurement excludes an unfinished section of this work item.' };
    }
    return { certified: fromCents(claimed), reason: '' };
  });
  return { ...savedCertificate(record, true, now), sample: true, scenario };
}

const legacySource = sampleClaims.find(claim => claim.id === 'PCAP-DEMO-02');
const legacy = normalizeCertificate(null, legacySource, 'CCAP-DEMO-01');
legacy.assessments = [{ certified: '9000.00', reason: 'Fictional measurement adjustment' }, { certified: '8000.00', reason: 'Fictional inspection pending' }];
const baseline = { ...savedCertificate(legacy, true, '2026-10-13T02:00:00.000Z'), sample: true };

export const sampleCertificates = projects.flatMap(project => {
  const prefix = project.defaultDirection === 'Payable' ? 'CCAP' : 'CCAR';
  const october = sourceClaim(project.id, '2026-10');
  if (project.id === 'cedar') return [baseline, preview(october, prefix + '-DEMO-CEDAR-202610', 'equal', '2026-10-13T03:00:00.000Z')];
  const september = sourceClaim(project.id, '2026-09');
  const scenario = project.id === 'willow' ? 'zero' : project.id === 'elm' ? 'historical' : 'reduced';
  return [
    preview(september, prefix + '-DEMO-' + project.id.toUpperCase() + '-202609', 'equal', '2026-10-13T02:30:00.000Z'),
    preview(october, prefix + '-DEMO-' + project.id.toUpperCase() + '-202610', scenario, '2026-10-13T03:00:00.000Z')
  ];
});
