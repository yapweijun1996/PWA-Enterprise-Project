// Fictional contract fixtures. Amounts are integer cents, never live financial records.
export const projects = [
  { id: 'harbor', name: 'Harbor Exchange', place: 'Demo City', description: 'Commercial development', contract: 'MC-001', party: 'Harbor Developments' },
  { id: 'cedar', name: 'Cedar Station', place: 'Demo City', description: 'Public works project', contract: 'SC-014', party: 'Cedar Concrete' }
];
export const SOURCE_VERSION = 'demo-sov-v2';
const baseLines = {
  harbor: [
    { id: 'A01', title: 'Site preparation', quantity: 1, unit: 'lump sum', rate: 20000000, original: 20000000, previous: 2000000, certified: 1800000 },
    { id: 'A02', title: 'Concrete works', quantity: 2000, unit: 'm³', rate: 40000, original: 80000000, previous: 3000000, certified: 2400000 }
  ],
  cedar: [
    { id: 'A01', title: 'Site preparation', quantity: 1, unit: 'lump sum', rate: 5000000, original: 5000000, previous: 2000000, certified: 1800000 },
    { id: 'A02', title: 'Concrete works', quantity: 500, unit: 'm³', rate: 40000, original: 20000000, previous: 3000000, certified: 2400000 }
  ]
};
const variations = [
  { id: 'VO-007', project: 'harbor', title: 'Drainage extension', status: 'Approved', quantity: 100, unit: 'm', rate: 50000, value: 5000000, revision: 1, reason: 'Extend the fictional drainage network along the east boundary.', decision: 'Sample approval recorded on 12 Oct 2026.' },
  { id: 'VO-008', project: 'harbor', title: 'Access ramp', status: 'In review', quantity: 30, unit: 'm²', rate: 40000, value: 1200000, revision: 2, reason: 'Additional accessible ramp at the fictional east entrance.', decision: 'Sample quantity review complete; final approval awaits a decision.' },
  { id: 'VO-009', project: 'harbor', title: 'Temporary fencing', status: 'Draft', quantity: 80, unit: 'm', rate: 10000, value: 800000, revision: 1, reason: 'Proposed temporary fencing for the fictional work zone.', decision: 'Sample proposal has not been submitted for approval.' },
  { id: 'VO-010', project: 'harbor', title: 'Entrance canopy', status: 'Rejected', quantity: 1, unit: 'lump sum', rate: 600000, value: 600000, revision: 1, reason: 'Proposed canopy outside the agreed fictional scope.', decision: 'Sample rejection: scope not accepted. No contract impact.' }
];
export function projectVariations(project) {
  return structuredClone(variations.filter(item => item.project === project));
}
export function sovLines(project) {
  const original = baseLines[project];
  if (!original) return [];
  return structuredClone(original).map(line => ({ ...line, approved: 0, revised: line.original, source: 'Original', version: SOURCE_VERSION })).concat(
    projectVariations(project).filter(item => item.status === 'Approved').map(item => ({ id: item.id, title: item.title, quantity: item.quantity, unit: item.unit, rate: item.rate, original: 0, approved: item.value, revised: item.value, previous: 0, certified: 0, source: 'Approved variation', version: SOURCE_VERSION }))
  );
}
export function contractSummary(project) {
  return sovLines(project).reduce((sum, line) => ({ original: sum.original + line.original, approved: sum.approved + line.approved, revised: sum.revised + line.revised, claimed: sum.claimed + line.previous, certified: sum.certified + line.certified }), { original: 0, approved: 0, revised: 0, claimed: 0, certified: 0 });
}
export function claimBasis(project) {
  return sovLines(project).map(line => ({ id: line.id, title: line.title, previous: (line.previous / 100).toFixed(2), current: '', note: '', basis: { contract: projects.find(item => item.id === project).contract, version: line.version, source: line.source, quantity: line.quantity, unit: line.unit, rate: (line.rate / 100).toFixed(2), revised: (line.revised / 100).toFixed(2) } }));
}
