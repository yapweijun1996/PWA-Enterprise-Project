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
| T-001 | Resolve baseline platform, runtime, browser/device support, hosting, and deployment constraints. The blueprint's React/Vite, Fastify, PostgreSQL/Drizzle, S3-compatible storage, and Playwright PDF stack is proposed, not selected. | Product/technical decision | Record approved decision and rationale; identify supported test matrix, artifact, environments, migrations, health, backup and rollback. No packages added before this decision. |
| T-002 | Finalize financial/domain invariants and separate claim, certificate, invoice, and payment lifecycles. | User blueprint; may proceed alongside T-001 | Define currency/tax/decimal rounding, negative adjustments, cumulative formulas, snapshots/versioning, retention cap/release ledger, transitions/authority, correction/supersession; create independently checked test vectors, then execute them as contract tests once T-004 establishes the runtime. `SPEC.md` currently contains three synthetic additive fixtures only; they do not complete this task. |
| T-003 | Define tenant identity, project/action permission matrix, external-user access, local/offline data policy, evidence and AI privacy boundaries. | Security/product decision; may proceed alongside T-001/T-002 | Specify invitation/revocation, direct-object denial, device/logout/retention policy, offline allowlist, shared-device handling, file access, AI data policy; obtain security review before sensitive data is stored. |
| T-004 | Create the chosen PWA/API workspace, local development path, CI, configuration/secrets contract, and basic readiness/health surface. | T-001, T-002, T-003 | Reproducible clean checkout/build/test; no secrets committed; CI evidence; health/readiness behavior documented. |
| T-005 | Implement tenant-scoped schema/migrations and foundational authorization/audit. | T-002, T-003, T-004 | Migration/recovery tests; server-enforced tenant/project/action boundary; E2E-09 and E2E-10 pass; foundational audit append/attribution tests pass. Full workflow E2E-17 remains gated on domain workflows. |

### P1 — Contract and business workflows

| ID | Task | Dependencies | Definition of Done / evidence |
|---|---|---|---|
| T-006 | Implement parties, projects, main contracts/subcontracts, versioned SOV, and VO lifecycle. | T-005 | E2E-01 and E2E-13 pass; only approved VO changes revised sums; source snapshots are readable and immutable. |
| T-007 | Implement canonical PCAR/PCAP claim lifecycle, line calculations, review/submission/revise/void, and version preconditions. | T-002, T-005, T-006 | Claimed values remain separate; unauthorized transitions fail; retries are idempotent; E2E-02 and E2E-06 pass. |
| T-008 | Implement mobile evidence capture, access-controlled storage, metadata/hash, and attachment retry/recovery. | T-003, T-005, T-007 | Authorized file read/write only; upload failure is visible/recoverable; file bytes and metadata reconcile. |
| T-009 | Implement bounded offline project data, IndexedDB draft/command queue, foreground sync, conflicts, and PWA install/update. | T-001, T-003, T-007, T-008 | No private business data in static cache; version conflicts are explicit; logout/revocation/update behavior follows policy; E2E-07, E2E-08, and E2E-16 pass. |
| T-010 | Implement independent CCAR/CCAP certificate documents, variance reasons, contract-configured retention ledger, and immutable issued output. | T-002, T-006, T-007 | E2E-03, E2E-04, E2E-11 pass; historical certificate/PDF is unchanged by later edits. |
| T-011 | Implement invoice/payment records or approved external links from certified values; prevent duplicate creation. | T-002, T-010, D-005 decision | Idempotency/concurrency/error handling; no claimed-value invoicing; E2E-05, E2E-18 pass. |

### P1/P2 — User experience, AI, and release

| ID | Task | Dependencies | Definition of Done / evidence |
|---|---|---|---|
| T-012 | Deliver responsive project, claims, inbox, evidence, certification, and reconciliation UX following the screen-family anchors in DESIGN.md. | T-006–T-010 | Real-browser keyboard/screen-reader-oriented checks; loading/empty/error/success/permission/conflict/offline states; desktop and 390×844 deliberate reflow, safe-area and non-obscured actions; E2E-12 pass. Mockup-only content is never treated as live data. |
| T-013 | Implement evidence-grounded AI assistance behind an approved provider/data boundary. | T-003, T-007, T-010, D-007 decision | Human confirmation required; permissions applied to retrieval; source links shown; manual workflow works during AI failure; E2E-14/E2E-15 pass. |
| T-014 | Implement search, inbox, receivable/payable project position, retention and cash-exposure reporting. | T-006–T-011 | Figures reconcile to source records; report clearly distinguishes certified/invoiced/paid and states margin basis. |
| T-015 | Build full automated acceptance, integration, browser, PWA, security/privacy, accessibility, and recovery verification. | T-004–T-014 | E2E-01–E2E-18 pass on agreed matrix; independent review findings resolved or explicitly accepted; artifact/package inspection completed. |
| T-016 | Establish authorized deployment/release process, migrations, backup/restore, health, rollback, and post-deploy smoke verification. | T-001, T-004, T-005, T-015 | Release version/artifact, migration/backup evidence, readiness and rollback verified in an approved target. Deployment is not authorized by this backlog. |

## Documentation-maintenance task

### T-017 — Integrate the user-provided UI reference set into project SSOT

- **Priority:** P1 — **Status:** Verified.
- **Scope:** Inspect all 24 `ui/*.png` screens and synchronize the existing core Markdown with an evidence-bounded UI layout anchor; preserve the PNGs unchanged and do not claim runtime verification.
- **Definition of Done:** `DESIGN.md` maps shared shell, screen families, desktop/mobile adaptation, visible states, and screenshot inventory; `SPEC.md`/`EPIC.md`/`ROADMAP.md`/`TASK.md`/`PROGRESS.md`/`GOAL.md`/`GOAL_PROMPT.md` align; links/IDs/counts/prompt limit pass; `ui/` assets remain untouched and un-staged.
- **Evidence:** 24/24 image inventory, Markdown targets, E2E/task IDs, D-008 alignment, prompt length, and whitespace checks passed; image-only quality review and runtime limits are recorded in [DESIGN.md](DESIGN.md) and [PROGRESS.md](PROGRESS.md).

## Open decision register

| ID | Decision | Why material | Recommendation / unblock |
|---|---|---|---|
| D-001 | Adopt, replace, or spike the proposed stack and choose deployment target. | Changes packages, runtimes, API and operations contract. | Prefer the proposed stack only if it fits the user's approved hosting/runtime constraints; otherwise run a bounded comparison before T-004. |
| D-002 | Identity, tenant topology, and external party access model. | Controls trust boundary and sensitive cross-company access. | Server-enforced tenant/project/action policy; define whether customers/subcontractors receive accounts or participate through controlled document exchange. |
| D-003 | Offline dataset, local retention, shared-device, logout and revoked-user behavior. | Offline data may remain on a device after access changes. | Default to minimum necessary fields/files, explicit expiry and sync; block sensitive offline data until policy/security review approves it. |
| D-004 | Currency/tax/rounding, retention ledger, and claim/certificate state transitions. | Affects legal/financial integrity and schema compatibility. | Define decimal-safe calculation rules and independent claim/certificate/invoice/payment records before migrations. |
| D-005 | Meaning of invoice link in V1. | Internal invoice, external ERP deep link, and ERP posting are different products/contracts. | Keep V1 to an auditable certified-value invoice record/link; do not add ERP posting without an explicit adapter contract. |
| D-006 | Supported browser/device and install/update matrix. | Determines PWA storage, sync and test guarantees. | Name target browsers and minimum versions before PWA acceptance is claimed. |
| D-007 | AI provider, evidence handling, retention, and audit. | Site photos/contracts may be confidential; provider processing changes privacy risk. | No sensitive provider integration until data boundary and human-review controls are approved. |
| D-008 | When missing photos/documents are blocking versus advisory for submit/certify. | The review mockup shows a warning, but does not establish a business/evidence rule. | Define an explicit rule by evidence type/workflow before implementation; do not infer a universal mandatory-photo policy from the image. |

## Current next task

**T-001 is the first implementation gate** because the blueprint labels its stack as recommended rather than approved. T-002 and T-003 can be refined in parallel without changing source. Do not start T-004 until material platform, domain, and security decisions have an explicit record.

## V1 acceptance mapping

Acceptance IDs E2E-01–E2E-18 are defined in [SPEC.md](SPEC.md). Their current state is 0 implemented, 0 verified, and 0 released. Keep each scenario's evidence linked from its implementation task and [PROGRESS.md](PROGRESS.md); never infer completion from a feature name or document section.
