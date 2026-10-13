import { normalizeDraft, validateDraft, toCents, fromCents } from './demo-domain.js';

export function canAssess(claim) {
  if (!claim?.reviewedAt) return false;
  return validateDraft(normalizeDraft(claim), { requireDetails: true, requireLines: true }).length === 0;
}
export function normalizeCertificate(record, claim, id) {
  if (!record && !canAssess(claim)) throw new Error('Locally review a valid claim before assessing it.');
  const source = record ? structuredClone(record.source) : normalizeDraft(claim);
  const assessments = record ? structuredClone(record.assessments) : source.lines.map(line => ({ certified: '', reason: '' }));
  return { id: String(record?.id || id), schemaVersion: 1, source, assessments, updatedAt: record?.updatedAt || null, reviewedAt: record?.reviewedAt || null };
}
export function assessmentTotals(certificate) {
  let claimed = 0, certified = 0, complete = true;
  certificate.source.lines.forEach((line, index) => {
    claimed += toCents(line.current || '0') ?? 0;
    const value = toCents(certificate.assessments[index]?.certified);
    if (value === null) complete = false;
    certified += value ?? 0;
  });
  return { claimed, certified, variance: certified - claimed, complete };
}
export function validateCertificate(certificate, reviewed = false) {
  const errors = [];
  if (!canAssess(certificate.source)) errors.push({ message: 'The source snapshot must be a locally reviewed, valid claim.' });
  if (certificate.assessments.length !== certificate.source.lines.length) errors.push({ message: 'Every source line needs an assessment.' });
  certificate.source.lines.forEach((line, index) => {
    const row = certificate.assessments[index] || {};
    const value = toCents(row.certified);
    if ((reviewed || String(row.certified || '').trim()) && value === null) errors.push({ field: 'certified-' + index, message: line.id + ': enter a non-negative amount with up to two decimals.' });
    if (String(row.reason || '').length > 300) errors.push({ field: 'reason-' + index, message: line.id + ': keep the reason within 300 characters.' });
    if (reviewed && value !== null && value !== (toCents(line.current || '0') ?? 0) && !String(row.reason || '').trim()) errors.push({ field: 'reason-' + index, message: line.id + ': explain the difference between certified and claimed.' });
  });
  return errors;
}
export function savedCertificate(certificate, reviewed, now = new Date().toISOString()) {
  if (certificate.reviewedAt) throw new Error('Reviewed previews are read-only. Start another assessment from the claim.');
  const errors = validateCertificate(certificate, reviewed);
  if (errors.length) throw new Error(errors[0].message);
  return { ...normalizeCertificate(certificate), updatedAt: now, reviewedAt: reviewed ? now : null };
}
export function checkCertificateWrite(existing, next) {
  if (existing?.reviewedAt && JSON.stringify(existing) !== JSON.stringify(next)) throw new Error('The saved reviewed preview is read-only.');
  if (validateCertificate(next, Boolean(next.reviewedAt)).length) throw new Error('The certificate preview is invalid.');
}
export const certificateLabel = record => record.sample ? record.id : 'Preview ' + record.id.replace(/^LOCAL-CERT-/, '').slice(0, 8).toUpperCase();
export const certifiedValue = record => assessmentTotals(record).complete ? fromCents(assessmentTotals(record).certified) : '';
