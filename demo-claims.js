// Independent fictional navigation records, not aggregates of device drafts.
export const sampleClaims = [
  { id: 'PCAR-DEMO-01', project: 'harbor', direction: 'Receivable', period: '2026-04', amount: '48000.00', status: 'Sample draft', certificate: 'Not yet certified', lines: [{ id: 'A01', title: 'Site preparation', previous: '0.00', current: '20000.00' }, { id: 'A02', title: 'Concrete works', previous: '0.00', current: '28000.00' }], attachments: [], sourceVersion: 'navigation-fixture-v1' },
  { id: 'PCAP-DEMO-02', project: 'cedar', direction: 'Payable', period: '2026-05', amount: '18500.00', status: 'Sample reviewed', certificate: 'CCAP-DEMO-01 · Illustrative', reviewedAt: '2026-10-12T02:00:00.000Z', updatedAt: '2026-10-12T02:00:00.000Z', lines: [{ id: 'A01', title: 'Site preparation', previous: '0.00', current: '10000.00' }, { id: 'A02', title: 'Concrete works', previous: '0.00', current: '8500.00' }], attachments: [], sourceVersion: 'navigation-fixture-v1' }
];
