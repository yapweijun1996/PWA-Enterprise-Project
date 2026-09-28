# ConstructClaim PWA — Design

## Evidence and status

This document separates product intent from repository facts.

- **Verified repository state before this UI-documentation update:** `main` was at local documentation commit `5780ee7`, one commit ahead of `origin/main` at `dbca199`; the earlier commit tracks `.gitattributes` and the eight core planning documents. The 24 PNGs under `ui/` are untracked and were preserved. No app source, package/configuration, tests, CI, or release workflow exists in this checkout; no `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, README, or ADR was found.
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

## UI/UX layout anchor — user-provided `ui/` references

### Evidence and status

The user designated the 24 static screen images in `ui/` as the visual/layout anchor for ConstructClaim. They show paired desktop and phone compositions for the main journeys. This pass reads them as **design references**, not screenshots of a running application; their dates, people, amounts, project names, status counts, and settings values are illustrative, not approved seed data or live facts. The assets are currently untracked in this worktree and were not modified. The UI layout spec below is a derived design baseline, not evidence that any route or interaction exists.

### Shared shell and information architecture

**Desktop shell**

- Persistent left rail: ConstructClaim branding, primary navigation, and a low-priority construction-brand image/motto area.
- Global utility bar: global search, notification entry with count, signed-in user/organization context, and account menu.
- Main work area: breadcrumb/context, page title and purpose, one primary action, then task-specific summary, list/table, or editor.
- Use a right-side inspector/summary only where it supports the current selection (for example selected claim, evidence item, inbox item); keep the main work area dominant.

**Primary navigation shown in the anchors:** Dashboard, Projects, Claims, Inbox, Parties, Reports, Settings. Global Search remains available from the top bar. Project context uses its own tabs: Overview, SOV, Claims, Variations, Evidence, Team, and Activity. Do not turn each data table or entity into a new global navigation item.

**Mobile shell**

- Compact top bar with brand/context, notifications, and menu or back navigation.
- Bottom navigation for Home, Projects, Claims, Inbox, and More; keep the active destination obvious and reserve safe-area space.
- Recompose the content to one column: project/list cards, stacked form fields, selected-record details, and explicit accordions/tabs where long detail must be deferred.
- Keep the current task's primary action visible without covering the last field, validation message, or keyboard. Do not merely shrink a desktop table or split-view panel.

### Screen-family layout contract

| User task / page family | Reference screens | Layout anchor |
|---|---|---|
| Authenticate | `ui/01-Login.png` | Desktop split layout: sign-in form plus product/context panel; mobile becomes a single-column sign-in flow. Email/password, remember, recovery, and SSO are visual affordances only; the actual identity provider is undecided. |
| Orient and triage | `ui/02-Home Dashboard.png` | Greeting/context, a small row of separate receivable/payable/retention/task summaries, claim-position chart, attention queue, projects, and financial snapshot. Mobile prioritizes My Tasks and vertically stacked overview cards. |
| Find a project / project workspace | `ui/03-Projects.png`, `ui/04-Project-360.png` | Search/filter/sort projects; desktop project cards/grid and mobile project cards. Project 360 begins with identity/status/manager/revised contract context, then project tabs, receivable/payable/retention indicators, progress and contract snapshot, recent claims, approvals, and activity. |
| Find and inspect claims | `ui/05-Claims.png`, `ui/06-Claim-Detail.png` | Receivable/Payable switch, status summaries, search and filters, then a desktop comparison table. On mobile use claim cards with number, project, period, amount, status, and next action. Detail starts with document identity/status/actions, separately labeled totals, claim-line/evidence/activity tabs or sections, and a contextual summary. |
| Create and edit a claim | `ui/07-New-Claim.png`, `ui/08-Claim-Line-Editor.png`, `ui/09-Submit-Claim-Review.png` | Four-step journey: Claim Details → SOV Lines → Evidence → Review. Preserve draft/save-and-continue. Claim-line editing shows the SOV basis, previous/current/cumulative values, progress/quantity/unit rate, balance, notes, evidence, and calculation summary. Review groups source info, line totals, evidence checklist/warnings, explicit acknowledgement, and Submit. Desktop may use a dense SOV grid; mobile uses a focused line form and stacked summary. |
| Review and issue certification | `ui/10-Certification.png`, `ui/11-Certificate-Detail.png` | Separate Receivable CCAR / Payable CCAP queues with status counts, filters, comparison table, and selected-claim inspector. Certificate detail leads with issued state/source claim version and separate certified/retention/deduction/net metrics; show line variance/reason, certificate preview/download, revision history, and audit events. Mobile stacks these sections. |
| Reconcile SOV and variations | `ui/12-Schedule-of-Values.png`, `ui/13-SOV-Detail.png`, `ui/14-Variation-Orders.png`, `ui/15-Variation-Order-Detail.png` | SOV list emphasizes project/contract context and line-by-line values; use table for desktop comparison and cards/stacked rows on mobile. SOV detail groups line facts, value breakdown, claim history, linked evidence, and related variations. VO list uses lifecycle filters; VO detail groups status/authority actions, financial summary, approval progress, affected SOV lines, and evidence. |
| Capture and find evidence | `ui/16-Evidence-Gallery.png`, `ui/17-Evidence-Capture.png` | Gallery uses type tabs/filters, a visual grid on desktop, and a compact list on mobile with a selected-item detail panel. Capture prioritizes photo preview, Retake/Use Photo, required project/claim/SOV/type/time links, note, optional location, upload state, retry/remove, Add Another, and Save Evidence. |
| Work an approval | `ui/18-Approval-Inbox.png` | Needs My Action / Assigned / Completed queue, filters and priority/due state; desktop list plus selected-item panel, mobile task cards and a record-detail route. Show only actions permitted to the signed-in actor. |
| Manage parties and audit | `ui/19-Parties.png`, `ui/20-Activity-Timeline.png` | Party type filters and searchable list with selected organization/contact/project context. Timeline uses date/actor/action filters, event list, and selected-event detail including before/after or reason; avoid presenting a visual feed as a substitute for authoritative audit records. |
| Find records globally | `ui/21-Global-Search.png` | Query and filters at top; group results by record type (projects, claims, parties, documents, variations) with enough status/context to identify the right record. Results remain permission-scoped. |
| Recover offline work | `ui/22-Offline-Queue.png`, `ui/23-Sync-Conflict.png` | Queue starts with prominent connectivity/last-sync state, pending command and attachment counts, approved project scope, operation states, and Retry/View Conflict actions. Conflict detail compares preserved local/base and current server versions, identifies changed fields, and offers Use Local / Use Server / Edit & Merge. No choice is applied until explicit confirmation. Stack the comparison on mobile. |
| Configure account and device data | `ui/24-Settings.png` | Group Profile, Organization, Notifications, Security & Sessions, Offline Data, and Preferences. Offline downloads/retention/sync controls must explain policy and consequences. The pictured 30-day retention and storage limit are examples, not defaults. |

### Visual language inferred from pixels

- A restrained construction brand: navy headings/text, white and pale-blue work surfaces, blue primary actions, and a small orange brand accent.
- Status color is supported by a text label and/or icon (for example Draft, Awaiting Certification, Issued, Offline, Conflict); color alone must never carry business meaning.
- Green, orange, red, and purple appear as semantic accents for positive/issued, pending/attention, variance/error, and supplementary metrics. Establish actual accessible design tokens from measured contrast before implementation; do not infer hex values from compressed PNGs.
- Use cards for independent summaries/actions, tables where users compare SOV or claim lines, and a side inspector only for a selected record. Avoid nested-card proliferation and KPI cards that obscure the next business action.
- Keep charts subordinate to the underlying values; label units, period, and series. Treat “Claim Gap” as an undefined label until its calculation and business meaning are approved.

### Required behavior beyond what static anchors prove

The screen set illustrates populated/normal states and selected offline/conflict cases. It does **not** prove working navigation, permissions, keyboard behavior, accessible names/focus order, contrast ratios, zoom/reflow, loading/empty/no-results/validation/permission-denied states, attachment failure recovery, or safe-area behavior. Those remain release acceptance criteria and must be added to the implemented flows. The Review & Submit image shows a warning for lines without photo evidence but does not define whether any missing evidence blocks submission; that rule remains a business decision, not a visual inference.

Financial status must remain truthful in every component: claimed, certified, invoiced, paid, retention held/released, and net certified are separate measures. All screenshot values and January 2024 records must be treated as sample presentation data; demo data must be visibly identified and must never masquerade as a tenant's live records.

### Screenshot-only design self-review

This is a bounded review of the **reference compositions**, not of an implemented UI. Evidence is the 24 static images; no browser, keyboard, assistive-technology, or task-completion test was possible.

| Dimension | Score | Visual evidence / limitation |
|---|---:|---|
| User purpose and task success | 14/15 | Page titles and actions map clearly to project, claim, certification, evidence, and sync jobs; actual task success is untested. |
| Information architecture | 9/10 | Persistent work areas, breadcrumbs, project tabs, and queue categories are visible; mobile More-menu reachability needs testing. |
| Visual hierarchy | 13/15 | Strong page title/status/primary action and separate summary/data regions; some dense screens have many equally prominent cards. |
| Layout, spacing, density | 8/10 | Desktop tables/inspectors and mobile stacked cards are intentionally different; tablet and small-device variants are absent. |
| Typography and content | 8/10 | Clear headings/field labels; dense secondary/table text may be too small at real device scale. |
| Interaction, feedback, recovery | 7/10 | Wizard, save/submit, upload status, offline queue, and conflict choices are pictured; behavior and focus feedback are not evidenced. |
| Responsive/adaptive | 8/10 | Many screens show desktop and phone recomposition; no tablet, landscape, zoom, or real browser layout evidence. |
| Accessibility/inclusive UX | 6/10 | Visible labels and multiple text/icon status cues help; contrast, keyboard, focus, screen-reader order, and zoom remain unverified. **Hard gate not met.** |
| Trust and data truth | 3/5 | Certificate/history/evidence provenance is represented, but sample data is not visibly labeled and “Claim Gap” has no defined formula. **High-trust hard gate not met.** |
| Craft, consistency, restraint | 4/5 | Brand, navigation, controls, and desktop/mobile vocabulary are coherent; production tokens are not specified. |
| **Total** | **80/100** | **REVISE before production/implementation approval.** Accessibility and trust hard gates fail on missing evidence. The user-designated screenshots remain the layout reference; the score does not reject their use as inspiration. |

### Reference inventory

All listed assets are user-provided files currently present under `ui/` in this worktree:

`01-Login.png`, `02-Home Dashboard.png`, `03-Projects.png`, `04-Project-360.png`, `05-Claims.png`, `06-Claim-Detail.png`, `07-New-Claim.png`, `08-Claim-Line-Editor.png`, `09-Submit-Claim-Review.png`, `10-Certification.png`, `11-Certificate-Detail.png`, `12-Schedule-of-Values.png`, `13-SOV-Detail.png`, `14-Variation-Orders.png`, `15-Variation-Order-Detail.png`, `16-Evidence-Gallery.png`, `17-Evidence-Capture.png`, `18-Approval-Inbox.png`, `19-Parties.png`, `20-Activity-Timeline.png`, `21-Global-Search.png`, `22-Offline-Queue.png`, `23-Sync-Conflict.png`, and `24-Settings.png`.

The static references are the layout anchor for the screen families above; they are not a pixel-perfect implementation mandate or runtime/browser verification. The PWA app-shell install/update/offline experience, manifest, service-worker versioning, cache strategy, supported browsers, and update recovery remain unimplemented and must be selected and tested as a coherent release contract.

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
- Which evidence types are mandatory versus advisory before claim submission or certification; see TASK.md D-008.
