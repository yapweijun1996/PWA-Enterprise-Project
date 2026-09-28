# ConstructClaim PWA — Epics

## Status convention

Every product epic below is **Planned**. Repository inspection found no application source, executable tests, runtime, or deployed product. An epic becomes Implemented only when its scoped behavior exists, Verified only with the stated evidence, and Released only after production/release evidence. See [PROGRESS.md](PROGRESS.md). The 24 user-designated images in `ui/` are static composition references; use the screen-family map and screenshot-only review in [DESIGN.md](DESIGN.md), and do not treat a mockup as runtime or accessibility proof.

## EPIC-01 — Tenant, identity, and project foundation

**Outcome:** Authorized internal and external participants can access only the tenant, project, document, and action they are allowed to use.

**Scope:** Tenant and organization model; users/roles/project access; party membership; identity/session lifecycle; project setup; server-side permission checks; audit foundation.

**Acceptance:** E2E-09 and E2E-10 pass for direct-object/list and cross-tenant record/file access; foundational audit append/attribution tests pass; external invitation and revocation behavior is explicit. Full workflow audit E2E-17 is gated on later domain workflows.

**Dependencies:** Resolve tenant topology, identity provider, and external-user model. See [TASK.md](TASK.md) T-001/T-003.

## EPIC-02 — Contract, SOV, and approved variations

**Outcome:** Every claim amount can be reconciled to original contract value, SOV line, and approved changes.

**Scope:** Main/subcontract setup, SOV lines, contract versions/snapshots, VO lifecycle, approval authority, revised contract value and balance-to-complete.

**Acceptance:** Only approved VOs alter revised contract value or claimable VO lines; historical claim/certificate snapshots do not change after later edits.

**Dependencies:** EPIC-01 and financial calculation/revision decisions.

## EPIC-03 — Receivable and payable progress claims

**Outcome:** Authorized parties create, review, submit, revise, void, and trace PCAR and PCAP documents with line-level progress and evidence.

**Scope:** Canonical document types, claim periods, SOV/VO references, claimed totals, review inbox, state transitions, validation, versions, idempotent submit, mobile claim screens.

**Acceptance:** E2E-02 and E2E-06 prerequisites pass; desktop claim comparison follows the Claims/Claim Detail anchors and mobile uses record cards/forms; submitted claims cannot be silently deleted; claimed values remain distinct from certified/invoiced/paid values.

**Dependencies:** EPIC-01 and EPIC-02.

## EPIC-04 — Certification, retention, and financial audit

**Outcome:** CCAR/CCAP certification is independently issued, explainable, immutable, and auditable.

**Scope:** Certificate documents/lines, claimed-versus-certified comparison, variance reasons, retention configuration/ledger, deductions/adjustments, immutable PDF/version, correction/supersession.

**Acceptance:** E2E-03, E2E-04, E2E-11, and E2E-17 pass; issued outputs survive later contract edits unchanged.

**Dependencies:** EPIC-01, EPIC-02, and EPIC-03; financial and lifecycle decisions resolved.

## EPIC-05 — Field evidence and offline synchronization

**Outcome:** Site users can collect authorized evidence and permitted draft changes with unreliable connectivity, then recoverably synchronize them.

**Scope:** Mobile capture, evidence metadata/storage, bounded project download, IndexedDB/command queue implementation, version conflicts, retry/status UX, PWA install/update/recovery.

**Acceptance:** E2E-07, E2E-08, E2E-10, E2E-12, and E2E-16 pass on the agreed browser/device matrix; evidence capture/gallery, offline queue, and sync conflict follow their mapped screen anchors with accessible feedback; private data is not placed in static caches; revoked/offline access follows approved policy.

**Dependencies:** EPIC-01 plus approved local-data and browser decisions. Evidence store is a candidate, not selected infrastructure.

## EPIC-06 — Invoice linkage, project position, and operations

**Outcome:** Finance and management can trace certified values into invoice/payment records and reconcile receivable/payable exposure without conflating project cash and margin.

**Scope:** Idempotent invoice linkage, payment records/status, project dashboards/search, reconciliation views, notification inbox, deployment/readiness/backup/restore/rollback evidence.

**Acceptance:** E2E-05 and E2E-18 pass; dashboard values reconcile to source records; release health and recovery procedures are tested. No bank payment execution or full accounting is included.

**Dependencies:** EPIC-03 and EPIC-04; invoice boundary and operational target decisions.

## EPIC-07 — Human-reviewed AI assistance

**Outcome:** Users can obtain evidence-grounded suggestions and summaries without delegating financial authority to AI.

**Scope:** Claim-draft assistance, certification-gap comparison, management summaries, source links, confidence/failure UX, provider/data policy, authorization-filtered retrieval, evaluation and audit metadata.

**Acceptance:** E2E-14 and E2E-15 pass; AI cannot issue/approve/reject documents; all referenced evidence is available to the requesting user; manual workflow remains usable when AI is unavailable.

**Dependencies:** EPIC-01, EPIC-03, EPIC-04, and approved provider/privacy policy. AI is not a substitute for workflow controls.

## V1 release gate

V1 release requires all seven epics' release-scoped acceptance criteria, all E2E-01–E2E-18 scenarios, and the verification matrix in [SPEC.md](SPEC.md) to pass. Each milestone must be tracked independently as Planned → Implemented → Verified → Released. Documentation presence alone does not satisfy a product epic.
