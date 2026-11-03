# Implementation Plan: AG-10 Filter transactions by type

- Jira issue: AG-10, run ID AG-10-5, branch `feature/AG-10-5`
- Inputs: `requirements.md` (Approved), `architecture.md` revision 2 (Approved), `design-review.md` incl. section 9 focused re-review (Approved)
- Status: **Approved** (user, 2026-11-03; see section 7). No source file has been modified by this stage.

## 1. Verified affected files (inspected)

| File | Verified facts relevant to the plan |
|------|-------------------------------------|
| `index.html` | `.history-card` (lines 94-104) holds `#history-heading`, `#load-error`, `#retry-load`, `#empty-state` (multi-line, hidden attr), `#transaction-history` (`aria-live="polite"`). `#form-error` is `<p class="form-error hide" role="alert">` inside the form (line 86). Amount input already uses `autocomplete="off"`. Script loaded at end of body. |
| `script.js` | Element lookups at lines 261-281 (`getElementById`); `showElement(element, visible)` at 294; `renderTransactions(nextTransactions, balanceInPaise)` at 387-398 (replaceChildren, then `formatINR`, then hidden toggles: the N-2 ordering problem); `renderLoadFailure` 400-412; `loadTransactions` 414-436 (calls render at 424 with 2 args); `setFormError` 438-441; submit handler 449-524 (render call at 511 with 2 args; error pattern 514-518); retry listener 526-528; `loadTransactions()` at 530. |
| `styles.css` | `.field` at 69 (flex column), `.field label` 76, `.field select` 80-91, `#empty-state` 125-128 (`margin:0; color:#5c6678`), `.hide {display:none}` is the LAST rule before the media query (line 183). |
| `tests/app.test.cjs` | `createApp` ids list lines 115-132; `elements["transaction-type"].value = "Expense"` at 138; `__appTest` export list 153-162; `getElementById` returns null for unlisted ids (148); markup test at 173 (id list from 174); existing tests at 317-450 (empty/corrupt/retry/markup-note). Fake DOM: one listener per event name; `dispatch(name)` event has no `target`; `FakeElement.value` defaults to `""`; `classList.toggle` updates `className`. |

CI configuration: Not Found. Git: working tree has `workflow-session.json` modified and an untracked analytics JSON under `docs/codemie/analytics/` (unrelated, must not be touched or staged by the implementation).

## 2. Constraints carried into tasks (from Stage 3 re-review)

| ID | Constraint | Carried by |
|----|------------|-----------|
| N-1 | Select and `activeHistoryFilter` must agree after reload: `autocomplete="off"` on the select and/or set `historyFilterSelect.value = activeHistoryFilter` once before the first render; fake select initial value `"all"` in `createApp`. | T-1, T-3, T-5 |
| N-2 | `formatINR(balanceInPaise)` and every other call that can throw must complete before any DOM mutation in `renderTransactions` (build-then-swap). | T-3, T-8 |
| N-3 | No `display` declaration on `.history-filter` placed after `.hide` (preferably none at all, margins only); `#filter-empty-state` markup must be exactly `<p id="filter-empty-state" role="status"></p>` with no inner whitespace so `:empty` matches. | T-1, T-2 |
| N-4 | Accepted. Manual screen-reader verification is recorded as a Stage 7 NOT-RUN item (T-11). | T-11 |
| N-5 | Filter-failure message in `formError` persists until next submit and is far from the filter. Addressed by: clear `formError` after a later successful filter change, only when its current text equals the filter-failure message (text comparison, no extra state, so an unrelated submit error is never cleared). Distance from the filter is accepted as cosmetic (a dedicated error element near the filter is out of scope of revision 2). | T-4, T-9 |
| Wrapper show | The wrapper show step (`showElement(historyFilterRow, true)`) lives inside `renderTransactions`'s assignment phase, so load, retry and add all restore it. | T-3 |

## 3. Tasks

Priority: P1 = required for the feature; P2 = required for acceptance evidence; P3 = process/records.

### T-1 Add filter markup to `index.html`
- Priority: P1. Status: Not started. Dependencies: none.
- Description: Inside `.history-card`, insert after `#retry-load` and before `#empty-state` (or directly before `#transaction-history`; keep above the list): `<div class="field history-filter" id="history-filter-row">` containing `<label for="history-filter">Show</label>` and `<select id="history-filter" autocomplete="off">` with options `value="all"` "All" (selected), `value="income"` "Income", `value="expenses"` "Expenses". Add `<p id="filter-empty-state" role="status"></p>` on one line with no inner whitespace or newline. No `hidden` attribute on any new element; wrapper has no `hide` class initially.
- Affected files: `index.html`.
- Acceptance criteria: exactly three options with exact texts and values, `all` default; label `for` matches select id; `autocomplete="off"` present (N-1); `#filter-empty-state` has `role="status"` and zero characters between tags (N-3); existing markup untouched.
- Traceability: AC-1, FR-1, FR-7, NFR-1, NFR-3; N-1, N-3, F-1, F-3, F-4.

### T-2 Add styles to `styles.css`
- Priority: P1. Status: Not started. Dependencies: T-1.
- Description: Add `.history-filter` rule with margin-only layout (for example bottom margin) and NO `display` declaration; add `#filter-empty-state` rule matching `#empty-state` (`margin: 0; color: #5c6678`) and `#filter-empty-state:empty { margin: 0; padding: 0 }` with no `display:none`. Place the new rules before `.hide` (near line 125-128) so `.hide` stays the last cascade word (N-3). Do not edit `.hide`.
- Affected files: `styles.css`.
- Acceptance criteria: no `display` property on `.history-filter` or `#filter-empty-state`; new rules appear before `.hide`; the `.field select` styling is reused through the `.field` wrapper; manual visual check recorded in T-10 as not-run if no browser is available.
- Traceability: NFR-3, NFR-4; N-3, F-1, F-4.

### T-3 Implement filter logic and render changes in `script.js`
- Priority: P1. Status: Not started. Dependencies: T-1.
- Description:
  1. Add lookups next to line 277: `historyFilterSelect` (`history-filter`), `historyFilterRow` (`history-filter-row`), `filterEmptyState` (`filter-empty-state`). Every use is null-guarded.
  2. Add `HISTORY_FILTERS` constant: `all -> null`, `income -> "Money Received"` with message "No income transactions.", `expenses -> "Expense"` with message "No expense transactions.". Use `Object.hasOwn`-style own-key lookup (or a `Map`) so keys like `"constructor"` fall back to `all`.
  3. Add pure `filterTransactions(list, filterKey)`: returns a new array, no mutation or reorder; unknown key means All.
  4. Add `let activeHistoryFilter = "all"` with the other module state.
  5. Change `renderTransactions(nextTransactions, balanceInPaise, filterKey = activeHistoryFilter)` to build-then-swap. Build phase (no DOM mutation): normalise key; `visible = filterTransactions(...)`; build the `.transaction-list` from `visible`; `balanceText = formatINR(balanceInPaise)` (N-2); compute the filter message ("" when total = 0 or visible > 0, otherwise the mapped string). Assignment phase (after all throwing calls): `transactionHistory.replaceChildren(list)`; balance text and `balanceAmount.hidden = false`; `emptyState.hidden = nextTransactions.length !== 0` (unchanged semantics, total-based); `filterEmptyState.textContent = message`; `showElement(historyFilterRow, true)` (inside render, per design-review 9.3). The assignment phase contains no call that can throw other than plain property sets.
  6. `renderLoadFailure`: add `showElement(historyFilterRow, false)` and `filterEmptyState.textContent = ""` (null-guarded).
  7. Initial sync (N-1): before the first `loadTransactions()` call at the end of the file, set `historyFilterSelect.value = activeHistoryFilter` (null-guarded).
  8. Leave `transactionRepository`, `calculateAvailableBalance`, validators, and the submit handler logic unchanged. Existing call sites at lines 424 and 511 keep two arguments.
- Affected files: `script.js`.
- Acceptance criteria: all existing tests still pass unchanged; for filter Income only "Money Received" rows render, for Expenses only "Expense", for All the full list in original order; balance text identical for every filter; `#empty-state` visible only when total = 0; filter message exact strings only when total > 0 and visible = 0; a forced throw in `createTransactionElement` or `formatINR` leaves list, balance, `#empty-state.hidden`, filter message and wrapper class exactly as before the call (N-2); `innerHTML` not used; stored data never touched by the filter path.
- Traceability: AC-2, AC-3, AC-4, FR-2..FR-8, NFR-2, NFR-4; N-1, N-2, F-1, F-2, F-3, F-7, F-10, AR-2.

### T-4 Implement the filter `change` handler in `script.js`
- Priority: P1. Status: Not started (see T-4 note on AR-7). Dependencies: T-3.
- Description: Inside `if (historyFilterSelect) { ... }` register exactly one `change` listener. Steps: if `!repositoryReady` return with no state change (F-6); read `historyFilterSelect.value` directly, never `event.target` (F-5); if not an own key of `HISTORY_FILTERS`, candidate = `"all"` and set `select.value = "all"` (F-10); compute `calculateAvailableBalance(transactions)`; call `renderTransactions(transactions, balance, candidate)` in a `try`; on success set `activeHistoryFilter = candidate` and, if `formError.textContent === FILTER_FAILURE_MESSAGE`, call `setFormError("")` (N-5). On throw: leave `activeHistoryFilter` unchanged, set `historyFilterSelect.value = activeHistoryFilter`, call `setFormError(FILTER_FAILURE_MESSAGE)`. Focus is not moved. The stale "Transaction added." status is left untouched (Q-A3).
- Affected files: `script.js`.
- AR-7 handling (does NOT block): `FILTER_FAILURE_MESSAGE` is a single named constant. USER-SPECIFIED value (AR-7 resolved, verbatim input "No trnasaction found", typo corrected): "No transaction found". Note: this wording is generic and could be confused with the filter empty-state messages ("No income transactions." / "No expense transactions."); kept as specified by the user. Tests assert `formError` is non-empty, visible (no `hide` class) and equals the constant exported through `__appTest` or compared to the observed text, not a hard-coded literal, so changing the wording touches one line. Unblocking condition if the user wants the wording changed: user supplies the exact text before or during Stage 5; otherwise the placeholder ships and is flagged in the Stage 5 notes and PR summary.
- Acceptance criteria: one `change` listener; `!repositoryReady` leaves `activeHistoryFilter`, list and select untouched; an unknown value normalises to All; on forced render failure previous filter and `select.value` are restored and `formError` shows the message (NFR-4); on later success a filter-failure message is cleared but any other `formError` text is not (N-5); handler never references `event.target`; repository is never called.
- Traceability: AC-2, AC-3, NFR-4; F-2, F-5, F-6, F-10, N-5, AR-7.

### T-5 Update test harness in `tests/app.test.cjs`
- Priority: P1. Status: Not started. Dependencies: T-1, T-3 (for the export names).
- Description: Add `"history-filter"`, `"history-filter-row"`, `"filter-empty-state"` to the `createApp` ids list; set `elements["history-filter"].value = "all"` next to line 138 (N-1); add `HISTORY_FILTERS`, `filterTransactions`, and (if the constant is exported by name) `FILTER_FAILURE_MESSAGE` to the `__appTest` export list. Add the three ids to the markup test id list (line 174 onward) and add markup assertions: three option values and texts in order, `all` selected or default, label "Show" with `for="history-filter"`, `autocomplete="off"` on the select, `role="status"` on `#filter-empty-state`, and the exact empty element `<p id="filter-empty-state" role="status"></p>` via a regex that fails on inner whitespace (N-3).
- Affected files: `tests/app.test.cjs`.
- Acceptance criteria: the three new elements are non-null in `createApp`; the markup test fails if any new id, option, label, attribute, or whitespace rule is wrong; all pre-existing tests still pass.
- Traceability: AC-1, FR-1, FR-7, NFR-1, NFR-5; N-1, N-3, F-5.

### T-6 Unit tests for `filterTransactions` and the mapping
- Priority: P2. Status: Not started. Dependencies: T-3, T-5.
- Acceptance criteria: mixed list under `income` returns only "Money Received" entries, `expenses` only "Expense", `all` all entries; input array not mutated and order preserved; unknown keys (`"x"`, `"constructor"`, `undefined`) behave as All; message strings are exactly "No income transactions." and "No expense transactions.".
- Affected files: `tests/app.test.cjs`.
- Traceability: AC-2, AC-3, FR-2, FR-3, FR-5, FR-4, R-1.

### T-7 Integration tests: AC-1..AC-4, FR-5..FR-8
- Priority: P2. Status: Not started. Dependencies: T-3, T-4, T-5.
- Description: Tests seed storage via `createApp(storage)`, set `elements["history-filter"].value`, call `dispatch("change")` (no `target`). Cases: default view shows all (AC-1/FR-7); Income and Expenses show only matching rows (AC-2); returning to All shows full history (AC-3); empty message exact strings with `#empty-state` hidden (AC-4); total = 0 shows only the original `#empty-state` text, filter message empty, and filter row without `hide` (F-7); balance text identical across filters (FR-6); `storage.values` JSON byte-identical before and after filter changes (FR-5); add transaction under an active filter keeps the filter, saves, updates balance, and hides a non-matching new row (FR-8); markup-like note stays literal text under each filter (NFR-2); handler is a no-op when `!repositoryReady` (F-6).
- Affected files: `tests/app.test.cjs`.
- Acceptance criteria: every listed case exists and passes against actual execution; assertions use real behaviour, not mocks of the code under test.
- Traceability: AC-1..AC-4, FR-3..FR-8, NFR-2, NFR-4, NFR-5.

### T-8 Integration tests: failure paths and constraints N-1, N-2, N-5
- Priority: P2. Status: Not started. Dependencies: T-4, T-5.
- Description:
  - Load failure (corrupt storage): wrapper `className` contains `hide`, `#filter-empty-state.textContent === ""`, `#empty-state` hidden; after storage recovery and retry the wrapper no longer has `hide` (NFR-4).
  - Forced render failure (for example a seeded transaction whose `amountInPaise` makes `formatINR` throw only for the candidate view, or by overriding `document.createElement` for the `article` element after load): assert previous `activeHistoryFilter` behaviour (a following add still renders under the previous filter), `select.value` restored, `formError` non-empty and visible, and the DOM (list children, balance text, `#empty-state.hidden`, filter message, wrapper class) identical to before the failed change (N-2, F-2).
  - N-2 specifically: make `formatINR` the only throwing call and assert the list was not replaced.
  - N-5: after a failed change, a successful change clears `formError`; an unrelated `formError` text (set by a failed save) is not cleared by a successful filter change.
  - N-1: with `createApp` default `"all"`, after load `select.value === "all"` and the list shows all; simulate restored value by pre-setting the select to `"income"` before script run is not possible in the fake harness, so the test asserts the init sync line by setting `value` to `"income"` on the element before `createApp` evaluation if the harness allows, otherwise records the limitation in the notes.
- Affected files: `tests/app.test.cjs`.
- Acceptance criteria: each case passes by execution, or any case the harness cannot express is listed explicitly in `implementation-notes.md` as a limitation (never silently dropped).
- Traceability: NFR-4, NFR-5; N-1, N-2, N-5, F-2.

### T-9 Documentation and notes
- Priority: P3. Status: Not started. Dependencies: T-1..T-8.
- Description: Check whether a README or docs describe features (`docs/` exists; README: Not Found / not verified in this stage). If one lists features, add one short line about the filter; otherwise make no doc change. Write `implementation-notes.md` (Stage 5) with changed files, the AR-7 placeholder wording and whether the user replaced it, deviations, and the N-5 decision (clear-on-success by text match; distance accepted).
- Affected files: `.claude/AgentOutput/AG-10-5/implementation-notes.md`; a README only if one exists and documents features.
- Acceptance criteria: notes list every changed file and every executed test with actual results; no secrets.
- Traceability: NFR-3; N-5, AR-7.

### T-10 Run full automated test suite
- Priority: P2. Status: Not started. Dependencies: T-1..T-8.
- Description: Run `node --test tests/` from the repository root and record the exact counts. The new test file edits stay in `tests/app.test.cjs` which is tracked, so nothing is left untracked (preflight item 5).
- Acceptance criteria: all tests pass, including the unchanged pre-existing ones; actual output recorded; if any fails, fix before Stage 6.
- Traceability: NFR-5, all ACs.

### T-11 Stage 7 NOT-RUN items (record for verification, not executed in Stage 5)
- Priority: P3. Status: Not started (Stage 7). Dependencies: T-10.
- Items to list as NOT RUN unless tooling becomes available:
  1. N-4 / AR-6: manual screen-reader verification that the always-present `role="status"` region is announced on change, and review of double announcement with `#transaction-history` (`aria-live="polite"`).
  2. Manual browser check of the CSS: `.hide` hides `#history-filter-row` on load failure (N-3), `#filter-empty-state:empty` collapses spacing, the select looks consistent with the form's select, N-1 behaviour on a Firefox soft reload with a non-default selection.
- Acceptance criteria: the verification report lists these as not-run with the reason, never as passed.
- Traceability: NFR-1; N-1, N-3, N-4, AR-6.

## 4. Dependency order

T-1 -> T-2; T-1 -> T-3 -> T-4; T-1 + T-3 -> T-5 -> T-6; T-3 + T-4 + T-5 -> T-7; T-4 + T-5 -> T-8; T-1..T-8 -> T-9, T-10 -> T-11.

Suggested execution order: T-1, T-2, T-3, T-4, T-5, T-6, T-7, T-8, T-10, T-9, T-11 (T-9 notes need the real test results).

## 5. Requirement and component coverage

| Requirement | Tasks |
|-------------|-------|
| AC-1, FR-1, FR-7, NFR-1 | T-1, T-3, T-5, T-7, T-11 |
| AC-2, FR-2, FR-5, FR-8 | T-3, T-4, T-6, T-7 |
| AC-3, FR-3 | T-3, T-6, T-7 |
| AC-4, FR-4, NFR-4 | T-3, T-4, T-6, T-7, T-8 |
| FR-6 | T-3, T-7 |
| NFR-2 | T-3, T-7 |
| NFR-3 | T-1, T-2, T-9 |
| NFR-5 | T-5..T-8, T-10 |

Architecture components: markup (T-1), styles (T-2), `HISTORY_FILTERS`, `filterTransactions`, state, `renderTransactions`, `renderLoadFailure`, init sync (T-3), handler (T-4), tests (T-5..T-8), repository/balance/validators unchanged (no task; guarded by T-7 FR-5/FR-6 tests).

## 6. Blockers, risks, and decisions

Blockers: none. No task is blocked. AR-7 does not block because a clearly marked placeholder constant is implementable and tested without hard-coding the wording.

Open questions for the user (not decided here):
1. AR-7: RESOLVED by the user: "No transaction found" (typo-corrected; see T-4 and section 7).
2. Plan approval, including the N-5 approach (clear on later successful change when the text matches; accept distance from the filter) and the T-1 placement of the markup in `.history-card`.

Accepted/deferred risks: N-4 and AR-6 (screen reader unverified), AR-4 (stale "Transaction added."), R-1 (Income vs Money Received), F-10 (O(n) rerender), fake DOM cannot test CSS, `:empty`, or form-state restoration (N-1 init sync is covered only to the extent the harness allows).

Scope guard: do not modify `workflow-session.json`, other artifacts, or `docs/codemie/analytics/*` as part of implementation.

## 7. Approval

Status: **Approved**. Approval evidence: User message in main session, 2026-11-03: "1.approve 2."No trnasaction found" 3.[keep current 4. depnedecy order 5 yes". Orchestrator interpretation: plan approved incl. N-5 approach and markup inside .history-card; AR-7 message = "No transaction found" (typo "trnasaction" corrected); keep current context; implement T-1..T-11 in dependency order; commit impl-plan.md and workflow-session.json (no push). Approval does not authorize push or PR creation.
