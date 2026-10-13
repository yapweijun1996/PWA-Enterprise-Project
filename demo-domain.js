import { claimBasis, SOURCE_VERSION } from './demo-contracts.js';
// Illustrative device-local calculations; not a production financial contract.
const AMOUNT = /^\d{1,11}(\.\d{1,2})?$/;
export const STEPS = ['Details', 'Claim lines', 'Evidence', 'Review'];
export function toCents(value) {
  const text = String(value ?? '').trim();
  if (!AMOUNT.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export const fromCents = cents => (cents / 100).toFixed(2);
export const validPeriod = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
export function sampleLines(project = 'harbor') {
  return claimBasis(project);
}
export function lineTotals(lines = []) {
  let previous = 0;
  let current = 0;
  let valid = true;
  for (const line of lines) {
    const prior = toCents(line.previous);
    const amount = String(line.current ?? '').trim() === '' ? 0 : toCents(line.current);
    if (prior === null || amount === null) valid = false;
    previous += prior ?? 0;
    current += amount ?? 0;
  }
  return { previous, current, cumulative: previous + current, valid };
}
export function normalizeDraft(record, context = {}, id) {
  const draft = {
    id: String(record?.id || id), schemaVersion: 2,
    project: String(record?.project || context.project || 'harbor'),
    direction: record?.direction === 'Payable' || (!record && context.direction === 'Payable') ? 'Payable' : 'Receivable',
    period: String(record?.period || ''), reference: String(record?.reference || ''),
    notes: String(record?.notes || ''), amount: String(record?.amount || ''),
    lines: structuredClone(record?.lines || []), attachments: structuredClone(record?.attachments || []),
    step: Math.min(3, Math.max(0, Number(record?.step) || 0)),
    updatedAt: record?.updatedAt || null, reviewedAt: record?.reviewedAt || null,
    sourceVersion: String(record?.sourceVersion || (record ? 'demo-sov-v1' : SOURCE_VERSION))
  };
  // Older one-amount drafts retain their value and identifier when resumed.
  if (record && !Array.isArray(record.lines) && toCents(record.amount) !== null) {
    draft.lines = [{ id: 'LEGACY', title: 'Imported demo amount', previous: '0.00', current: String(record.amount), note: '' }];
    draft.sourceVersion = 'legacy-demo-amount';
  }
  return draft;
}
export function validateDraft(draft, { requireDetails = false, requireLines = false } = {}) {
  const errors = [];
  if ((requireDetails || draft.period) && !validPeriod(draft.period)) errors.push({ field: 'period', message: 'Select a valid claim month.' });
  if (draft.reference.length > 60) errors.push({ field: 'reference', message: 'Keep the reference within 60 characters.' });
  if (draft.notes.length > 500) errors.push({ field: 'notes', message: 'Keep the period note within 500 characters.' });
  draft.lines.forEach((line, index) => {
    if (String(line.current).trim() !== '' && toCents(line.current) === null) errors.push({ field: 'line-' + index, message: line.id + ': enter a non-negative amount with up to two decimal places.' });
    if (String(line.note || '').length > 300) errors.push({ field: 'line-note-' + index, message: line.id + ': keep the note within 300 characters.' });
  });
  const totals = lineTotals(draft.lines);
  if (requireLines && (!draft.lines.length || (totals.valid && totals.current <= 0))) errors.push({ field: 'lines', message: 'Enter a positive total for this period before continuing.' });
  return errors;
}
export function savedRecord(draft, reviewed, now = new Date().toISOString()) {
  const copy = structuredClone(draft);
  const totals = lineTotals(copy.lines);
  if (!totals.valid) throw new Error('Correct invalid line amounts before saving.');
  copy.amount = copy.lines.some(line => String(line.current).trim() !== '') ? fromCents(totals.current) : '';
  copy.updatedAt = now;
  copy.reviewedAt = reviewed ? now : draft.reviewedAt;
  return copy;
}
export const EVIDENCE_KINDS = [
  { id: 'measurement', name: 'Measurement note' },
  { id: 'inspection', name: 'Inspection checklist' },
  { id: 'delivery', name: 'Delivery record' }
];
export function sampleAttachment(kind, draft, lineId = '') {
  const fixture = EVIDENCE_KINDS.find(item => item.id === kind);
  if (!fixture) throw new Error('Choose a known synthetic evidence type.');
  const id = kind + '-' + (lineId || 'claim');
  const content = [
    'CONSTRUCTCLAIM — SYNTHETIC DEMO EVIDENCE', fixture.name,
    'Project: ' + draft.project, 'Direction: ' + draft.direction,
    'Period: ' + (draft.period || 'Not set'), 'Line: ' + (lineId || 'Whole claim'),
    'Example only. No site inspection, delivery or approval occurred.',
    kind === 'measurement' ? 'Fictional measured progress recorded for a layout walkthrough.' :
      kind === 'inspection' ? 'Fictional checklist: example work reviewed; no authorized sign-off.' :
        'Fictional delivery: sample materials record; no real goods received.'
  ].join('\n');
  return { id, kind, name: id + '.txt', type: 'text/plain', lineId, content, size: new TextEncoder().encode(content).length };
}
