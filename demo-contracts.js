// Fictional contract fixtures. Amounts are integer cents, never live financial records.
export const projects = [
  { id: 'harbor', name: 'Harbor Exchange', place: 'Demo City', description: 'Commercial development', contract: 'MC-001', party: 'Harbor Developments', defaultDirection: 'Receivable' },
  { id: 'cedar', name: 'Cedar Station', place: 'Demo City', description: 'Public works project', contract: 'SC-014', party: 'Cedar Concrete', defaultDirection: 'Payable' },
  { id: 'willow', name: 'Willow Medical Campus', place: 'Demo City', description: 'Outpatient medical campus', contract: 'MC-002', party: 'Willow Health Developments', defaultDirection: 'Receivable' },
  { id: 'riverside', name: 'Riverside Logistics Park', place: 'Demo City', description: 'Warehouse and loading facilities', contract: 'SC-021', party: 'Riverside Logistics Contractors', defaultDirection: 'Payable' },
  { id: 'elm', name: 'Elm Residences', place: 'Demo City', description: 'Residential towers and shared gardens', contract: 'MC-003', party: 'Elm Property Group', defaultDirection: 'Receivable' },
  { id: 'meridian', name: 'Meridian Roadworks', place: 'Demo City', description: 'Road, drainage and junction upgrades', contract: 'SC-023', party: 'Meridian Civil Works', defaultDirection: 'Payable' }
];
export const SOURCE_VERSION = 'demo-sov-v2';
// New histories are independent illustrations, just like the preserved legacy histories.
function originalLines(rows) {
  return rows.map(([title, quantity, unit, rate], index) => {
    const original = quantity * rate;
    const previous = Math.floor(original * (38 + index % 5 * 4) / 100);
    return { id: 'A' + String(index + 1).padStart(2, '0'), title, quantity, unit, rate, original, previous, certified: Math.floor(previous * 92 / 100) };
  });
}
const baseLines = {
  harbor: [
    { id: 'A01', title: 'Site preparation', quantity: 1, unit: 'lump sum', rate: 20000000, original: 20000000, previous: 2000000, certified: 1800000 },
    { id: 'A02', title: 'Concrete works', quantity: 2000, unit: 'm³', rate: 40000, original: 80000000, previous: 3000000, certified: 2400000 }
  ],
  cedar: [
    { id: 'A01', title: 'Site preparation', quantity: 1, unit: 'lump sum', rate: 5000000, original: 5000000, previous: 2000000, certified: 1800000 },
    { id: 'A02', title: 'Concrete works', quantity: 500, unit: 'm³', rate: 40000, original: 20000000, previous: 3000000, certified: 2400000 }
  ],
  willow: originalLines([
    ['Campus preliminaries and site facilities', 10, 'month', 1000000],
    ['Excavation and formation', 2000, 'm³', 4000],
    ['Reinforced concrete foundations', 600, 'm³', 30000],
    ['Clinic structural frame', 1000, 'm³', 40000],
    ['Roofing and weatherproofing', 1000, 'm²', 8000],
    ['External facade and glazing', 2000, 'm²', 8000],
    ['Clinical partitions and doors', 2500, 'm²', 4000],
    ['Patient-area finishes', 3000, 'm²', 5000],
    ['Medical gas distribution', 100, 'point', 100000],
    ['Ventilation and air handling', 30, 'zone', 500000],
    ['Electrical distribution and lighting', 140, 'circuit', 100000],
    ['Fire detection and protection', 100, 'device', 70000],
    ['Campus paths and external works', 1000, 'm²', 6000],
    ['Integrated testing and handover', 1, 'lump sum', 3000000]
  ]),
  riverside: originalLines([
    ['Warehouse preliminaries', 8, 'month', 500000],
    ['Earthworks and compaction', 1000, 'm³', 3500],
    ['Warehouse piling', 100, 'pile', 80000],
    ['Structural steel frame', 100, 'tonne', 170000],
    ['Industrial floor slabs', 1500, 'm²', 7000],
    ['Warehouse roof panels', 1500, 'm²', 3000],
    ['External wall cladding', 1000, 'm²', 3500],
    ['Loading bay equipment', 10, 'bay', 500000],
    ['Surface water drainage', 500, 'm', 6000],
    ['Warehouse lighting', 200, 'fitting', 20000],
    ['Fire sprinkler installation', 500, 'head', 7000],
    ['Utility services and connections', 10, 'connection', 300000],
    ['Service yard paving', 1000, 'm²', 3500],
    ['Commissioning and handover records', 1, 'lump sum', 2000000]
  ]),
  elm: originalLines([
    ['Tower preliminaries and access', 10, 'month', 2000000],
    ['Basement excavation', 5000, 'm³', 3000],
    ['Foundation piles and caps', 200, 'pile', 150000],
    ['Residential reinforced concrete frame', 3000, 'm³', 30000],
    ['Facade glazing and balcony doors', 4000, 'm²', 10000],
    ['Roof and wet-area waterproofing', 3000, 'm²', 4000],
    ['Apartment partitions and doors', 5000, 'm²', 4000],
    ['Apartment floor and wall finishes', 8000, 'm²', 5000],
    ['Plumbing and sanitary installations', 300, 'point', 60000],
    ['Apartment electrical installations', 500, 'circuit', 50000],
    ['Passenger lifts', 4, 'lift', 5000000],
    ['Fire protection and emergency systems', 200, 'device', 50000],
    ['Podium landscaping and shared gardens', 3000, 'm²', 5000],
    ['Testing and apartment handover', 100, 'apartment', 50000]
  ]),
  meridian: originalLines([
    ['Traffic management and preliminaries', 6, 'month', 1000000],
    ['Survey and setting out', 3, 'km', 1000000],
    ['Road corridor earthworks', 4000, 'm³', 5000],
    ['Granular road base', 5500, 'm²', 2000],
    ['Asphalt surfacing', 6000, 'm²', 2000],
    ['Roadside stormwater drains', 1000, 'm', 9000],
    ['Precast culverts', 100, 'm', 70000],
    ['Kerbs and edge restraints', 1000, 'm', 5000],
    ['Accessible footpaths', 1000, 'm²', 5000],
    ['Street lighting', 40, 'column', 100000],
    ['Junction signal equipment', 3, 'junction', 1000000],
    ['Road markings and signs', 1000, 'm²', 2000],
    ['Verge planting and reinstatement', 1000, 'm²', 2000],
    ['Pavement testing and completion survey', 1, 'lump sum', 1000000]
  ])
};
const variations = [
  { id: 'VO-007', project: 'harbor', title: 'Drainage extension', status: 'Approved', quantity: 100, unit: 'm', rate: 50000, value: 5000000, revision: 1, reason: 'Extend the fictional drainage network along the east boundary.', decision: 'Sample approval recorded on 12 Oct 2026.', approvedAt: '2026-10-12T00:00:00.000Z' },
  { id: 'VO-008', project: 'harbor', title: 'Access ramp', status: 'In review', quantity: 30, unit: 'm²', rate: 40000, value: 1200000, revision: 2, reason: 'Additional accessible ramp at the fictional east entrance.', decision: 'Sample quantity review complete; final approval awaits a decision.' },
  { id: 'VO-009', project: 'harbor', title: 'Temporary fencing', status: 'Draft', quantity: 80, unit: 'm', rate: 10000, value: 800000, revision: 1, reason: 'Proposed temporary fencing for the fictional work zone.', decision: 'Sample proposal has not been submitted for approval.' },
  { id: 'VO-010', project: 'harbor', title: 'Entrance canopy', status: 'Rejected', quantity: 1, unit: 'lump sum', rate: 600000, value: 600000, revision: 1, reason: 'Proposed canopy outside the agreed fictional scope.', decision: 'Sample rejection: scope not accepted. No contract impact.' },
  { id: 'VO-WILLOW-001', project: 'willow', title: 'Isolation room pressure monitoring', status: 'Approved', quantity: 12, unit: 'room', rate: 200000, value: 2400000, revision: 1, approvedAt: '2026-06-08T00:00:00.000Z', reason: 'Add fictional pressure monitoring to twelve treatment rooms.', decision: 'Fictional approval dated 8 Jun 2026; included in later sample snapshots.' },
  { id: 'VO-WILLOW-002', project: 'willow', title: 'Sheltered patient walkway', status: 'Approved', quantity: 120, unit: 'm²', rate: 15000, value: 1800000, revision: 2, approvedAt: '2026-08-05T00:00:00.000Z', reason: 'Provide a fictional sheltered route between the clinic and drop-off zone.', decision: 'Fictional approval dated 5 Aug 2026; included in later sample snapshots.' },
  { id: 'VO-WILLOW-003', project: 'willow', title: 'Additional pharmacy counters', status: 'In review', quantity: 4, unit: 'counter', rate: 350000, value: 1400000, revision: 2, reason: 'Illustrate additional dispensing counters awaiting a scope decision.', decision: 'Fictional review only; excluded from the contract and claim basis.' },
  { id: 'VO-WILLOW-004', project: 'willow', title: 'Consultation room acoustic panels', status: 'In review', quantity: 160, unit: 'm²', rate: 7500, value: 1200000, revision: 1, reason: 'Illustrate acoustic treatment proposed for consultation rooms.', decision: 'Fictional quantities under review; no approval is represented.' },
  { id: 'VO-WILLOW-005', project: 'willow', title: 'Staff bicycle shelter', status: 'Draft', quantity: 40, unit: 'm²', rate: 18000, value: 720000, revision: 1, reason: 'Unsubmitted fictional proposal for a small staff bicycle shelter.', decision: 'Sample draft only; no contract impact.' },
  { id: 'VO-WILLOW-006', project: 'willow', title: 'Decorative entrance fountain', status: 'Rejected', quantity: 1, unit: 'lump sum', rate: 1600000, value: 1600000, revision: 1, reason: 'Illustrate a decorative addition outside the clinical brief.', decision: 'Fictional scope rejected; excluded from all claim sources.' },
  { id: 'VO-RIVERSIDE-001', project: 'riverside', title: 'Loading yard drainage branch', status: 'Approved', quantity: 150, unit: 'm', rate: 15000, value: 2250000, revision: 1, approvedAt: '2026-06-09T00:00:00.000Z', reason: 'Extend fictional yard drainage to the northern loading apron.', decision: 'Fictional approval dated 9 Jun 2026; later sample claims may include it.' },
  { id: 'VO-RIVERSIDE-002', project: 'riverside', title: 'Dock interlock controls', status: 'Approved', quantity: 5, unit: 'bay', rate: 250000, value: 1250000, revision: 2, approvedAt: '2026-09-04T00:00:00.000Z', reason: 'Add fictional door and dock-leveller interlock controls.', decision: 'Fictional approval dated 4 Sep 2026; not available to earlier snapshots.' },
  { id: 'VO-RIVERSIDE-003', project: 'riverside', title: 'Additional charging points', status: 'In review', quantity: 6, unit: 'point', rate: 180000, value: 1080000, revision: 1, reason: 'Illustrate additional charging outlets for warehouse equipment.', decision: 'Fictional electrical scope review pending; excluded from revised value.' },
  { id: 'VO-RIVERSIDE-004', project: 'riverside', title: 'Security booth relocation', status: 'Draft', quantity: 1, unit: 'lump sum', rate: 950000, value: 950000, revision: 1, reason: 'Unsubmitted fictional relocation proposal at the service entrance.', decision: 'Draft illustration only; no approval or instruction occurred.' },
  { id: 'VO-RIVERSIDE-005', project: 'riverside', title: 'Mezzanine office expansion', status: 'Rejected', quantity: 100, unit: 'm²', rate: 20000, value: 2000000, revision: 1, reason: 'Illustrate an office extension beyond the warehouse brief.', decision: 'Fictional proposal rejected; no claim or contract impact.' },
  { id: 'VO-ELM-001', project: 'elm', title: 'Balcony privacy screens', status: 'Approved', quantity: 120, unit: 'screen', rate: 40000, value: 4800000, revision: 1, approvedAt: '2026-07-08T00:00:00.000Z', reason: 'Add fictional privacy screens to the residential balconies.', decision: 'Fictional approval dated 8 Jul 2026; included only in later snapshots.' },
  { id: 'VO-ELM-002', project: 'elm', title: 'Podium irrigation extension', status: 'In review', quantity: 300, unit: 'm', rate: 4000, value: 1200000, revision: 2, reason: 'Illustrate additional irrigation for the shared podium garden.', decision: 'Fictional route under review; no authorized contract change.' },
  { id: 'VO-ELM-003', project: 'elm', title: 'Parcel locker alcove', status: 'Draft', quantity: 1, unit: 'lump sum', rate: 850000, value: 850000, revision: 1, reason: 'Unsubmitted fictional parcel locker proposal for the lobby.', decision: 'Sample draft; excluded from all financial sources.' },
  { id: 'VO-ELM-004', project: 'elm', title: 'Additional roof maintenance anchors', status: 'Draft', quantity: 20, unit: 'anchor', rate: 30000, value: 600000, revision: 1, reason: 'Illustrate maintenance anchors proposed for the roof perimeter.', decision: 'Unsubmitted fictional proposal; no contract impact.' },
  { id: 'VO-ELM-005', project: 'elm', title: 'Penthouse stone finish upgrade', status: 'Rejected', quantity: 200, unit: 'm²', rate: 15000, value: 3000000, revision: 1, reason: 'Illustrate a finish upgrade outside the agreed apartment scope.', decision: 'Fictional upgrade rejected; excluded from the revised contract.' },
  { id: 'VO-MERIDIAN-001', project: 'meridian', title: 'Junction drainage improvement', status: 'Approved', quantity: 120, unit: 'm', rate: 30000, value: 3600000, revision: 1, approvedAt: '2026-08-07T00:00:00.000Z', reason: 'Add a fictional drain to the eastern junction approach.', decision: 'Fictional approval dated 7 Aug 2026; available to later sample snapshots.' },
  { id: 'VO-MERIDIAN-002', project: 'meridian', title: 'Additional pedestrian refuge', status: 'In review', quantity: 2, unit: 'island', rate: 650000, value: 1300000, revision: 2, reason: 'Illustrate pedestrian refuge islands awaiting a layout decision.', decision: 'Fictional layout review only; excluded from claim sources.' },
  { id: 'VO-MERIDIAN-003', project: 'meridian', title: 'Bus stop hardstanding', status: 'Draft', quantity: 100, unit: 'm²', rate: 9000, value: 900000, revision: 1, reason: 'Unsubmitted fictional bus stop paving proposal.', decision: 'Sample draft only; no financial contract change.' },
  { id: 'VO-MERIDIAN-004', project: 'meridian', title: 'Decorative median lighting', status: 'Rejected', quantity: 12, unit: 'fitting', rate: 80000, value: 960000, revision: 1, reason: 'Illustrate decorative lighting beyond the road safety scope.', decision: 'Fictional proposal rejected; no contract impact.' }
];
export function projectVariations(project) {
  return structuredClone(variations.filter(item => item.project === project));
}
export function sovLines(project) {
  const original = baseLines[project];
  if (!original) return [];
  return structuredClone(original).map(line => ({ ...line, approved: 0, revised: line.original, source: 'Original', version: SOURCE_VERSION })).concat(
    projectVariations(project).filter(item => item.status === 'Approved').map(item => ({ id: item.id, title: item.title, quantity: item.quantity, unit: item.unit, rate: item.rate, original: 0, approved: item.value, revised: item.value, previous: 0, certified: 0, source: 'Approved variation', version: SOURCE_VERSION, approvedAt: item.approvedAt }))
  );
}
export function contractSummary(project) {
  return sovLines(project).reduce((sum, line) => ({ original: sum.original + line.original, approved: sum.approved + line.approved, revised: sum.revised + line.revised, claimed: sum.claimed + line.previous, certified: sum.certified + line.certified }), { original: 0, approved: 0, revised: 0, claimed: 0, certified: 0 });
}
export function claimBasis(project) {
  return sovLines(project).map(line => ({ id: line.id, title: line.title, previous: (line.previous / 100).toFixed(2), current: '', note: '', basis: { contract: projects.find(item => item.id === project).contract, version: line.version, source: line.source, quantity: line.quantity, unit: line.unit, rate: (line.rate / 100).toFixed(2), revised: (line.revised / 100).toFixed(2), ...(line.approvedAt ? { approvedAt: line.approvedAt } : {}) } }));
}
