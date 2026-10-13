import { projects } from './demo-contracts.js';
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const EVIDENCE_TYPES = [{ id: 'progress', name: 'Progress photo' }, { id: 'inspection', name: 'Inspection photo' }, { id: 'delivery', name: 'Delivery photo' }];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateImageBytes(type, bytes) {
  if (!IMAGE_TYPES.includes(type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Choose an image up to 3 MB.');
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const text = start => String.fromCharCode(...bytes.slice(start, start + 4));
  const webp = text(0) === 'RIFF' && text(8) === 'WEBP';
  if (!(type === 'image/png' ? png : type === 'image/jpeg' ? jpeg : webp)) throw new Error('The image bytes do not match the file type.');
}
// Only allow embedded raster data. No remote URL, SVG or executable document preview.
export function imageContent(file) {
  if (!file || !IMAGE_TYPES.includes(file.type) || typeof file.content !== 'string') return '';
  const prefix = 'data:' + file.type + ';base64,';
  const data = file.content.slice(prefix.length);
  return file.content.startsWith(prefix) && data.length <= Math.ceil(MAX_IMAGE_BYTES / 3) * 4 && data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(data) ? file.content : '';
}
export async function readImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image up to 3 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateImageBytes(file.type, bytes);
  const content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });
  const photo = new Image(); photo.src = content;
  try { await photo.decode(); } catch { throw new Error('The image could not be decoded. Choose another image.'); }
  if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth * photo.naturalHeight > 24000000) throw new Error('Choose an image with no more than 24 megapixels.');
  return { name: String(file.name || 'demo-photo.png').slice(0, 120), type: file.type, size: bytes.length, content, width: photo.naturalWidth, height: photo.naturalHeight };
}
export function contextSnapshot(claim, lineId = '') {
  if (!claim || !projects.some(p => p.id === claim.project)) throw new Error('Choose a known demo claim.');
  const lines = claim.lines || [];
  const line = lineId ? lines.find(item => item.id === lineId) : null;
  if (lineId && !line) throw new Error('Choose a line belonging to this claim snapshot.');
  return { id: claim.id, project: claim.project, direction: claim.direction, period: claim.period || '', reference: claim.reference || claim.id, updatedAt: claim.updatedAt || null, sourceVersion: claim.sourceVersion || 'legacy-demo-amount', lineId, lineTitle: line?.title || 'Whole claim' };
}
export function validateEvidence(record) {
  if (!record?.id || !record.context?.id || !projects.some(p => p.id === record.context.project)) throw new Error('A known project and claim context are required.');
  if (!EVIDENCE_TYPES.some(type => type.id === record.kind)) throw new Error('Choose a known evidence type.');
  if (String(record.note || '').length > 500 || String(record.location || '').length > 120) throw new Error('Keep the note within 500 and optional location within 120 characters.');
  if (!record.capturedAt || !Number.isFinite(new Date(record.capturedAt).valueOf())) throw new Error('Choose a valid captured time.');
  if (!imageContent(record.file)) throw new Error('Choose and preview an image before saving.');
  if (!Number.isInteger(record.file.width) || !Number.isInteger(record.file.height) || record.file.width < 1 || record.file.height < 1 || record.file.width * record.file.height > 24000000) throw new Error('The image dimensions are invalid.');
  const data = record.file.content.split(',')[1];
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  validateImageBytes(record.file.type, bytes);
  if (bytes.length !== record.file.size) throw new Error('Image content and byte size do not match.');
}
export function savedEvidence(input, now = new Date().toISOString()) {
  const record = { id: input.id, schemaVersion: 1, context: contextSnapshot(input.claim, input.lineId), kind: input.kind, note: input.note || '', location: input.location || '', capturedAt: input.capturedAt, file: structuredClone(input.file), updatedAt: now };
  validateEvidence(record);
  return record;
}
export function checkEvidenceWrite(existing, next) {
  validateEvidence(next);
  if (existing && JSON.stringify(existing) !== JSON.stringify(next)) throw new Error('The previous saved file is read-only. Open Device evidence to recover it.');
}
export const linkedEvidence = (records, claimId, projectId = '') => records.filter(record => record.context.id === claimId && (!projectId || record.context.project === projectId)).map(record => ({ ...structuredClone(record.file), id: record.id, lineId: record.context.lineId, kind: record.kind, note: record.note, capturedAt: record.capturedAt, context: structuredClone(record.context) }));
