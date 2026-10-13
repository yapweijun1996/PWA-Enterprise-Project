import { escapeHtml as e, displayDate, icon, draftLabel } from './ui.js';
import { projects } from './demo-contracts.js';
import { projectTabs } from './project-pages.js';
import { imageContent, EVIDENCE_TYPES } from './evidence-domain.js';
import { evidenceCards } from './draft-editor.js';

export const captureLink = (project = '', claim = '') => '<a class="button" href="#evidence-new?project=' + encodeURIComponent(project) + '&claim=' + encodeURIComponent(claim) + '">' + icon('plus') + 'Add evidence</a>';
function photo(file, alt, lazy = true) {
  const content = imageContent(file);
  return content ? '<img class="evidence-photo" loading="' + (lazy ? 'lazy' : 'eager') + '" decoding="async" src="' + e(content) + '" alt="' + e(alt) + '">' : '<p class="notice warning">Image preview unavailable.</p>';
}
export function evidenceResults(records, claims, currentClaims, query = '', type = 'All') {
  const search = query.trim().toLocaleLowerCase();
  const matches = value => value.toLocaleLowerCase().includes(search);
  const images = type === 'Documents' ? [] : records.filter(record => matches([record.file.name, record.note, record.location, record.context.reference, record.context.lineId, record.context.lineTitle].join(' ')));
  const documents = type === 'Photos' ? [] : claims.map(claim => ({ ...claim, attachments: (claim.attachments || []).filter(file => matches([file.name, file.content, claim.reference, claim.id, file.lineId].join(' '))) })).filter(claim => claim.attachments.length);
  if (!images.length && !documents.length) return '<div class="notice" role="note">No matching evidence. Clear the filters or add a fictional image.</div>';
  const currentById = new Map(currentClaims.map(claim => [claim.id, claim]));
  return '<div class="evidence-gallery">' + images.map(record => {
    const current = currentById.get(record.context.id);
    const changed = !current || (current.updatedAt || null) !== record.context.updatedAt;
    return '<article class="card evidence-tile">' + photo(record.file, record.note || 'Preview of ' + record.file.name) + '<span class="status local">' + (record.sample ? 'Bundled sample · Read-only' : 'Saved on this device') + '</span><h3>' + e(record.file.name) + '</h3><p class="meta">' + e(record.context.reference + ' · ' + (record.context.lineId || 'Whole claim')) + '</p><p class="meta">' + e(record.note || 'No note') + '</p>' + (changed ? '<p class="meta">Historical source snapshot</p>' : '') + '<a class="text-link" href="#evidence/' + encodeURIComponent(record.id) + '">View evidence ' + icon('arrow') + '</a></article>';
  }).join('') + '</div>' + documents.map(claim => '<section class="panel section-gap"><div class="panel-head"><h2>' + e(draftLabel(claim)) + ' · Documents</h2><a class="text-link" href="#claim/' + encodeURIComponent(claim.id) + '">Open claim ' + icon('arrow') + '</a></div>' + evidenceCards(claim.attachments) + '</section>').join('');
}
export function evidenceGallery({ records, claims, currentClaims, projectId = '', error = '', claimError = '' }) {
  const project = projects.find(p => p.id === projectId);
  const filtered = projectId ? records.filter(record => record.context.project === projectId) : records;
  const documents = projectId ? claims.filter(claim => claim.project === projectId) : claims;
  const count = filtered.length + documents.reduce((sum, claim) => sum + (claim.attachments?.length || 0), 0);
  const unavailable = error && claimError && count === 0;
  return '<div class="page-head"><div><h1>Evidence</h1><p class="subtitle">' + e(project?.name || 'Across demo projects') + ' · ' + (error || claimError ? 'Some files unavailable · ' + count + ' available' : count + ' available file' + (count === 1 ? '' : 's')) + '</p></div>' + captureLink(projectId) + '</div>' + (project ? projectTabs(project.id, 'evidence') : '') + '<p class="meta">Bundled fictional samples and separately saved device-local files. Samples are read-only and are not stored on this device as user records. Nothing is uploaded or queued; use fictional images only.</p>' + (error ? '<div class="notice error" role="alert">Image storage unavailable: ' + e(error) + '. Bundled samples remain available.</div>' : '') + (claimError ? '<div class="notice error" role="alert">Claim documents unavailable: ' + e(claimError) + '. Bundled sample documents remain available.</div>' : '') + '<section class="panel"><div class="filters"><label>Search evidence<input id="evidence-search" type="search" placeholder="File, note or claim"></label><label>File type<select id="evidence-type"><option>All</option><option>Photos</option><option>Documents</option></select></label></div><div id="evidence-results">' + (unavailable ? '<p id="evidence-unavailable" class="meta">Saved evidence could not be read. Retry after browser storage becomes available.</p>' : evidenceResults(filtered, documents, currentClaims)) + '</div></section>';
}
export function bindEvidenceGallery(root, { records, claims, currentClaims, projectId = '', error = '', claimError = '' }) {
  const search = root.querySelector('#evidence-search'), type = root.querySelector('#evidence-type');
  if (!search) return;
  if (error && claimError && root.querySelector('#evidence-unavailable')) { search.disabled = true; type.disabled = true; return; }
  const images = projectId ? records.filter(record => record.context.project === projectId) : records;
  const documents = projectId ? claims.filter(claim => claim.project === projectId) : claims;
  function update() { if (root.querySelector('#evidence-unavailable')) return; root.querySelector('#evidence-results').innerHTML = evidenceResults(images, documents, currentClaims, search.value, type.value); }
  search.addEventListener('input', update); type.addEventListener('change', update);
}
export function evidenceDetail(record, claim, sourceError = '') {
  const context = record.context;
  const sample = record.sample === true;
  const changed = !claim || (claim.updatedAt || null) !== context.updatedAt;
  return '<div class="editor-breadcrumb"><a class="text-link" href="#project/' + e(context.project) + '/evidence">' + icon('back') + 'Back to evidence</a><span class="status local">' + (sample ? 'Bundled sample · Read-only' : 'Saved on this device') + '</span></div><div class="page-head"><div><h1>' + e(record.file.name) + '</h1><p class="subtitle">' + e(projects.find(p => p.id === context.project)?.name + ' · ' + context.reference) + '</p></div>' + captureLink(context.project, context.id) + '</div><div class="grid columns"><section class="panel"><h2>Image preview</h2>' + photo(record.file, record.note || 'Preview of ' + record.file.name, false) + '<p class="meta">' + Number(record.file.width) + ' × ' + Number(record.file.height) + ' · ' + Number(record.file.size) + ' bytes · ' + e(record.file.type) + '</p></section><aside class="panel"><h2>Evidence details</h2><dl class="key-values"><div><dt>Claim snapshot</dt><dd>' + e(context.reference) + '</dd></div><div><dt>Claim line</dt><dd>' + e((context.lineId || 'Whole claim') + ' · ' + context.lineTitle) + '</dd></div><div><dt>Type</dt><dd>' + e(EVIDENCE_TYPES.find(type => type.id === record.kind)?.name) + '</dd></div><div><dt>' + (sample ? 'Illustrated time · Fictional' : 'Captured · User supplied') + '</dt><dd>' + displayDate(record.capturedAt) + '</dd></div><div><dt>' + (sample ? 'Bundled sample timestamp' : 'Saved on device') + '</dt><dd>' + displayDate(record.updatedAt) + '</dd></div><div><dt>' + (sample ? 'Location · Fictional manual label' : 'Location · User supplied') + '</dt><dd>' + e(record.location || 'Not provided') + '</dd></div></dl><p class="review-note">' + e(record.note || 'No note') + '</p><p class="meta">' + (sample ? 'Immutable bundled illustration, not a device-saved photograph. No real inspection, delivery or authorized sign-off is implied.' : 'Not uploaded or queued. No inspection, delivery or authorized sign-off is implied. Browser storage is not a backup.') + '</p>' + (sourceError ? '<div class="notice error" role="alert">Current source claim unavailable: ' + e(sourceError) + '. The ' + (sample ? 'bundled image' : 'saved image') + ' and context are retained.</div>' : changed ? '<div class="notice warning">The linked claim changed or was removed. The image keeps its original context snapshot.</div>' : '') + (claim ? '<a class="text-link" href="#claim/' + encodeURIComponent(claim.id) + '">' + (sample ? 'Open sample claim ' : 'Open current claim ') + icon('arrow') + '</a>' : '') + (sample ? '' : '<button class="button danger section-gap" id="delete-evidence" data-id="' + e(record.id) + '" data-project="' + e(context.project) + '" type="button">Delete local image</button>') + '</aside></div>';
}
