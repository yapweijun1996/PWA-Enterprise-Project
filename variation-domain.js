import { SOURCE_VERSION, sovLines } from './demo-contracts.js';
import { toCents } from './demo-domain.js';

export function normalizeVariation(record, project, id) {
  return { id: String(record?.id || id), schemaVersion: 1, project: String(record?.project || project), title: String(record?.title || ''), reason: String(record?.reason || ''), amount: String(record?.amount || ''), lineId: String(record?.lineId || ''), sourceVersion: String(record?.sourceVersion || SOURCE_VERSION), sourceSnapshot: structuredClone(record?.sourceSnapshot || null), updatedAt: record?.updatedAt || null, reviewedAt: record?.reviewedAt || null };
}
export function validateVariation(record, review = false) {
  const errors = [];
  if (record.title.length > 100 || (review && !record.title.trim())) errors.push({ field: 'title', message: 'Enter a scope title of up to 100 characters.' });
  if (record.reason.length > 500 || (review && !record.reason.trim())) errors.push({ field: 'reason', message: 'Enter a reason of up to 500 characters.' });
  if ((record.amount.trim() && toCents(record.amount) === null) || (review && (toCents(record.amount) ?? 0) <= 0)) errors.push({ field: 'amount', message: 'Enter a positive proposed amount with up to two decimal places for review.' });
  if (record.lineId && !sovLines(record.project).some(line => line.id === record.lineId)) errors.push({ field: 'lineId', message: 'Choose a line from this project or new scope.' });
  return errors;
}
export function savedVariation(record, reviewed, now = new Date().toISOString()) {
  if (validateVariation(record, reviewed).length) throw new Error('Correct the proposal before saving.');
  const snapshot = normalizeVariation(record);
  if (!snapshot.sourceSnapshot && snapshot.lineId) snapshot.sourceSnapshot = sovLines(snapshot.project).find(line => line.id === snapshot.lineId);
  snapshot.updatedAt = now;
  snapshot.reviewedAt = reviewed ? now : record.reviewedAt || null;
  // No supplied status/approval flag can turn a local proposal into an approved VO.
  return snapshot;
}
