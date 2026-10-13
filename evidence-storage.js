import { createRecordStore } from './record-store.js';
import { checkEvidenceWrite } from './evidence-domain.js';
const records = createRecordStore('constructclaim-demo-evidence-v1', 'evidence');
export const listEvidence = records.list;
export const getEvidence = records.get;
export const saveEvidence = (record, expectedRevision) => records.save(record, expectedRevision, checkEvidenceWrite);
export const removeEvidence = records.remove;
export const clearEvidence = records.clear;
