# ConstructClaim PWA — Design

## Evidence and status

This document separates product intent from repository facts.

- **Verified repository state before this UI-documentation update:** `main` was at local documentation commit `5780ee7`, one commit ahead of `origin/main` at `dbca199`; the earlier commit tracks `.gitattributes` and the eight core planning documents. The 24 PNGs under `ui/` are untracked and were preserved. No app source, package/configuration, tests, CI, or release workflow exists in this checkout; no `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, README, or ADR was found.
- **User-defined target:** the ConstructClaim PWA V1 blueprint supplied in the task conversation.
- **Production not verified:** target runtimes, frameworks, databases, APIs, storage services and integrations below remain proposals. The bounded static demo and its evidence are described separately in README.md and PROGRESS.md.

## Product/system classification

The intended product is a hybrid business system:

1. Mobile-first installable web client (PWA) for office and construction-site workflows.
2. API/service boundary for identity, authorization, business rules, financial calculations, synchronization, audit, and integration.
3. Persistent relational business data and object/file storage for evidence and issued documents.
4. Optional AI assistance and future ERP adapters behind explicit interfaces.

The **production system** remains at the pre-implementation blueprint stage. A separate zero-dependency static demo slice (`index.html`, `app.js`, `storage.js`, `sw.js`) demonstrates navigation and browser-local drafts; it has no production API, authorization, evidence store, or authoritative financial behavior. See [README.md](README.md) for its boundaries. No production package or deployable service boundary exists yet.

## Implemented static demo boundary

The v2 shared shell, local claim/SOV/VO workflows, certification previews and device-local evidence capture/gallery are implemented; the wider production screen families remain targets. [README.md](README.md) owns the walkthrough and commands; [PROGRESS.md](PROGRESS.md) owns verification evidence and limitations.

| Source | Demo responsibility |
|---|---|
| app.js | Hash navigation, synthetic read models, local persistence/read-back and editor lifecycle. |
| draft-editor.js | One active draft state, Details/Lines/Evidence/Review UI, dirty/busy guards and explicit save feedback. |
| demo-contracts.js | Single synthetic project/SOV/VO source; approved-only revised values and immutable returned basis snapshots. |
| project-pages.js | Project SOV/VO browsing, responsive records, filtering, source facts and project tabs. |
| demo-domain.js | Integer-cent illustrative totals, readiness validation, synthetic evidence fixtures and old-record adaptation. |
| ui.js | Escaping, formatting and consistent outline icons. |
| storage.js | Existing claim database/store/key API, with no database version upgrade. |
| record-store.js | Shared IndexedDB transaction completion/error handling; no shared record collection. |
| variation-storage.js | Separate device-only variation proposal database and read/write/delete API. |
| variation-domain.js / variation-editor.js | Proposal validation, source snapshots, local review and one active editor with dirty/busy guards. |
| demo-claims.js | Independent synthetic claim navigation fixtures. |
| certificate-domain.js / certificate-editor.js / certificate-pages.js | Separate assessments, signed variance/reason readiness, snapshot review and responsive read-only previews. |
| certificate-storage.js | Separate certificate database and atomically checked immutable reviewed writes. |
| evidence-domain.js / evidence-editor.js / evidence-pages.js | Raster selection/validation, generated fictional illustration, context snapshots, capture state and project/global gallery/detail. |
| evidence-storage.js | Separate local image records with bytes/metadata saved together and checked immutable retry. |
| settings-page.js | Responsive application status, version and independent device-data management rows. |
| pwa-updates.js | Automatic checks, page readiness/interaction locks, visible update/failure states and safe single reload. |
| sw.js / manifest.webmanifest | Release identity, allowlisted versioned static shell, cross-page activation coordination and install metadata. |

Schema-version-2 records add line arrays, sample text file content/metadata, saved step and local review time without changing the store or identifier. Old one-amount records adapt in memory and save back to their existing key. One transaction stores the draft and sample evidence together; the UI confirms read-back before showing Saved on this device. The editor owns unsaved state; network events only update connectivity presentation. A failed write retains the editor and retries the same identifier. Source-context changes explicitly discard only the current draft's synthetic lines/evidence after confirmation.

New claim lines snapshot the selected project's original SOV and sample approved VO basis from demo-contracts.js (demo-sov-v2). Pending/rejected fixtures and local proposals are never claim sources. Existing v1 line arrays, amounts, notes and source versions survive resume/resave; an empty old draft takes the current source only when its first lines are created.

Variation proposals use constructclaim-demo-variations-v1 / drafts at database version 1 with schema-version-1 records. Claims keep constructclaim-demo-v1 / drafts at version 1. This separation avoids mixing proposal records into claim consumers or requiring an upgrade of existing cached clients. The app reads both independently, labels unavailable storage explicitly, and confirms each write with its owning read-back. Proposal scope, proposed amount, linked-line snapshot, source version and local review timestamp are saved; no approval/submission flag is accepted. Editing clears local review. Separate delete/clear operations cannot clear the other record family. Rollback leaves both databases intact; older app versions will simply not expose variation records.

Certificates use constructclaim-demo-certificates-v1 / certificates at database version 1, schema version 1. Each independently owned record snapshots a locally reviewed valid claim, its evidence, and assessments. Variance is illustrative certified minus claimed in integer cents. Incomplete rows remain unknown; review requires amounts and reasons for differences. Review makes the preview read-only; a check and put in one transaction prevents replacement, while an identical retry is accepted after an unconfirmed read-back. Later source changes/deletion preserve the preview and show a warning. Clear/delete operations affect only their own record family. No issue/submission flag is generated; retention, tax, deductions, net payable and issued PDF rules remain unselected.

Images use constructclaim-demo-evidence-v1 / evidence at database version 1, schema version 1. Each record atomically stores an embedded PNG/JPEG/WebP data URL, decoded dimensions and byte count, selected project/claim/line context, source save/version reference, evidence type, manual note/location and user-supplied captured time. Limits are 3 MB and 24 megapixels; type/signature, decode and metadata validation run before saving. Only embedded raster previews are allowed; no remote image/SVG preview or Blob URL/CSP expansion is added. Saved files are read-only; identical unconfirmed retries retain the identifier. Invalid selections keep the previous valid preview. No upload/queue state is generated.

The claim editor displays independently saved images without changing their saved status or copying them into claim writes. Capture links become available after confirmed claim saves and are hidden during unsaved/busy edits. New assessments copy readable images linked to the same claim and project into the certificate snapshot. Old-project images are not pulled into a claim moved to another project. File deletion keeps certificate copies; source deletion keeps image/context snapshots. Each store is read independently, and unavailable source reads are distinct from known changes/deletion. Clear/delete operations never clear another record family. Rollback preserves all four version-1 databases; older clients simply omit new record families.

Incomplete saves and optional fictional evidence are scoped demo choices. Local review is not submission or certificate issue. There is no production permission, authoritative money, upload, command queue, server acceptance or conflict implementation. Rollback of source must retain browser data; historical records remain readable by the adapter. The Service Worker caches only declared static assets and normalizes hash fragments for shell matching. From demo v0.3.0, the worker owns the release identity; GET_VERSION reports that identity and actual shell completeness to the UI. The user's 2026-10-13 request changes this project's manual update policy to automatic application at a safe point. APPLY_UPDATE checks all window clients within its registration scope using transferred MessageChannel ports. Ready clients block interaction until controller change or cancellation; unsaved/busy, unresponsive or newly opened clients defer activation. The page rechecks its own editor/device-operation state before reloading. Updates do not rewrite any IndexedDB schema or record. Older v29 clients retain their guarded explicit action for migration. README.md owns operational details and rollback.

Settings is a scoped runtime refinement of v2's Device data anchor. A 1040px reading column places Application/version/update status first, three compact environment facts next, independent record-count/delete rows below, and demo limitations last. Mobile stacks facts and actions; unreadable stores show an unavailable count and disabled deletion rather than a fabricated zero. Existing confirmation text and the four database owners remain unchanged. The original/v2 image anchors remain unchanged; they do not illustrate these new update states.

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

## Active visual baseline v2

**Status:** target UI design, created and expanded on 2026-10-13 at the user's request. Four core boards in `ui/ssot-v2/`, 21 independent page sheets in `ui/ssot-v2/pages/`, and the rules in this section form the current visual design baseline for subsequent implementation. They are not screenshots of implemented functionality or approval of a technology, identity provider, financial policy, or offline-data policy.

### Source of truth and precedence

- `SPEC.md` owns business meaning, permissions, financial invariants, and acceptance scenarios. This document owns visual structure and interaction presentation.
- The four core boards own the shared visual language. The independent page sheets own the corresponding page composition and take precedence over a small inset of that page in a core board. This section owns exact labels, responsive rules, and behaviors that a raster image cannot specify reliably. Use these written rules if generated pixels or small labels are ambiguous.
- The original 24 `ui/*.png` images remain secondary references for field inventory and unillustrated subflows. The v2 coverage index below now maps all 24 original page families plus Reports. Apply the v2 shell, hierarchy, tokens, and state rules; do not reproduce inconsistent original examples.
- Examples are independent synthetic scenarios, not a cross-board dataset or approved seed data. SGD and the illustrated retention amounts are presentation examples, not selected production financial defaults. External-party roles and available actions still require server authorization.

### Board index

| Board | Authoritative visual coverage | Supporting original page families |
|---|---|---|
| [01 — Workspace and navigation](ui/ssot-v2/01-workspace-navigation.png) | Desktop app shell; task-first overview; resume draft; separate financial stages; mobile browsing shell. | Dashboard, projects, project overview, inbox, global search. |
| [02 — Claims and draft editing](ui/ssot-v2/02-claims-draft-editing.png) | Desktop claim-line editor and summary; mobile focused editor; claim-list component; persistent project/direction context and save feedback. | Claims, claim detail, new claim, line editor, submission review; table/form patterns for SOV and variations. |
| [03 — Certification and field evidence](ui/ssot-v2/03-certification-field-evidence.png) | Claim/certificate separation; line assessment and variance reasons; certificate summary; mobile evidence capture before local save. | Certification, certificate detail, evidence gallery and capture. |
| [04 — Offline recovery and UI states](ui/ssot-v2/04-offline-recovery-ui-states.png) | Sync queue, field-level conflict comparison, explicit resolution, local/server status vocabulary, empty/no-results/error components. | Offline queue, sync conflict, device-data settings. |

The four core boards are retained unchanged. The page expansion below supplies dedicated desktop/mobile sheets for the other 20 original page families, plus Reports. Together the 25 PNGs provide visual coverage for 25 page families; this is not an exhaustive specification of every tab, dialog, exception state, or production permission. Settings illustrates Device data; other settings categories are navigation anchors pending their policy decisions. Original images remain unchanged.

Generation uses the built-in `image_gen.imagegen` tool. Core-board prompts are preserved in [generation-prompts.json](ui/ssot-v2/generation-prompts.json); page prompts and targeted corrections are in [pages/generation-prompts.json](ui/ssot-v2/pages/generation-prompts.json). Only selected final images are project assets. Presentation-canvas dimensions and any rendered viewport captions are not CSS measurements or browser verification.

### Independent page index

Open the [local design gallery](ui/ssot-v2/pages/index.html) for thumbnails and full-size image links. The following page numbers match the original reference inventory, with Reports added as page 25. Existing coverage is retained for page 02 (Overview) in board 01, page 08 (Claim-line editor) in board 02, page 10 (Certification review) in board 03, and page 22 (Sync center) in board 04.

| Page | Independent desktop/mobile sheet | Main handoff constraint |
|---|---|---|
| 01 | [Sign in](ui/ssot-v2/pages/01-login.png) | Organization context before sign-in; Single-column mobile entry; Identity provider remains a product decision. |
| 03 | [Projects](ui/ssot-v2/pages/03-projects.png) | Assigned-project scope; Cards preserve the next action; Filters remain visible on mobile. |
| 04 | [Project workspace](ui/ssot-v2/pages/04-project-overview.png) | Project context stays in every task; Financial stages remain separate; Approved variations alone revise contract. |
| 05 | [Claims](ui/ssot-v2/pages/05-claims.png) | Direction filters govern every row; Current-period basis is explicit; Missing certificate is not zero. |
| 06 | [Claim detail](ui/ssot-v2/pages/06-claim-detail.png) | Claim and certificate states are independent; Source version remains visible; Submitted claims are not edited in place. |
| 07 | [New claim · Details](ui/ssot-v2/pages/07-new-claim.png) | Inherit project and direction; Preserve fields across connectivity changes; Saving locally does not submit. |
| 09 | [Review claim](ui/ssot-v2/pages/09-submit-claim-review.png) | Review before the final submission; Readiness is based on approved rules; Server confirmation owns Submitted. |
| 11 | [Certificate detail](ui/ssot-v2/pages/11-certificate-detail.png) | Issued snapshots are read-only; Link to the exact source claim version; Retention terms come from the contract. |
| 12 | [Schedule of values](ui/ssot-v2/pages/12-schedule-of-values.png) | Versioned contract basis; Approved variations are explicit; Mobile uses line cards. |
| 13 | [SOV line detail](ui/ssot-v2/pages/13-sov-detail.png) | Keep the calculation basis visible; History uses source snapshots; Separate claimed and certified histories. |
| 14 | [Variation orders](ui/ssot-v2/pages/14-variation-orders.png) | Only approved value enters contract totals; Statuses remain visible in cards; Review is distinct from approval. |
| 15 | [Variation detail](ui/ssot-v2/pages/15-variation-order-detail.png) | Unapproved work is excluded from claims; Decision review precedes approval; Reason and source version are preserved. |
| 16 | [Evidence gallery](ui/ssot-v2/pages/16-evidence-gallery.png) | File bytes and metadata share a state; Context identifies the correct attachment; Failed uploads have recoverable actions. |
| 17 | [Capture evidence](ui/ssot-v2/pages/17-evidence-capture.png) | Preview is not a saved attachment; Location is optional; Offline file save requires successful persistence. |
| 18 | [Approval inbox](ui/ssot-v2/pages/18-approval-inbox.png) | Queue is the workflow source; Record review precedes decisions; Show only permitted actions. |
| 19 | [Parties](ui/ssot-v2/pages/19-parties.png) | Directory entries are not permission grants; External access is separately managed; Organization context survives mobile reflow. |
| 20 | [Activity timeline](ui/ssot-v2/pages/20-activity-timeline.png) | Audit event details remain read-only; Before and after values have provenance; Project and document scope stay visible. |
| 21 | [Global search](ui/ssot-v2/pages/21-global-search.png) | Results remain permission scoped; Context separates similar records; No-results differs from access denial. |
| 23 | [Resolve conflict](ui/ssot-v2/pages/23-sync-conflict.png) | Preserve base, local and server versions; Review choice before applying; Revalidate the server version on confirmation. |
| 24 | [Settings · Device data](ui/ssot-v2/pages/24-settings.png) | Policy defines what may stay on a device; Review pending work before removal; Connection does not prove synchronization. |
| 25 | [Reports · Financial position](ui/ssot-v2/pages/25-reports.png) | Stages are separate, overlapping measures; Currency and as-of basis are explicit; Totals reconcile to visible source rows. |

### Page handoff clarifications

- Use a single implementation of the shared logo, outline icons, navigation and controls. Small generated glyph or wordmark variations are not alternative components. Canonical labels include `Harbor Exchange`, `Cedar Station`, `A02 · Concrete works`, and `Parties`; preserve normal word spacing. Project codes in the illustrations are HX-001 and CS-002.
- Browsing mobile navigation always includes all five destinations. New-claim entry, line editing, submission review, capture and conflict resolution use focused task actions with an explicit back path. Project-level tabs are Overview, SOV, Claims, Variations, Evidence, Team, Activity; narrow screens expose additional tabs through More.
- List counts describe the full filtered result, even when only the first cards fit the mobile viewport. In the Projects sheet, All statuses includes both Active and Planning. Receivable claim lists contain PCAR records only. A missing certificate is Not yet certified.
- Read-only certificate detail links its source claim version and retains the variance reason. Illustrated variance is certified minus claimed; this sample convention does not resolve D-004. The 95,000 certified / 4,750 retention / 90,250 net example is internally consistent, not a universal retention policy.
- Review submission separately from server acceptance. The pictured acknowledgement represents a user-selected state and must start unchecked in implementation. File types, evidence requirements, SSO, remembered-device behavior, approval steps, and available actions remain subject to SPEC.md and the relevant product/security decisions.
- Capture retains project, claim and line context on both screen sizes. Ready to save means not persisted; Upload failed exposes Retry. Settings storage is measured in MB, never currency; policy text does not select an offline allowlist or retention duration. Removing local data requires reviewing unsynced work and confirming the consequences.
- Reports declares direction, currency, cumulative/as-of basis and freshness. Its four stage totals reconcile independently to visible project rows: 200,000 claimed, 180,000 certified, 160,000 invoiced, 120,000 paid. Mobile project cards use two columns by two rows. These stages must not be added together.
- Page examples remain independent synthetic scenarios. Reused document labels across sheets do not establish a shared seed dataset, historical sequence or permission grant. Prompts record generation intent; these written handoff rules resolve minor raster-copy ambiguity. Raster inspection does not establish measured contrast, keyboard behavior, real touch-target dimensions or successful persistence.

### Visual tokens and layout dimensions

These are explicit implementation targets, not color measurements extracted from generated pixels. They require verification in the rendered implementation.

| Token | Target |
|---|---|
| Canvas / surface / border | `#F4F7FB` / `#FFFFFF` / `#D9E2EE` |
| Primary text / secondary text | `#14243B` / `#52637A` |
| Primary action / on-primary | `#155EEF` / `#FFFFFF` |
| Brand accent | `#F79009`; decoration only, not small text on white. |
| Attention / success / error / conflict text | `#B54708` / `#067647` / `#B42318` / `#6941C6`; pair with a text label and a pale surface. |
| Typography | Inter when available, system sans-serif fallback; tabular numerals for amounts. Mobile body 16px; desktop body/table 14-16px; supporting labels at least 12px; headings 24-32px. |
| Spacing / shape | 8px base rhythm with 4px micro-spacing; 16px mobile and 24-32px desktop content gutters; 8px controls and 12px panel corners; restrained borders, minimal shadow. |
| Controls | At least 44px touch height; visible labels and focus; one dominant primary action per task region. |
| Desktop, at least 1200px | 240px navigation rail, 64px utility bar, fluid workspace; optional 280-320px summary only when the main task retains sufficient width. |
| Tablet, 768-1199px | Collapse navigation to a 72px rail with an expandable labelled menu; stack the inspector when needed. Preserve accessible names and discoverable labels. |
| Mobile, 320-767px | Single-column content, compact top context, deliberate card/form recomposition; primary navigation Home, Projects, Claims, Inbox, More. |
| Table adaptation | Use available content width, not viewport width alone. Below 720px of usable workspace, show claim/task cards or a focused line editor. Essential status and amount must not require horizontal scrolling. |

Use one outline-icon family. Icons complement text; raw Unicode glyphs and color alone must not carry navigation or state meaning. Keep amounts right-aligned and show currency, period, and current/cumulative basis explicitly. Use descriptive short document labels; keep full technical IDs in a copyable secondary detail.

### Shared navigation and task hierarchy

- Desktop navigation is Overview, Projects, Claims, Inbox, Parties, Reports, with Settings at the bottom. Mobile Home maps to Overview; More groups Parties, Reports, Settings, and device-data access. Search remains a utility rather than a new navigation section.
- Project context retains Overview, SOV, Claims, Variations, Evidence, Team, and Activity. Certification is reachable within Claims; evidence is reachable from its project or claim; Sync center is under Settings / Device data and the connectivity indicator. The static demo currently implements Overview, SOV, Claims, Variations and Evidence within project context. Team and Activity remain target destinations.
- Browsing pages retain the mobile bottom navigation. Focused claim-line editing, capture, and conflict resolution replace it with a task action bar and an explicit back link. Preserve the originating project, direction, filters, and list position when returning; protect dirty work before leaving.
- Overview prioritizes actionable work and resumable drafts, then financial position and recent projects. Avoid placing large decorative summary cards ahead of the user's next action.
- Financial position presents Claimed, Certified, Invoiced, and Paid independently. Never add these overlapping stages together or put them in a total-share donut without a separately defined mutually exclusive basis. Receivable/Payable filters must match every visible record.
- Use short persistent identity/status cues. In the static demo, retain a compact visible Demo / synthetic-data label; expose fuller limitations on demand. Put relevant storage or operation failures next to the affected action rather than repeating long banners above every form.

### Exact interaction contract

1. **Draft context and recovery:** starting from a project preselects that project; entering from a filtered direction carries it forward. Network events update connectivity presentation without rebuilding or clearing the editor. Preserve fields, selection, and focus across offline/online changes and failed saves. Refresh recovery is bounded by the approved local-data policy and successful persistence.
2. **Claim editing:** Details -> Claim lines -> Evidence -> Review. Save draft remains available; the primary action names the next step. Previous and cumulative values are read-only projections from their proper sources. A saved draft has a Resume/Edit action. No certification is displayed as zero merely because a certificate does not exist; use Not yet certified.
3. **Certification:** reference the exact source claim version and keep certificate state independent. The assessment columns are Item, Claimed, Certified, Variance, Reason. Every non-zero variance requires a reason. Certified, retention held/released, deductions, adjustments, and net certified remain separate where applicable. The illustrated Review & issue action opens a review step; it does not bypass evidence requirements, permissions, or final explicit confirmation. Issued documents are read-only, with authorized revision/void flows.
4. **Capture:** inherited project/claim/line context must remain visible and internally consistent. A preview marked Ready to save is not yet persisted. Only a successful file-and-metadata save may produce Saved on device or Upload pending; Uploaded requires confirmed file bytes on the server. Location is optional. Required-evidence rules remain D-008.
5. **Conflict resolution:** show base version and current server version; compare local/server values together per changed field on mobile. Keep server values, Review my changes, and Edit and merge are choices, not immediate writes. Review stays disabled until a choice; show the resulting changes, require confirmation, and revalidate server version/authority before applying. An authorization failure preserves recoverable work according to policy and cannot become a successful sync.
6. **Truthful status:** distinguish Saving, Saved on device, Pending, Synced, Conflict, and Failed. Connectivity and sync status are separate; Online does not mean Up to date. Global and local connectivity labels must agree within one screen. Server-confirmed timestamps describe actual successful confirmation only.
7. **Failure and empty states:** distinguish no records, no matching filters, loading, permission denial, write failure, and upload failure. Provide the relevant permitted action, retain input, and announce outcomes. Keep the existing accessible/truthful state contract below as the detailed state checklist.
8. **Keyboard and viewport:** skip-to-content focuses the existing main landmark without changing the application route. Route changes announce the new title and place focus logically. Sticky actions account for safe areas, the software keyboard, zoom, validation messages, and the last field. Do not hide focused controls under navigation.

### Implementation acceptance for the visual baseline

- Check representative pages at 1440x900, 1024x768, 768x1024, 390x844, and 320x740, plus 200% zoom and a real mobile keyboard. These are layout test sizes, not an approved production browser-support matrix.
- Verify tasks and information hierarchy against the boards, rather than matching scaled PNG text sizes. Check ordinary text contrast, focus visibility, accessible names, reading order, and screen-reader announcements in the rendered application.
- Reproduce and then resolve the existing demo issues before calling the new UI complete: online/offline events clear unsaved input; project-originated creation resets to the first project; the skip link enters the missing route. Also verify edit/resume, long labels, tablet status visibility, local save failure, and unobscured action bars.
- Static assets and visual inspection do not satisfy product E2E-01-E2E-18. Production API/security/financial/offline decisions and runtime verification remain governed by SPEC.md and TASK.md.

## Supporting UI references — original `ui/` images

### Evidence and status

The original 24 user-designated images in `ui/` provide secondary screen-family references under the active v2 baseline above. They show paired desktop and phone compositions for the main journeys. Their dates, people, amounts, project names, status counts, and settings values are illustrative, not approved seed data or live facts. The assets were untracked during the original layout review and were later committed in `89370cd`; they remain unchanged. The historical composition guidance below is subordinate to v2 where layouts differ and is not evidence that any route or interaction exists.

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

The screen set illustrates populated/normal states and selected offline/conflict cases. It does **not** prove working navigation, permissions, keyboard behavior, accessible names/focus order, contrast ratios, zoom/reflow, loading/empty/no-results/validation/permission-denied states, attachment failure recovery, or safe-area behavior. The following cross-screen state contract is a target requirement, not implementation evidence. The Review & Submit image shows a warning for lines without photo evidence but does not define whether any missing evidence blocks submission; that rule remains a business decision, not a visual inference.

#### Accessible and truthful state contract (unimplemented)

| State | Required presentation and behavior | Accessibility and trust acceptance |
|---|---|---|
| Loading / refresh | Preserve page context; distinguish first load from refresh. If stale data remains visible during refresh, identify it as stale and show its last-update time. | Expose the updating region/status to assistive technology without repetitive announcements or unexpected focus movement. |
| Empty / no results | Distinguish no records, no search/filter matches, load failure, and access denial. Give only a permitted next action, such as clearing filters or creating a record when authorized. | Keep the state heading and explanation in reading order; never invent or present screenshot/sample values as tenant data. |
| Validation | Identify each invalid field and the correction needed; retain other entered values. Server validation remains authoritative for business rules. | Programmatically associate field errors with controls; provide a summary and predictable focus after submit; do not rely on color alone. |
| Permission denied | Deny the requested action and protected payload. Do not rely on a hidden/disabled control as authorization. Avoid confirming record existence when policy requires non-enumerating denial. | Keep explanations actionable but non-sensitive. Cached data after expiry/revocation follows the unresolved T-003 policy; cached grants never authorize an action. |
| Error | Distinguish validation, permission, network, service, upload, and conflict failures where safe; explain whether work was saved and what can be retried. | Offer retry only when safe/idempotent; do not claim submission, certification, invoice, payment, or upload success without its authoritative outcome. Preserve input only within the approved local-data policy. |
| Offline / pending / success | Show connectivity and last-sync context. Distinguish a successful local write, a queued-but-pending command, server acceptance, and final business outcomes. | Label local-only state as device-local and best-effort; mark queued only after the local transaction succeeds. A queued command remains pending until server authorization and commit. Final server-only actions cannot complete offline; if policy permits queueing an intent, keep it visibly pending and never present it as final. |
| Recovery / conflict / partial upload | Provide accessible retry/resume or removal for failed attachments. Preserve base, local, and server versions for conflicts; require an explicit resolution and never silently overwrite. | Announce outcome and keep focus usable after recovery. Do not mark an attachment complete until its bytes are confirmed available; do not discard pending work on retry/update. |

Across states, status must not depend on color, keyboard focus must stay visible and unobscured, and content must remain usable with screen readers, zoom/reflow, mobile safe areas, and long messages. Verify these requirements in the implemented flow on the approved browser/device matrix; precise browser support and offline-local-data policy remain subject to T-001/T-003. Financial status must remain truthful in every component: claimed, certified, invoiced, paid, retention held/released, and net certified are separate measures. All screenshot values and January 2024 records must be treated as sample presentation data; demo data must be visibly identified and must never masquerade as a tenant's live records.

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

These original static references supplement the active v2 baseline; they are not a pixel-perfect implementation mandate or runtime/browser verification. The demo has a static manifest and Service Worker, while production PWA install/update/offline behavior, browser support, and recovery remain subject to implementation and verification as a coherent release contract.

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
