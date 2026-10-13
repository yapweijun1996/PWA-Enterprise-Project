import { projects, sovLines } from './demo-contracts.js';
import { sampleClaims } from './demo-claims.js';
import { normalizeDraft, savedRecord } from './demo-domain.js';
import { normalizeVariation, savedVariation } from './variation-domain.js';
import { normalizeCertificate, savedCertificate } from './certificate-domain.js';
import { getDraft, createDraftIfAbsent, removeDraftIfPresent } from './storage.js';
import { getVariation, createVariationIfAbsent, removeVariationIfPresent } from './variation-storage.js';
import { getCertificate, createCertificateIfAbsent, removeCertificateIfPresent } from './certificate-storage.js';
import { listEvidence } from './evidence-storage.js';
import { linkedEvidence } from './evidence-domain.js';

// These exact reserved identifiers are the complete reset boundary, not a prefix match.
const claimSpecs = [
  { project: 'harbor', ordinal: 1, reviewed: true },
  { project: 'harbor', ordinal: 2, reviewed: false },
  { project: 'cedar', ordinal: 1, reviewed: true },
  { project: 'cedar', ordinal: 2, reviewed: false },
  { project: 'willow', ordinal: 1, reviewed: true },
  { project: 'riverside', ordinal: 1, reviewed: true },
  { project: 'elm', ordinal: 1, reviewed: false },
  { project: 'meridian', ordinal: 1, reviewed: false }
];
const variationSpecs = [
  { project: 'willow', title: 'Practice clinic wayfinding', amount: '4200.00' },
  { project: 'riverside', title: 'Practice loading bay markings', amount: '3600.00' },
  { project: 'elm', title: 'Practice courtyard drainage', amount: '7800.00' },
  { project: 'meridian', title: 'Practice pedestrian crossing', amount: '5400.00' }
];
const assessmentProjects = ['harbor', 'cedar', 'willow', 'riverside'];
const SAVED_AT = '2026-10-13T03:00:00.000Z';
const ASSESSED_AT = '2026-10-13T03:05:00.000Z';
const claimId = (project, ordinal = 1) => 'LOCAL-PRACTICE-CLAIM-' + project.toUpperCase() + '-' + ordinal;
const variationId = project => 'LOCAL-VO-PRACTICE-' + project.toUpperCase();
const certificateId = project => 'LOCAL-CERT-PRACTICE-' + project.toUpperCase();

function practiceClaim(spec) {
  const project = projects.find(item => item.id === spec.project);
  const candidates = sampleClaims.filter(item => item.project === spec.project && !['PCAR-DEMO-01', 'PCAP-DEMO-02'].includes(item.id));
  const source = candidates.find(item => Boolean(item.reviewedAt) === spec.reviewed);
  if (!project || !source) throw new Error('The bundled practice claim source is unavailable for ' + spec.project + '.');
  const draft = normalizeDraft(source);
  draft.id = claimId(spec.project, spec.ordinal);
  draft.direction = project.defaultDirection;
  draft.reference = 'PRACTICE-' + spec.project.toUpperCase() + '-' + spec.ordinal;
  draft.notes = 'Fictional editable practice copy. Local review is not submission, approval or certification.';
  draft.step = spec.reviewed ? 3 : 1;
  draft.reviewedAt = null;
  // Copy text content only: bundled sample/device-origin flags are not saved states.
  draft.attachments = source.attachments.filter(file => file.type === 'text/plain').map(file => ({
    id: file.id, kind: file.kind, name: file.name, type: file.type,
    lineId: file.lineId || '', content: file.content, size: file.size
  }));
  return savedRecord(draft, spec.reviewed, SAVED_AT);
}

function practiceVariation(spec) {
  const line = sovLines(spec.project).find(item => item.source === 'Original');
  if (!line) throw new Error('The bundled practice variation basis is unavailable for ' + spec.project + '.');
  return savedVariation(normalizeVariation({
    id: variationId(spec.project), project: spec.project, title: spec.title,
    reason: 'Fictional additional scope for editing practice. This local proposal is not an approved variation.',
    amount: spec.amount, lineId: line.id, sourceVersion: line.version,
    sourceSnapshot: line, reviewedAt: null
  }), false, SAVED_AT);
}

function practiceAssessment(project, source, deviceEvidence = []) {
  const claim = { ...source, attachments: [...(source.attachments || []), ...linkedEvidence(deviceEvidence, source.id, source.project)] };
  const certificate = normalizeCertificate(null, claim, certificateId(project));
  certificate.assessments[0].certified = certificate.source.lines[0].current || '0.00';
  // The remaining amounts deliberately stay unknown; this preview cannot be issued.
  certificate.assessments[certificate.assessments.length - 1].certified = '';
  return savedCertificate(certificate, false, ASSESSED_AT);
}

export function practiceRecordIds() {
  return {
    drafts: claimSpecs.map(spec => claimId(spec.project, spec.ordinal)),
    variations: variationSpecs.map(spec => variationId(spec.project)),
    certificates: assessmentProjects.map(certificateId)
  };
}

export function practiceRecords(deviceEvidence = []) {
  const drafts = claimSpecs.map(practiceClaim);
  return {
    drafts,
    variations: variationSpecs.map(practiceVariation),
    certificates: assessmentProjects.map(project => practiceAssessment(project, drafts.find(record => record.id === claimId(project)), deviceEvidence))
  };
}

function failure(operation, cause, progress, current) {
  const counts = operation === 'load' ? progress.created + ' created, ' + progress.kept + ' kept' : progress.removed + ' removed';
  const uncertain = current?.mutation ? ' The last ' + current.mutation + ' committed, but its read-back was not verified.' : '';
  const error = new Error('Practice ' + operation + ' stopped: ' + counts + ' verified.' + uncertain + ' ' + cause.message + ' Existing records are never replaced. Retry to continue.', { cause });
  error.operation = operation;
  error.progress = { ...progress };
  error.recordType = current?.recordType || null;
  error.recordId = current?.recordId || null;
  error.unverified = current?.mutation ? { action: current.mutation, recordType: current.recordType, recordId: current.recordId } : null;
  return error;
}

async function createAndVerify(record, create, get, progress, current) {
  const result = await create(record);
  current.mutation = result.created ? 'creation' : null;
  const stored = await get(record.id);
  if (!stored || stored.id !== record.id || (result.created && JSON.stringify(stored) !== JSON.stringify(result.record))) {
    throw new Error('Device read-back failed for ' + record.id + '.');
  }
  progress[result.created ? 'created' : 'kept'] += 1;
  current.mutation = null;
  return stored;
}

// Each store is atomic independently; completed records survive a later store failure.
export async function loadPracticeRecords() {
  const progress = { created: 0, kept: 0 };
  let current;
  try {
    const records = practiceRecords();
    const storedDrafts = new Map();
    let deviceEvidence;
    for (const draft of records.drafts) {
      current = { recordType: 'claim draft', recordId: draft.id, mutation: null };
      storedDrafts.set(draft.id, await createAndVerify(draft, createDraftIfAbsent, getDraft, progress, current));
    }
    for (const variation of records.variations) {
      current = { recordType: 'variation proposal', recordId: variation.id, mutation: null };
      await createAndVerify(variation, createVariationIfAbsent, getVariation, progress, current);
    }
    for (const project of assessmentProjects) {
      current = { recordType: 'assessment preview', recordId: certificateId(project), mutation: null };
      // A kept edited preview is never reconstructed from a different source.
      const existing = await getCertificate(current.recordId);
      let certificate = existing;
      if (!certificate) {
        // Read only for missing previews; unreadable images stop this load with verified progress.
        deviceEvidence ??= await listEvidence();
        certificate = practiceAssessment(project, storedDrafts.get(claimId(project)), deviceEvidence);
      }
      await createAndVerify(certificate, createCertificateIfAbsent, getCertificate, progress, current);
    }
    return progress;
  } catch (cause) { throw failure('load', cause, progress, current); }
}

export async function resetPracticeRecords() {
  const progress = { removed: 0 };
  let current;
  const families = [
    { recordType: 'assessment preview', ids: assessmentProjects.map(certificateId), remove: removeCertificateIfPresent, get: getCertificate },
    { recordType: 'variation proposal', ids: variationSpecs.map(spec => variationId(spec.project)), remove: removeVariationIfPresent, get: getVariation },
    { recordType: 'claim draft', ids: claimSpecs.map(spec => claimId(spec.project, spec.ordinal)), remove: removeDraftIfPresent, get: getDraft }
  ];
  try {
    for (const family of families) {
      for (const id of family.ids) {
        current = { recordType: family.recordType, recordId: id, mutation: null };
        const removed = await family.remove(id);
        current.mutation = removed ? 'removal' : null;
        if (await family.get(id) !== undefined) throw new Error('Device read-back still contains ' + id + '.');
        if (removed) progress.removed += 1;
        current.mutation = null;
      }
    }
    return progress;
  } catch (cause) { throw failure('reset', cause, progress, current); }
}
