# ConstructClaim PWA — Goal

## Product purpose

**ConstructClaim PWA** is the working product name for a mobile-first construction financial evidence system. Its purpose is to connect contract value and approved changes to measured site progress, claim submissions, independent certification, invoices, and payment records.

The product is not a full ERP. Its core business chain is:

```text
Contract → Progress → Claim → Certification → Invoice / Payment
```

V1 is intended to support both directions on a project:

- **Receivable:** main contractor claims from a customer and records customer/consultant certification.
- **Payable:** subcontractor claims from the main contractor and the main contractor records its certification.

The key invariant is that **claimed, certified, invoiced, and paid are distinct financial facts**. Evidence and history must explain how a reported amount was reached.

## Users and outcomes

| User | Intended outcome |
|---|---|
| Project admin | Set up projects, parties, contracts, users, and access. |
| QS / contract administrator | Maintain SOV and approved VO records; prepare, review, and certify claims. |
| Project manager | Review and approve project decisions; understand financial exposure. |
| Site engineer | Record progress and attach field evidence, including when connectivity is poor. |
| Customer / consultant | Review receivable claims and record certification through an explicitly authorized workflow. |
| Subcontractor | Submit payable claims and supporting evidence through an explicitly authorized workflow. |
| Finance | Link certified amounts to invoice and payment records. |
| Management | See traceable receivable/payable position, certification gaps, retention, and project exposure. |

A successful V1 lets authorized users create either claim direction, attach evidence, review/certify without collapsing the financial stages, work within the approved offline boundary, and trace consequential changes through an audit timeline.

## Product success criteria

V1 is not complete until all acceptance scenarios in [SPEC.md](SPEC.md) pass on the selected supported browsers and deployment target. The scenarios cover the supplied E2E-01–E2E-12 flows plus derived tests for approved variations, AI authority/evidence, PWA update safety, auditability, and retry behavior.

Release evidence must show, at minimum:

- A submitted claim has a traceable project, contract, SOV/VO basis, period, actor, and supporting evidence.
- Certification is a separate record tied to a specific claim version; variances have reasons.
- Invoice/payment records use certified values, never silently substitute claimed values.
- Retention, deductions, adjustments, and net amounts are explicit and reproducible.
- Offline edits are queued as versioned commands; conflicts are visible and never silently overwritten.
- Project and tenant permissions are enforced by the server, not only by the UI.
- The mobile workflow and install/update behavior work on the agreed browser matrix.

No numeric time-saving, financial accuracy, uptime, or market-adoption target has been approved. Such targets must not be invented in progress reports.

## Scope boundaries

### V1 intent

Projects, parties, contracts, SOVs, approved variations, PCAR/CCAR and PCAP/CCAP workflows, evidence/documents, approval inbox, invoice links/records, retention, audit trail, offline synchronization, and human-reviewed AI assistance.

The 24 user-provided `ui/` screenshots are the visual layout reference for the screen families documented in [DESIGN.md](DESIGN.md); they are static comps, not proof of a running UI. The exact invoice integration boundary, identity provider, browser matrix, deployment environment, offline-data retention policy, and mandatory-evidence policy remain open decisions; see [TASK.md](TASK.md).

### Explicit non-goals

Full accounting/general ledger, payroll, inventory, tendering, BIM, project scheduling, bank payments, and full procurement ERP are outside V1. External ERP connectivity is an adapter/integration concern, not a dependency of the core domain model.

AI may suggest, compare, extract, or summarize evidence. It must not approve claims, issue certification, create an authoritative money decision, or bypass a user's permissions.

## Current truth and lifecycle

- **Repository evidence:** initial commit `dbca199` contained only `.gitattributes`; later commits added the eight core planning files and tracked the 24 `ui/` references (`89370cd`). A separate static demo now has HTML/CSS/JS, a manifest and a Service Worker. No production API, schema, dependency manifest, CI, deployment configuration, or product E2E suite exists.
- **Product definition:** the user-provided ConstructClaim V1 blueprint is the accepted product-intent source for this documentation pass.
- **Project type:** intended hybrid of a mobile-first installable/offline-capable PWA, an authoritative API/service, persistent business data, evidence-file storage, and optional AI/ERP integrations. These are target boundaries, not verified implementations.
- **Lifecycle:** production product remains pre-implementation; a separate static, local-only demo slice now exists at `index.html` (see [README.md](README.md)). Its synthetic examples and IndexedDB drafts do not satisfy the server-backed V1 criteria.
- **Implemented / Verified / Released:** no product capability is evidenced in the repository. Documentation status is tracked separately in [PROGRESS.md](PROGRESS.md).

## Principles

1. Preserve a traceable chain from evidence to claim, certification, and downstream financial consequence.
2. Keep canonical business meaning stable; tenant labels and ERP-specific codes are mappings, not domain semantics.
3. Keep money calculations and authorization server-authoritative.
4. Keep issued financial documents and audit history immutable; correct by revision, void, or supersession rather than silent overwrite.
5. Make offline capability explicit, bounded, observable, and recoverable.
6. Keep the first release focused on reliable PCAR → CCAR and PCAP → CCAP flows rather than expanding into a general ERP.
7. Use the user-selected `ui/` images as composition anchors while verifying actual accessibility, trust, responsive behavior, and interaction states in a real browser.
