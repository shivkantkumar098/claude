# Implementation Plan: AG-10 Filter transactions by type

Status: Awaiting Approval (DRAFT, not approved)
Stage: 4 - Implementation Planning
Branch: feature/AG-10-1 (no commits, all files untracked; no baseline to diff against)
Author: implementation-planner (Claude Code). Planning only; no source or test file was modified.
Inputs (all human-approved, evidence in `workflow-session.json`): `requirements.md`, `architecture.md`, `design-review.md` (Approve with conditions).
User decisions in force: D-004 keep the active filter after add, with the optional note "Transaction added. It is hidden by the current filter."; D-005 filtered-empty wording "No income transactions found." / "No expense transactions found." Other Q-001..Q-007 defaults in architecture.md section 11 stand.
Files read to verify this plan: `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`. Line numbers below are from the current untracked working tree and will shift as tasks land; function and ID names are the stable anchors.

## 1. Baseline (actual execution)

Command run read-only from the repository root: `node --test tests/` (Node v20.17.0).
Result: 15 tests, 15 pass, 0 fail, 0 skipped, 0 cancelled, about 237 ms. This establishes that `node --test tests/` works on this machine. It is still not a documented project command (no `package.json`, no CI config: Not Found). The baseline is a local run only; no git baseline exists.

## 2. Scope and approach

Display-only filter: native `<select id="transaction-filter">` in the history card, in-memory `activeFilter`, pure `filterTransactionsByType`, `renderTransactions` renders the filtered list while balance stays on the full list, new `#filter-empty-state`. No storage, schema, balance or add-flow changes. Files changed: `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`. No new files, dependencies or build steps.

### Concrete design choices made in this plan (all within the approved architecture)

| Choice | Decision | Rationale |
|---|---|---|
| Filter keys | `"all"`, `"income"`, `"expenses"` | architecture 3.3 |
| Mapping | `FILTER_TYPE_BY_KEY = Object.freeze({ income: "Money Received", expenses: "Expense" })` | A-001, single source |
| Wording | `FILTER_EMPTY_MESSAGE_BY_KEY = Object.freeze({ income: "No income transactions found.", expenses: "No expense transactions found." })` | D-005, F-05; not read from DOM |
| Key check | `normalizeFilterKey(value)` returns `value` if it is `"all"` or `Object.hasOwn(FILTER_TYPE_BY_KEY, value)`, else `"all"`. `filterTransactionsByType` uses `Object.hasOwn` too | F-03 |
| Select label | "Filter by type" | F-06 |
| `#filter-empty-state` | `<p id="filter-empty-state" role="status"></p>` always rendered (no `hidden`), text set to `""` when not applicable | F-04 mitigation; an empty `<p>` with `margin: 0` takes no space |
| Initial disabled | `disabled` attribute on the select in HTML, mirroring `#save-transaction` | F-08 |
| Saved-note strings | constants `TRANSACTION_ADDED_MESSAGE`, `TRANSACTION_ADDED_HIDDEN_MESSAGE` | D-004 |

## 3. Design-review conditions (section 6) and findings: how each is handled

| Ref | Handling | Task |
|---|---|---|
| Condition 1 / F-01 | At module level, right after the element lookups and `let activeFilter = "all"`, force `transactionFilter.value = activeFilter` before the first `loadTransactions()` (script.js currently l.530). Also add `autocomplete="off"` to the select. Test: create the app with the select pre-set to `"expenses"` (stub option) and mixed seed data; assert the select reads `"all"` and the full list is rendered | T2, T4 |
| Condition 2 / F-03 | `Object.hasOwn` in `normalizeFilterKey` and in `filterTransactionsByType`; the handler validates via `normalizeFilterKey`. Unit tests for `"constructor"`, `"toString"`, `"__proto__"`, `undefined`, `""`, `null` | T3 |
| Condition 3 / F-02 | Filter change handler clears `saveStatus` (text `""`, `showElement(saveStatus, false)`) via a small `clearSaveStatus` helper that `clearSubmissionFeedback` also calls. The "hidden" decision in the submit handler is `filterTransactionsByType([transaction], activeFilter).length === 0` (same mapping) | T5, T6 |
| Condition 4 / F-05 | `FILTER_EMPTY_MESSAGE_BY_KEY` constant map next to `FILTER_TYPE_BY_KEY`; set with `textContent` | T3, T4 |
| Condition 5 / F-07, F-08 | Handler failure: on any throw inside the handler's render, restore `activeFilter` and `transactionFilter.value` to the previous valid key, and call `setFormError("The filter could not be applied. The previous view is kept.")` (existing `role="alert"` element; reuse, no new element). Guard: if `!repositoryReady || isLoading`, set `transactionFilter.value = activeFilter` and return without rendering. Disable: `renderLoadFailure` sets `transactionFilter.disabled = true` and clears `#filter-empty-state`. Re-enable: `loadTransactions` try block, immediately after `saveButton.disabled = false` (i.e. only after a successful render). Initial HTML `disabled` | T2, T4, T5 |
| Condition 6 | Stub and ID lists first (T1), then tests alongside each code task. Deviation in the strict "both lists first" ordering: the HTML-presence list (l.174) is extended in T2 together with the markup, and the `__appTest` export entries are added in T3 together with the functions. Adding them earlier would make the suite red or throw a `ReferenceError` in the `vm` run. All other stub changes are in T1 | T1, T2, T3 |
| F-04 | Mitigated in markup (always-rendered `role="status"` element, text swapped). Real screen-reader behavior is Not Verified and deferred to manual check (section 9). The full replacement of `#transaction-history` (`aria-live="polite"`) on filter change is accepted: it already happens on every add | T2; deferred check |
| F-06 | Label "Filter by type" | T2 |
| F-07 | See condition 5. Test forces `elements["transaction-history"].replaceChildren` to throw after load | T5 |
| F-08 | See condition 5. Tests: failure then retry; handler ignored while not ready | T4, T5 |
| N-01 | Accepted: `renderTransactions` keeps its signature and reads module `activeFilter` (architecture D-003) | T4 |
| N-04 | `#filter-empty-state` added to the `#empty-state` CSS rule (styles.css l.125); no `display` rule on any `hidden` element | T7 |
| N-05 | Extra tests included: startup sync, prototype keys, stale note, failure then retry, no storage write, form inputs preserved | T3-T6 |
| N-06 | Test command confirmed to run locally (section 1); still undocumented in the repo | T8 |

Stale-wording housekeeping in the approved artifacts (header "Awaiting Approval", D-004/D-005 phrased as pending, architecture 3.5 `in` sketch) is not edited here; this plan supersedes the sketch (use `Object.hasOwn`).

## 4. Ordered tasks

Every task is one commit-sized step, leaves `node --test tests/` green, and depends only on listed task IDs. Commits are recommendations only; none will be made without explicit approval.

### T1 - Extend the test stub (tests only)
- Depends on: none.
- File: `tests/app.test.cjs`, `createApp` (l.114-168).
- Changes:
  - Change signature to `createApp = (storage = createStorage(), { initialFilter = "all" } = {})`.
  - Add `"transaction-filter"` and `"filter-empty-state"` to the `ids` list (l.115-132).
  - After `elements["transaction-type"].value = "Expense"` (l.138): `elements["transaction-filter"].value = initialFilter;` and `elements["transaction-filter"].disabled = true;` (mirrors the HTML `disabled`, so tests can observe the re-enable).
  - Add helpers near `transactionsFrom` (l.170): `visibleTypes(elements)` returning `elements["transaction-history"].children[0].children.map((article) => article.children[0].children[0].textContent)` (article > heading > type span, per `createTransactionElement`), and `seedEnvelope(list)` building `JSON.stringify({ schemaVersion: 1, transactions: list })` with valid records (`id` string, `type`, `amountInPaise` positive safe integer, `date` "YYYY-MM-DD"; see `isStoredTransaction`).
  - Do NOT touch `FakeElement.reset()` (filter is outside the form).
- Acceptance: all 15 existing tests pass unchanged (null-element risk R-3 removed). No new tests yet.
- Maps to: prerequisite for FR-001..004, EC-001..006 tests; condition 6.
- Commit: "test: extend DOM stub for transaction filter elements".

### T2 - Markup and markup test
- Depends on: T1.
- Files: `index.html`, `tests/app.test.cjs`.
- `index.html`, history `<section>` (l.94-104): directly after `<h2 id="history-heading">` and before `#load-error` insert
  ```html
  <div class="field history-filter">
    <label for="transaction-filter">Filter by type</label>
    <select id="transaction-filter" name="filter" autocomplete="off" disabled>
      <option value="all" selected>All</option>
      <option value="income">Income</option>
      <option value="expenses">Expenses</option>
    </select>
  </div>
  ```
  and after `#empty-state` (l.100-102) add `<p id="filter-empty-state" role="status"></p>`. The select stays outside `<form id="transaction-form">`.
- `tests/app.test.cjs`: add `"transaction-filter"` and `"filter-empty-state"` to the HTML-presence list (l.174-191). Add a new test "integration: index.html offers the All, Income and Expenses filter outside the form" asserting: `label[for="transaction-filter"]` exists; the select block contains exactly three options with values/labels `all/All`, `income/Income`, `expenses/Expenses` and `all` is `selected`; the select has `autocomplete="off"`; the select's index in the source is after `</form>` (outside the form); `#filter-empty-state` has `role="status"`.
- Acceptance: FR-001 / AC-001 / BR-003 markup verified; suite green (16 tests).
- Commit: "feat(ui): add transaction filter control markup".

### T3 - Pure filter layer and unit tests
- Depends on: T2 (not technically required; ordered so the markup test lands first).
- Files: `script.js`, `tests/app.test.cjs`.
- `script.js`: after `calculateAvailableBalance` (l.39-52) add `FILTER_TYPE_BY_KEY`, `FILTER_EMPTY_MESSAGE_BY_KEY`, `normalizeFilterKey`, `filterTransactionsByType(transactions, filter)` (pure; `Object.hasOwn`; returns `transactions.filter(({ type }) => type === FILTER_TYPE_BY_KEY[filter])` for own keys, else the input array unchanged; never mutates). Add `let activeFilter = "all";` next to the module state at l.289-292 (placed here so T4 can use it; if `activeFilter` is unused until T4 that is acceptable).
- `tests/app.test.cjs`: add `filterTransactionsByType` and `normalizeFilterKey` to the `__appTest` snippet (l.153-162). New unit tests (compare via `.map(({ id }) => id)` or a JSON round trip, because arrays created inside the `vm` context have a different prototype and `assert.deepStrictEqual` would fail across realms):
  - `all` returns every record; `income` returns only `Money Received`; `expenses` returns only `Expense`; original order preserved (A-005); empty input returns empty.
  - Input not mutated (length and order unchanged; returned array for `income` is not the same reference as a mutated input).
  - Unknown keys `"constructor"`, `"toString"`, `"__proto__"`, `"hasOwnProperty"`, `undefined`, `null`, `""` return the full list and `normalizeFilterKey` returns `"all"` (F-03).
  - `normalizeFilterKey("income")` and `("expenses")` and `("all")` return themselves.
- Acceptance: FR-002/FR-003 logic (BR-001, BR-002), EC-005 mapping basis; suite green.
- Commit: "feat: add pure transaction type filter with own-key validation".

### T4 - Render integration, startup sync, load-failure handling
- Depends on: T1, T2, T3.
- Files: `script.js`, `tests/app.test.cjs`.
- `script.js`:
  1. Element lookups (l.266-277 region): `const transactionFilter = document.getElementById("transaction-filter");` and `const filterEmptyState = document.getElementById("filter-empty-state");`.
  2. Startup sync, after the state declarations and before `loadTransactions()` (l.530): `if (transactionFilter) { transactionFilter.value = activeFilter; }` (F-01).
  3. `renderTransactions` (l.387-398): compute `visible = filterTransactionsByType(nextTransactions, activeFilter)`; loop over `visible` instead of `nextTransactions`; keep balance line from `balanceInPaise`; keep `emptyState.hidden = nextTransactions.length !== 0`; add `const filteredEmpty = nextTransactions.length > 0 && visible.length === 0;` then `filterEmptyState.textContent = filteredEmpty ? (FILTER_EMPTY_MESSAGE_BY_KEY[activeFilter] ?? "") : "";` (own-key safe because `activeFilter` is only ever set through `normalizeFilterKey`). Guard `filterEmptyState` for null like other lookups if the existing style requires; existing render code does not guard, so follow it.
  4. `renderLoadFailure` (l.400-412): add `filterEmptyState.textContent = ""` and `transactionFilter.disabled = true`.
  5. `loadTransactions` (l.421-429): add `transactionFilter.disabled = false` immediately after `saveButton.disabled = false`.
- Tests (new):
  - F-01 startup sync: seed one `Money Received` and one `Expense`; `createApp(storage, { initialFilter: "expenses" })`; assert `elements["transaction-filter"].value === "all"` and `visibleTypes` has both.
  - EC-002: empty storage: `#empty-state.hidden === false`, `#filter-empty-state.textContent === ""`.
  - EC-004: corrupt storage: `#empty-state.hidden === true`, `#filter-empty-state.textContent === ""`, `transaction-filter.disabled === true`.
  - F-08: read failure then recovery (reuse `failReads` pattern, l.432-448): after retry `transaction-filter.disabled === false` and `value === "all"` with full list; also assert the select was disabled while failed.
  - Initial load success enables the select (stub starts `disabled = true`).
- Acceptance: EC-002, EC-004, BR-003, A-002; F-01, F-08 (partial); all prior tests still green.
- Commit: "feat: render filtered history and sync filter on load".

### T5 - Change handler, failure behavior, behavior tests
- Depends on: T4.
- Files: `script.js`, `tests/app.test.cjs`.
- `script.js`: add `clearSaveStatus` helper beside `clearSubmissionFeedback` (l.443-447) and call it from there. After the submit handler block (ends l.524) add:
  ```
  if (transactionFilter) {
    transactionFilter.addEventListener("change", () => {
      if (!repositoryReady || isLoading) { transactionFilter.value = activeFilter; return; }
      const previousFilter = activeFilter;
      const nextFilter = normalizeFilterKey(transactionFilter.value);
      clearSaveStatus();
      try {
        activeFilter = nextFilter;
        transactionFilter.value = nextFilter;
        renderTransactions(transactions, calculateAvailableBalance(transactions));
      } catch (error) {
        activeFilter = previousFilter;
        transactionFilter.value = previousFilter;
        setFormError("The filter could not be applied. The previous view is kept.");
      }
    });
  }
  ```
  (Shape illustrative; the implementer writes the final code in repository style.) No `localStorage` access. Balance recomputed from the full `transactions` list.
- Tests (new, seed 1 `Money Received` 5000 paise + 2 `Expense`, using `seedEnvelope`):
  - FR-002 / AC-002: select `"income"` + `dispatch("change")` shows only `Money Received`; select `"expenses"` shows only `Expense`; counts match.
  - FR-003 / AC-003: back to `"all"` shows all records in original order.
  - FR-004 / EC-001 / AC-004: only expenses stored, select `"income"`: `#filter-empty-state.textContent === "No income transactions found."`, `#empty-state.hidden === true`, history list has zero items; select `"expenses"` with only income stored gives "No expense transactions found."; selecting `"all"` clears the text.
  - EC-005: legacy storage (`budget`/`expenses` seed, as in l.273-301): all rows appear under Expenses, none under Income (with the Income empty message shown).
  - EC-006 / BR-004: balance text identical across all three selections; `storage.values.get("transactions")` byte-identical before and after changes (no write); amount/note inputs keep their typed values after a filter change.
  - Invalid select value (`"constructor"`) dispatches as All: full list, select value normalized to `"all"` (F-03 integration).
  - Guard: with load failure (select disabled, not ready), setting value `"income"` and dispatching leaves the select at `"all"` and no list render (F-08).
  - F-07 failure path: after a successful load, replace `elements["transaction-history"].replaceChildren` with a function that throws; set select `"income"`, dispatch; assert `form-error.textContent` matches `/filter could not be applied/i`, select value back to the previous key, and storage unchanged. Restore a working `replaceChildren` and verify a later valid change works.
  - F-02 part A: after a save success message exists, a filter change sets `save-status.textContent === ""` and the element has class `hide`.
- Acceptance: FR-002, FR-003, FR-004, EC-001, EC-005, EC-006, F-02 (clear), F-07, F-08.
- Commit: "feat: apply transaction type filter on change".

### T6 - Add-while-filtered note (D-004)
- Depends on: T5.
- Files: `script.js`, `tests/app.test.cjs`.
- `script.js` submit handler (l.507-518): after the successful `renderTransactions(transactions, updatedBalance)`, replace the literal `"Transaction added."` (l.512) with `filterTransactionsByType([transaction], activeFilter).length === 0 ? TRANSACTION_ADDED_HIDDEN_MESSAGE : TRANSACTION_ADDED_MESSAGE`. Define both constants near the other constants (`TRANSACTION_ADDED_MESSAGE = "Transaction added."`, `TRANSACTION_ADDED_HIDDEN_MESSAGE = "Transaction added. It is hidden by the current filter."`). The filter is not reset (D-004, EC-003). The render-failure catch (l.514-518) is unchanged.
- Tests (new):
  - Income filter active, add default type `Expense` (the form resets to Expense): `save-status.textContent === "Transaction added. It is hidden by the current filter."`, history shows no `Expense` item, `#filter-empty-state` shows the income message when no income exists (and `#empty-state` stays hidden), balance reflects the new expense, storage has the new record, select still `"income"`.
  - Expenses filter active, add Expense: message is exactly `"Transaction added."` and the item is visible.
  - Income filter active, add `Money Received`: plain message, item visible.
  - F-02: after the hidden note, switch to All: `save-status` cleared and hidden.
  - Existing test at l.317-341 (All filter) still asserts `"Transaction added."`.
- Acceptance: EC-003, D-004, F-02 (derivation from shared mapping).
- Commit: "feat: note when an added transaction is hidden by the active filter".

### T7 - Styles
- Depends on: T2 (markup); independent of T3-T6 and may be done in parallel with them.
- File: `styles.css`.
- Changes: extend the rule at l.125 to `#empty-state, #filter-empty-state { margin: 0; color: #5c6678; }`; add `.history-filter { margin-bottom: 1rem; }` and a width limit such as `.history-filter select { max-width: 16rem; }` (existing `.field select` is `width: 100%`, l.80-90). Do not add `display` to any element that uses `hidden`. No tests (CSS); visually checked in T8.
- Acceptance: NFR-001 look and feel (reuses `.field` focus styles).
- Commit: "style: spacing and empty-state styling for history filter".

### T8 - Full verification, notes, cleanup
- Depends on: T1-T7.
- Actions: run `node --test tests/` (expect baseline 15 plus new tests, all passing; report the real counts); run a syntax check of the script via the same test run (no separate linter exists: Not Found); perform the manual browser checks in section 9; review `git status` shows only the four expected source files changed plus `.codemie/` artifacts; write `implementation-notes.md` (Stage 5 artifact) listing changed files, deviations and actual test results. No docs to update (`docs/` holds only Codemie analytics JSON; no README found: Not Found). No commit or push without explicit approval.
- Acceptance: all FR/EC mappings in section 6 evidenced by executed tests; unverified items listed honestly.

### Dependency graph
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T8; T2 -> T7 -> T8. No cycles; every dependency is a real task ID.

## 5. Test cases to add (summary)

| Group | Count (approx.) | Tasks |
|---|---|---|
| Markup (FR-001) | 1 test + 2 list entries | T2 |
| Unit: `filterTransactionsByType`, `normalizeFilterKey` (order, no mutation, prototype keys) | 3-4 | T3 |
| Startup sync and load/failure/retry (F-01, F-08, EC-002, EC-004) | 4-5 | T4 |
| Handler behavior (FR-002/3/4, EC-001/5/6, guard, invalid value, F-07, F-02) | 8-9 | T5 |
| Add-while-filtered (EC-003, D-004, F-02) | 4 | T6 |

Exact count is not fixed; the implementer reports the real totals. The existing literal-text note test (l.385-398) must keep passing unchanged.

## 6. Requirement and edge-case acceptance map

| Requirement / EC | Evidence (task: check) |
|---|---|
| FR-001 | T2 markup test (exactly three options, label, outside form) |
| FR-002 | T3 unit; T5 income/expenses selection |
| FR-003 | T3 unit; T5 return to All |
| FR-004 | T5 filtered-empty text, `#empty-state` hidden |
| BR-003 / A-002 | T2 `selected`; T4 startup sync test |
| BR-004 / A-003 / EC-006 | T5 balance identical, no storage write |
| EC-001 | T5 |
| EC-002 | T4 |
| EC-003 | T6 |
| EC-004 | T4 (neither message, select disabled) |
| EC-005 | T5 legacy data under Expenses |
| NFR-001 | T2 label/`role="status"`; manual check T8 |
| NFR-002 | `textContent` only; existing note test unchanged; unit prototype-key tests |
| NFR-004 | all tests in `node:test` style |

## 7. How to run tests

- `node --test tests/` from the repository root. Executed during planning and passed (15/15, Node v20.17.0). Status as a project-documented command: Not Found (no `package.json`, no CI). Run after every task.
- Single file: `node --test tests/app.test.cjs` (Not Verified separately; same file).

## 8. Rollback notes

- No commits exist and all files are untracked, so `git revert` or `git checkout` cannot restore originals. Before T1, recommend the human take a safety copy (for example copy `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs` to a backup folder) or authorize an initial baseline commit. Neither will be done by the planner or implementer without explicit approval.
- Changes are additive and localized per task. Per-task reversal: T7 revert the CSS lines; T6 restore the literal `"Transaction added."` and remove two constants; T5 remove the change handler block and `clearSaveStatus` call; T4 restore the `renderTransactions` loop over `nextTransactions` and drop the three small additions; T3 remove the constants/functions; T2 remove the two markup blocks; T1 stub additions are harmless if left.
- Data safety: nothing writes to `localStorage` for the filter, so rollback needs no data migration.

## 9. Risks, accepted/deferred items

| ID | Risk / item | Status |
|---|---|---|
| R-A | No git baseline and no backup: rollback relies on a manual copy or a baseline commit | Needs human decision (section 10) |
| R-B | Browser form-state restoration (F-01) cannot be reproduced in the stub; mitigated by forced startup sync and `autocomplete="off"` | Mitigated; manual check deferred to T8 |
| R-C | Screen-reader announcement of `#filter-empty-state` and list re-read on filter change (F-04) unverified | Accepted/deferred; manual check, no automated coverage |
| R-D | `Object.hasOwn` requires a modern browser (Chrome 93+, Firefox 92+, Safari 15.4+); the app already uses `BigInt` and numeric separators | Accepted; fallback `Object.prototype.hasOwnProperty.call` if the user wants older support |
| R-E | Cross-realm `deepEqual` pitfalls in `vm` tests | Handled in T3 test notes |
| R-F | Stale form error after a filter-failure message is not auto-cleared by later filter changes (cleared on next submit via `clearSubmissionFeedback`) | Accepted; failure path is practically unreachable because render uses already-validated data |
| R-G | Stub `addEventListener` keeps a single listener per event; only one `change` handler may be registered on the select | Constraint noted for implementer |
| R-H | Stub `classList` only supports `toggle`; new code must use `showElement`/`hidden`/`textContent` only | Constraint noted |
| R-I | Existing `renderTransactions` reads module `activeFilter` (implicit dependency, N-01) | Accepted per architecture D-003 |
| Deferred | Persisting the filter (Q-006), other filters/sorting (Q-007), live announcement tuning | Out of scope |

Blockers: none. All tasks are unblocked once this plan is approved.

## 10. Items needing human input

1. Approve this plan (Stage 4). Nothing here is approved yet.
2. Rollback safety (R-A): authorize a baseline commit, or accept a manual backup copy, before implementation starts. Default if no answer: the implementer makes no commit and only works on the working tree, and the human is warned that originals cannot be restored from git.
3. Optional: confirm the label "Filter by type" (F-06) and the failure message "The filter could not be applied. The previous view is kept." Defaults stand if not changed.
4. Optional: confirm `Object.hasOwn` browser baseline (R-D).
5. Confirm whether per-task commits are wanted at Implementation stage (commits require explicit approval under CLAUDE.md section 11).

## 11. Coverage check

- All FR-001..FR-004 and EC-001..EC-006 appear in section 6 and in a named task test.
- All architecture components are covered: select + empty element (T2), constants/pure function/state (T3), render/load/failure/startup (T4), handler (T5), add-while-filtered (T6), CSS (T7), test stub (T1), verification (T8).
- Documentation task: none needed (no docs found); `implementation-notes.md` is produced in T8.
- Nothing was executed except the read-only baseline test run.

## 12. Approval status

- Stage status: Awaiting Approval
- Approval: Pending
- Approval evidence: None recorded for this stage
- Nothing in this document has been approved by a human.
