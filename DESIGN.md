# ConstructClaim PWA — Design

## Evidence and status

This document separates product intent from repository facts.

- **Verified repository state:** `main` and `origin/main` point to initial commit `dbca199`; the only tracked file is `.gitattributes`. No `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, README, ADR, source, package/configuration, tests, CI, or release workflow exists in this checkout.
- **User-defined target:** the ConstructClaim PWA V1 blueprint supplied in the task conversation.
- **Not verified:** every runtime, framework, database, API, storage service, browser behavior, PWA capability, and integration described below. Target architecture is a design proposal, not a claim about existing code.

## Product/system classification

The intended product is a hybrid business system:

1. Mobile-first installable web client (PWA) for office and construction-site workflows.
2. API/service boundary for identity, authorization, business rules, financial calculations, synchronization, audit, and integration.
3. Persistent relational business data and object/file storage for evidence and issued documents.
4. Optional AI assistance and future ERP adapters behind explicit interfaces.

It is currently at the **pre-implementation blueprint** lifecycle stage. No package or deployable boundary exists yet.

## Proposed system context

```text
Site / office users
  └─ ConstructClaim PWA
       ├─ app shell: Service Worker + Cache Storage (static assets only)
       ├─ bounded local records/commands: IndexedDB (policy not yet finalized)
       └─ HTTPS API
            ├─ identity, tenant/project authorization
            ├─ domain validation, transitions, money calculation, version checks
            ├─ relational business store (PostgreSQL is proposed, unselected)
            ├─ evidence/document object store (S3-compatible is proposed, unselected)
            └─ outbox/adapters → future ERP / notification / AI services
```

This is a logical target, not a deployed topology. The API must remain authoritative for permission, final state, and money. The browser may capture work offline, but cannot certify or authorize a final server-side outcome by itself.

## Responsibility and trust boundaries

| Boundary | Owns | Must not own |
|---|---|---|
| PWA presentation | Responsive navigation, forms, field feedback, evidence capture, local sync queue/status, previews. | Tenant authorization, final approval, authoritative totals, or trust in hidden/disabled controls. |
| Local browser storage | Explicitly permitted offline snapshots, drafts, attachment queue, versioned commands. | Permanent system of record or unbounded retention of sensitive records. |
| API/domain service | Identity checks, tenant/project scope, workflow transitions, validation, authoritative calculations, idempotency, version/concurrency checks, audit writes. | Trusting client-supplied tenant IDs, stale local permissions, or AI output as an approval. |
| Relational store | Authoritative structured records, revisions, relationships, transaction boundaries. | Mutable rewriting of issued historical evidence. |
| Evidence/object storage | Original files, immutable identifiers/hashes, access-controlled retrieval and document versions. | Public-by-default links or unscoped cross-tenant access. |
| AI adapter | Permission-scoped evidence analysis with provenance and human-review output. | Issuing a certificate, approving money, or crossing tenant/project boundaries. |
| ERP adapter | Translate canonical records to external ERP contracts/codes. | Leaking ERP table names or codes into the core domain model. |

All future requests must enforce authenticated tenant + requested project + action/document permission on the server. Tenant/project identifiers supplied by a client are selectors to validate, not proof of authority.

## Core domain and source of truth

### Canonical documents

Use stable internal `document_type` values. The supplied abbreviations are labels/mappings, not universal semantics:

| Tenant-visible code | Canonical type |
|---|---|
| PCAR | `RECEIVABLE_PROGRESS_CLAIM` |
| CCAR | `RECEIVABLE_CERTIFICATE` |
| PCAP | `PAYABLE_PROGRESS_CLAIM` |
| CCAP | `PAYABLE_CERTIFICATE` |

Tenant-controlled labels and ERP adapters may map these values to local language or external transaction codes. Do not store a mutable display label as the canonical business meaning.

### Independent financial facts

- A claim records amounts requested for a project/contract/SOV and claim period.
- A certification is a separate, versioned/issued record referencing the claim version and recording line-level claimed, certified, variance, and reason values.
- Invoice and payment records reference certified amounts and their own downstream states.
- Claimed, certified, invoiced, paid, retention held, and retention released must remain separately queryable.

A claim line snapshots its SOV/VO description, quantity/rate/amount basis, and relevant source version. Later contract edits must not silently alter a historical claim or issued certificate. Approved VO items may affect the revised contract sum; draft, submitted, rejected, or void VOs do not.

### Configuration and calculations

Contract-owned configuration controls retention rate/cap and related rules; no universal percentage is hardcoded. The supplied equations establish the intended cumulative relationships, but currency, tax, rounding, negative adjustments, partial periods, retention release ordering, and multi-currency behavior still require an explicit domain decision before schema implementation.

Retention should be explainable as dated hold/release events and source records, not just a mutable balance. “Project cash position” must distinguish certified/invoiced/paid and payable states. Gross margin is not safely inferred from receivables minus payables without an explicit cost/commitment basis.

## Workflow and state ownership

The blueprint defines draft, internal review, submitted, certification, invoice, and close stages, plus revise/reject/void exceptions. It also requires Certification to be a separate document. Therefore implementation must not make one status field the authoritative state for both claim review, certification issuance, invoice, and payment. A projection may summarize the end-to-end lifecycle, but the underlying claim, certificate, invoice, and payment lifecycles must stay distinct. Exact transition matrix, authority by actor, and reopening/supersession rules are an open design task.

Approved business events (submission, certification issue, retention adjustment/release, invoice creation, void/supersede) should append audit events in the same consistency boundary as the business mutation. Issued documents are immutable; corrections are new linked records or explicitly authorized void/supersession actions.

## Offline, synchronization, and recovery

The blueprint proposes IndexedDB for structured client data and a command queue with `command_id`, entity identifiers, `base_version`, and payload. The server accepts a command only when authorization and the base version still hold; a stale version returns a conflict for explicit review. Retries must be idempotent. Foreground synchronization is the correctness path; background sync is optional enhancement only.

Required design constraints:

- Service Worker Cache Storage is for versioned application shell/static assets, not private claim files or tenant business records.
- Define which projects/fields may be downloaded, how long local copies live, logout/revocation behavior, shared-device handling, and whether local data is protected at rest before enabling offline downloads.
- Never silently overwrite either local or server values. Show pending, synced, conflict, and error states and provide recoverable retry.
- Preserve drafts across compatible app updates; do not activate a new worker in a way that discards queued user work.
- Attachment upload must be resumable/retryable or expose a clear failed state; metadata and file bytes must not diverge silently.

## PWA and UX target

The intended interface is mobile-first and responsive. Mobile claim lines use cards rather than forcing a wide spreadsheet table; desktop may use an SOV-style grid. Primary navigation, safe areas, keyboard behavior, accessible labels/focus, touch targets, long content, empty/error/loading/success states, and clear sync status require real-browser verification. The repository has no UI, so none of these properties are currently verified.

The app-shell install/update/offline experience, manifest, service worker versioning, cache strategy, supported browsers, and update recovery remain unimplemented and must be selected and tested as a coherent release contract.

## AI and integrations

AI may draft progress suggestions, compare claims with prior progress/evidence, and summarize variance. Every suggestion must carry links to permitted source evidence and remain visibly a suggestion until a human confirms it. AI cannot certify/reject, issue a document, create an authoritative financial value, or broaden permissions. Sensitive evidence handling, provider/data-retention policy, and failure behavior are unresolved.

The core domain must not depend on Globe3 table names such as `entp_pbill` or `entp_pcar`. A future adapter translates canonical claim/certificate records to a selected ERP interface. V1 invoice-link behavior must be clarified: internal invoice record, external ERP deep link, or a later integration are materially different contracts.

## Candidate technology, not a decision

The blueprint recommends React + TypeScript + Vite, a Node.js/TypeScript Fastify API, PostgreSQL + Drizzle, S3-compatible object storage, and Chromium/Playwright PDF output. These are candidate technologies only: no manifest, dependency, package policy, deployment target, runtime constraint, or compatibility requirement exists in the repository. Confirm the stack and operational environment before adding packages or scaffolding.

## Failure, operations, and compatibility

The target system needs explicit handling for authorization denial, validation errors, stale-version conflicts, duplicate/replayed commands, partial evidence upload, connectivity loss, unavailable AI/ERP, and failed PDF generation. No deployment, health/readiness, backup/restore, migrations, observability, rollback, or compatibility policy is present yet. These are release prerequisites, not verified capabilities.

## Open design decisions

Track and resolve in [TASK.md](TASK.md) before dependent implementation:

- Candidate stack, browser/device support, hosting and tenant topology.
- Tenant/user identity and external customer/subcontractor onboarding/permissions.
- Offline data allowlist, retention, revocation, and shared-device protection.
- Currency, tax, precision/rounding, claim/certificate versioning, retention ledger, and exact lifecycle transitions.
- Whether invoice links are internal records or external ERP references.
- Evidence storage/link expiry, immutable PDF generation, and AI provider/data handling.
