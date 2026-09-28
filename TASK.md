# ConstructClaim PWA — Task Backlog

## Status rules

`Planned → Implemented → Verified → Released` are independent states. A task is not Verified merely because code exists; it needs the evidence in its Definition of Done. No application task is currently Implemented, Verified, or Released. Dependencies and open product/platform decisions are recorded explicitly.

Priorities: **P0** blocks safe foundations or the V1 financial/tenant contract; **P1** required V1 capability after its dependencies; **P2** release hardening or bounded enhancement. All work remains local unless deployment is separately authorized.

## T-000 — Establish and verify the documentation baseline

- **Priority:** P0 — **Status:** Verified.

- **Scope:** Maintain the eight core docs and reconcile statements with repository evidence and the user-supplied blueprint.
- **Definition of Done:** All eight files exist; status distinctions are consistent; internal links resolve; `GOAL_PROMPT.md` is at most 2,000 characters; docs-only validation passes; one focused local documentation commit is created and verified.
- **Evidence:** Repository baseline, documentation checks, and local commit verification are recorded in [PROGRESS.md](PROGRESS.md). The documentation change is a single focused commit atop the original baseline.

## Product tasks (all Planned)

### P0 — Decisions and safe foundations

| ID | Task | Dependencies | Definition of Done / evidence |
|---|---|---|---|
| T-001 | Resolve baseline platform, runtime, browser/device support, hosting, and deployment constraints. The blueprint's React/Vite, Fastify, PostgreSQL/Drizzle, S3-compatible storage, and Playwright PDF stack is proposed, not selected. | Product/technical decision | Complete the T-001 decision-to-verification worksheet below; record owner approval and rationale for each in-scope row before T-004. No packages or scaffold before the platform/runtime decision. |
| T-002 | Finalize financial/domain invariants and separate claim, certificate, invoice, and payment lifecycles. | User blueprint; may proceed alongside T-001 | Record rules for every in-scope V1 workflow in the T-002 worksheet in `SPEC.md`; exclusions remove affected capabilities rather than leave their money/state rules undefined. Map each rule to independently checked boundary vectors and execute them as contract tests once T-004 establishes the runtime. The three additive fixtures are incomplete and do not complete this task. |
| T-003 | Define tenant identity, project/action permission matrix, external-user access, local/offline data policy, evidence and AI privacy boundaries. | Security/product decision; may proceed alongside T-001/T-002 | Resolve every in-scope row in the T-003 decision-to-test worksheet in `SPEC.md`; record explicit role/action grants, offline/data policies, evidence boundary, and AI provider boundary; map each to security tests and obtain security review before sensitive persistence or provider integration. Exclusions remove affected capabilities rather than leave access/privacy undefined. Unspecified grants deny by default. |
| T-004 | Create the chosen PWA/API workspace, local development path, CI, configuration/secrets contract, and basic readiness/health surface. | T-001, T-002, T-003 | Reproducible clean checkout/build/test; no secrets committed; CI evidence; health/readiness behavior documented. |
| T-005 | Implement tenant-scoped schema/migrations and foundational authorization/audit. | T-002, T-003, T-004 | Migration/recovery tests; server-enforced tenant/project/action boundary; E2E-09 and E2E-10 pass; foundational audit append/attribution tests pass. Full workflow E2E-17 remains gated on domain workflows. |

### P1 — Contract and business workflows

| ID | Task | Dependencies | Definition of Done / evidence |
|---|---|---|---|
| T-006 | Implement parties, projects, main contracts/subcontracts, versioned SOV, and VO lifecycle. | T-005 | E2E-01 and E2E-13 pass; only approved VO changes revised sums; source snapshots are readable and immutable. |
| T-007 | Implement canonical PCAR/PCAP claim lifecycle, line calculations, review/submission/revise/void, and version preconditions. | T-002, T-005, T-006 | Claimed values remain separate; unauthorized transitions fail; retries are idempotent; E2E-02 and E2E-06 pass. |
| T-008 | Implement mobile evidence capture, access-controlled storage, metadata/hash, and attachment retry/recovery. | T-003, T-005, T-007 | Authorized file read/write only; upload failure is visible/recoverable; file bytes and metadata reconcile. |
| T-009 | Implement bounded offline project data, IndexedDB draft/command queue, foreground sync, conflicts, and PWA install/update. | T-001, T-003, T-007, T-008 | No private business data in static cache; version conflicts are explicit; revoked/expired users cannot commit queued commands; denied persistence is identified as best-effort, while quota/write failures are never reported as queued; local data handling follows policy; E2E-07, E2E-08, and E2E-16 pass. |
| T-010 | Implement independent CCAR/CCAP certificate documents, variance reasons, contract-configured retention ledger, and immutable issued output. | T-002, T-006, T-007 | E2E-03, E2E-04, E2E-11 pass; historical certificate/PDF is unchanged by later edits. |
| T-011 | Implement invoice/payment records or approved external links from certified values; prevent duplicate creation. | T-002, T-010, D-005 decision | Idempotency/concurrency/error handling; no claimed-value invoicing; E2E-05, E2E-18 pass. |

### P1/P2 — User experience, AI, and release

| ID | Task | Dependencies | Definition of Done / evidence |
|---|---|---|---|
| T-012 | Deliver responsive project, claims, inbox, evidence, certification, and reconciliation UX following the screen-family anchors in DESIGN.md. | T-006–T-010 | Real-browser keyboard/screen-reader checks against the accessible/truthful state contract in DESIGN.md: loading, empty/no-results, validation, disabled/permission-denied, error, offline/pending/success, conflict, upload retry, and recovery. Verify deliberate desktop/390×844 reflow, safe-area and unobscured actions; E2E-12 passes. Mockup-only content is never treated as live data. |
| T-013 | Implement evidence-grounded AI assistance behind an approved provider/data boundary. | T-003, T-007, T-010, D-007 decision | Server filters authorized evidence before provider submission; evidence and model output are untrusted data, not authority; adversarial instructions cannot widen retrieval or cause writes; suggestions cite sources and require human confirmation; manual workflow survives AI failure; E2E-14/E2E-15 pass. |
| T-014 | Implement search, inbox, receivable/payable project position, retention and cash-exposure reporting. | T-006–T-011 | Figures reconcile to source records; report clearly distinguishes certified/invoiced/paid and states margin basis. |
| T-015 | Build full automated acceptance, integration, browser, PWA, security/privacy, accessibility, and recovery verification. | T-004–T-014 | E2E-01–E2E-18 pass on agreed matrix, including real-browser coverage of the accessible/truthful UI state contract in DESIGN.md; independent review findings resolved or explicitly accepted; artifact/package inspection completed. |
| T-016 | Establish authorized deployment/release process, migrations, backup/restore, health, rollback, and post-deploy smoke verification. | T-001, T-004, T-005, T-015 | Release version/artifact, migration/backup evidence, readiness and rollback verified in an approved target. Deployment is not authorized by this backlog. |

## Documentation-maintenance task

### T-017 — Integrate the user-provided UI reference set into project SSOT

- **Priority:** P1 — **Status:** Verified.
- **Scope:** Inspect all 24 `ui/*.png` screens and synchronize the existing core Markdown with an evidence-bounded UI layout anchor; preserve the PNGs unchanged and do not claim runtime verification.
- **Definition of Done:** `DESIGN.md` maps shared shell, screen families, desktop/mobile adaptation, visible states, and screenshot inventory; `SPEC.md`/`EPIC.md`/`ROADMAP.md`/`TASK.md`/`PROGRESS.md`/`GOAL.md`/`GOAL_PROMPT.md` align; links/IDs/counts/prompt limit pass; `ui/` assets remain untouched and un-staged.
- **Evidence:** 24/24 image inventory, Markdown targets, E2E/task IDs, D-008 alignment, prompt length, and whitespace checks passed; image-only quality review and runtime limits are recorded in [DESIGN.md](DESIGN.md) and [PROGRESS.md](PROGRESS.md).

## Separate static demo workstream

### DEMO-001 — Device-local GitHub Pages-capable walkthrough

- **Scope:** Owner clarified that the immediate deliverable is a demo, followed by a separate production phase. Use only synthetic examples and browser-local drafts; show a desktop/mobile shell, claim navigation, IndexedDB save/read/delete, explicit empty/error/offline states and a static PWA shell. See [README.md](README.md).
- **Boundary:** No production security, tenant isolation, certified money, evidence upload, server sync, approval, invoice/payment, AI provider, or release claim. The T-001–T-003 decisions still gate T-004 and production work. Publishing to GitHub Pages is not authorized by this task.
- **Acceptance evidence:** Syntax/manifest checks, browser navigation and local-write read-back, validation/error and 390×844 layout checks, offline/update checks where tool support permits; record any missing coverage separately from the production E2E matrix.
- **Status:** Implemented in part; demo verification and the wider screenshot-family journeys remain open.

## Open decision register

| ID | Decision | Why material | Recommendation / unblock |
|---|---|---|---|
| D-001 | Adopt, replace, or spike the proposed stack and choose deployment target. | Changes packages, runtimes, API and operations contract. | **Proposed default (not approved):** blueprint stack with a currently supported Node.js LTS, Docker Compose for local development if a container engine is available, and portable Linux containers with managed PostgreSQL/private S3-compatible storage in deployment. Proposed browser baseline: current and preceding stable releases of Chrome/Edge desktop, Safari on iOS/iPadOS, and Chrome on Android. Owner must confirm or replace hosting/browser constraints before T-004; no packages or scaffold until then. |
| D-002 | Identity, tenant topology, and external party access model. | Controls trust boundary and sensitive cross-company access. | **Proposed safety baseline, not an approved role matrix:** server-enforced tenant/project/document/action/state checks; deny unspecified grants; no public evidence links. Explicitly decide account/invitation and action scope for customers, consultants, and subcontractors. |
| D-003 | Offline dataset, local retention, shared-device, logout and revoked-user behavior. | Offline data may remain on a device after access changes; a disconnected device cannot receive revocation or be remotely wiped immediately. | **Proposed safety baseline, not an approved data policy:** deny local downloads/persistence until allowlist, maximum offline-access age, logout/revocation, shared-device, and file policies receive security review. Browser storage is best-effort by default; a persistent-storage request is browser-controlled, may be denied, and does not prevent explicit user clearing. Queue only approved commands; queued transitions stay visibly pending until a successful local write and, authoritatively, until the server rechecks current scope/state/version and commits. Define local-data handling when access expires or revocation is detected. No client-only approval, certificate issue, invoice, or payment outcome. |
| D-004 | Currency/tax/rounding, retention ledger, and claim/certificate state transitions. | Affects legal/financial integrity and schema compatibility. | Define decimal-safe calculation rules and independent claim/certificate/invoice/payment records before migrations. |
| D-005 | Meaning of invoice link in V1. | Internal invoice, external ERP deep link, and ERP posting are different products/contracts. | Keep V1 to an auditable certified-value invoice record/link; do not add ERP posting without an explicit adapter contract. |
| D-006 | Supported browser/device and install/update matrix. | Determines PWA storage, sync and test guarantees. | Name target browsers and minimum versions before PWA acceptance is claimed. |
| D-007 | AI provider, evidence handling, retention, and audit. | Site photos/contracts may be confidential; provider processing changes privacy risk. | No sensitive provider integration until data boundary and human-review controls are approved. |
| D-008 | When missing photos/documents are blocking versus advisory for submit/certify. | The review mockup shows a warning, but does not establish a business/evidence rule. | Define an explicit rule by evidence type/workflow before implementation; do not infer a universal mandatory-photo policy from the image. |

### T-001 evidence reviewed (2026-09-28; advisory, not a decision)

Primary documentation supports these maintenance and compatibility constraints; it does **not** approve a stack or hosting target:

- [Node.js release policy](https://nodejs.org/en/about/previous-releases) says production should use Active or Maintenance LTS. On this review date, v24 is listed as LTS and v25 as EOL; select a supported LTS line and re-check its status when pinning the runtime.
- [Vite's guide](https://vite.dev/guide/) currently requires Node.js 20.19+ or 22.12+. The version floor alone is not a reason to choose an EOL runtime; pair Vite with a currently supported Node LTS and verify the selected React template against it.
- [React's app guidance](https://react.dev/learn/creating-a-react-app) recommends starting new apps with a framework; building from scratch is an option when constraints justify owning routing, data-fetching, and related choices. Record why a Vite client plus separate Fastify API fits better than a React framework alternative, if that boundary is retained.
- [Fastify's LTS policy](https://fastify.dev/docs/latest/Reference/LTS/) defines major-line and security support windows. Keep a supported Node/Fastify pair and schedule upgrades rather than treating a framework major as indefinitely supported.
- [PostgreSQL's versioning policy](https://www.postgresql.org/support/versioning/) gives each major version five years of support and recommends the current minor release for that major. Choose a still-supported major, keep its minor current, and plan/test major-version upgrade and recovery procedures.
- The [Drizzle PostgreSQL guide](https://orm.drizzle.team/docs/get-started-postgresql) documents both `node-postgres` and `postgres.js` drivers, while its current quick-start examples use `@rc` package tags. If Drizzle remains a candidate, explicitly select and lock a supported release channel/driver and verify migrations, transactions, and exact-money handling; do not copy the prerelease tags by default.
- [Playwright's `page.pdf()` API](https://playwright.dev/docs/api/class-page#page-pdf) renders using print CSS by default. If selected for issued documents, test the actual print stylesheet, fonts, and generated artifact; a successful browser/UI check alone does not establish immutable PDF correctness.

**Unresolved:** these sources do not identify the organization's hosting, browser/device minimums, storage provider, artifact, environment, backup/restore, or rollback requirements. T-001 remains Planned pending owner confirmation/replacement of D-001 and the required operational constraints. No packages, scaffold, or migrations are authorized by this research.

### T-001 owner decision-to-verification worksheet (unfilled; proposal not approved)

Use D-001/D-006 to record a selected option (or replacement) and rationale for every in-scope row before T-004. Host tool versions are not product approval. Verification is future evidence for the selected target; this worksheet does not authorize deployment or release.

| Area | Owner input required | Verification after decision |
|---|---|---|
| Stack, runtime, and versions | Confirm/replace the client, API, data access, database, file storage, document/PDF approach, supported production runtime line, and release channels/versions. | Pin compatible versions; prove clean-checkout install/build/test and database transactions/migrations in T-004/T-005; verify exact-money vectors against the selected database after T-002 rules are resolved. |
| Environments and artifacts | Name local/CI/test/production environments, hosting boundary/region, deployable artifact, private storage/network constraints, and approved secret-injection mechanism. | Reproducible isolated build/CI and artifact inspection; no secrets in source/artifacts. Verify target-specific rollout only under T-016 authorization. |
| Browser/device support | Set minimum supported browser/OS/device versions, desktop/mobile/tablet scope, required install/update/camera/storage APIs, and viewport acceptance. | Run responsive, accessibility, install/update, offline-storage, and recovery checks on the named matrix in T-015; document unsupported/limited capabilities. |
| Data, migration, and recovery operations | Select database/object-storage service and versions, regions, access boundary, migration approach, backup/restore objectives, readiness/health signals, retention, and rollback/forward-recovery policy. | Exercise tenant-safe migrations and private-file access in T-005; verify restore, readiness, and recovery against the approved objectives in T-016. |
| Issued document artifact | Specify required output format/generator, print/font/rendering constraints, storage/versioning, and any legal/signature constraints. | Generate and inspect the actual artifact; verify issued snapshot/hash stability after source changes (T-010/E2E-11). |

### T-003 offline-storage evidence reviewed (2026-09-28; technical constraints, not policy)

- The [WHATWG Storage Standard](https://storage.spec.whatwg.org/#persistence) defines local storage as best-effort by default; changing it to persistent requires the user or user agent on the user's behalf to grant permission. Persistent mode does not remove the user's ability to clear site data.
- [MDN's storage quota and eviction guide](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) documents browser-specific quotas and eviction behavior, storage-pressure deletion, and `QuotaExceededError`. Its [StorageManager.persist() reference](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) says the request may resolve false and is available only in secure contexts. `navigator.storage.estimate()` is only an estimate.
- **Engineering consequence:** offline retention must not promise that browser data survives eviction, a denied persistence request, private-browsing cleanup, or user clearing. Identify denied persistent-storage permission as best-effort (not as a failed IndexedDB write); surface actual write failures; do not label a command queued until its local transaction succeeds; bound and reconcile pending records/files with the server. Verify both states, quota, logout, update, and recovery on the approved browser matrix. These facts do not select the offline allowlist, retention period, or shared-device policy.

### Repository secret-pattern spot-check (limited; not a security review)

No Secretlint executable, project dependency/configuration, or ignore configuration is present. A no-write heuristic checked the nine tracked Markdown/`.gitattributes` files for common credential assignments, private-key headers, token prefixes, and JWT-shaped strings; it found no matches. Untracked `ui/` files and runtime-injected values were excluded. This is not a Secretlint scan and does not establish that the repository or runtime is secret-free; no package was downloaded or installed. T-003 security review remains outstanding.

### Owner response key for P0 gates

Reply with decisions keyed by IDs; partial answers are useful, but unanswered items remain blocked and no proposal is treated as approved:

- **D-001/D-006 (T-001):** complete the unfilled decision-to-verification worksheet in this file: approve or replace each in-scope stack/runtime, environment/artifact, browser/device, data/recovery, and issued-document choice, with rationale and required evidence.
- **D-004 (T-002):** resolve the no-default decision-to-test worksheet in `SPEC.md` for every in-scope V1 workflow; exclusions remove capability and cannot leave money/state rules undefined. **D-005/D-008:** choose the invoice-link boundary and mandatory-versus-advisory evidence rules.
- **D-002/D-003/D-007 (T-003):** resolve the unfilled security/privacy decision-to-test worksheet in `SPEC.md` and record the required security review before sensitive persistence or provider integration. Browser support remains under D-001; partial answers do not select remaining policies.

“Defer” is not an implicit product rule: name any item explicitly excluded from V1, or leave its dependent work gated. This checklist collects owner input; it makes no new product or security decision.

## Current next task

**Scope decision:** The owner selected option 1: retain the full V1 scope rather than exclude unresolved capabilities. This is not approval of any proposed stack, financial rule, role grant, offline policy, or AI provider; T-001–T-003 still require explicit answers in their worksheets.

**Blocked on owner input: no product implementation task is currently unblocked.** T-001 is the first implementation gate because the blueprint labels its stack as recommended rather than approved. D-001 contains a portability-first proposal, not a selected stack/hosting/browser contract; the owner must confirm or replace it. T-002 and T-003 can be resolved in parallel without changing source. Do not start T-004 until material platform, domain, and security/privacy decisions have an explicit record.

## V1 acceptance mapping

Acceptance IDs E2E-01–E2E-18 are defined in [SPEC.md](SPEC.md). Their current state is 0 implemented, 0 verified, and 0 released. Keep each scenario's evidence linked from its implementation task and [PROGRESS.md](PROGRESS.md); never infer completion from a feature name or document section.
