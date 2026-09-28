# ConstructClaim PWA — V1 Specification

## Status and authority

This is the requirements baseline derived from the user-supplied V1 blueprint. It describes intended behavior; it is not evidence that any feature exists. The repository currently contains no application code, schema, API, package manifest, tests, browser build, or deployed runtime.

Words such as **must** define target requirements. Candidate technology is not locked. Open decisions are listed at the end and tracked in [TASK.md](TASK.md).

## Product scope

ConstructClaim PWA is a mobile-first construction financial evidence system, not a full ERP. It supports these two linked flows:

```text
Receivable: Contract → SOV/approved VO → PCAR → CCAR → invoice/payment record
Payable:    Subcontract/PO → SOV/approved VO → PCAP → CCAP → supplier invoice/payment record
```

V1 includes projects, parties, contracts, SOV, VO, PCAR/CCAR, PCAP/CCAP, evidence/documents, approval inbox, retention, audit, invoice linkage, offline command synchronization, and human-reviewed AI assistance. Full GL/accounting, payroll, inventory, tendering, BIM, scheduling, banking/payment execution, and full procurement ERP are excluded.

## Terms and canonical types

| User-facing code (tenant-configurable) | Canonical internal meaning |
|---|---|
| PCAR | `RECEIVABLE_PROGRESS_CLAIM` |
| CCAR | `RECEIVABLE_CERTIFICATE` |
| PCAP | `PAYABLE_PROGRESS_CLAIM` |
| CCAP | `PAYABLE_CERTIFICATE` |

Canonical types must not depend on one ERP's abbreviation. Tenant display labels and external ERP transaction codes are mappings around stable internal meaning.

## Functional requirements

### FR-01 — Tenant, people, and project scope

- A project identifies its customer, main contract, subcontracts, parties, and assigned users.
- Internal roles include project admin, QS/contract admin, project manager, site engineer, finance, and management.
- Customer/consultant and subcontractor participation is part of the blueprint; exact invitation, identity, and cross-organization access behavior must be specified before implementation.
- Every server read/write must enforce authenticated tenant, project membership, and action/document permission. UI visibility is not authorization.

### FR-02 — Contract, SOV, and variation orders

- Contract and subcontract SOV lines hold the agreed breakdown used by claims.
- A VO has its own lifecycle: `DRAFT → SUBMITTED → APPROVED | REJECTED`; an approved VO may later be explicitly voided under an authorized rule.
- Only an approved VO changes revised contract sum or can be claimed as a VO line.
- Original and revised contract totals must be explainable from the contract plus approved changes.

### FR-03 — Progress claims

- Users may create a receivable PCAR or payable PCAP for a project/contract and period.
- Claim lines identify original SOV or approved VO basis and capture prior/current/cumulative claimed amounts and relevant progress/evidence.
- Drafts may be edited subject to permission and version checks. Submitted claims may not be deleted; correction uses revise, void, or supersede with an audit trail.
- Claimed amounts must never be represented as certified, invoiced, or paid amounts.

### FR-04 — Certification

- A CCAR or CCAP is a distinct record referencing a specific claim and claim version.
- Each line records claimed value, certified value, difference, and reason. A non-zero variance requires a reason before issue.
- Issued certificates are immutable. Reissue/correction creates a linked revision or superseding record; later source edits must not alter issued output.
- The blueprint's displayed lifecycle includes `DRAFT`, `INTERNAL_REVIEW`, `SUBMITTED`, `UNDER_CERTIFICATION`, `PARTIALLY_CERTIFIED`, `CERTIFIED`, `INVOICED`, and `CLOSED`, with `REVISE_REQUIRED`, `REJECTED`, and `VOID` exceptions. These labels span different business documents. Implementation must define separate claim, certificate, invoice, and payment lifecycles rather than using one status field as their shared source of truth.

### FR-05 — Financial calculations and retention

- Revised contract sum = original contract sum + approved VO value.
- Cumulative claimed = previous claimed + current claimed; cumulative certified = previous certified + current certified.
- Current certified, current retention, released retention, deductions, adjustments, and net certified remain separately stored/reconcilable.
- Retention rules belong to contract configuration; no universal rate/cap is hardcoded.
- Balance-to-complete, progress, claim/certification variance, retained/released amounts, outstanding certification, and outstanding payment must show their calculation basis.
- Currency, tax, precision/rounding, negative adjustment, multi-currency, and release-allocation rules are open business decisions. Money calculations are server-authoritative and must use deterministic decimal-safe rules.

### FR-06 — Evidence and documents

- Claim lines may reference photographs, PDFs, drawings, delivery orders, inspection records, site notes, timesheets, measurements, and comments.
- Evidence metadata is intended to include capture/upload time, user, project, claim/line relation, original filename, and content hash. GPS/device metadata is optional and requires privacy controls.
- Evidence reads must be permission-scoped. Failed/incomplete upload must be visible and retryable; metadata cannot claim a complete attachment when bytes are unavailable.
- Issued PDFs/documents must be versioned and immutable; regeneration must not silently change a previously issued artifact.

### FR-07 — Offline PWA and synchronization

- Authorized users may download an explicitly bounded assigned-project dataset and create/edit allowed drafts while offline.
- Structured local data, pending commands, and attachment work must survive ordinary navigation/reload and recover from a failed network attempt, subject to an approved local-retention policy.
- Mutations are queued as idempotent commands with command ID and base entity version. The server validates authorization and version on replay.
- A stale base version returns a conflict; the UI presents local value, server value, and explicit review choices. No last-write-wins or silent overwrite is allowed.
- Foreground sync is the canonical path; background sync is optional. The UI clearly exposes offline, pending, synced, and error/conflict states.
- Service Worker Cache Storage is limited to versioned static app assets. Private records/files use an explicit local-data policy; logout, revoked access, shared devices, expiry, and update recovery must be tested.

### FR-08 — Audit and approvals

- Consequential actions append actor/time/action/target/version and relevant before/after or reason data, including claim submission, line changes, evidence attachment, certification issue, retention changes, invoice creation, void, and supersession.
- Issued and audit history is not silently overwritten or deleted by routine editing.
- Inbox is the workflow source of truth. Email/push may notify but are not workflow records.

### FR-09 — Invoice and payment linkage

- Receivable invoice creation uses certified receivable value; payable invoice/payment linkage uses certified payable value.
- Invoice/payment status is separate from claim/certificate state.
- Idempotency and authorization prevent duplicate invoice/payment records on retries.
- Exact V1 behavior—internal record versus external ERP link/adapter—is unresolved. No bank payment execution is in scope.

### FR-10 — AI assistance

- AI may suggest progress from site notes/photos, compare claimed progress against prior state/evidence, and summarize certification gaps.
- AI output is a proposal with links to permission-checked supporting evidence; a human must confirm any operational change.
- AI must not approve/reject, issue certification, authorize an invoice, or invent financial facts. Unavailable/low-confidence AI must fail visibly without blocking manual workflows.
- Data sent to any AI provider, retention, tenant isolation, model/version audit, and deletion behavior require approval before integration.

### FR-11 — Responsive and accessible workflows

- Mobile claim detail uses readable cards rather than forcing a wide desktop grid; desktop may expose spreadsheet-style SOV editing.
- Main tasks include opening a project, claim creation/review, evidence capture, certification, and sync resolution.
- Loading, empty, validation/error, success, disabled, conflict, offline, keyboard focus, screen-reader labels, safe-area, touch-target, and small-viewport states must be verified in a real browser.
- 390×844 is the blueprint's minimum named mobile viewport; final supported browser/device matrix remains to be approved.

### FR-12 — Search, dashboards, and notifications

- Search covers document number, party, project, VO, SOV description, and invoice references within user permission scope.
- Project views separate customer receivable and subcontract payable claim/certified/invoiced/paid values and retention exposure.
- Cash exposure and gross margin must state their basis; receivable-minus-payable is not automatically gross margin.
- Dashboard/inbox figures must reconcile to underlying records and must not overstate payment or certification.

## Target data concepts

The blueprint identifies tenants, users/roles/project access, parties, projects, contracts/contract lines, variations/lines, claims/lines, certifications/lines, retention entries, invoices, payments, attachments/document links, comments, approval steps/actions, audit events, sync commands, and device sessions. This is a conceptual inventory, not an approved schema. Required keys, tenant-scoped constraints, versioning, indexes, deletion/retention policy, and migrations must be designed before implementation.

At minimum, claims/certifications and their lines need tenant/project/contract references, canonical type, document number, period, status, source version, actors/timestamps, and explicit currency/amount fields. Historical snapshots must remain stable.

## Candidate interfaces (not implemented contracts)

The blueprint sketches routes such as project listing/dashboard, contract SOV, claim listing/detail/create/update/submit/revise/evidence/certification, certificate issue/invoice linkage, and inbox. They are candidates only. Final API methods, schemas, error envelope, auth model, pagination, idempotency, version preconditions (`If-Match`/version), file-upload flow, and compatibility policy are not yet approved.

## Acceptance scenarios and evidence

All scenarios are **Planned / Unimplemented / Unverified**. Product progress is 0/18 scenarios implemented and 0/18 verified as of this documentation pass.

| ID | Acceptance scenario | Minimum evidence required |
|---|---|---|
| E2E-01 | Create project → contract → SOV. | Persistent read-back, tenant/project permissions, correct totals. |
| E2E-02 | Create PCAR, update progress, attach evidence, submit. | Mobile browser flow, persisted claim/evidence, audit trail. |
| E2E-03 | Certify below claimed value. | CCAR line variance and mandatory reason; source claim remains unchanged. |
| E2E-04 | Apply contract retention configuration. | Independently checked amount/cap and ledger/read-back. |
| E2E-05 | Create receivable invoice from certified value. | Certified basis, distinct invoice state, duplicate-retry protection. |
| E2E-06 | Submit PCAP and issue CCAP. | Payable flow, line variance/reason, role boundaries and audit. |
| E2E-07 | Create/update allowed work offline, reconnect, synchronize. | Browser E2E, command read-back, pending/error recovery. |
| E2E-08 | Concurrent edit with stale base version. | Conflict response and explicit user resolution; no silent overwrite. |
| E2E-09 | User without project access requests project data/action. | Server denial for list and direct-object routes. |
| E2E-10 | Tenant A requests Tenant B records/files. | API and storage denial across direct IDs, search, and attachment paths. |
| E2E-11 | Edit contract after certificate issuance. | Issued certificate/PDF hash and displayed contents remain unchanged. |
| E2E-12 | Mobile 390×844 main workflow. | Real-browser no page-level horizontal overflow; usable primary controls/focus. |
| E2E-13 | Draft/submit VO, then approve and claim it. | Only approved VO changes revised sum and eligible claim lines. |
| E2E-14 | AI suggests progress from evidence. | Provenance links; human confirmation required; no autonomous approval. |
| E2E-15 | AI summarizes a certification gap. | Citations point to authorized records; unauthorized tenant/project evidence excluded. |
| E2E-16 | Install/update PWA with an offline draft queued. | Supported browser install/update flow preserves or safely recovers draft/queue. |
| E2E-17 | Perform consequential workflow actions. | Append-only audit evidence identifies actor, time, target, version, and reason. |
| E2E-18 | Retry submit/certify/invoice after timeout. | Idempotent result; no duplicate authoritative business documents. |

E2E-13–E2E-18 operationalize explicit VO, AI, PWA, audit, and idempotency requirements from the blueprint; they do not assert existing implementation.

## Verification matrix

| Layer | Required before release | Current evidence |
|---|---|---|
| Static/type/lint | Project-configured checks, no unjustified warnings. | Not runnable: no source or package configuration. |
| Unit/domain | Deterministic calculations, state transitions, retention, snapshots, permissions. | No tests/configuration. |
| API/integration | Auth, tenant isolation, validation, idempotency, concurrency, transaction/audit behavior. | No API/runtime. |
| Database | Migration up/down or forward recovery, constraints, backup/restore, tenant-scoped integrity. | No schema/migrations. |
| Browser/E2E | Main receivable/payable workflows, failure/retry/conflict, responsive/a11y, console/runtime. | No browser product/build. |
| PWA | Manifest/install/update/cache/offline/version recovery in supported browsers. | No manifest/service worker. |
| Security/privacy | Cross-tenant/project, revoked identity/offline data, file access, AI data boundaries, dependency/license review. | Not assessable from current checkout. |
| Release/operations | Artifact/version, deploy, migrations, health/readiness, backup, rollback, deployed browser smoke. | No workflow/artifact/target. |

## Open decisions

1. Approve or replace the proposed stack and select hosting/deployment/runtime.
2. Define supported browsers/devices and offline download allowlist, expiry, logout/revocation, and shared-device policy.
3. Define identity provider, tenant topology, external customer/consultant/subcontractor onboarding, and permission matrix.
4. Specify currency, tax, precision/rounding, partial/negative values, retention cap/release rules, and exact document state transitions.
5. Clarify V1 invoice link semantics and whether any ERP adapter is included.
6. Approve evidence-file retention/access, immutable PDF generation, AI provider/data handling, and any legal/signature requirements.
