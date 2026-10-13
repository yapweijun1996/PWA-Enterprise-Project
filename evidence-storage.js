import { createRecordStore } from './record-store.js';
import { checkEvidenceWrite } from './evidence-domain.js';
const records = createRecordStore('constructclaim-demo-evidence-v1', 'evidence');
export const listEvidence = records.list;
export const saveEvidence = record => records.saveChecked(record, checkEvidenceWrite);
export const removeEvidence = records.remove;
export const clearEvidence = records.clear;
