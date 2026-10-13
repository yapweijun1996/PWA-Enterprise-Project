# ConstructClaim codebase review

## Scope and evidence

The review observations below are historical evidence from v0.4.0. **All 13 confirmed findings are now fixed and locally verified in v0.5.0**, following the approved full-remediation option. See [Local remediation and verification](#local-remediation-and-verification). Original reproduction text and baseline line references are retained; they do not describe the current implementation.

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
