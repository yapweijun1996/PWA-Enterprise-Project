# ConstructClaim codebase review

## Scope and evidence

The review observations below are historical evidence from v0.4.0. **All 13 confirmed findings are now fixed and locally verified in v0.5.0**, following the approved full-remediation option. See [Local remediation and verification](#local-remediation-and-verification). Original reproduction text and baseline line references are retained; they do not describe the current implementation.

The separate [PWA product standard audit and remediation](#pwa-product-standard-audit-and-remediation) records the 2026-10-14 v0.5.0 audit and approved v0.6.0 corrections. Its three additional bugs do not reopen BUG-001 through BUG-013.

- **Reviewed runtime baseline:** `e9e3b09` on `main`, worker version `0.4.0`; review performed on 2026-10-13. The worktree was clean at intake.
- **Goal:** identify current codebase defects, including pre-existing defects, document them, and commit documentation locally. This is not limited to regressions introduced by the latest feature commit.
- **Coverage:** all 27 runtime JavaScript modules and their consumers; 11 existing test files; application HTML/CSS/manifest; Pages packaging and workflow; the two Python asset generators and generated-image metadata; static design-gallery HTML. Generated `_site` duplicates and visual design images were not independently re-audited as application implementations.
- **Method:** four independent read-only source reviews, integration review, and actual Chromium reproductions at 1440px and 390px on an isolated local origin. Supported UI paths were exercised against real IndexedDB. Delayed transaction completion and one-shot aborted read transactions were used only for failure/race reproduction. Missing-cache recovery was checked with the real worker, then with HTTP cache removed and the server stopped.
- **Baseline checks:** the unchanged runtime passed 42 Node contract tests in the preceding main-merge verification. That is historical baseline evidence, not proof that the paths below are covered. No permanent tests or runtime fixes were added by this review.
- **Tool boundary:** no LSP server or JS/TS project configuration is available; review used bounded source/import evidence and runtime observations rather than claiming a complete static impact graph.
- **Constraints:** fictional/device-local demo only. Missing production authentication, tenant authorization, approval, issue, invoices/payments, retention/tax, upload and synchronization are deliberate exclusions, not findings. Independent Overview/Reports and scalar SOV figures are explicitly illustrative.
- **Cleanup:** all review-owned claims, proposals, assessments and images were removed; all four isolated stores returned to zero records. The deliberately removed cache entry was restored as harness cleanup, not as an application fix. Managed tabs and servers were closed. No runtime source, tests, generated assets or deployment settings were modified.

## Result

**Historical findings: 13 unique confirmed defects — 2 High / P1, 10 Medium / P2, 1 Low / P3. Current status: 13 locally verified fixes, none of these findings open.** Multiple symptoms with the same correction boundary remain grouped. The SCMC assessment below describes the reviewed v0.4.0 baseline, not a new post-remediation audit.

| SCMC dimension | Status | Evidence-backed reason |
|---|---|---|
| Simple | PASS | The findings do not require a framework replacement or new backend. |
| Clear | FAIL | The mobile pager identifies the wrong line; unknown financial values are displayed as zero. |
| Modular | FAIL | Completion of an operation from a previous page can dispose an unrelated new editor. |
| Consistent | FAIL | Normal and practice assessment creation snapshot different evidence; display and review disagree on blank amounts. |

## Findings

The following source locations and failing-before observations refer to baseline `e9e3b09`. Current correction symbols and passing-after evidence are recorded in the remediation table.

### BUG-001

**High / P1 — Mutable saves silently overwrite newer edits and resurrect deleted records**

- **Root evidence:** [record-store.js:15-25](record-store.js#L15-L25), [record-store.js:83](record-store.js#L83); [storage.js:8](storage.js#L8). Proposal saves use the same unchecked operation at [variation-storage.js:7](variation-storage.js#L7). Incomplete assessments have no stale-version check in [record-store.js:37-38](record-store.js#L37-L38) / [certificate-domain.js:42-44](certificate-domain.js#L42-L44).
- **Reproduce:** save a claim with note `Initial saved note`; open it in two tabs. Tab B saves note `Saved note from second tab`. Tab A changes only the reference and saves its previously loaded snapshot.
- **Observed:** the stored note reverted to `Initial saved note`; no conflict was reported. After another tab cleared the claim store, saving the still-open old editor recreated the deleted claim with the same ID.
- **Expected:** a stale edit must not silently replace a newer save or recreate an explicitly deleted record. New-record creation and existing-record replacement need distinct guards.
- **Smallest correction:** check the expected base revision and record existence inside the write transaction. Reject stale/deleted updates with recoverable conflict feedback rather than overwriting or discarding input. Do not weaken immutable-preview protection.
- **Verify:** repeat the two-tab edit and delete/save interleavings; preserve both users' inputs, keep the successful newer record, and require explicit recovery for the stale editor. Claim overwrite/resurrection were browser-reproduced; the equivalent proposal/incomplete-assessment exposure is static evidence, not a separately exercised finding.

### BUG-002

**High / P1 — A completed background clear operation discards a different dirty editor**

- **Root evidence:** [app.js:334-339](app.js#L334-L339); same unconditional redraw pattern at [app.js:281-286](app.js#L281-L286), [app.js:296-300](app.js#L296-L300), [app.js:311-315](app.js#L311-L315). [app.js:154-156](app.js#L154-L156) disposes the active editor without a leave check.
- **Reproduce:** start a category clear in Settings and delay its transaction-completion callback. During the pending operation, navigate through Claims to New draft and type a reference.
- **Observed:** `REVIEW-UNSAVED-AFTER-CLEAR` became an empty reference when the clear completed. The URL remained `#new`; there was no discard confirmation. The clear used a real IndexedDB transaction, with a 3-second completion delay for deterministic interleaving.
- **Expected:** a callback from an old page must not reconstruct a new unsaved editor. `deviceChanges` currently protects PWA switching, not this redraw.
- **Smallest correction:** retain the originating view identity; refresh that non-editor view only while it is still current. Otherwise update stored state without disposing an active editor.
- **Verify:** delayed clears of each family followed by navigation/typing must preserve the new editor, its focus and input, and existing leave guards. Claim clearing was reproduced; identical sibling redraw paths are statically traced.

### BUG-003

**Medium / P2 — Editing evidence after an unconfirmed committed write destroys its retry identity**

- **Root evidence:** [evidence-editor.js:52-58](evidence-editor.js#L52-L58), [evidence-editor.js:67](evidence-editor.js#L67), [evidence-editor.js:80-82](evidence-editor.js#L80-L82); [evidence-domain.js:62-64](evidence-domain.js#L62-L64); post-write confirmation at [app.js:228](app.js#L228).
- **Reproduce:** save a demo image with note `REVIEW-EVIDENCE-ORIGINAL`; abort the first evidence `getAll()` readback after the write has committed. After the failure message, change the note to `REVIEW-EVIDENCE-EDITED` and save again.
- **Observed:** the first attempt reported `Device read-back failed after the write`. The second reported `The previous saved file is read-only`. Storage retained the original note; the edited note remained in the editor and could not be saved under that fixed ID.
- **Expected:** recovery must retain the original idempotent request until its committed state is reconciled. Allowing edits must not leave an editor in a permanent retry loop.
- **Smallest correction:** reconcile the unresolved attempt before discarding it or accepting a replacement immutable snapshot; recover the committed record or explicitly start a new record. Do not overwrite saved evidence.
- **Verify:** committed-write/readback-failure followed by identical retry, note/context changes and new-image selection must have truthful recoverable outcomes and no accidental duplicates.

### BUG-004

**Medium / P2 — Switching certificate save mode loses an unconfirmed reviewed attempt**

- **Root evidence:** [certificate-editor.js:30](certificate-editor.js#L30), [certificate-editor.js:38-45](certificate-editor.js#L38-L45); immutable guard [certificate-domain.js:42-44](certificate-domain.js#L42-L44); [app.js:215](app.js#L215).
- **Reproduce:** assess sample `PCAP-DEMO-02` at `10000` / `8500`, acknowledge and save the reviewed preview. Abort its first certificate readback after persistence. Click Save draft, then Save reviewed preview again.
- **Observed:** the first save was committed but reported unconfirmed. Both later modes returned `The saved reviewed preview is read-only`, even after read storage recovered. Storage retained the original reviewed timestamp and amounts.
- **Expected:** a change of mode or field must not replace the only identical request that can confirm an already committed read-only preview.
- **Smallest correction:** retain and reconcile the pending reviewed snapshot before switching mode/editing. Restore the saved read-only detail; subsequent changes require a separate assessment.
- **Verify:** post-write readback failure followed by both retry modes and field changes must recover the exact saved preview, without mutable replacement or misleading retry advice.

### BUG-005

**Medium / P2 — Recreated practice assessments omit linked device images**

- **Root evidence:** [demo-practice.js:129-134](demo-practice.js#L129-L134). Normal creation merges independent images at [app.js:210-213](app.js#L210-L213).
- **Reproduce:** Load practice drafts; add and save a demo image for `LOCAL-PRACTICE-CLAIM-HARBOR-1`; delete only `LOCAL-CERT-PRACTICE-HARBOR`; Load practice drafts again.
- **Observed:** loading created one missing assessment and kept 15 records. Its source had zero image snapshots despite one linked device image. Normal Start assessment for the same claim rendered one supporting image card.
- **Expected:** newly created assessments of the same saved claim must preserve the same readable linked evidence, regardless of entry point.
- **Smallest correction:** when a practice assessment is genuinely missing, read and merge same-project/claim evidence before snapshotting. An unreadable evidence store must report partial failure, not silently create a reduced snapshot. Keep existing previews unchanged.
- **Verify:** recreate with text and image support, then remove the original image; the recreated snapshot must retain it. Also exercise unavailable evidence storage.

### BUG-006

**Medium / P2 — Reconnecting and reopening cannot repair an incomplete current cache**

- **Root evidence:** network fallback without repair at [sw.js:81-86](sw.js#L81-L86); recovery instruction [pwa-updates.js:38-41](pwa-updates.js#L38-L41).
- **Reproduce:** after a complete online install, remove only `demo-images.js` from the current scoped cache. Reopen online with unchanged worker bytes. Then remove HTTP-cache assistance and stop the server before reloading.
- **Observed:** online Settings rendered but still reported `Cache incomplete · reconnect and reopen`; the missing asset remained absent. With HTTP cache cleared and the server stopped, reload produced `ConstructClaim — Demo`, an empty main area, zero navigation links and a failed `demo-images.js` request.
- **Expected:** the advertised recovery action must make the current shell usable offline again, or clearly provide a real bounded recovery action.
- **Smallest correction:** implement and verify a version-safe shell repair/reinstallation path. Do not blindly mix assets from a newer deployment into an older active cache or report success based only on network loading.
- **Verify:** missing module and missing HTML entry, online recovery, then cold offline reload with no HTTP-cache fallback. The initial emulated-offline-only run still loaded using fallback assistance; only the server-stopped/HTTP-cache-cleared cold run demonstrated the broken boot. This distinction is part of the evidence, not omitted.

### BUG-007

**Medium / P2 — In-memory record lists do not refresh after another tab changes storage**

- **Root evidence:** reads occur in [app.js:51-60](app.js#L51-L60), while list/detail routes use the cached collections at [app.js:94-110](app.js#L94-L110). [app.js:354-366](app.js#L354-L366) provides no cross-tab storage refresh.
- **Reproduce:** open Claims in Tab A; save a new claim in Tab B. In A, navigate to Projects and back to Claims without reloading.
- **Observed:** A still showed 36 rows and no new reference while IndexedDB contained the new claim. Reload showed 37 rows and the reference.
- **Expected:** navigating back to records should not continue presenting known-stale device data as current. The same cached state also feeds source lookups.
- **Smallest correction:** refresh safe browsing views on navigation/focus and invalidate them after cross-tab mutations. Preserve unsaved editor snapshots; do not implement refresh by unconditional editor redraw.
- **Verify:** create/update/delete from another tab must update browsing counts/rows and source status without reload, while dirty editors keep their input. Only claim list creation was browser-reproduced; broader cached-family exposure is static evidence.

### BUG-008

**Medium / P2 — Mobile validation selects an error row but leaves another row's identity visible**

- **Root evidence:** [draft-editor.js:112-121](draft-editor.js#L112-L121).
- **Reproduce:** at 390px, create a Cedar claim with a valid month. Enter `x` on A01, advance to A02 and enter `1`, then Continue.
- **Observed:** visible row/input was `A01 · Site preparation` / `x`, but the pager still displayed `A02 · Concrete works` / `Line 2 of 2`. Previous was enabled and Next disabled, the wrong states for A01. Screenshot inspected.
- **Expected:** the visible input, item title, index and controls must identify the same work item.
- **Smallest correction:** synchronize pager text, selected row and controls after selecting the invalid line, before marking/focusing it.
- **Verify:** errors on non-current amount and note fields at mobile widths must show the correct item identity and preserve all entered amounts.

### BUG-009

**Medium / P2 — A blank claimed value incorrectly requires a zero-variance reason**

- **Root evidence:** [certificate-domain.js:32](certificate-domain.js#L32); blank-as-zero claim behavior [demo-domain.js:16-27](demo-domain.js#L16-L27), [demo-domain.js:48-59](demo-domain.js#L48-L59).
- **Reproduce:** locally review a valid Cedar claim with A01 current `1` and A02 current three spaces. Start assessment, enter certified `1` / `0`, acknowledge and review without reasons.
- **Observed:** both displayed variances were `SGD 0.00`, but saving was blocked by `A02: explain the difference between certified and claimed`.
- **Expected:** the already accepted blank claimed amount must have the same zero meaning in totals and variance validation.
- **Smallest correction:** normalize the claimed amount consistently before comparison. Preserve rejection of invalid nonblank amounts and the reason requirement for genuine differences.
- **Verify:** empty string, whitespace, true zero, equal positive values and non-zero differences must agree between UI, totals and review readiness.

### BUG-010

**Medium / P2 — Unknown whitespace amounts are rendered as zero in details**

- **Root evidence:** [ui.js:31-35](ui.js#L31-L35) converts raw whitespace with `Number`; affected consumers are [certificate-pages.js:17-18](certificate-pages.js#L17-L18) and [project-pages.js:73-75](project-pages.js#L73-L75).
- **Reproduce A:** save an incomplete assessment with a whitespace-only Certified input, then open its detail.
- **Observed A:** the row showed `SGD 0.00` as Certified while the same row's variance was `Not assessed`; the assessment remained incomplete.
- **Reproduce B:** save a proposal whose amount is three spaces; compare its list and detail.
- **Observed B:** the list showed `No amount yet`, but the detail showed `SGD 0.00`.
- **Expected:** an unknown assessment/proposed amount is not a genuinely entered zero. Both contexts are grouped under the same raw-whitespace formatting boundary.
- **Smallest correction:** pass validated nullable cents/state to detail formatters, retaining explicit zero and keeping the claim-line blank-as-zero rule separate where that rule is intentional.
- **Verify:** blank/whitespace/zero/positive values remain distinguishable and consistent in desktop tables, mobile cards, summaries and detail views.

### BUG-011

**Medium / P2 — Searching a displayed local proposal reference returns no match**

- **Root evidence:** [project-pages.js:36-37](project-pages.js#L36-L37); the field promises `Reference or scope` at [project-pages.js:43](project-pages.js#L43).
- **Reproduce:** save a proposal, copy its displayed reference, and search that exact reference.
- **Observed:** `Proposal AE11A36F` returned `No variation orders match. Try another filter.` Clearing the filter restored the proposal.
- **Expected:** the displayed reference must be a searchable identifier, not only the hidden full ID/title.
- **Smallest correction:** include `item.reference` in the existing normalized search string.
- **Verify:** full displayed reference, suffix, full ID and title searches locate the same proposal without cross-project leakage.

### BUG-012

**Medium / P2 — Evidence claim-ID search omits linked images**

- **Root evidence:** [evidence-pages.js:15-16](evidence-pages.js#L15-L16): photo matching omits `record.context.id`, while document matching includes the claim ID.
- **Reproduce:** search global Evidence for `PCAR-WILLOW-2026-10`.
- **Observed:** two bundled image records were linked to that claim, but zero photo tiles appeared; its one text document did appear.
- **Expected:** a search advertised as file/note/claim must find the claim's linked images as well as its documents, even when its reference differs from its ID.
- **Smallest correction:** include the actual context claim ID in photo matching, retaining reference/file/note matching and project isolation.
- **Verify:** IDs and references for sample/device claims must both find their whole-claim and line images; project-scoped filtering must remain intact.

### BUG-013

**Low / P3 — Missing claim/variation editors hide mobile browsing navigation**

- **Root evidence:** [app.js:170-174](app.js#L170-L174), [app.js:194-195](app.js#L194-L195); [app.css:289-291](app.css#L289-L291).
- **Reproduce:** at 390px, open `#edit/LOCAL-missing`, `#variation-edit/LOCAL-VO-missing`, or `#variation-new/missing-project`.
- **Observed:** all showed Page not found with `task-mode` still true and mobile navigation `display: none`. Missing certificate editing correctly removed task mode and displayed navigation as a grid.
- **Expected:** an error page without an active editor is a browsing surface and should retain the normal mobile navigation.
- **Smallest correction:** keep focused-task mode only when an editor actually exists, or remove it in these error branches consistently.
- **Verify:** missing/unreadable editor routes for every family retain recovery links and mobile navigation. Existing Home/Device drafts recovery links remain available, so this is not an unrecoverable lockout or data-loss finding.

## Unverified risks and exclusions

- **RISK-01 — Delete confirmation under concurrent mutation:** historical claim deletion checked read errors but not residual ID/length. Remediation adds both checks. A real delayed clear followed by a new committed claim was exercised: the new record remained, and the clear reported a failed readback rather than false empty-store success. This is verified hardening within BUG-001/002, not another numbered finding.
- **RISK-02 — Changed proposal basis version:** changing the affected line clears the old source snapshot but retains its sourceVersion before capturing the current line. Current fixtures do not provide two active basis versions for a supported-UI reproduction. Verify this before introducing contract source revisions; do not count it as a present demonstrated bug.
- Physical phone camera/installation, Safari/iOS standalone, real screen-reader acceptance, prolonged stress/storage eviction, live deployment and server-backed production security were not verified.
- Controllerchange deferred reload was investigated and rejected as a finding: `pwa-updates.js` exports `reconsider: resume`, so app save/route completion does process pending safe reloads. Intentional query-bearing URL cache exclusions, fixed illustrative financial snapshots and missing production workflows are also not bugs.
- No claim of exhaustive absence of additional bugs is made. These are all unique confirmed findings from this bounded source and runtime review, not a proof about every browser, timing or future dataset.

## Overall

- **Decision:** the 13 confirmed findings are fixed and locally verified; the original baseline failed review. This is not a release or an exhaustive absence-of-bugs assertion.
- **Evidence:** 96 passing Node behavior contracts, 43 JavaScript syntax targets, a validated 35-file artifact and the real browser/storage/recovery scenarios below.
- **Next acceptance:** publication and the unverified device/browser/product boundaries remain separate. RISK-02 is unchanged and must be checked before introducing source-version transitions.
- **Preserve throughout remediation:** existing fixture arithmetic and snapshots, unrelated device records, explicit practice reset boundaries, immutable reviewed previews/images, exact-cent calculations, truthful unknown/zero distinctions, local-only state labels and scope-specific cache ownership.

## Local remediation and verification

Completed on 2026-10-13 after review commit `ac794ba`; repository worker version is **0.5.0**. All statuses below mean **Verified locally**, not Released.

| Finding | Current correction boundary | Passing-after evidence |
|---|---|---|
| BUG-001 | `record-store.js` transactional `prepareRecordWrite`/`save`; explicit create/update revision and generation; editor commit receipts and explicit new-record recovery | Real simultaneous writes from two tabs for claims, proposals and incomplete assessments each produced one success and one `RECORD_CONFLICT`. Deleted updates failed; same-ID/same-revision replacement received a fresh generation and resisted the old token. Claim and assessment recovery preserved input in fresh unreviewed records. |
| BUG-002 | `app.js` `browsingOwner`, guarded completion/error feedback and navigation generations | Real transaction completion delayed for each of the four category clears; navigating and typing in a new claim retained the later marker and editor. Concurrent post-clear insertion was retained and produced truthful readback failure. |
| BUG-003 | `evidence-editor.js` pending persisted receipt and locked immutable attempt | Native readonly confirmation aborted after the image write committed. Fields locked, exact retry stayed available, and healthy retry opened detail with one image at revision 1 and its original note/context. Aborted writes remain editable in behavior contracts. |
| BUG-004 | `certificate-editor.js` retained snapshot/mode, exact retries and explicit unreviewed conflict fork | Native confirmation aborted after reviewed write; draft mode and amount fields disabled while reviewed retry remained available. Retry opened readonly detail at revision 1. An unconfirmed draft deleted elsewhere was explicitly recovered under a new ID with its value/reason preserved. |
| BUG-005 | `demo-practice.js` readable same-project/claim image merge only for missing previews | Recreated Harbor practice assessment included its independently saved image; deleting original images retained that source snapshot. Aborted evidence listing stopped a missing Cedar preview after 0 created/13 kept; healthy retry created only the missing preview. |
| BUG-006 | `sw.js` installed SHA256 authority, per-consumer response ownership, bounded matching repair; independent `bootstrap.js`; guarded isolated reinstall in `pwa-updates.js` | Deleted module healed online and later cold boot worked with HTTP cache cleared and server stopped. Different deployment bytes were rejected while a dirty tab stayed intact. Missing integrity authority refused repair but complete reinstall restored it. Both HTML keys repaired. Two real tabs received the correct verified response body concurrently. |
| BUG-007 | `app.js` single-flight refresh, navigation/focus refresh and committed cross-tab invalidation | Another tab's new claim appeared without reload; active search text remained. A dirty new editor retained its note while counts refreshed. Real family mutations also refreshed device counts. |
| BUG-008 | `draft-editor.js` selected error index before pager/row/control synchronization | At 390px, invalid A01 `x` and valid A02 `1` with A02 selected returned to A01, Line 1 of 2, previous disabled/next enabled; both amounts remained. Amount/note boundaries also pass behavior contracts. |
| BUG-009 | `certificate-domain.js` canonical accepted blank-as-zero comparison | Real review of claimed `1`/whitespace and certified `1`/`0` completed with empty reasons and zero variance. Empty, whitespace, true zero, equal positives and real differences are covered by contracts. |
| BUG-010 | Nullable cents in `certificate-pages.js` and `project-pages.js` | Actual desktop/mobile assessment rows showed whitespace as Not assessed and entered zero as SGD 0.00. Proposal whitespace detail showed No amount yet; entered zero remained SGD 0.00. |
| BUG-011 | `project-pages.js` includes displayed local reference | Searching the full displayed `Proposal XXXXXXXX` found the same local proposal in both list representations; ID/title and project isolation contracts pass. |
| BUG-012 | `evidence-pages.js` includes `context.id` | `PCAR-WILLOW-2026-10` returned its two image tiles and document despite a different displayed reference; sample/device context and scope contracts pass. |
| BUG-013 | `app.js` task mode reflects the actual editor | Three missing claim/proposal/new-project routes at 390px showed Page not found, no form/task mode and mobile navigation as a grid; screenshots inspected. |

### Additional recovery boundaries

- Commit receipts are issued immediately after the IndexedDB transaction succeeds; exact per-record readback must succeed before claiming a confirmed save. A changed/deleted record cannot be silently recreated by retry.
- `storageRevision` and `storageGeneration` are device persistence metadata, not financial/source versions. Legacy records start at revision 0 without being bulk rewritten; first changed writes/new inserts gain identity metadata. Source fixtures and all four database/store names remain unchanged.
- Reinstallation uses a fresh UUID script identity and a separate cache, then the existing all-client readiness protocol. Startup reuses the existing registration rather than re-registering an older active script over a staged release. Partial-boot forms/task mode block acknowledgement and reopening.
- A new concurrent-body regression failed before the per-consumer clone with `Body is unusable: Body has already been read`, then passed after correction. Browser consumers independently received the installed SHA256.
- Synthetic 0.5.1/0.5.2 releases were served only from owned temporary artifacts to test version mismatch, missing authority and current recovery code; they are not repository releases. Final server-stopped fresh-tab boot retained the same claim/note at revision 1.
- Cleanup: all four isolated stores returned to zero; owned scoped cache/registration removed; managed tabs and both services closed; all three temporary build/synthetic-release directories removed. Existing `_site`, generated illustration/icon bytes and deployment settings were untouched.
- Limits: no configured LSP/project impact graph, remote deployment, physical phone/iOS/Safari, full accessibility/security acceptance or prolonged eviction/stress proof. RISK-02 remains unverified; no production task/E2E state changed.

## PWA product standard audit and remediation

Audited on 2026-10-14 against canonical KB-MCP skill `pwa:product-standard` v1.0, ref `270d896a-12b0-40b4-856f-f6274d872c95:3f932f5e-8bc9-40c6-86e9-e676d47e1c52`. This is the product-grade acceptance contract, not minimum browser installability. The baseline was v0.5.0; the owner selected remediation B, retaining the documented safe automatic-update exception. Corrections below are **Verified locally in v0.6.0**, not Released.

### BUG-014

**P1 — An incomplete waiting release is misreported as another-page readiness problem (audit F1).**

- **Failing before:** remove one candidate-cache icon while another tab is dirty, then save its input. Waiting metadata reports `offlineReady: false`, `cacheState: repairable`, `missing: 1`; the UI still says to save/close other pages.
- **Correction:** `sw.js` `applyUpdate` preserves `incomplete-cache`, `cache-check-failed`, `pages-busy`, `readiness-cancelled` and `activation-failed` causes. `pwa-updates.js` selects recovery by cause, leaves active metadata intact and offers separate complete-release recovery for an incomplete candidate.
- **Passing after:** the same native two-tab scenario shows `data-reason="incomplete-cache"`, keeps active v0.6.0 offline state complete, disables the irrelevant active-cache repair and enables complete installation. A UUID-isolated complete release activated with the visible loader/interaction lock; the saved note, hash route and revision 2 survived.
- **Regression:** real worker/cache contracts cover missing/corrupt candidates, cache-read/activation failures, busy/unresponsive/new pages, unknown failures and recovery isolation. Known incomplete candidates do not spin through the visible-page automatic retry loop; a new candidate or explicit check can reevaluate readiness.

### BUG-015

**P2 — Local cache corruption is labelled as a confirmed server-release change (audit F2).**

- **Failing before:** alter only a locally cached icon; metadata paints `Different server release / complete install required`, although ordinary repair succeeds against the unchanged server.
- **Correction:** local digest failures report `corrupt`; only observed rejected network bytes report `server-mismatch`. Missing entries remain `repairable`, absent authority remains `unverified`, and matching repairs clear the failure state. A rejected server response does not disable later repair retry when installed authority exists.
- **Passing after:** actual altered-cache status identifies local verification failure and enables repair. The unchanged server restores completeness; the existing practice claim remains revision 1. Behavioral contracts also prove retry after the server restores the expected bytes.

### BUG-016

**P2 — Settings mutation completion removes the focused keyboard control (audit F3).**

- **Failing before:** focus Load practice drafts and press Enter; the same-route redraw leaves focus on BODY.
- **Correction:** `app.js` focus capture/restoration and mutation-view ownership retain a usable replacement target. Disabled deletion controls fall back to the relevant heading/main; intentional later focus and newer routes/editors are not overridden. Render/device-change generations prevent stale live-refresh completion from racing that ownership.
- **Passing after:** keyboard load and reset retain their button focus; all four delete-all completions focus `device-settings-title` after disabling the deleted category. A native delayed claim clear followed by focus on Check for updates preserves that later control. Delayed clears for all four families followed by a new editor retain its note and notes-field focus.

### UI standard corrections

| Finding | Baseline gap | Current correction and local evidence |
|---|---|---|
| PWA-001 / P1 | Missing top inset; incomplete side/bottom coverage; fixed task/footer offsets | Shared fallback-aware safe-area tokens cover opaque top surface, content/notices, sidebar/nav, floating actions, footer and overlay. Actual footer measurement drives clearance. With simulated 47px top, 34px bottom and 44px sides, the 390px bar was 107px, footer 112px, main bottom clearance 136px and note bottom above the footer top. A simulated 484px VisualViewport placed the footer bottom at 484px and the note above it. |
| PWA-002 / P1 | Claim/filter controls at 14px or 13px, smaller pager/segmented/brand targets | Visible controls across the checked routes are at least 16px; mobile line amounts retain 22px. Actual pagers are 44 by 44px. User zoom remains enabled. |
| PWA-003 / P2 | Permanently sticky bar on long pages | Downward/upward thresholds are 48px/24px, transform-only. Actual down/up and 10px reverse-motion checks show hiding, reveal and no jitter; document main position stays constant. Focusing a bar control reveals it. Route/viewport/short-page/expanded-nav and editing-focus guards preserve access. Reduced-motion transition is 0s and spinner animation stops. |

### Acceptance and remaining boundaries

- **Commands:** 103/103 behavior contracts; 43 syntax targets; manifest JSON; pristine 35-file Pages artifact. No dependencies or new runtime modules were added. One incidental Settings navigation-link assertion was removed rather than pinned; substantive category/count guards remain.
- **Layout/browser:** 48 checks across six routes at 320/390/820/1440px, with zero and simulated nonzero insets, had no document overflow or visible sub-16px text controls. Screenshots inspected; observed page exception logs were empty.
- **Updates/offline:** temporary 0.6.1/0.6.2 artifacts proved distinct candidate recovery, dirty-tab protection, UUID staging, loader/inert-before-controllerchange, safe automatic activation and cache cleanup. A pristine v0.6.0 fresh tab loaded after clearing HTTP cache and stopping the server; offline local save/reload retained the same note at revision 3.
- **Exception:** canonical explicit user activation remains a MUST with documented exceptions. The user's prior automatic all-pages-ready policy was explicitly retained; this is not strict manual-update compliance. No Update-now cutover, dark theme or optional icon redesign was introduced.
- **Additional risk, out of scope:** existing cached hits bypass per-request digest verification. Readiness checks and matching repair verify snapshots; they do not guarantee signed release authenticity or verification of every served hit. The audit demonstrated an altered cached icon being served, but the owner-selected correction scope did not include per-hit hashing.
- **Unverified:** physical iOS/Safari standalone/status bar/keyboard, OS installation/camera, full screen-reader/contrast/zoom and eviction/stress acceptance. RISK-02 remains unchanged. Simulated insets/VisualViewport are geometry checks, not device proof.
- **Static evidence:** LSP unavailable; installed `agent-impact file pwa-updates.js --json` returned `PROJECT_CONFIG_NOT_FOUND`. Bounded imports/consumers were inspected; no complete graph is claimed.
- **Cleanup/release:** both isolated origins' four stores returned to zero; own registrations/caches removed; managed tabs/services closed; the owned artifact tree removed. Existing `_site`, icons/illustrations, database names, source fixtures and deployment configuration stayed unchanged. This task did not push or deploy. A read-only public worker fetch reported v0.5.0, not its exact commit or remote installation acceptance.
- **SCMC:** Simple PASS, Clear PASS, Modular PASS, Consistent PASS within this correction scope: preserve causes instead of hiding failures, keep existing store/update owners, use one shared inset/layout model and retain the documented policy exception. Wider product/device/security acceptance remains separate.

## Visual audit and four scoped fixes

**Baseline:** main `1f143a0`, worker v0.6.0, read-only screenshot review on 2026-10-14. Eight routes at six sizes plus supplemental states produced 54 frames and 13 visual improvement candidates. These are presentation observations/recommendations, not 13 additional confirmed functional bugs. The owner selected only VIS-01 through VIS-04 for implementation.

**Milestone status:** those four refinements are Implemented and Verified locally under DEMO-012 / worker v0.6.1 and committed on main as `5fbab1c` after owner B selection. No push or deployment. The subsequent C follow-up below covers 05-08 separately. Existing BUG-001 through BUG-016 history and RISK-02 are unchanged.

| Finding | Baseline observation | Current correction and local evidence |
|---|---|---|
| VIS-01 | At 390x844 the first file title was near y=778 and its view action below the initial viewport | Scoped mobile thumbnail/identity grid retains status, context and full notes. Title now begins at y=582; context ends at y=653 and the 44px view action at y=705, above navigation y=783. Search/type filtering and original record link exercised. |
| VIS-02 | Claims table/card label did not name the amount basis | Labels now say Claimed this period, with SGD/period retained. Sample generation and savedRecord derive amount from current lines; no calculation changed. Native direction/search filtering and a saved 1,234.56 record retained correct amount/local-only state. |
| VIS-03 | A 5px visual track reserved a 44px button row, leaving roughly 59px before the form | The track reserves 5px with native 44px hit areas around it. Track/form gap is 20px; period ends at y=738 before footer y=754. All step top/bottom hit points resolve to the intended button; native Enter/validation/month/progression and saved-editor reload exercised. |
| VIS-04 | Three mobile amount cards occupied roughly 337px | Only certificate-summary becomes a compact mobile three-row panel, about 148px at 390x844. All amounts, negative variance, right alignment, Snapshot/Illustrative basis and not-issued notice retained. Desktop/tablet cards unchanged; no assessment-detail or source-link redesign. |

### Verification and remaining limits

- Existing behavior contracts: **103 passed, zero failed**. Syntax: four changed JS files. Packaging: 35 validated static files; no new runtime module/dependency/test.
- Real Chromium: 48 after captures across the same eight routes and six sizes; no document horizontal overflow. Two independent reviewers inspected 16 before/after images each and accepted their assigned fixes. No numeric taste score or full WCAG conclusion.
- Browser smoke: original gallery filtering/link, Claims directional filtering, native step hit/keyboard/validation, saved amount/note persistence through reload, current-period list value and active v0.6.1 complete-cache identity. Observed page exception logs were empty.
- At 320x720, some identity/context/actions and period fields still require scrolling; certificate summary is about 204px with values wrapping, not clipped. The 390x844 first-viewport criteria are not generalized to every phone height.
- At this milestone findings 05-13 were unselected. The subsequent owner C selection implements 05-08 below; 09-13 remain unselected: duplicate evidence empty state, repeated gallery prose, home empty-panel density, project metadata order and partial floating-button overlap.
- Physical iOS/Safari/installed PWA/software keyboard, full screen reader/contrast/zoom and production financial correctness are not covered. Prior update/offline/inset results remain dated DEMO-011 evidence.
- LSP unavailable; impact CLI returned PROJECT_CONFIG_NOT_FOUND. Bounded imports, exported consumers, amount sources and relevant tests were inspected instead; no complete static graph is claimed.
- Scoped source ZIP and screenshot/JSON evidence retained outside the repo; restore not executed. Owned smoke data/caches/registration/tab/service/runtime artifact cleaned. Reference PNGs and existing `_site` unchanged.

## Follow-up visual findings 05-08

**Baseline and status:** previous fixes committed locally as `5fbab1c` / v0.6.1; owner then selected C. VIS-05 through VIS-08 are Implemented and Verified locally under DEMO-013 / v0.6.2, committed on local main as `1cf57c7`. No push/deployment.

| Finding | Correction | Exercised evidence |
|---|---|---|
| VIS-05 | Existing sample/device preview entries move into the claim summary, with independent amount/state and not-issued labels; duplicate lower lists removed | Initial 390px entry ends at y=553 above nav y=783; claim/preview/current-claim native round trip retained 18,500/17,000/-1,500. After review found decimal-digit splitting at 768px, full-row layout and fixed-width/nowrap amount display restored one text line with 598px entry width. |
| VIS-06 | Header shows actual snapshot reference/full ID, basis and saved time; current-source entry is conditional and explicitly current, with existing error/change notice moved alongside | Initial current-source entry ends around y=392 at 390px. Actual incomplete local preview keeps No amount yet / Not assessed. Deleting its owned source hides the current link, shows retained-snapshot warning and preserves source identity/time and amounts. No historical-version or issued-state fiction. |
| VIS-07 | Existing references or project/period titles identify claims; existing captions identify images, with raw filenames retained and no guessed note parsing | Caption query found the original PNG; detail retained harbor-demo-01.png. Original PCAP-DEMO-02 ID search and links still worked; Technical reference retained the full ID. One regression covers caption matching without duplicated note content and exclusion of a different image. |
| VIS-08 | Three native Settings buttons target existing section headings; no competing hash links | Enter focused each actual heading while retaining #settings; reduced-motion navigation followed by Tab reached View saved records. Six-size captures showed 44px targets and normal narrow wrapping. Existing update/practice/delete handlers unchanged. |

### Follow-up acceptance and limits

- Final regression: **104 passed, zero failed**; six modified JS syntax checks; 35 validated final runtime files. No fixture/database/calculation change or new runtime dependency/module.
- Final Chromium matrix: eight routes at six sizes, 48 screenshots without document horizontal overflow. Source/identity/navigation reviews accepted the final scope; initial failing 768px screenshot/source evidence retained rather than silently replaced.
- Active worker returned v0.6.2, complete cache and zero missing; observed page exception logs empty. Native links, original identifiers, focus/route behavior, reduced motion and actual incomplete/missing-source state exercised.
- Readiness/cache/update/inset proof from DEMO-011 remains historical. No new physical iOS/Safari/keyboard/installed mode, full screen-reader/contrast/zoom/eviction or production-money acceptance.
- LSP unavailable and impact analyzer lacks JS/TS config; bounded static imports/callers/data-source inspection substituted, not a complete graph.
- Two isolated origins' owned practice data/caches/registration cleared; tabs/services closed and final runtime removed. Baseline ZIP, before/after/failed screenshots and JSON retained outside the repo; restore not executed. Existing `_site` and reference PNGs unchanged. Findings 09-13 were outside this milestone and subsequently selected below.

## Remaining visual findings 09-13

**Baseline and status:** local `main` baseline `1cf57c7` / v0.6.2; owner selected A/B/C/D. DEMO-014 was initially verified as v0.6.3 and is retained in v0.6.4 with subsequent A/B/C local commit authorization. No push/deployment.

| Finding | Correction | Exercised evidence |
|---|---|---|
| VIS09 | Existing attachments and linked images share one Evidence section and contextual entry; one total empty state only when readable and empty | Cedar detail: two empty messages to one. Native local image appears under Linked images with no total empty message. Injected image-read failure shows unavailable and no empty message. |
| VIS10 | Captioned bundled cards omit repeated long notes; full detail/local/no-caption notes and source/file markers remain | 48 bundled cards/72 files retained; native local note search finds the original detail route and visible device-local note. Full bundled note remains on detail. |
| VIS11 | Compact no-draft resume, unavailable distinction and non-stretching grid | 390px empty resume 172px to 101.5px. Actual Cedar practice resume retains Payable, 2026-08, reference and saved Review step; injected read failure does not claim no drafts. |
| VIS12 | Project name before secondary contract/location; scoped secondary spacing | Six-size screenshots retain descriptions, next action and original Open project links; first 390px card 228.375px to 208.1875px. |
| VIS13 | Cached generic control collision check; protected keyboard slot; stationary pointer activation | Enabled baseline clear action was intercepted. Final four clear-control geometries are reachable; native confirmation was reached and dismissed. Mouse and CDP touch return to y=0/main; Tab/Enter returns to y=0 with action focus retained. |

### Final verification and candidate corrections

- Final 104 behavior contracts, zero failures; three modified JS syntax targets; 35-file pristine artifact. Final eight-route/six-size matrix: 48 captures, no document horizontal overflow.
- Initial keyboard slot failed at 320px because the mobile avatar was display:none. Final focus mode allocates a 44px utility slot and preserves the named home icon. Twelve final default/simulated-inset keyboard captures have no header-control overlap/overflow.
- Independent review identified focus relocation breaking the first pointer click. Native before proof: press moved y724 to y8, release left scrollY unchanged. A pointer-capture revision still lost the emulated touch click. Final pointer mode leaves the press/release target stationary and transfers activation focus to main; keyboard mode uses the top-bar slot. Failed screenshots/JSON/candidates retained, not silently replaced.
- Independent evidence/home and project/return reviews accepted the final scope. Actual local image/detail/gallery and injected-unavailable branches were exercised separately from the bundled/empty screenshot matrix.
- LSP/project-config impact graph remains unavailable; bounded actual imports/callers/source units used. Fixtures, schemas, calculations, source snapshots, original identifiers and safe automatic update policy are unchanged. No new runtime dependency/module or permanent copy/wiring test.
- Evidence is retained outside the repository in `constructclaim-visual-final-1PpTPT`; final screenshots are in `complete/`. CSS insets and CDP touch are simulations, not physical iOS/keyboard acceptance. Specialist verification below does not imply complete WCAG or bug-free certification.

## Specialist keyboard, accessibility and device audit

**Scope:** owner D selection; current v0.6.3 local candidate, non-production records only. This was verification/reporting, not authorization to fix additional findings.

| Coverage | Observed result | Limit |
|---|---|---|
| Native Settings Enter/Tab | Three destinations keep #settings and focus visible headings; next Tab reaches View saved records with3px outline | Desktop Chromium keyboard, not mobile software keyboard |
| Six-route reflow | Home/Projects/Claims/Evidence/Settings/New at720x450CSS/DSF2: no horizontal overflow, one main/H1 | 200% layout approximation of1440x900, not real browser zoom |
| Actual accessibility tree | No unnamed sampled interactive AX controls on those six routes | Does not prove complete semantics, reading order or screen-reader behavior |
| Lighthouse desktop snapshot | Accessibility100; one experimental label-in-name failure | Not full WCAG; inspect the actual failed item below |
| Worker/mode |0.6.3, complete cache, missing0, offlineReadytrue; Windows Chromium browser mode | Not installation/standalone/cold-launch acceptance |
| Phone control prerequisites | Bounded PnP query0 matches; no adb/standard SDK/device-farm endpoint; mounted browser only about:blank | No verified physical phone or software-keyboard control channel |

### BUG-017

**Confirmed P2; subsequently fixed and Verified locally in v0.6.4 under DEMO-015.** Historical failing-before evidence follows.

- Route: `#evidence-new?project=cedar&claim=PCAP-DEMO-02`; viewport390x844; no selected file.
- Place Load demo illustration near the task footer. Its exposed center at(121.55,735.77) hits the actual button; footer top754px.
- Native mouse down focuses the button and moves its rectangle from top713.77px to378.77px. Mouse up at the original point yields click count0, Save remains disabled and No file selected remains.
- Source: unchanged `evidence-editor.js:64`, form-wide focus clearance calls scrollIntoView for buttons as well as editing fields. The event/geometry evidence confirms lost activation; this is not the corrected return-button code.
- Keyboard Enter successfully loaded/saved a real fictional image but did not close the original pointer defect. Subsequent owner B selection authorized the narrow root correction described below.
- Evidence: `specialist-picker-pointer.json/png`, and separate successful `local-image-proof.json`.
- **Correction:** deleted the duplicate capture form focus-scroll handler. Shared app `keepEditorFieldVisible()` owns editable-field/footer/VisualViewport clearance and excludes buttons; no new pointer modality state, capture, retry or timer.
- **Passing-after:** native mouse and CDP touch at320/390/1440 produce six first activations, one click each, unchanged press geometry and decoded640x480/21,112-byte PNG. Note input stays above the footer; a reduced viewport retains note text and12px clearance. Native keyboard save opens the actual local image detail. All simulation limits remain explicit.

### CAND-A11Y-001

**Automated candidate, not a manually confirmed WCAG violation.** Lighthouse experimental `label-content-name-mismatch` flags `.utility-actions > .topbar-link`: visible `Device drafts 0`, accessible name `0 device drafts`. The same words appear in a different order; verify visible-label scope and voice-control semantics before declaring a violation. Preserve unknown/unavailable count semantics if correcting it. Report: external `lighthouse/report.json/html`. A weighted Accessibility100 score does not clear the flagged item.

**Subsequent owner B resolution in v0.6.4:** [W3C Label in Name guidance](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) recommends visible text at the start of the accessible name and warns about reordered labels. Conservatively aligned the existing category/count order rather than claiming OS voice-control testing or reclassifying every badge as a label. Actual visible/AX names match Device drafts1/17, zero is Device drafts0, unreadable remains Device drafts — with Some records unavailable. No count calculation, storage or route change. New isolated Lighthouse snapshot passes this rule (score1),35 audits passed/0 failed; complete WCAG remains unverified.


### Physical-device gate and verification boundaries

Actual iPhone/Safari or Android browser installation, safe areas, camera, software keyboard and OS screen reader were not exercised. Windows PnP/SDK/PATH/tool/browser probes found no verified controllable phone channel in this runtime; this is not a claim that no phone exists anywhere. Missing prerequisite is an approved controllable real-device session with keyboard and access to the current owned candidate. No device-farm install, public deployment, firewall/LAN change or credentials request was performed.

Real browser zoom, full contrast/manual WCAG, browser-process cold launch and eviction are also not established. All CSS-inset, CDP touch and layout-reflow evidence is labelled simulation. The audit found the issues above; it does not assert all bugs were found.

Cleanup completed for current managed8903/8904 and the isolated audit context: four known stores cleared, owned worker/cache removed, tabs/services closed and accepted temporary runtime deleted. Checkpoint/failed candidates and actual PNG/JSON/Lighthouse evidence remain outside the repository. No unrelated origin, source checkpoint restore, new commit, push or deployment.

## Authorized post-audit correction and local release v0.6.4

- Owner A/B/C selected actual VIS09-13 comparisons, BUG-017/label correction, and combined local main commit only.
- Final104 behavior contracts, four modified JS syntax targets and35-file pristine runtime passed. Final eight-route/six-size matrix:48 actual screenshots, no horizontal overflow or observed page exceptions. Worker0.6.4 is complete with missing0/offlineReadytrue.
- Exact pre-edit working-tree ZIP and actual pointer/field/save/count/unavailable/Lighthouse evidence retained externally in `constructclaim-picker-label-BxtujW`. Existing reference PNGs and `_site` untouched.
- No new dependency/module/schema/calculation/update policy, no permanent wording/wiring tests, no push/deployment. Real phone/software keyboard/OS screen reader, actual browser zoom and full WCAG remain outside verified coverage.

Post-fix cleanup: both owned8905 contexts' four known stores confirmed0; owned cache/registration removed; tabs/service closed and accepted runtime deleted. Exact source checkpoint and actual PNG/JSON/Lighthouse evidence retained; no restore or unrelated origin change.

