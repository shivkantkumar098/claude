# Verification Report: AG-10 - Filter transactions by type

Run ID: AG-10-3 | Branch: feature/AG-10-3 | Stage 7 status: awaiting human approval

## Scope and method

Uncommitted changes in index.html, script.js, styles.css, tests/app.test.cjs verified against requirements.md (AC-001..AC-009). Project has no package.json and no CI; the test runner is Node built-in (`node --test tests/`). No lint, type-check, or static-analysis tooling exists in the repo (Not Applicable). No documentation generator exists (Not Applicable; implementation-notes.md is hand-written).

## Commands executed

| Command | Exit | Result |
|---|---|---|
| `node --test tests/` (repo root) | 0 | tests 28, pass 28, fail 0, cancelled 0, skipped 0, todo 0 |

## AC to test mapping (tests read, not assumed)

| AC | Covering test(s) | Verdict |
|---|---|---|
| AC-001 options All/Income/Expenses | "index.html has a labeled three-option filter..." (exact value/label list, label for=, status paragraphs not hidden); "index.html exposes every required app control" | Passed (static HTML check) |
| AC-002 Income -> Money Received, Expenses -> Expense | unit "filterTransactions maps Income/Expenses and rejects prototype keys"; integration "filters show matching items..." | Passed |
| AC-003 All shows full history | "filters show matching items, All restores..." (3 items after All); unit filterTransactions all | Passed |
| AC-004 empty message, no items | "no matches shows Not found, not the empty-history message" (0 items, #empty-state hidden, message cleared on All); "empty history shows No transactions yet for every filter" | Passed |
| AC-005 balance unchanged | "filters show matching items..." asserts balance text and stored envelope identical across filters | Passed |
| AC-006 default All, restored after reload | "default is All and the selection is restored after reload"; "preference-only storage failure keeps filtering working in memory" | Passed |
| AC-007 "Not found" with non-All filter | same test as AC-004 (exact text "Not found") | Passed |
| AC-008 add hidden tx resets to All | "adding a transaction hidden by the filter resets to All"; "adding a matching transaction keeps the filter"; "failed save leaves the active filter..." | Passed |
| AC-009 unknown stored value shows message | "unknown or empty stored filter shows unknown value and falls back to All" (bogus and empty string; asserts "unknown value", All shown, stored value overwritten to `all`) | Passed |

Additional covered edge cases: load failure disables filter and ignores changes; Retry enables filter and keeps startup preference; prototype-key rejection.

## Gap analysis

- No real AC gap found; no tests were added or changed by this stage.
- Minor, non-AC observations (not gated): the change handler's `unknown value` branch for an invalid value arriving via the select `change` event is not directly tested (the select can only emit three options in a real browser); swallowed-render-exception path in the change handler is untested; the Expenses-with-no-matches case is covered only via the Income path (same code path). The fake DOM cannot verify CSS visibility, `:empty` styling, or `role="status"` announcement.
- Tests are against a hand-written fake DOM and static regex checks of index.html; they do not exercise a real browser.

## Documentation claims in implementation-notes.md validated against source

- Constants/functions (FILTER_STORAGE_KEY = "transactionFilter", TRANSACTION_FILTERS, DEFAULT_FILTER, isKnownFilter, filterTransactions, filterPreference, activeFilter, lastBalanceInPaise, setActiveFilter, setFilterMessage): present in script.js. Confirmed.
- filterPreference never throws and has no removeItem: read/write wrapped in try/catch; no `removeItem` in script.js. Confirmed.
- Startup preference read once immediately before the single `loadTransactions();` at end of file; Retry is wired directly to loadTransactions, so it does not re-read. Confirmed (script.js 616-649; Retry test).
- Change handler ignored unless repositoryReady; render exceptions swallowed with no setFormError. Confirmed.
- Add-flow reset only when the active filter would hide the new transaction (script.js ~591-595). Confirmed by tests; "not applied on save failure" confirmed by test.
- renderLoadFailure clears #filter-message and disables select (script.js 478-484). Confirmed.
- HTML: label "Show" for=transaction-filter; select with all/income/expenses; #filter-message and #filter-empty-state are role="status" and not hidden; filter-message above #empty-state, filter-empty-state after it. Confirmed (index.html 100-113).
- styles.css: `.filter-field`, `#filter-empty-state`/`#filter-message` rules and `:empty` resets; no display rules on those elements (only `display` hits are unrelated lines 64, 70, 169, 180, 199). Confirmed by grep.
- "28 tests, 15 pre-existing + 13 new": total 28 confirmed by execution; the split was not independently re-derived (current file has 15 pre-filter tests and 13 filter tests by reading).
- Line-ending note (LF to CRLF warning): not checked.

## Results by category

- Passed: `node --test tests/` 28/28; AC-001..AC-009 each have at least one passing automated test (see mapping); doc claims above.
- Failed: none.
- Skipped: none (skipped 0).
- Blocked: none.
- Not run: manual Chrome checks (keyboard operation, label association, reload persistence, Not found / unknown value display, load-error state, add-while-hidden) - NOT RUN; screen-reader announcement of role="status" and aria-live region - NOT RUN; mutation spot-check of new tests - NOT RUN; CSS visual rendering - NOT RUN.
- Not Applicable: lint/type-check/static analysis (none configured); documentation generator and deterministic-output / manual-section preservation (no generator); CI (none exists); secret exposure in changed files was not scanned with a tool, only noted: changes contain no credentials or network calls by inspection of the grep'd regions (limited check).

## Conclusion

All applicable automated checks pass with execution evidence. Requirement NFR-001/NFR-004 (accessibility, Chrome) remain unverified until manual checks are performed. Stage 7 requires human approval; no commit, push, or Jira action was performed. The untracked docs/codemie analytics JSON was not touched.
