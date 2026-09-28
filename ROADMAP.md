# ConstructClaim PWA — Roadmap

## Planning basis

The repository contains the initial `.gitattributes` baseline and a locally committed set of eight planning documents; 24 user-provided UI PNGs are present but untracked. There is no application code, and no product milestone is Implemented, Verified, or Released. The ConstructClaim PWA V1 blueprint defines the intended product. This roadmap sequences work by dependency; it does not assert dates or percent-complete estimates.

## Milestone status

| Milestone | Exit evidence | Status |
|---|---|---|
| M0 — Decisions and contract baseline | Resolve stack/runtime and material business/security decisions; record domain/API decisions; approve browser and offline policy. | Planned |
| M1 — Secure foundation | Buildable repository, CI checks, identity/tenant/project boundaries, schema/migration and audit foundation. | Planned |
| M2 — Contract basis | Projects, parties, contracts/subcontracts, versioned SOV, VO approvals and revised-sum reconciliation. | Planned |
| M3 — Claims and field capture | PCAR/PCAP lifecycle, mobile line progress, evidence workflow, bounded offline queue and visible sync recovery. | Planned |
| M4 — Certification and retention | CCAR/CCAP as independent immutable documents; variance reasons, retention ledger, PDF/version handling. | Planned |
| M5 — Finance, reporting, and AI | Certified-value invoice linkage, project position, AI assistance with evidence/provenance and human confirmation. | Planned |
| M6 — Release readiness | 18/18 E2E scenarios, security/privacy, accessibility/mobile, PWA lifecycle, operations, rollback and deployed smoke evidence. | Planned |

## Dependency-aware sequence

### M0 — Decisions and contract baseline

- Confirm whether the proposed React/TypeScript/Vite + Node/Fastify + PostgreSQL/Drizzle + object storage baseline is adopted, replaced, or subject to a spike.
- Define tenant/identity/external-party scope, currency/tax/rounding and financial semantics, claim/certificate state separation, invoice linkage, and offline data policy.
- Select supported browsers/devices, hosting and operations constraints.
- Convert decisions into versioned domain/API/schema decisions before writing migrations.

**Exit:** material decisions are recorded with rationale and acceptance; no security-critical offline or tenancy behavior is left to client inference.

### M1 — Secure foundation

- Create application/API packages only after M0 selections.
- Establish CI/static checks, local development and test runtime.
- Implement identity/session/tenant/project authorization and deny-by-default tests before business records.
- Add schema migration/versioning, audit event boundary, health/readiness and secret-handling configuration.

**Exit:** E2E-09, E2E-10, and foundational audit tests prove server-side boundaries; backup/migration strategy documented.

### M2 — Contract basis

- Implement parties/projects, main contract and subcontract, versioned SOV, VO submission/approval, and revised contract sum.
- Keep external ERP codes out of canonical data.

**Exit:** E2E-01 and E2E-13 pass; historical source version read-back works.

### M3 — Claims and field capture

- Implement PCAR/PCAP, draft/review/submit/revise/void behavior, SOV/VO-linked lines, and claim snapshots.
- Build the mobile-first project/claim/evidence experience from the user-designated screen-family anchors in [DESIGN.md](DESIGN.md): desktop tables/inspectors, mobile cards/forms, project context, and clear primary actions.
- Implement attachment handling and only the approved offline dataset and command types; add conflict/retry UX and PWA install/update behavior. Treat the PNGs as design references, then verify real browser behavior rather than pixel-copying sample data.

**Exit:** E2E-02, E2E-06, E2E-07, E2E-08, E2E-12, and E2E-16 pass. Submitted claims are not silently deleted or overwritten.

### M4 — Certification and retention

- Implement independent CCAR/CCAP documents tied to exact claim versions.
- Implement line variance/reason, contract-specific retention and append-only hold/release records, immutable issue/PDF snapshots, and audit timeline.

**Exit:** E2E-03, E2E-04, E2E-11, and E2E-17 pass; calculations match independent expected-value fixtures.

### M5 — Finance, reporting, and AI

- Implement certified-value invoice records/links with idempotency; payment state remains separate.
- Reconcile receivable/payable dashboards to source records and label cash exposure versus margin basis.
- Add human-reviewed AI suggestions and permission-filtered evidence-linked summaries only after provider/privacy decision.

**Exit:** E2E-05, E2E-14, E2E-15, and E2E-18 pass; manual workflows do not depend on AI availability.

### M6 — Release readiness

- Complete the full E2E suite and supported browser/device matrix; compare implemented desktop/mobile screens to the anchors while verifying accessibility, empty/error/loading, permission, and trust states not shown in the images.
- Inspect built artifacts, PWA manifest/cache/update behavior, dependency/license/security surface, migrations, backup/restore, readiness/health and rollback.
- Verify an actual deployed release and version only after deployment is separately authorized.

**Exit:** all release acceptance and operations evidence is recorded; update [PROGRESS.md](PROGRESS.md) with exact implementation, verification, and release evidence.

## Change control

- Track executable work in [TASK.md](TASK.md); ROADMAP milestones remain dependency-level.
- Reorder only when new evidence changes dependencies or risk. Preserve the distinction between a proposed design, code present, passing verification, and a released/deployed product.
- No release date, hosting service, browser support claim, or technology is assumed by this roadmap.
