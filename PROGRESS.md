# ConstructClaim PWA — Progress

## Current state

**Lifecycle:** pre-implementation / product blueprint. The intended product is the ConstructClaim construction progress-claim and certification PWA described in [GOAL.md](GOAL.md) and [SPEC.md](SPEC.md).

**Repository baseline reviewed:** branch `main`; the initial source baseline is `dbca199` (`Initial commit`, 2026-09-28). The first documentation pass is locally committed as `5780ee7`; `origin/main` still points at `dbca199`. Before this UI-reference update, the working tree showed the 24 user-provided PNGs under `ui/` as untracked. This pass leaves them unchanged and un-staged. The tracked project has no application source, `README.md`, `CHANGELOG.md`, ADR, package/build manifest, dependencies, tests, CI, release/deploy scripts, app entrypoint, or running browser/API/database behavior. No root/nested `AGENTS.md`, `CLAUDE.md`, or `CONTRIBUTING.md` was found.

**Product/design evidence:** the user-supplied ConstructClaim PWA V1 blueprint defines product intent. The 24 static `ui/*.png` screens are user-designated visual/layout references, not evidence of implementation. Other projects' KB records were not imported as project facts. KB-MCP context and the registered `ui:visual-design-lifecycle` guidance were checked; no verified repository-specific implementation record was established. The KB reuse-context call did not return a schema-valid reuse pack. The image-only self-review is 80/100 with accessibility and trust hard gates not met; this is not a runtime UI audit or a rejection of the screenshots as layout anchors.

## Planned / Implemented / Verified / Released

| Scope | Planned | Implemented | Verified | Released |
|---|---|---|---|---|
| Product requirements E2E-01–E2E-18 | 18 | 0 | 0 | 0 |
| Application/API/data/PWA capabilities | Entire intended V1 | 0 evidenced | 0 evidenced | 0 evidenced |
| Core planning documents | 8 requested files | 8 present; relevant UI-reference sections updated | Markdown consistency checks passed | Not applicable |
| Documentation task T-017 | 1 UI-reference synchronization | 1 implemented | 1 verified by documentation checks | Not applicable |
| UI reference assets | 24 user-provided PNGs | 0 modified/staged | 24 image files visually inspected as static references | Not applicable |

Progress is measured against the explicit E2E scenario IDs in [SPEC.md](SPEC.md), not subjective completion estimates. At baseline, 0/18 are executable tests, implemented behaviors, or verified scenarios. `Released` means verified in an identified release/deployment target; no target or release exists.

## Documentation sync status

The eight core SSOT files are:

- `GOAL.md` — product purpose, scope and outcomes.
- `DESIGN.md` — repository evidence plus explicit proposed target boundaries and open decisions.
- `SPEC.md` — functional requirements, invariants, acceptance and verification matrix.
- `EPIC.md` — capability boundaries and exit criteria.
- `ROADMAP.md` — dependency-aware milestones.
- `TASK.md` — executable backlog, status, dependencies, Done evidence, and decision register.
- `PROGRESS.md` — this evidence-based state.
- `GOAL_PROMPT.md` — bounded future autonomous work contract.

They distinguish user-approved product intent, proposed architecture, user-selected visual references, unresolved decisions, and verified source/runtime facts. The UI reference update is documentation-only; product implementation/verification/release remains 0/18. The PNGs remain local/untracked and are not included in the Markdown-only updates.

## Verification performed / not performed

### Performed

- During the initial documentation pass, inspected repository files, Git status/history/refs, and candidate rule/document paths; at that point `main` and `origin/main` were both at `dbca199` and no unrelated work was present. The later UI-reference images are separately preserved as untracked user assets.
- Checked KB-MCP context and retrieved the registered visual-design lifecycle guidance; unrelated project records were excluded from repository claims.
- Inspected all 24 `ui/*.png` references via contact sheets and full-size views of key screens. No image was modified or staged.
- Documentation-only checks passed: 8/8 required docs; local Markdown targets; ordered E2E-01–E2E-18; unique T-001–T-016 plus documentation task T-017; D-008 mirrored between SPEC.md and TASK.md; all 24 image filenames indexed; no trailing whitespace; GOAL_PROMPT.md is 1,969/2,000 characters. `git diff --check` passed.
- Created the earlier local documentation commit containing only the eight requested files, parented directly to `dbca199`; verified that commit's file list. The current UI-reference change is Markdown-only; the 24 PNGs remain untracked/unstaged. No push or release was performed.

### Not run / not possible

- Build, package/install, static analysis, unit/integration/API tests: no runtime or project configuration exists.
- Browser, responsive, accessibility, console, PWA install/offline/update, and UI E2E verification: no product entrypoint or build exists. The 80/100 screenshot-only review does not prove keyboard, contrast, screen-reader, or runtime behavior.
- Database/migration, security penetration, backup/restore, deployment, health/readiness, release/artifact, and rollback verification: no implementation or target exists.

These are unavailable checks, not passing checks. See [SPEC.md](SPEC.md) for the required future verification matrix.

## Risks and blockers

1. The product blueprint is explicit, but the recommended stack and target hosting are not approved decisions.
2. Tenant/external-user identity and permission semantics require explicit security design before data/API implementation.
3. Offline retention/revocation on shared devices is unresolved; sensitive offline access must fail closed until approved.
4. Financial rounding/tax/currency/retention allocation and exact lifecycle transitions need a contract before schema migrations.
5. Invoice-link meaning, AI data handling, evidence retention, supported browsers, and release operations are not finalized.
6. No code-based behavior can be confirmed until implementation begins.
7. The 24 PNG anchors are untracked; they are preserved locally and excluded from documentation commits. A future shareable visual gallery requires the owner to decide whether these assets should be versioned.

## Next task / resume point

Start with **T-001** in [TASK.md](TASK.md): decide whether to adopt the proposed technology baseline or run a bounded architecture/deployment spike. T-002 (financial lifecycle/calculation contract) and T-003 (tenant, external access, and offline security policy) may proceed in parallel. Do not scaffold packages or migrations until these dependencies are resolved. No release, push, PR, or deployment is authorized by this documentation task.
