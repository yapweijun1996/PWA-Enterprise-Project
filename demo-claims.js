import { projects, sovLines, SOURCE_VERSION } from './demo-contracts.js';
import { fromCents, toCents, sampleAttachment } from './demo-domain.js';

// Independent fictional navigation records, not aggregates of device drafts.
const legacyClaims = [
  { id: 'PCAR-DEMO-01', project: 'harbor', direction: 'Receivable', period: '2026-04', amount: '48000.00', status: 'Sample draft', certificate: 'Not yet certified', lines: [{ id: 'A01', title: 'Site preparation', previous: '0.00', current: '20000.00' }, { id: 'A02', title: 'Concrete works', previous: '0.00', current: '28000.00' }], attachments: [], sourceVersion: 'navigation-fixture-v1' },
  { id: 'PCAP-DEMO-02', project: 'cedar', direction: 'Payable', period: '2026-05', amount: '18500.00', status: 'Sample reviewed', certificate: 'CCAP-DEMO-01 · Illustrative', reviewedAt: '2026-10-12T02:00:00.000Z', updatedAt: '2026-10-12T02:00:00.000Z', lines: [{ id: 'A01', title: 'Site preparation', previous: '0.00', current: '10000.00' }, { id: 'A02', title: 'Concrete works', previous: '0.00', current: '8500.00' }], attachments: [], sourceVersion: 'navigation-fixture-v1' }
];

const periodNotes = {
  harbor: ['Enabling works and concrete pour records for the east block.', 'Foundation pours and ground-floor preparation in the east block.', 'Concrete frame progress and continued site access works.', 'Upper-floor pours and remaining site preparation activities.', 'Month-to-date concrete progress; the drainage extension is available only after its fictional 12 October approval.'],
  cedar: ['Platform preparation and first concrete placements.', 'Station slab pours and prepared service areas.', 'Platform edge concrete and station access preparation.', 'Continued concrete pours around the west station approach.', 'Month-to-date station concrete progress and access tidy-up.'],
  willow: ['Clinic formation and initial service coordination.', 'Foundation works and treatment-room service routes.', 'Clinic frame progress and early clinical fit-out.', 'Facade work and sheltered patient walkway preparation.', 'Patient-area fit-out and coordinated medical services.', 'Month-to-date clinical finishes and staged testing preparations.'],
  riverside: ['Warehouse formation and pile installation.', 'Steel frame erection and loading-yard drainage.', 'Industrial floor pours and roof installation.', 'Warehouse enclosure and utility connections.', 'Loading bay equipment and approved dock controls.', 'Month-to-date service yard finishes and staged commissioning.'],
  elm: ['Basement formation and residential pile works.', 'Foundation caps and initial residential frame.', 'Tower frame progress and approved balcony screen scope.', 'Facade installation and internal partitions.', 'Apartment finishes and coordinated plumbing services.', 'Month-to-date apartment installations and shared-garden preparation.'],
  meridian: ['Traffic management, survey and formation.', 'Road earthworks and granular base installation.', 'Drainage runs and accessible footpath preparation.', 'Asphalt work and the approved junction drainage addition.', 'Street lighting and junction equipment installation.', 'Month-to-date markings, verge reinstatement and pavement checks.']
};

// All document observations are invented; descriptions differ by project and scope.
const documentDetails = {
  harbor: ['East-block enabling areas sketched for the sample measurement walkthrough.', 'Concrete batch register invented for the east-block frame illustration.', 'East-block pour surfaces and access routes listed in a fictional inspection checklist.', 'Drainage and concrete progress illustrated for the October month-to-date review.'],
  cedar: ['West-approach prepared areas described in a fictional measurement worksheet.', 'Invented platform concrete delivery entries; no material receipt took place.', 'Platform edge and station approach listed for an illustrative visual check.', 'Station concrete placements summarised in an invented October measurement note.'],
  willow: ['Clinic formation and foundation zones outlined for a sample quantity discussion.', 'Fictional facade and walkway materials register for the medical campus.', 'Patient-area finishes and medical-service routes listed for an illustrative inspection.', 'Clinic progress and staged testing areas described in an invented month-to-date worksheet.'],
  riverside: ['Warehouse formation and steel erection zones outlined in a fictional worksheet.', 'Invented roof-panel and utility component entries for the warehouse example.', 'Loading bay controls and industrial floor surfaces listed for a sample inspection.', 'Service yard and warehouse progress outlined in an invented October record.'],
  elm: ['Basement and residential frame zones described in a fictional measurement worksheet.', 'Invented facade panels and balcony-screen deliveries for the residence example.', 'Apartment finish areas and plumbing routes listed for an illustrative inspection.', 'Residential progress and shared-garden areas described in an invented October worksheet.'],
  meridian: ['Road chainages and granular base zones invented for the measurement example.', 'Fictional asphalt and precast drain entries for the roadworks illustration.', 'Lighting columns and junction installations listed in a sample inspection checklist.', 'Road markings and verge reinstatement described in an invented October progress note.']
};

function textDocument(claim, ordinal) {
  const kind = ['measurement', 'delivery', 'inspection', 'measurement'][ordinal];
  const line = claim.lines[ordinal % claim.lines.length];
  const fixture = sampleAttachment(kind, claim, line.id);
  const id = 'DOC-' + claim.project.toUpperCase() + '-' + String(ordinal + 1).padStart(2, '0');
  const content = [
    fixture.content,
    'Document reference: ' + id,
    'Illustrated scope: ' + line.title,
    'Fictional observation: ' + documentDetails[claim.project][ordinal],
    'Illustrative current value: SGD ' + line.current,
    'Illustrative previous value: SGD ' + line.previous,
    'Snapshot captured: ' + claim.snapshotAt,
    'Bundled read-only sample. Not saved on this device and not evidence of real work.'
  ].join('\n');
  return { ...fixture, id, name: id.toLowerCase() + '-' + kind + '.txt', content, size: new TextEncoder().encode(content).length, sample: true };
}

function projectClaims(project, projectIndex) {
  const legacy = legacyClaims.find(claim => claim.project === project.id);
  const periods = legacy ? ['06', '07', '08', '09', '10'] : ['05', '06', '07', '08', '09', '10'];
  // Preserved navigation fixtures are not posted history for this separate sample sequence.
  const previousByLine = new Map();
  return periods.map((month, periodIndex) => {
    const period = '2026-' + month;
    const snapshotAt = period + (month === '10' ? '-13' : '-12') + 'T03:00:00.000Z';
    // Filter the current fixture basis to the sources actually available at this snapshot.
    const sources = sovLines(project.id).filter(line => !line.approvedAt || line.approvedAt <= snapshotAt);
    const lines = sources.map((source, lineIndex) => {
      const previous = previousByLine.get(source.id) || 0;
      const progressPercent = (legacy ? 3 : 5) + periodIndex + (lineIndex + projectIndex) % 3;
      const current = Math.floor(source.revised * progressPercent / 100);
      previousByLine.set(source.id, previous + current);
      return {
        id: source.id, title: source.title, previous: fromCents(previous), current: fromCents(current),
        cumulative: fromCents(previous + current),
        note: (source.source === 'Original' ? 'Fictional staged progress for ' : 'Fictional progress against approved sample scope: ') + source.title.toLowerCase() + '.',
        basis: {
          contract: project.contract, version: source.version, source: source.source,
          quantity: source.quantity, unit: source.unit, rate: fromCents(source.rate), revised: fromCents(source.revised),
          snapshotAt, ...(source.approvedAt ? { approvedAt: source.approvedAt } : {})
        }
      };
    });
    // Harbor's legacy draft supplies one unreviewed example; Cedar's legacy row is reviewed.
    const reviewed = project.id === 'harbor' ? periodIndex >= 1 : periodIndex >= 2;
    const amount = lines.reduce((sum, line) => sum + toCents(line.current), 0);
    const previous = lines.reduce((sum, line) => sum + toCents(line.previous), 0);
    const claim = {
      id: (project.defaultDirection === 'Payable' ? 'PCAP-' : 'PCAR-') + project.id.toUpperCase() + '-' + period,
      schemaVersion: 2, project: project.id, direction: project.defaultDirection, period,
      reference: project.contract + ' / ' + period + ' / Progress example',
      notes: 'Synthetic demo only. ' + periodNotes[project.id][periodIndex] + ' Values are invented; no claim was submitted or approved.',
      amount: fromCents(amount), previous: fromCents(previous), cumulative: fromCents(previous + amount),
      status: reviewed ? 'Sample reviewed' : 'Sample draft', certificate: 'No issued certificate · Illustrative only',
      lines, attachments: [], step: reviewed ? 3 : 2,
      updatedAt: snapshotAt, reviewedAt: reviewed ? snapshotAt : null, snapshotAt,
      sourceVersion: SOURCE_VERSION, sample: true
    };
    const documentOrdinal = ['06', '08', '09', '10'].indexOf(month);
    if (documentOrdinal !== -1) claim.attachments.push(textDocument(claim, documentOrdinal));
    return claim;
  });
}

export const sampleClaims = [...legacyClaims, ...projects.flatMap(projectClaims)];
