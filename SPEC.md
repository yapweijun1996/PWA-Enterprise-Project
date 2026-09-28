# ConstructClaim PWA — V1 Specification

## Status and authority

This is the requirements baseline derived from the user-supplied V1 blueprint. It describes intended behavior; it is not evidence that any feature exists. The repository now contains a separate static, local-only demo slice described in [README.md](README.md); it does not implement the production schema, API, financial contract, tenant authorization, E2E suite, or deployed runtime.

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
- Every protected server read/write must enforce authenticated identity, tenant, project, document, action, and current workflow-state permission. UI visibility is not authorization.
- Deny any action without an explicit server-side grant; role names or client-supplied tenant/project IDs do not prove authority. External users must be scoped to an explicitly authorized organization/project/document; invitations and exact grants remain open under TASK.md D-002.

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

#### T-002 arithmetic fixtures (synthetic and incomplete)

These exact-integer fixtures exercise only the additive equations stated above. `CU` means an abstract calculation unit, not a selected currency. They do not define tax, decimal precision, rounding, negative adjustments, retention, progress basis, or variance sign. Values are invented test data and are not taken from the UI screenshots.

| Invariant | Inputs | Expected result |
|---|---|---|
| Revised contract sum | Original `1,000,000 CU`; active approved VO `+125,000 CU`; draft `+40,000 CU`; submitted `+30,000 CU`; rejected `+10,000 CU`; void `+5,000 CU`. | `1,125,000 CU`; only the active approved VO contributes. |
| Cumulative claimed (one line) | Previous `100,000 CU`; current `35,000 CU`. | Cumulative claimed `135,000 CU`. |
| Cumulative certified (same line, separate fact) | Previous `90,000 CU`; current `30,000 CU`. | Cumulative certified `120,000 CU`; do not substitute the claimed total. |

These are **specification fixtures only**, not executable contract tests or a completed T-002. Keep claim/certificate/invoice/payment records distinct regardless of the decisions below.

#### T-002 owner decision-to-test worksheet (unfilled; no defaults)

For each row, record the selected rule for in-scope V1 behavior before schema or contract tests. An exclusion must remove the affected capability from V1; it cannot leave an in-scope workflow's amounts or state transitions undefined. Then create independent expected-value/state vectors for the listed boundaries using an exact-decimal oracle separate from production calculation.

| Topic | Owner input required | Minimum vector coverage after decision |
|---|---|---|
| Currency and tax | Contract/reporting currency scope, tax jurisdiction/rules, inclusive/exclusive treatment, tax codes and aggregation limits. | Currency precision/exponent boundaries; zero-tax and applicable-tax cases; prohibit combining unlike currencies without an approved conversion rule. |
| Precision and rounding | Accepted input/storage precision, rounding mode, and whether/where rounding occurs (line, tax, document, or cumulative). | Exact values and midpoint/tie cases at each selected rounding boundary, including negative values if allowed. |
| Negative adjustments and cumulative basis | Whether negative claim/certification values are allowed, their correction/reversal mechanism, and the source/version used for prior/current/cumulative line totals. | Positive and zero cases; accept negative/full reversal only if allowed, otherwise verify rejection; cover correction/supersession and keep claimed/certified totals separate. |
| Retention | Eligible base, rate(s), cap and when it applies, release triggers, and allocation across lines/periods. | Below/at/above cap, partial and final release, repeated release, and corrected source version. |
| Variance | Sign convention (`certified − claimed` or `claimed − certified`), any tolerance, and when a reason blocks issue. | Over-certification, under-certification, zero/tolerance boundary, and missing/present reason. |
| Document lifecycle and snapshots | Separate states, permitted transitions and actor authority for each claim/certificate/invoice/payment type; correction, void, reissue/supersession, and immutable snapshot/version contents. | Allowed and denied transitions, stale-version rejection, retry, and issued-snapshot equality after source edits/correction. |

The additive fixtures above remain the only selected arithmetic invariants. This worksheet records questions and test coverage only; it does not choose the answers.

### FR-06 — Evidence and documents

- Claim lines may reference photographs, PDFs, drawings, delivery orders, inspection records, site notes, timesheets, measurements, and comments.
- Evidence metadata is intended to include capture/upload time, user, project, claim/line relation, original filename, and content hash. GPS/device metadata is optional and requires privacy controls.
- Evidence reads must be permission-scoped. Failed/incomplete upload must be visible and retryable; metadata cannot claim a complete attachment when bytes are unavailable.
- Issued PDFs/documents must be versioned and immutable; regeneration must not silently change a previously issued artifact.

### FR-07 — Offline PWA and synchronization

- Authorized users may download an explicitly bounded assigned-project dataset and create/edit allowed drafts while offline only under the approved allowlist/local-retention policy (TASK.md D-003).
- Offline commands are nonauthoritative until the server rechecks current identity, tenant/project/document/action permission, workflow state, and base version and commits them. A queued submission must display as pending, not submitted. Offline approval/issue and invoice/payment actions are not available unless a separately approved policy permits queueing an intent; they never become final on the client.
- Structured local data, pending commands, and attachment work must survive ordinary navigation/reload and recover from a failed network attempt, subject to an approved local-retention policy.
- Mutations are queued as idempotent commands with command ID and base entity version. The server validates authorization and version on replay.
- A stale base version returns a conflict; the UI presents local value, server value, and explicit review choices. No last-write-wins or silent overwrite is allowed.
- Foreground sync is the canonical path; background sync is optional. The UI clearly exposes offline, pending, synced, and error/conflict states.
- Service Worker Cache Storage is limited to versioned static app assets. Private records/files use an explicit local-data policy; logout, revoked access, shared devices, expiry, and update recovery must be tested.
- Browser quotas and eviction are user-agent specific. Local storage is best-effort by default; a `persist()` request may be denied, quota estimates are advisory, and users can clear site data. Identify denied persistence as best-effort rather than a failed IndexedDB write. Only show a command as locally queued after its write transaction succeeds; handle unavailable storage, quota/write errors, and recovery visibly without promising indefinite device durability.
- A disconnected client cannot receive account/project revocation or be remotely wiped immediately. The approved policy must bound offline-access age and define how local records and uncommitted commands are handled on expiry, logout, and reconnection. When a revoked/expired identity reconnects, server denial must prevent command commitment; local cleanup follows the approved policy.

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
- Enforce user/tenant/project/document/action permissions server-side before retrieving evidence or constructing any provider payload. Client/model-supplied identifiers never grant access.
- Treat site notes, documents, OCR, images, and model output as untrusted data, not instructions. Embedded instructions must not override policy, widen retrieval, or trigger state changes; the model has no direct authority to approve/reject, issue certification, authorize invoices, or mutate records.
- AI must not approve/reject, issue certification, authorize an invoice, or invent financial facts. Unavailable/low-confidence AI must fail visibly without blocking manual workflows.
- Data sent to any AI provider, retention, tenant isolation, model/version audit, and deletion behavior require approval before integration.

## T-003 security and privacy decision-to-test worksheet (unfilled; no grants or policy selected)

This worksheet makes no identity, role, offline-retention, evidence-sharing, or AI-provider choice. Before sensitive data is persisted, downloaded for offline use, or sent to a provider, record the policy for every in-scope workflow and obtain the T-003 security review. Exclusions must remove the affected capability from V1 rather than leave access or privacy rules undefined. The FR-01 server-side default-deny, FR-07 pending-command, and FR-10 human-review requirements remain in force.

| Topic | Owner input required | Minimum security/test vectors after decision |
|---|---|---|
| Identity, tenant, and invitation lifecycle | Identity/account assurance, tenant/company boundaries, membership and external-party model, invitation acceptance/expiry/revocation, session invalidation. | Accept/expire/revoke invitations; verify membership changes and account/session revocation cannot retain server authority. |
| Project/document/action grants | Explicit role × tenant/project/document/state × action grants for every supported operation, including contract/SOV administration, claim draft/edit/submit/revise/void, VO approval, certificate issue, invoice/payment, evidence, offline sync, and AI retrieval. | Exercise each grant and its denial; wrong project/document/state, revoked or changed role, direct IDs, and client-supplied scope cannot broaden server authorization. Unspecified grants deny. |
| External parties, objects, and evidence files | Customer/consultant/subcontractor scope; list/search/direct-object and file read/write/download rules; any public/expiring link policy; metadata (including optional GPS/EXIF) and retention/deletion rules. | Compare permitted access with wrong-tenant/project/object and guessed file IDs across lists, search, direct routes, and storage. Verify link scope/expiry/revocation if links are allowed, and incomplete upload cannot appear complete. |
| Offline data, devices, and commands | Per-role/project entity, field, attachment, and command allowlist; maximum offline-access age; local retention and any at-rest protection; logout, revocation, shared/lost-device, app-update, storage-denial/eviction/quota/write-failure handling. | Test allowed/denied downloads and commands; logout/expiry/revocation and replay denial; storage permission denied versus actual write failure/quota; no command appears queued before a successful local transaction, and no client-only final outcome. |
| AI provider and evidence boundary | Provider/model, exact evidence/fields permitted for retrieval and payload, data location, retention/training/logging/deletion, tenant isolation, audit, and failure behavior. | Deny unauthorized retrieval before provider construction; prove payload scope/provenance, injection cannot expand retrieval or cause writes, suggestions require human confirmation, and unavailable AI leaves manual work available. |

### FR-11 — Responsive and accessible workflows

- Use the user-designated static references in `ui/` as the screen-composition anchor indexed in [DESIGN.md](DESIGN.md). They guide hierarchy and layout; they do not prove that routes, interactions, or browser behavior exist.
- Desktop app shell uses persistent primary navigation and a global utility/search bar. Mobile uses a compact header and Home/Projects/Claims/Inbox/More navigation; preserve project context and active location.
- Desktop tables are appropriate for SOV/claim/certification comparison. Mobile must recompose into readable cards, focused line forms, stacked inspectors, or deliberate detail routes; do not shrink desktop tables until labels/values become unusable.
- Follow the screen-family patterns for dashboard, Projects/Project 360, Claims/Create/Review, Certification/Certificate Detail, SOV/VO, Evidence, Inbox, Parties, Timeline/Search, Offline Queue/Conflict, and Settings in DESIGN.md.
- Primary actions, save-draft, wizard progress, selected-record context, warning/error states, and offline/sync status must be visible. Sticky mobile controls must not cover fields, errors, keyboard, or bottom navigation.
- Verify the accessible and truthful state contract in [DESIGN.md](DESIGN.md#accessible-and-truthful-state-contract-unimplemented) in a real browser: loading/refresh, empty/no-results, validation, disabled/permission-denied, error, offline/pending/success, conflict, upload failure/retry, and recovery. Check keyboard focus, screen-reader announcements, safe-area, touch targets, zoom/reflow, and long content; never communicate status by color alone or imply a server outcome from local state.
- 390×844 is the blueprint's minimum named mobile viewport; verify desktop plus this mobile viewport and approve the wider browser/device matrix before release.
- Screenshot sample values are not live data. Demo mode must visibly identify sample records; define financial KPI labels/formulas before displaying them as authoritative.

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
| E2E-07 | Create/update allowed work offline, reconnect, synchronize. | Browser E2E, command read-back, pending/error recovery; revoke or expire access before replay and verify server denial, no command commitment, and policy-compliant handling of retained local work. |
| E2E-08 | Concurrent edit with stale base version. | Conflict response and explicit user resolution; no silent overwrite. |
| E2E-09 | User without project access requests project data/action. | Server denial for list and direct-object routes. |
| E2E-10 | Tenant A requests Tenant B records/files. | API and storage denial across direct IDs, search, and attachment paths. |
| E2E-11 | Edit contract after certificate issuance. | Issued certificate/PDF hash and displayed contents remain unchanged. |
| E2E-12 | Compare the main claim journey and representative anchored page families, including accessible/truthful states, on desktop and at mobile 390×844. | Real-browser evidence shows intentional mobile recomposition (not scaled desktop), no page-level horizontal overflow or obscured sticky actions, usable keyboard/focus and screen-reader announcements, and correct primary-navigation/context. Exercise loading, empty/no-results, validation, permission-denied, error, offline/pending, and recovery states without exposing protected cached data or implying uncommitted server outcomes. |
| E2E-13 | Draft/submit VO, then approve and claim it. | Only approved VO changes revised sum and eligible claim lines. |
| E2E-14 | AI suggests progress from evidence. | Provenance links; human confirmation required; no autonomous approval. |
| E2E-15 | AI summarizes a certification gap. | Citations and provider input contain only server-authorized records; adversarial instructions embedded in evidence cannot reveal unauthorized data, widen retrieval, or cause writes; human review remains required. |
| E2E-16 | Install/update PWA with an offline draft queued. | Supported browser install/update flow preserves or safely recovers draft/queue; denied persistence is identified as best-effort, while quota/write failure never masquerades as a successfully queued command. |
| E2E-17 | Perform consequential workflow actions. | Append-only audit evidence identifies actor, time, target, version, and reason. |
| E2E-18 | Retry submit/certify/invoice after timeout. | Idempotent result; no duplicate authoritative business documents. |

E2E-13–E2E-18 operationalize explicit VO, AI, PWA, audit, and idempotency requirements from the blueprint; they do not assert existing implementation.

## Verification matrix

| Layer | Required before release | Current evidence |
|---|---|---|
| Static/type/lint | Production project-configured checks, no unjustified warnings. | Not runnable for production: no production package/configuration. The separate demo has JS syntax and manifest checks only. |
| Unit/domain | Deterministic calculations, state transitions, retention, snapshots, permissions. | No tests/configuration. |
| API/integration | Auth, tenant isolation, validation, idempotency, concurrency, transaction/audit behavior. | No API/runtime. |
| Database | Migration up/down or forward recovery, constraints, backup/restore, tenant-scoped integrity. | No schema/migrations. |
| Browser/E2E | Main receivable/payable workflows, failure/retry/conflict, responsive/a11y, console/runtime. | No browser product/build. |
| PWA | Manifest/install/update/cache/offline/version recovery in supported browsers. | No manifest/service worker. |
| Security/privacy | Cross-tenant/project, revoked identity/offline data, file access, AI data boundaries, dependency/license review. | Not assessable from current checkout. |
| Release/operations | Artifact/version, deploy, migrations, health/readiness, backup, rollback, deployed browser smoke. | No workflow/artifact/target. |

## Open decisions

1. Approve or replace the proposed stack and select hosting/deployment/runtime.
2. Define supported browsers/devices under D-001 and complete the T-003 worksheet for offline scope, expiry, logout/revocation, storage failure, and shared-device behavior.
3. Complete the T-003 worksheet for identity/tenant topology, invitations, external-party access, explicit permission grants, and object/file boundaries.
4. Complete the unfilled T-002 decision-to-test worksheet above: record rules for every in-scope V1 workflow; exclusions remove affected capabilities rather than leave their money/state rules undefined.
5. Clarify V1 invoice link semantics and whether any ERP adapter is included.
6. Complete the T-003 worksheet for evidence access/retention and AI provider/data handling; separately resolve immutable PDF generation and any legal/signature requirements before implementation.
7. Define when photos/documents are mandatory versus advisory for submission/certification; the UI reference shows a missing-photo warning but does not establish a blocking rule. Track as TASK.md D-008.
