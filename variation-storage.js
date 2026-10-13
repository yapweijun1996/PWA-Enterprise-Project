import { createRecordStore } from './record-store.js';
const records = createRecordStore('constructclaim-demo-variations-v1');
export const listVariations = records.list;
export const saveVariation = records.save;
export const removeVariation = records.remove;
export const clearVariations = records.clear;
