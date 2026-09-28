# ConstructClaim PWA — Progress

## Current state

**Lifecycle:** production pre-implementation / product blueprint; separate static demo slice in progress. The intended product is the ConstructClaim construction progress-claim and certification PWA described in [GOAL.md](GOAL.md) and [SPEC.md](SPEC.md).

**Historical documentation baseline (not current inventory):** branch `main`; the initial source baseline is `dbca199` (`Initial commit`, 2026-09-28). The first documentation pass is locally committed as `5780ee7`; `origin/main` still points at `dbca199`. Before this UI-reference update, the working tree showed the 24 user-provided PNGs under `ui/` as untracked. This pass leaves them unchanged and un-staged. The tracked project has no application source, `README.md`, `CHANGELOG.md`, ADR, package/build manifest, dependencies, tests, CI, release/deploy scripts, app entrypoint, or running browser/API/database behavior. No root/nested `AGENTS.md`, `CLAUDE.md`, or `CONTRIBUTING.md` was found.

**Product/design evidence:** the user-supplied ConstructClaim PWA V1 blueprint defines product intent. The 24 static `ui/*.png` screens are user-designated visual/layout references, not evidence of implementation. Other projects' KB records were not imported as project facts. KB-MCP context and the registered `ui:visual-design-lifecycle` guidance were checked; no verified repository-specific implementation record was established. The KB reuse-context call did not return a schema-valid reuse pack. The image-only self-review is 80/100 with accessibility and trust hard gates not met; this is not a runtime UI audit or a rejection of the screenshots as layout anchors.

## Planned / Implemented / Verified / Released

| Scope | Planned | Implemented | Verified | Released |
|---|---|---|---|---|
| Product requirements E2E-01–E2E-18 | 18 | 0 | 0 | 0 |
| Production application/API/data/PWA capabilities | Entire intended V1 | 0 evidenced | 0 evidenced | 0 evidenced |
| Static local-only demo (DEMO-001) | Browser walkthrough | Navigation, synthetic records, IndexedDB drafts, static shell | Focused browser checks underway; not full demo acceptance | Not published |
| Core planning documents | 8 requested files | 8 present; relevant UI-reference sections updated | Markdown consistency checks passed | Not applicable |
| Documentation task T-017 | 1 UI-reference synchronization | 1 implemented | 1 verified by documentation checks | Not applicable |
| UI reference assets | 24 user-provided PNGs | 0 modified/staged | 24 image files visually inspected as static references | Not applicable |

Progress is measured against the explicit E2E scenario IDs in [SPEC.md](SPEC.md), not subjective completion estimates. At baseline, 0/18 are executable tests, implemented behaviors, or verified scenarios. `Released` means verified in an identified release/deployment target; no target or release exists.

## Static demo status

The owner chose a demo-first phase, with production to follow. `index.html`, `app.css`, `app.js`, `storage.js`, `sw.js`, `manifest.webmanifest` and generated icons form a GitHub Pages-compatible static walkthrough. Local drafts are not submitted commands; sample claims are synthetic. No production endpoint, permission, audit, evidence upload, financial calculator or AI provider was introduced. This slice does not satisfy any production E2E ID. Details and local run instructions are in [README.md](README.md).

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

They distinguish user-approved product intent, proposed architecture, user-selected visual references, unresolved decisions, and verified source/runtime facts. The UI reference update is documentation-only; product implementation/verification/release remains 0/18. The PNGs were subsequently committed in `89370cd` by a separate change; this documentation update does not modify them.

## Verification performed / not performed

### Performed

- During the initial documentation pass, inspected repository files, Git status/history/refs, and candidate rule/document paths; at that point `main` and `origin/main` were both at `dbca199` and no unrelated work was present. At that checkpoint, the later UI-reference images were preserved as untracked user assets; they were subsequently committed in `89370cd`.
- Checked KB-MCP context and retrieved the registered visual-design lifecycle guidance; unrelated project records were excluded from repository claims.
- Inspected all 24 `ui/*.png` references via contact sheets and full-size views of key screens. No image was modified or staged.
- Observed local tools: Node.js v25.2.1, npm 11.6.2, Docker CLI 29.8.0, Docker Compose v5.5.1, and psql client 17.10. `docker info` could not connect to the Docker Desktop Linux Engine; the compose client is present but no daemon was available. These are host capabilities only; they do not select a deployment, support matrix, or project runtime.
- Added three synthetic, exact-integer financial calculation fixtures to `SPEC.md` for the explicitly stated additive formulas. An independent Python `Decimal` spot-check passed; this is not a contract test or completion of T-002.
- Clarified T-003's non-negotiable safety floor in `SPEC.md`: explicit server grants default-deny; offline commands remain pending until the server rechecks and commits them; no client-only financial/approval outcome. D-002/D-003 remain unapproved proposals, not a completed permission or retention policy.
- Latest documentation consistency check after T-001/T-003 proposal updates passed: 8/8 required docs; local Markdown targets; ordered E2E-01–E2E-18; unique T-001–T-016 plus documentation task T-017; D-002/D-003 offline/authorization constraints and D-008 cross-reference synchronized; all 24 image filenames indexed; no trailing whitespace; GOAL_PROMPT.md is 1,969/2,000 characters. `git diff --check` passed.
- Reviewed official Node.js, Vite, React, Fastify, PostgreSQL, Drizzle, and Playwright documentation for T-001. Recorded support/runtime caveats and exact source links in [TASK.md](TASK.md); this is advisory research only and does not resolve hosting, browser/device minimums, or owner approval. No stack was selected and no packages were added. Rechecked all eight core docs: local Markdown targets/fragments, E2E-01–E2E-18, task IDs, 24/24 UI inventory, 1,969/2,000-character prompt limit, whitespace, and `git diff --check` passed.
- Added a concise owner-response key in `TASK.md` for T-001–T-003, mapping each unresolved decision to its required inputs without selecting defaults. All three tasks remain Planned; implementation gates are unchanged.
- Reviewed the WHATWG Storage Standard and MDN browser-storage documentation for T-003. Recorded the best-effort default, browser-dependent persistence grant/eviction, estimated quotas, and write-failure consequences in `TASK.md` and `SPEC.md`; expanded T-009/E2E-16 to distinguish denied persistence permission (best-effort storage) from failed local writes (not queued). Also documented that revocation cannot reach a disconnected device, requiring a policy-defined offline-access age and server-denied replay test in T-009/E2E-07. No access window or local-purge rule is selected.
- Performed a no-write heuristic credential-pattern check over the nine tracked Markdown/`.gitattributes` files because Secretlint executable/configuration was unavailable. No matches for the checked patterns; untracked `ui/` and runtime values were excluded. This is not a Secretlint scan or T-003 security review; no package was installed.
- At the audit checkpoint immediately before this progress update (HEAD `5f170c3`), `main` was 18 commits ahead of `origin/main` (`dbca199`); that range adds only the eight core planning documents (904 insertions). The 24 `ui/` references remain untracked and untouched, and `git diff --check` passed. This is documentation/version hygiene evidence, not product verification.
- Refined T-013/FR-10/E2E-15 to require server-side authorization before AI retrieval/provider payload construction and to treat evidence/model output as untrusted, including adversarial instructions. This is a target requirement only; there is no AI implementation or adversarial runtime test.
- Added an unfilled T-002 decision-to-test worksheet in `SPEC.md`, covering currency/tax, precision/rounding, negative adjustments, cumulative basis, retention, variance, and separate document lifecycles/snapshots. It assigns no defaults; the task remains Planned until the owner records rules and the boundary vectors are independently checked. Revalidated all eight core docs: local links/fragments, E2E-01–E2E-18, 1,969-character goal prompt, 24/24 image inventory, whitespace, and `git diff --check` passed.
- Added a cross-screen accessible/truthful UI state contract to `DESIGN.md` and linked it from `SPEC.md`, T-012/T-015, and E2E-12. It distinguishes local writes, pending commands, server outcomes, denial, and recovery; it is an unimplemented acceptance requirement, not browser evidence. Documentation checks passed for all eight core docs, local links/fragments, E2E-01–E2E-18, the 1,969-character prompt limit, 24/24 UI inventory, whitespace, and `git diff --check`.
- Added an unfilled T-003 security/privacy decision-to-test worksheet in `SPEC.md` for identity/invitations, action grants, external-party/file boundaries, offline/device policy, and AI-provider scope. It selects no grants or retention/provider policy; T-003 remains Planned and its security review gate remains open. All eight core docs passed local-link/fragment, E2E-01–E2E-18, GOAL_PROMPT length (1,969/2,000), 24/24 image-inventory, whitespace, and `git diff --check` validation.
- Added a T-001 owner decision-to-verification worksheet to `TASK.md` mapping platform/runtime, environments/artifacts, supported browsers/devices, data/recovery operations, and issued-document output to required evidence. It endorses no stack/host/matrix; T-001 remains Planned and T-004 stays gated. All eight core docs passed local-link/fragment, E2E-01–E2E-18, GOAL_PROMPT length (1,969/2,000), 24/24 image-inventory, whitespace, and `git diff --check` validation.
- Created the earlier local documentation commit containing only the eight requested files, parented directly to `dbca199`; verified that commit's file list. That UI-reference documentation change was Markdown-only and did not include the PNGs. No push or release was performed as part of that change.

### Static demo checks (not production verification)

- Node syntax checks for `app.js`, `storage.js`, `sw.js`; manifest JSON parsing; local Markdown links, 18 E2E identifiers, 24 image inventory, relative icon paths, and `git diff --check` passed. No npm dependencies were installed.
- In Chromium on localhost, verified synthetic home/claims navigation; validation and focus for missing month/invalid amount; successful IndexedDB save, refresh/read-back, deletion and empty state; device-storage failure retained the form and did not claim success. A literal HTML payload in notes remained text rather than an element.
- Desktop 1280×800 and mobile-emulated 390×844 views rendered without measured horizontal overflow on the sampled routes. Browser checked route titles and active navigation; a standalone iOS device and screen reader were not available.
- Under a repository-name URL prefix, the static app loaded and the worker registered at the matching subpath. A waiting worker displayed an Update now action; clicking it activated the new version and removed the old cache. This does not prove a deployed GitHub Pages build.
- Offline `fetch('./index.html')` in a controlled page returned cached HTML. **Offline full-page reload under DevTools network emulation failed with `ERR_INTERNET_DISCONNECTED`**; do not claim offline launch verified. Investigate with a real browser/device and separate network-loss test before demo completion.

### Not run / not possible

- Production build, API, database, integration, financial-contract, tenant security, E2E-01–E2E-18 and deployment checks: no production system or target exists.
- Demo install prompt, iOS standalone safe areas, screen reader, keyboard-only journey, offline cold launch and failure recovery across browsers remain unverified. A static screenshot review is not accessibility evidence.

These are unavailable or failed checks, not passing checks. See [SPEC.md](SPEC.md) for future production verification.

## Risks and blockers

1. D-001 now proposes a portability-first stack/host/browser baseline and has official-documentation evidence recorded, but the T-001 decision-to-verification worksheet is unfilled; organizational hosting/support requirements are unknown, and the local Docker engine was unavailable.
2. D-002 identity/external-user semantics and the role/action grant matrix remain unapproved; the T-003 worksheet is unfilled and defaults deny unspecified actions.
3. D-003 offline allowlist/retention/revocation and shared-device policy remain unresolved; the T-003 worksheet is unfilled and sensitive offline downloads stay disabled until approved. Browser storage can be denied or evicted, and remote revocation cannot reach a disconnected device; local writes alone do not guarantee durability or prompt access revocation.
4. Financial rounding/tax/currency/retention allocation and exact lifecycle transitions need a contract before schema migrations.
5. Invoice-link meaning, AI data handling, evidence retention, supported browsers, and release operations are not finalized; the T-003 security/privacy worksheet has no approved answers or review evidence.
6. Only the static demo's limited browser behavior is evidenced. No production business or security behavior can be confirmed until its implementation begins.
7. The 24 PNG anchors are tracked by the existing `89370cd` commit; static images remain layout references, not product or accessibility verification.
8. T-002 has three synthetic additive fixtures and an unfilled decision-to-test worksheet; currency/tax/rounding, negative adjustments, retention, variance convention, and lifecycle rules remain unresolved.

## Next task / resume point

**Owner scope choice:** retain the full V1 scope (option 1). This approves no specific platform, money/state rule, permission grant, offline/data policy, or AI provider. At the start of this update, local `main` and `origin/main` were both at `89370cd`, which added the 24 `ui/` images; no application source or runtime appeared.

Finish focused demo verification and additional approved demo journeys under DEMO-001; production work still resumes with **T-001** in [TASK.md](TASK.md): fill its unapproved decision-to-verification worksheet and confirm/replace D-001/D-006. T-001–T-003 remain Planned pending owner decisions. Local Node/Compose/PostgreSQL client versions do not satisfy those gates, and Docker Compose cannot run until a daemon is available. Do not scaffold packages or migrations until platform, financial, and security/privacy decisions are resolved. No release, push, PR, or deployment is authorized.
