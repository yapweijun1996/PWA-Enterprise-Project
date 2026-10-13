import { createRecordStore } from './record-store.js';
const records = createRecordStore('constructclaim-demo-v1');
export const openDrafts = records.open;
export const listDrafts = records.list;
export const saveDraft = records.save;
export const removeDraft = records.remove;
export const clearDrafts = records.clear;
