import { createRecordStore } from './record-store.js';
import { checkCertificateWrite } from './certificate-domain.js';
const records = createRecordStore('constructclaim-demo-certificates-v1', 'certificates');
export const listCertificates = records.list;
export const saveCertificate = record => records.saveChecked(record, checkCertificateWrite);
export const removeCertificate = records.remove;
export const clearCertificates = records.clear;
