# Design Review: AG-10 - Filter transactions by type

- Run ID: AG-10-4 (branch `feature/AG-10-4`)
- Stage: 3 - Design Review
- Review date: 2026-11-02
- Reviewer: `design-review-agent` (Claude Code), one-shot run; no conversation with the user took place
- **Status: APPROVED (Stage 3) - 2026-11-02.** Approval evidence: user message "yes,APPROVE Stage 3" (relayed by the orchestrator), plus the user's approval to apply all proposals P-1..P-5 to `architecture.md` and the decisions recorded in Section 7. **Scope of this approval:** it covers this Stage 3 review and P-1..P-5 as proposals. **Architecture Draft 2 (the amended `architecture.md`) is APPROVED by the user** via the message "approve Draft 2" (relayed by the orchestrator, 2026-11-02); see Section 7 (UD-5..UD-8) and the Addendum (Section 13). The scope of the Draft 2 approval is limited to Stage 3 / Draft 2. Nothing here is approval for Stage 4, any commit, any push, or any pull request.
- This reviewer did not modify application code, `requirements.md`, `architecture.md`, or `workflow-session.json`. Nothing was staged, committed, or pushed by this reviewer. (The architecture-agent amended `architecture.md` after approval of the proposals; that amendment is reviewed in Section 13.)

## 1. Review Scope and Artifacts Reviewed

| Artifact | State | Notes |
|---|---|---|
| `requirements.md` (revision 2) | APPROVED, committed c2a435c | FR-001..013, NFR-001..006, AC-001..013, BR-001..004, D-01..D-11 |
| `architecture.md` (Draft 1, approved) | APPROVED, committed 9b19c82 | C1..C9, PD-01..PD-05, R-01..R-08, A-S1..A-S4 |
| `index.html`, `script.js`, `styles.css` | Read in full by this reviewer | Used to verify architecture claims independently |
| `tests/app.test.cjs` | Read in full | Fake DOM and harness feasibility |
| `.claude/skills/design-review/SKILL.md` | Read | Finding format |
| Baseline test run | **Executed** by this reviewer: `node --test tests/` on Node v20.17.0 gave 15 tests, 15 pass, 0 fail, 0 cancelled, 0 skipped | Confirms the architecture's baseline claim |

Not reviewed or Not Found: real-browser behavior (nothing was run in a browser), screen-reader behavior, CI configuration (no `.github`, no `package.json` exist in the repo root listing), any CSP (none in `index.html`).

## 2. Summary and Overall Recommendation

The architecture is sound, minimal, and consistent with the repository's conventions. Every repository claim I checked against the source was accurate (Section 3). The design honors every confirmed decision (D-01..D-11), traces every FR/NFR/AC/BR, keeps the storage schema and the balance path untouched, and correctly identifies and resolves the one real tension in the requirements (the `#empty-state` element sitting outside the `aria-live` region).

I found **no Critical or High issues and no true blockers**. I found three Medium items (an internal contract inconsistency in the renderer, an unverified and partly questionable browser form-state mitigation, and the fact that several acceptance criteria can only be evidenced manually), four Low items, and three Info items. None prevents Implementation Planning from starting; the Medium and Low items are best folded in as small, clarifying amendments to `architecture.md` so that the implementation plan is unambiguous.

**Recommended verdict (recommendation only): Approve with changes** - the changes are clarifications (Section 6, P-1..P-5) that need the user's approval because they amend an approved document. If the user prefers to accept all findings as-is, the design can also proceed unchanged with the risks recorded in Section 8; no finding makes that unsafe.

## 3. Independent Verification of Architecture Claims

Each claim was checked against the actual files. "Verified" means I read the cited code; it does not mean the behavior was exercised in a browser.

| # | Architecture claim (section) | Result | Evidence |
|---|---|---|---|
| V-01 | `TRANSACTION_TYPES = ["Expense","Money Received"]`; `isStoredTransaction` rejects other types (S3) | Verified | `script.js` line 3; lines 116-124 (`TRANSACTION_TYPES.includes(transaction.type)`) |
| V-02 | Only `load()`/`save()` touch storage; `load()` may write once for migration (S3) | Verified | `script.js` lines 204-259; `saveEnvelope` called from `load()` line 231 and `save()` |
| V-03 | Module state `transactions`, `repositoryReady`, `isSaving`, `isLoading` (S3) | Verified | `script.js` lines 289-292 |
| V-04 | `showElement` toggles `hide`, null-tolerant (S3) | Verified | `script.js` lines 294-298 |
| V-05 | `renderTransactions` builds the list first, then `replaceChildren`, then balance, then `emptyState.hidden` (S3, atomicity) | Verified | `script.js` lines 387-398; the list is built (lines 388-392) before any DOM mutation (line 394) |
| V-06 | `renderLoadFailure` hides balance and `#empty-state`, clears history, shows load-error and retry (S3) | Verified | `script.js` lines 400-412 (`transactionHistory.replaceChildren()` at line 405 also removes any filter message, so FR-013 "no filter message" holds) |
| V-07 | `loadTransactions` renders, then assigns state; any throw goes to `renderLoadFailure`; called on retry click and once at start-up (S3) | Verified | `script.js` lines 414-436, 526-530 |
| V-08 | Retry button is visible only after a failure, so `loadTransactions` cannot run after a successful load (underlies R-07) | Verified | `script.js` lines 426-429 hide retry on success; only callers are the retry click and line 530 |
| V-09 | Submit handler computes `updatedTransactions`/`updatedBalance` from the full list, then `form.reset()`, then `renderTransactions(transactions, updatedBalance)` (S3, D-05, D-06) | Verified | `script.js` lines 482-483, 507-511; no handler change is needed for D-05/D-06 |
| V-10 | `#empty-state` is a **sibling** of the `aria-live="polite"` region `#transaction-history`, not inside it (PD-03) | Verified | `index.html` lines 100-103 versus line 103 |
| V-11 | `form.reset()` cannot affect the filter radios because they are placed outside `#transaction-form` | Verified by markup and by the fake DOM: the form element is `section.history-card`'s sibling subtree; the proposed placement is inside `.history-card` (lines 94-104), outside the `<form>` (lines 32-91). The fake `reset()` only touches amount, note, and type ids (`tests/app.test.cjs` lines 79-88). Real-browser `reset()` only resets listed form controls, which radios outside the form are not. | `index.html`, `tests/app.test.cjs` |
| V-12 | CSS `.field input`/`.field select` rules are scoped under `.field`, so unscoped radios are not affected by `width:100%`/`min-height` form styling | Verified | `styles.css` lines 80-96 |
| V-13 | `.hide` is declared at line 183 after component rules, single-class specificity (R-04) | Verified | `styles.css` lines 183-185; only one media block (line 187) |
| V-14 | `#empty-state` and `#balance-amount` use the `hidden` attribute and have no author `display` rule, so `hidden` works for them | Verified | `styles.css` lines 125-128; `.balance-value` lines 57-61 have no `display` |
| V-15 | Fake DOM supports only `classList.toggle`, one listener per event name per element, `dispatch` with no `target`, fixed id list, no `querySelector`/`closest`/radio exclusivity | Verified | `tests/app.test.cjs` lines 24-93, 114-149 |
| V-16 | Harness appends an export snippet inside the same `vm` script, so new top-level `const`/`let` are reachable | Verified | `tests/app.test.cjs` lines 152-165 |
| V-17 | `window` in the harness is a plain object (`localStorage`, `crypto` only) with no `addEventListener` | Verified; relevant to DR-002 | `tests/app.test.cjs` lines 141-146 |
| V-18 | Existing markup test would not be broken by new ids/class names (`id="(?:budget|expense-title|edit|delete)..."` negative check) | Verified; `filter-*` ids do not match | `tests/app.test.cjs` lines 173-200 |
| V-19 | Schema/storage untouched by the design | Verified at design level: no new call to `getItem`/`setItem`/`transactionRepository` is proposed on the filter path; `TRANSACTION_SCHEMA_VERSION` unchanged | `architecture.md` S4, S7; `script.js` line 2 |
| V-20 | Baseline: 15 tests pass | Verified by execution in this review | Test run described in Section 1 |
| V-21 | Mermaid diagrams in S4.4/S4.5 are syntactically plausible and consistent with the component table | Read-only check, not rendered. Note one inconsistency: the filter-change sequence diagram renders "using candidate key" (see DR-001) | `architecture.md` S4.4-4.5 |

## 4. Review Areas and Outcome

"Passed" is used only where I found nothing to raise. Areas with open findings are marked "Passed with findings" and are not described as clean.

| Review area (design-review skill) | Outcome | Notes |
|---|---|---|
| 1. Requirements coverage and traceability | Passed | All 13 FR, 6 NFR, 13 AC, 4 BR, 11 D map to a component or decision (S14). I re-checked a sample (FR-005/010, FR-011, FR-013, AC-006, AC-012) against the decision table and flows and found no gap. Evidence for AC-007/AC-013/NFR-003 is partly manual (DR-003). |
| 2. Component responsibilities and boundaries | Passed with findings | Boundaries are clean (pure predicate, single mapping, balance off the filter path). One contract ambiguity in C5/C4 (DR-001). |
| 3. Data flow and integration contracts | Passed with findings | DR-001 only. Add, load, retry flows verified (V-07..V-09). |
| 4. Security, secrets, sensitive data | Passed | `textContent` only, no storage on filter path, internal-only filter keys, no CSP change, no secrets. No finding raised. |
| 5. Error handling and failure scenarios | Passed with findings | Load-failure precedence is correct (V-06). The speculative revert branch is questionable (DR-004). |
| 6. Maintainability, testability, scalability | Passed with findings | Testable with the existing fake DOM, but some outlined assertions would be vacuous (DR-005); small duplication (DR-007). |
| 7. Technology choices and compatibility | Passed with findings | Native radio group is appropriate. The `autocomplete="off"` on radios is questionable (DR-002). |
| 8. Missing dependencies, assumptions, operational concerns | Passed with findings | Real-browser/screen-reader evidence cannot be produced by the existing test setup (DR-003). No CI exists (Not Found); no dependency added. |

## 5. Findings

Severity scale: Critical / High / Medium / Low / Info. "Blocker" means the finding must be resolved before the next stage can start. Status values: Open, Accepted, Resolved, Deferred. The status shown on each finding is the **current** status after the re-review in Section 13; the original review state was Open for DR-001..DR-007. "Resolved" here means the amended `architecture.md` text addresses the finding; that text (Draft 2) was approved by the user ("approve Draft 2", 2026-11-02).

Summary by severity (after re-review, Section 13, and the user decisions of 2026-11-02): Critical 0, High 0, Medium 3, Low 5, Info 6 (14 findings; DR-011..DR-014 were added by the re-review). Dispositions: DR-001..DR-007 Resolved; DR-008..DR-010 Info/Resolved; DR-011 and DR-014 Deferred to the Stage 4 implementation plan; DR-012 Accepted (unreachable, no guard); DR-013 Accepted/Ignored. True blockers: 0. The original review (DR-001..DR-010) had Medium 3, Low 4, Info 3.

### DR-001 - Medium - Component contract - `renderHistoryList` signature conflicts with the filter-change flow (confirmed inconsistency)

- **Evidence.** `architecture.md` S4.1 C5 defines `renderHistoryList(allTransactions)` as building the view "from `allTransactions` and `activeFilter`". C4 and the S4.5 sequence diagram say `setActiveFilter` "re-renders ... using candidate key" and **then** commits `activeFilter` (so that a render failure leaves the old state). With the C5 signature the renderer can only read the committed module variable, so the candidate key cannot be passed without either mutating `activeFilter` before rendering (contradicting "commit afterwards") or adding a parameter. Related: `renderTransactions(allTransactions, balance)` now silently filters, though its parameter name and callers suggest it renders exactly what it is given.
- **Impact.** An implementer must guess. A wrong guess (set state first, render second) quietly invalidates the stated rollback behavior of S8 row "Unexpected render exception". Low runtime risk, but it is the one place where the approved text is not self-consistent.
- **Recommendation.** Amend C5 to `renderHistoryList(allTransactions, filterKey = activeFilter)` and have `renderTransactions` call it with the default. Add a one-line comment/doc note that `renderTransactions` applies the active filter and that `allTransactions` must be the full list. If P-3 (drop revert branch, DR-004) is adopted, the "candidate key" language can simply be removed and the signature may stay as written; either way the text should be made consistent.
- **Blocker?** No. Can be resolved in the implementation plan if the user prefers not to reopen `architecture.md`.
- **Status.** Resolved. The amended text (P-1) was confirmed by re-review (Section 13.2) and Draft 2 was approved by the user ("approve Draft 2", 2026-11-02).

### DR-002 - Medium - Browser compatibility / assumption - Form-state restoration mitigation is unverified and partly questionable (potential risk, Not Verified)

- **Evidence.** PD-05 and R-03 rely on (a) explicitly setting `checked` from `activeFilter` at start-up and (b) `autocomplete="off"` on each radio, and the S11 markup test would assert (b). Observations:
  1. As far as I know, the HTML specification does not list `radio` among the input types to which `autocomplete` applies (it applies to text-like, date/number, color, and hidden types). Browsers may still honor it (some historically do for form-state restoration), but the attribute may be flagged by HTML validators, and its effect is **Not Verified** here. I did not run a browser or consult the browsers' source in this review.
  2. Whether start-up `checked` assignment wins over browser restoration depends on when each browser restores state relative to a script placed at the end of `<body>` (`index.html` line 106). That timing is **Not Verified** (the architecture says the same). If restoration happens after the script, the control and `activeFilter` would disagree (violates AC-007) and the mitigation in (a) would not help.
  3. The test harness cannot exercise this at all (see DR-003/DR-005); the existing `window` stub has no `addEventListener` (V-17), so any additional `pageshow`/`load` re-sync must be null-guarded or it will crash start-up in all tests.
- **Impact.** Plausible but unconfirmed AC-007 failure after a browser reload in some browsers (radio shows Income, list shows All). Severity Medium because the symptom is a visible mismatch of control and list, but it is recoverable by one click, and no data is affected.
- **Recommendation.** Keep PD-05's state-driven sync (it is correct and cheap). Treat `autocomplete="off"` as a best-effort attribute rather than a requirement: do not make it a mandatory assertion in the markup test. Optionally add a second sync call from a guarded `pageshow` (or `window.addEventListener` if present) handler. Make the manual reload check in Firefox and a Chromium-based browser an explicit Verification checklist item whose result is reported honestly (including "Not Run" if no browser is available).
- **Blocker?** No.
- **Status.** Resolved (amended text P-2; Draft 2 approved by the user, 2026-11-02). The underlying browser form-state restoration risk remains **unverified** and is **Deferred** to manual Verification check M-2 (user decision).

### DR-003 - Medium - Testability / verification evidence - Several acceptance criteria cannot be evidenced by the existing automated setup (confirmed limitation)

- **Evidence.** `architecture.md` S11 and S14.6 already state that announcement, real CSS at 600px, and browser restoration are manual. The repo has no browser tooling and no CI (`package.json`, `.github` Not Found); the fake DOM does no layout, no accessibility tree, and no radio exclusivity (V-15). A CLI agent run is unlikely to be able to perform a real-browser or screen-reader check.
- **Impact.** AC-007 (reload part), AC-013 (announcement, keyboard operation), NFR-001 (announcement), and NFR-003 (600px) will have **no execution evidence** at Verification unless the user performs the manual checks. CLAUDE.md section 10 forbids reporting them as passed in that case.
- **Recommendation.** Record in `architecture.md` S11/S12 (or the implementation plan) that these items are expected to be reported as **Not Run (manual)** unless the user supplies evidence, and add a short manual checklist (keyboard Tab/arrow/Space, empty-message announcement in a screen reader, 600px wrap, reload in two browsers). This is an acceptance of reduced evidence, not a pass.
- **Blocker?** No. Risk acceptance requires the user's decision.
- **Status.** Resolved in the amended text (P-5: Section 11.1 checklist M-1..M-4, Not Run (manual) rule). The evidence gap itself is **Accepted** by the user's decision that the user or a reviewer will run the manual checks at Verification; those items are not passed until a person supplies a result. Status: Resolved; the manual-evidence gap is accepted per user decision (Draft 2 approved 2026-11-02).

### DR-004 - Low - Error handling - Speculative "revert and call `renderLoadFailure`" branch should be dropped (design opinion; the architect flagged it as R-06)

- **Evidence.** `architecture.md` S8 last-but-one failure row and R-06. In the filter path the only inputs are already-validated records (`isStoredTransaction`, V-01) rendered through `createTransactionElement`/`formatINR`/`formatTransactionDate`, which throw only for unvalidated values. Because the list and message nodes are built before the DOM is mutated (V-05), a throw would leave the old list in place anyway. Calling `renderLoadFailure(error)` would also set `repositoryReady = false`, disable saving, hide the balance, and print "<message> No empty history is being shown." - presenting an in-memory render bug as a storage load failure (`script.js` lines 400-412), and it is practically unreachable, so it would ship untested.
- **Impact.** Extra dead branch, misleading user message if it ever fired, more surface for the implementation and tests.
- **Recommendation.** Drop the branch: build first, then replace children, then commit `activeFilter` and sync radios; let any unexpected exception propagate as it would elsewhere. R-06 itself says dropping affects no requirement. If the user wants a guard, make it local (restore previous selection and keep the old list) without invoking `renderLoadFailure`.
- **Blocker?** No.
- **Status.** Resolved (amended text P-3; Draft 2 approved 2026-11-02). One residual is recorded as DR-012 (Info), Accepted.

### DR-005 - Low - Test design - Some outlined assertions would pass vacuously against the fake DOM (confirmed)

- **Evidence.** (a) S11 integration row "'Add one to get started' absent": in the harness `#empty-state` is a bare `FakeElement` whose `textContent` is `""` (HTML is never parsed; `tests/app.test.cjs` lines 24-46, 133-139), so that text is never present regardless of behavior. The meaningful assertion is `elements["empty-state"].hidden === true`. (b) The filter fieldset in the fake starts with `className = ""`, so an assertion that the filter is *visible after a successful load* (`!className.includes("hide")`) passes even if `showElement(filter, true)` is never called. (c) The "new `createApp` on the same storage starts at All" test (S11) re-creates a fresh `vm` context, so it proves only that state is not stored, not that a browser reload resets the radio (that is DR-002/manual).
- **Impact.** False confidence in AC-005/AC-006/AC-007/AC-012 if implemented as written.
- **Recommendation.** In `createApp`, initialize the fake filter element with `className = "hide"` to mirror the shipped markup; assert the "no stored transactions" message through the markup test (text exists in `index.html`) plus `emptyState.hidden`; label the recreate-app test as a state-not-persisted check only. Also assert the negative storage case with a write-count spy (the `createStorage` helper exposes `values` but not a call counter; the spy must be added in the test, not the app).
- **Blocker?** No.
- **Status.** Resolved (amended text P-4: items (a), (b), (c) and the write-spy note all addressed; Draft 2 approved 2026-11-02). A closely related gap in the same test-design area was found during re-review and is raised as DR-011 (Low), Deferred to the Stage 4 implementation plan.

### DR-006 - Low - Accessibility - Arrow-key traversal fires a `change` and a live-region update on every step (potential, Not Verified)

- **Evidence.** Native radio groups change selection (and fire `change`) as the arrow keys move focus, so moving from All to Expenses passes through Income, replacing the list inside the `aria-live="polite"` region at each step (PD-01 point 3, PD-03, R-01).
- **Impact.** Possible chatter for screen-reader users with long histories. How polite queueing handles it is **Not Verified**. R-01 already accepts the whole-list re-announcement and D-10 forbids a count-based summary.
- **Recommendation.** No design change. Fold into the manual checklist (DR-003) and note as accepted under R-01 if the user agrees.
- **Blocker?** No.
- **Status.** Resolved (no design change; folded into manual check M-3 and R-01 as recommended; Draft 2 approved 2026-11-02).

### DR-007 - Low - Maintainability - Type literals defined in several places (confirmed, minor)

- **Evidence.** `"Money Received"`/`"Expense"` already appear in `TRANSACTION_TYPES` (line 3) and `calculateAvailableBalance` (lines 41-44); C2 adds a third mapping. The architecture mitigates with a coverage unit test (`TRANSACTION_TYPES` vs `TRANSACTION_FILTERS`, S11).
- **Impact.** A future third type would need touching three places; the test would catch a missed filter mapping but not a missed balance sign.
- **Recommendation.** Keep as designed (consistent with the repository's current style, no refactor of unrelated code). Keep the coverage test mandatory. No new abstraction.
- **Blocker?** No.
- **Status.** Resolved as Accepted (no design change; the amended Section 12 keeps the coverage unit test mandatory, and Section 11 still lists it; Draft 2 approved 2026-11-02).

### DR-008 - Info - Assumption R-07 / A-S2 is moot (confirmed)

- **Evidence.** V-08: `loadTransactions` runs only at start-up and from the retry button, and retry is hidden after any success. The filter is hidden on failure and revealed only after success, so `activeFilter` is always `"all"` whenever a failure or a retry occurs. The question "does a retry reset the filter?" cannot arise.
- **Impact.** None. Already confirmed by the user's Stage 2 approval; recorded here as independently verified.
- **Recommendation.** None.
- **Status.** Resolved (no action).

### DR-009 - Info - D-05 user-experience note (no action)

- **Evidence.** Under D-05 the status "Transaction added." appears while a non-matching new item is not visible.
- **Impact.** A student could momentarily wonder where the item went. This is the confirmed user decision, and a count or extra hint is excluded by D-10.
- **Recommendation.** None; do not change without a new decision.
- **Status.** Resolved (no action; behavior is as decided).

### DR-010 - Info - Positive verification record (no action)

- The load-failure flow (V-06, V-07), PD-03's live-region claim (V-10), `form.reset()` independence (V-11), the "build before mutate" atomicity (V-05), the unchanged schema/storage (V-19), the 15-test baseline (V-20), and cross-checks of the decision table against FR-010/AC-005/AC-006 all held. Scenario checked that the architecture does not list explicitly but its table handles: stored count 0, filter Income, user adds an Expense, so the empty-state is hidden and the Income message appears while the balance updates.
- **Status.** Resolved.

## 6. Proposed Design Decisions / Architecture Changes (require user approval)

These amend the approved `architecture.md`. I have **not** applied any of them.

| ID | Resolves | Proposed change | Effect |
|---|---|---|---|
| P-1 | DR-001 | In C5 and the S4.5 filter-change diagram, give `renderHistoryList` a `filterKey` parameter defaulting to `activeFilter`; add a note that `renderTransactions` applies the active filter and must receive the full list. | Clarification; no behavior change. |
| P-2 | DR-002 | Amend PD-05/R-03: `autocomplete="off"` is best-effort, not a mandated markup assertion; optionally add a guarded `pageshow` re-sync; make the two-browser reload check an explicit Verification item. | Lowers a questionable test coupling; no scope change. |
| P-3 | DR-004 | Drop the "revert and `renderLoadFailure`" branch from S8 and close R-06. | Removes an unreachable, misleading path. |
| P-4 | DR-005 | In S11 specify: fake filter starts with `className = "hide"`; assert `#empty-state.hidden` rather than absent text; relabel the recreate-app test. | Prevents vacuous tests. |
| P-5 | DR-003, DR-006 | Add to S11/S12 an explicit statement that AC-007 (reload), AC-013, NFR-001 announcement, and NFR-003 are manual-evidence items to be reported as Not Run unless the user supplies evidence, with a short manual checklist. | Honest evidence plan. |

None of P-1..P-5 changes a requirement, a confirmed decision (D-01..D-11), or the approved PD-01..PD-04 choices. If the user declines all of them, the existing architecture can proceed; the findings would then be recorded as Accepted.

## 7. User-Approved Decisions

Recorded 2026-11-02, from the user's messages relayed by the orchestrator:

| # | Decision | Evidence | Scope |
|---|---|---|---|
| UD-1 | Stage 3 (this design review) is approved | User message "yes,APPROVE Stage 3" | Covers the review as written, including the findings and the verdict "Approve with changes". |
| UD-2 | All proposals P-1..P-5 are approved for application to `architecture.md` | User approval relayed by the orchestrator | Approved **as proposals**. The architecture-agent's resulting text (Draft 2) was a separate artifact; its approval is recorded in UD-5. |
| UD-3 | Manual browser checks (AC-007 reload, AC-013 and NFR-001 announcements, NFR-003 at 600px) will be run by the user or a reviewer at Verification | User decision relayed by the orchestrator | Until a person supplies a result, these are reported as Not Run (manual). |
| UD-4 | `autocomplete="off"` stays as a best-effort attribute, with an explicit two-browser reload check as a Verification item | User decision relayed by the orchestrator | Not a mandated markup assertion. |
| UD-5 | Architecture Draft 2 (the amended `architecture.md`, including the amended PD-05 and the other Draft 2 changes) is **APPROVED** | User message "approve Draft 2" (relayed by the orchestrator, 2026-11-02) | Limited to Stage 3 / Draft 2. Does not cover Stage 4, any commit, any push, or any pull request. |
| UD-6 | DR-012 is accepted as unreachable; no extra guard (no `finally { syncFilterControls() }`) | User explicit choice (relayed by the orchestrator, 2026-11-02) | DR-012 status: Accepted. |
| UD-7 | DR-011 and DR-014 are carried into the Stage 4 implementation plan, not the architecture text | User decision (relayed by the orchestrator, 2026-11-02) | Status: Deferred to the Stage 4 implementation plan. `architecture.md` is not to be edited for them. |
| UD-8 | DR-013 is ignored; the stale Section 3 Git-status row is not relabelled | User decision (relayed by the orchestrator, 2026-11-02) | DR-013 status: Accepted/Ignored. |

PD-01..PD-04 and the accepted assumptions of Stage 2 remain as approved in `architecture.md` Draft 1 (committed 9b19c82). The amendment of PD-05 and the other Draft 2 changes are approved per UD-5.

**Not covered by any approval recorded here:** Stage 4 (Implementation Planning), any commit, any push, any pull request. (The Draft 2 approval, UD-5, is limited to Stage 3 / Draft 2.)

## 8. Accepted or Deferred Risks

The user decided UD-3 and UD-4 (Section 7), which fix the disposition of the manual-evidence and browser-restoration rows below, and UD-6 for the DR-012 row. The remaining rows were proposed in this review and are carried in the amended `architecture.md` Section 12; their acceptance is confirmed by the user's approval of Draft 2 (UD-5). None of these is counted as a passed check.

| Risk | Finding | Proposed disposition | Condition to revisit |
|---|---|---|---|
| Whole-list re-announcement and arrow-key chatter in the live region | DR-006, R-01 | Accept | A real screen-reader check reports the behavior as unusable |
| Type literals repeated in three places | DR-007 | Accept | A third transaction type is introduced |
| Manual-only evidence for AC-007 reload, AC-013, NFR-001, NFR-003 | DR-003 | Accepted by user (UD-3): reported as Not Run (manual) unless evidence supplied | The user wants automated browser tests (would add tooling, out of scope per NFR-004) |
| Browser form-state restoration unverified | DR-002 | Deferred to Verification check M-2 (UD-4) | The reload check shows a control/list mismatch in any browser |
| Radio/list mismatch if a render exception occurred during a filter change (unreachable with validated data) | DR-012 | Accepted by user (UD-6): unreachable, no extra guard | Any code path is found that can feed unvalidated data to the filter render |

## 9. Unresolved Questions

Original questions, now answered by the user (Section 7): (1) P-1..P-5 approved for application; (2) the user or a reviewer will perform the manual browser checks; (3) `autocomplete="off"` stays best-effort with a two-browser reload check.

Questions raised by the re-review (Section 13), now answered by the user (Section 7): (4) Draft 2 re-approved (UD-5); (5) DR-012 accepted as unreachable with no guard (UD-6); (6) DR-011 and DR-014 go to the Stage 4 implementation plan, not the architecture text (UD-7); and DR-013 is ignored (UD-8).

Still open: none for Stage 3. Carried forward: DR-011 and DR-014 must be addressed in the Stage 4 implementation plan (which requires its own approval).

## 10. Blockers

None. There are no true blockers, including after the re-review (Section 13). No finding is raised to blocker status, so there is no unblocking condition to define. The re-approval gate for the amended `architecture.md` (Draft 2) has been cleared by the user ("approve Draft 2", 2026-11-02). The next gate is the separate Stage 4 approval workflow, which this document does not cover.

## 11. Final Review Status

- Review outcome: **Approve with changes** (P-1..P-5, all non-blocking clarifications). Stage 3 **APPROVED 2026-11-02** by the user ("yes,APPROVE Stage 3"). Architecture Draft 2 **APPROVED 2026-11-02** by the user ("approve Draft 2").
- Findings: 14 total - Critical 0, High 0, Medium 3 (DR-001, DR-002, DR-003; all Resolved; DR-002 browser-restoration risk unverified and deferred to manual check M-2; DR-003 manual-evidence gap accepted), Low 5 (DR-004, DR-005, DR-006, DR-007 Resolved; DR-011 Deferred to the Stage 4 implementation plan), Info 6 (DR-008, DR-009, DR-010 Resolved; DR-012 Accepted, unreachable, no guard; DR-013 Accepted/Ignored; DR-014 Deferred to the Stage 4 implementation plan). True blockers: 0.
- Requirements coverage: complete per the architecture's traceability; spot-checked independently; unchanged by the amendment (Section 13.3).
- Approval scope: Stage 3 approval covers this review and P-1..P-5 as proposals. The amended `architecture.md` (Draft 2) is **APPROVED by the user** ("approve Draft 2", 2026-11-02); this approval is limited to Stage 3 / Draft 2. There is no approval for Stage 4, any commit, push, or pull request.
- Artifacts: this file (`design-review.md`). `architecture.md`, `requirements.md`, and `workflow-session.json` were not edited by this reviewer.

## 12. Revision History

| Revision | Date | Summary |
|---|---|---|
| Draft 1 | 2026-11-02 | Initial design review of architecture Draft 1 (approved). 10 findings, no blockers. Awaiting human approval. |
| Draft 2 (approved, Stage 3) | 2026-11-02 | Stage 3 approval recorded ("yes,APPROVE Stage 3"; P-1..P-5 approved as proposals; UD-1..UD-4). Added Section 13: focused re-review of the architecture Draft 2 amendment, statuses of DR-001..DR-007 updated, new findings DR-011..DR-014. Amended `architecture.md` remained pending the user's re-approval at that point. |
| Draft 3 (Draft 2 approved) | 2026-11-02 | Recorded the user's "approve Draft 2" approval of the amended `architecture.md` (UD-5) and decisions UD-6..UD-8. Final dispositions: DR-001..DR-007 Resolved; DR-008..DR-010 Info/Resolved; DR-011 and DR-014 Deferred to the Stage 4 implementation plan; DR-012 Accepted (unreachable, no guard); DR-013 Accepted/Ignored. Findings' evidence and severities unchanged. No approval for Stage 4, commit, push, or PR. |

## 13. Addendum - Re-review of amended architecture (Draft 2)

- Date: 2026-11-02. Reviewer: `design-review-agent` (Claude Code), one-shot run.
- Subject: the amendment of `architecture.md` (header "AMENDED - PENDING RE-APPROVAL"), reviewed through `git diff -- .claude/AgentOutput/AG-10-4/architecture.md` against HEAD (9b19c82), the amended file itself, and the repository files `script.js`, `index.html`, and `tests/app.test.cjs`.
- Scope: the amendment only. Unchanged Draft 1 text was not re-reviewed beyond the cross-references listed below.
- Not executed: no tests were run in this re-review (the amendment contains no code; the baseline run in Section 1 still stands). No browser was used; browser behavior remains Not Verified.
- **Verdict (recommendation only): the amendment faithfully and consistently applies P-1..P-5. No Critical, High, or Medium finding. One new Low (DR-011) and three new Info items (DR-012..DR-014). No true blockers.** The amended text (Draft 2) was subsequently approved by the user ("approve Draft 2", 2026-11-02; UD-5); that approval is limited to Stage 3 / Draft 2 and does not cover Stage 4, any commit, push, or PR. Post-review dispositions are in Sections 7 and 13.3-13.6.

### 13.1 Integrity check (nothing changed that should not have)

| Check | Result | Evidence |
|---|---|---|
| `requirements.md` untouched | Confirmed | `git status` lists only `architecture.md` as modified; `design-review.md` and `workflow-session.json` are untracked |
| D-01..D-11 and FR/NFR/AC/BR meaning unchanged | Confirmed | The diff contains no edit to a requirement or D-item. The only requirement-ID edits are added cross-references (M-1..M-4) in the traceability tables |
| PD-01..PD-04 meaning unchanged | Confirmed | PD-01..PD-03 are untouched in the diff; PD-04 gained one clarifying bullet only (the `filterKey` parameter), and its Proposal/Rationale/Rejected-alternatives text is unchanged |
| PD-05 changed | Yes, openly: the mandate of `autocomplete="off"` is downgraded to best-effort and an optional guarded `pageshow` sync is added | This is a change to an approved Stage 2 decision. The architect flagged it as "pending re-approval". It is within the user-approved P-2 and UD-4. The user must still re-approve the amended wording |
| No ID renumbered or deleted | Confirmed | R-06 is kept and marked CLOSED; Section 13 keeps the historical Draft 1 PD list; Revision History gains a row |
| Draft 1 approval record preserved | Confirmed | Section 13 labels the original list as historical and records "Draft 2 approval: none yet" |
| Header status is honest | Confirmed | "AMENDED - PENDING RE-APPROVAL"; states the user has not approved the amended text and that nothing covers Stage 4, commit, push, or PR |

### 13.2 Per-proposal result

| P | Targets | Result | Basis |
|---|---|---|---|
| P-1 | DR-001 | **Confirmed, resolves DR-001** | `renderHistoryList(allTransactions, filterKey = activeFilter)` appears consistently in C5, C4 (`setActiveFilter` passes the candidate key, then commits and syncs), the Section 4.5 filter-change diagram (message line and the commit line), the add-flow diagram, the load flowchart label, PD-04's clarification, Section 10's integration table, and the amendment note. `renderTransactions` keeps its signature and calls `renderHistoryList(allTransactions)` with the default, then sets the balance. It still receives the **full** list: the load path passes `loadedTransactions` (`script.js` line 424) and the submit path passes `transactions` after assignment (line 511), so the full-list contract holds for both existing call sites. The Section 4.3 decision table and the Section 4.4 component diagram need no change and read consistently. Residual wording tension: none found. One implementation note (DR-014 item 1) on default-parameter evaluation. |
| P-2 | DR-002 | **Confirmed, resolves DR-002 (text); runtime risk Deferred** | `autocomplete="off"` is "may carry ... best-effort only" in C1, PD-05, the markup test row ("not asserted"), and R-03; no remaining place mandates it. The one stale mention is the historical Draft 1 list in Section 13 (explicitly labelled historical; acceptable). The `pageshow` registration is guarded with `typeof window.addEventListener === "function"` in C4 and PD-05 and the Section 11 note, and this matches the repository: the harness `window` is a plain object with only `localStorage` and `crypto` (`tests/app.test.cjs` lines 141-146) and `script.js` only reads `window.localStorage` and `window.crypto` (lines 134, 331). The two-browser reload check is explicit (M-2) with a pass condition and a Not Run rule. The restoration-timing risk itself stays Not Verified and is Deferred to M-2 as the user decided. See DR-014 items 2 and 3 for minor wording points. |
| P-3 | DR-004 | **Confirmed, resolves DR-004** | The revert branch is removed from Section 8 (the failure row now says no revert and no `renderLoadFailure`, with the correct reason: `renderLoadFailure` sets `repositoryReady = false`, disables save, hides the balance and shows the load error and retry, `script.js` lines 400-412), from the 4.5 diagram note ("exception propagates; `activeFilter` is not committed"), and R-06 is CLOSED with the matching rationale. A search of the amended file finds no remaining operative "revert" instruction; the word survives only in the R-06 title (describing what was dropped), and in line 310 the load-failure row is the pre-existing storage-failure case, which is unrelated. Residual radio/list mismatch: assessed in DR-012. |
| P-4 | DR-005 | **Confirmed with one gap, resolves DR-005; gap raised as DR-011** | (a) The "Add one to get started" check is replaced by `#empty-state.hidden === true` plus a markup-text row: sound, because the fake `#empty-state` is a bare `FakeElement` with `hidden = false` initially, so a `true` assertion is meaningful. (b) The fake filter starts with `className = "hide"` (C9, Section 11): sound, since `classList.toggle("hide", false)` then removes the class (`tests/app.test.cjs` lines 35-44) so "visible after load" becomes meaningful. (c) The recreated-app test is relabelled as a state-not-persisted check with an explicit statement that it does not prove browser reload behavior: sound (a new `vm` context is created per `createApp`, lines 151-165). (d) The write-spy note (helper has `values` but no call counter, lines 95-112): correct. Gap: the empty-storage case asserts `#empty-state.hidden === false`, but the fake starts with `hidden = false`, so that assertion is satisfied even if the render never touches the element (DR-011). |
| P-5 | DR-003, DR-006 | **Confirmed, resolves DR-003 and DR-006** | AC-007 (reload part), AC-013, NFR-001 (announcements), and NFR-003 (600px) are declared manual-evidence items in Sections 9, 11 (manual row), 11.1 (evidence rule), 12 (evidence limitation), and 14. Checklist traceability is consistent: M-1 maps to FR-001/NFR-001/AC-013 (keyboard); M-2 to AC-007/D-08/R-03 (reload); M-3 to AC-013/NFR-001/AC-004/AC-005 (announcement, with DR-006 chatter); M-4 to NFR-003 (600px). The traceability tables (FR-008, NFR-001, NFR-003, AC-007, AC-013) point to the matching M items. The "Not Run (manual), never passed, unless a person supplies a result" rule matches CLAUDE.md section 10 and the user's UD-3. Minor: M-2's back/forward variant is worded against a "reload" pass condition (DR-014 item 3). Markdown formatting: Section 12's heading follows the table in Section 11.1 without a blank line (cosmetic; may render poorly in some viewers). |

### 13.3 Statuses of DR-001..DR-010 after re-review

| Finding | Status | Reason |
|---|---|---|
| DR-001 | Resolved | P-1 confirmed; Draft 2 approved by user |
| DR-002 | Resolved; browser-restoration risk remains unverified and is Deferred to manual check M-2 | P-2 confirmed; behavior Not Verified |
| DR-003 | Resolved; manual-evidence gap Accepted per user decision (UD-3) | P-5 confirmed; items remain Not Run (manual) until a person reports a result |
| DR-004 | Resolved | P-3 confirmed; residual in DR-012 (Accepted) |
| DR-005 | Resolved | P-4 confirmed; related gap in DR-011 (Deferred to Stage 4 plan) |
| DR-006 | Resolved | Folded into M-3 and R-01 |
| DR-007 | Resolved as Accepted | No change needed; coverage test kept |
| DR-008 | Info, Resolved (no action) | Unchanged |
| DR-009 | Info, Resolved (no action) | Unchanged |
| DR-010 | Info, Resolved | Unchanged |

"Resolved" means the amended text is adequate and the user approved Draft 2 ("approve Draft 2", 2026-11-02). If Draft 2 is later edited, the affected findings should be re-checked.

### 13.4 New findings

#### DR-011 - Low - Test design - Empty-storage assertion `#empty-state.hidden === false` is vacuous against the fake DOM (confirmed)

- **Evidence.** Amended Section 11 integration row: "with empty storage the filter is visible and `#empty-state.hidden === false`". In the harness, `FakeElement` initialises `hidden = false` (`tests/app.test.cjs` line 34) and `createApp` does not override it for `empty-state` (lines 133-139). The shipped markup has `<p id="empty-state" hidden>` (`index.html` line 100). So the assertion holds before any script runs; an existing test already has this weakness (line 323). It is the same class of problem as DR-005(b), which P-4 fixed for the filter fieldset but not for `#empty-state`.
- **Impact.** The AC-006 "prompt stays visible under every option" check could pass even if the render never un-hides the element. Low: the `true` direction is meaningful and the shipped markup is correct.
- **Recommendation.** In `createApp`, initialise `elements["empty-state"].hidden = true` to mirror the markup (the existing tests set `hidden` on every render path, so this should not break them; confirm by running the suite at implementation time). Add one line to Section 11/C9 or leave it to the implementation plan.
- **Blocker?** No.
- **Status.** Deferred to the Stage 4 implementation plan (user decision UD-7); `architecture.md` is not to be edited for it.

#### DR-012 - Info - Error handling - Residual radio/list mismatch after an unexpected render exception (assessment requested; recommendation: accept)

- **Evidence.** Amended Section 8 records: if the render throws during a filter change, the old list stays and `activeFilter` is not committed, but the radio the user just clicked is already natively checked by the browser, so the control and the list could disagree until the next change. The architect declared it "accepted as unreachable, not mitigated". Reachability check: the filter path renders only the in-memory `transactions`, whose items were validated by `isStoredTransaction` at load or by `validateTransaction` before add; `filterTransactions` is a pure array filter; `createTransactionElement`, `formatINR`, and `formatTransactionDate` throw only for unvalidated values (Section 3, V-01, V-05). I found no path that gives the filter render unvalidated data. This is a code-reading judgement, not a test.
- **Impact.** Hypothetical only. If it ever occurred: a visible mismatch, no data affected, no storage touched, and one click on a different option recovers it (clicking the already-checked option fires no `change` event, so recovery needs a different option first; this is a one-sentence wording refinement to the architect's "until the next change").
- **Recommendation.** Acceptable as documented; no guard is required by any requirement, and this does not reintroduce the dropped `renderLoadFailure` path. If the user prefers zero known inconsistencies, the cheapest guard needs no design change: in `setActiveFilter`, wrap the render in `try { ... } finally { syncFilterControls(); }` so the radios are always re-projected from the committed `activeFilter`, and still let the exception propagate. That is a plan-level choice (one line, one test with a throwing stub), not a reason to reopen the architecture.
- **Blocker?** No.
- **Status.** Accepted (unreachable, no extra guard), by the user's explicit choice (UD-6, 2026-11-02). The optional `finally` re-sync is not to be added.

#### DR-013 - Info - Documentation accuracy - Section 3 Git-status fact is stale (confirmed, immaterial)

- **Evidence.** `architecture.md` Section 3 states: "Git: branch `feature/AG-10-4`; only untracked item is `.claude/AgentOutput/AG-10-4/workflow-session.json`." It was true when Draft 1 was written. Current `git status` shows `architecture.md` modified and both `design-review.md` and `workflow-session.json` untracked. The amendment did not touch the row.
- **Impact.** None on design. It is a point-in-time repository-intelligence fact about the Stage 2 baseline, and any restatement would go stale again at every commit.
- **Recommendation.** Optional: label the row "as of Draft 1" at re-approval, or ignore. Not worth a design iteration on its own.
- **Blocker?** No.
- **Status.** Accepted/Ignored by user decision (UD-8, 2026-11-02); the Section 3 Git-status row is not relabelled.

#### DR-014 - Info - Implementation-plan notes arising from the amendment (no architecture change required)

1. **Default parameter timing.** `filterKey = activeFilter` is evaluated at call time. `let activeFilter` must be declared and initialised before the first render call (`loadTransactions()` at `script.js` line 530); declaring it with the other module state (lines 289-292) satisfies this. A declaration placed after line 530 would raise a temporal-dead-zone error at start-up.
2. **`pageshow` is left optional.** The amendment makes the second sync optional ("may add"). The implementation plan should decide explicitly (include or omit) so Verification knows what M-2 is testing. The harness check for the guard is only that existing tests do not crash; the registered-listener branch is not exercised by tests unless a test passes a `window.addEventListener` stub (optional).
3. **M-2 wording.** The pass condition says "After reload the All radio is checked and the full list is shown". For a back/forward navigation that restores the page from the browser's back/forward cache, script state is preserved too, so "Income + Income list" would be consistent and not a defect. Suggested wording: after a normal reload both show All; after back/forward, the radio and list must agree with each other. This is a clarification for the Verification stage and does not change the requirement (AC-007 is about reload).
4. **Cosmetic.** Add a blank line before the `## 12.` heading in `architecture.md` (it directly follows the Section 11.1 table).
- **Blocker?** No.
- **Status.** Deferred to the Stage 4 implementation plan (user decision UD-7). Items 1-3 are carried into the plan; item 4 is cosmetic.

### 13.5 Re-review summary

| Item | Result |
|---|---|
| P-1 | Consistent everywhere checked; full-list contract holds for both call sites |
| P-2 | Consistent; guard matches the harness; reload check explicit; wording note in DR-014 |
| P-3 | Revert branch removed everywhere operative; R-06 closed; residual assessed as acceptable (DR-012) |
| P-4 | Sound, with one gap (DR-011) |
| P-5 | Declarations and M-1..M-4 consistent with AC-007, AC-013, NFR-001, NFR-003 traceability |
| Requirements, D-01..D-11, PD-01..PD-04 | Unchanged in meaning; no ID renumbered or deleted; PD-05 openly amended |
| New findings | DR-011 Low; DR-012, DR-013, DR-014 Info; no blockers |

### 13.6 User decisions on the re-review (recorded 2026-11-02)

1. Architecture Draft 2: **APPROVED** ("approve Draft 2"; UD-5). Scope limited to Stage 3 / Draft 2.
2. DR-012: accepted as unreachable, no extra guard (UD-6).
3. DR-011 and DR-014: carried into the Stage 4 implementation plan, not the architecture text (UD-7).
4. DR-013: ignored; the Section 3 Git-status row is not relabelled (UD-8).

No approval recorded in this document covers Stage 4, any commit, any push, or any pull request.
