# Code Review: AG-10 Filter transactions by type

- Jira issue: AG-10, run ID AG-10-5, branch `feature/AG-10-5`
- Stage: 6 Code Review
- Status: **Approved** (user, 2026-11-03; see Approval section). CR-1 remains OPEN.
- Reviewed: commit e5c0417 (local, not pushed); `git diff main...HEAD` for `index.html`, `styles.css`, `script.js`, `tests/app.test.cjs`. Untracked `docs/codemie/analytics/*fe4bb36f*.json` ignored as unrelated.
- Evidence run: `node --test tests/` -> 29 tests, 29 pass, 0 fail, 0 skipped (executed by reviewer, read-only).

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 2 |
| Low | 5 |

No unresolved Critical or High findings. Implementation meets AC-1..AC-4 on the evidence available; browser/screen-reader aspects remain Not Verified.

## Findings

### CR-1 (Medium) Filter failure message is generic and resembles empty-state wording (AR-7)
- Evidence: `script.js` `FILTER_FAILURE_MESSAGE = "No transaction found"`; empty messages are "No income transactions." / "No expense transactions." / "No transactions yet. ...". The failure text reads like an empty result, not an error.
- Affected: `script.js` (constant, handler catch), shown in `#form-error` (role=alert) in the form section, away from the filter.
- Impact: a render failure could be misread as "no matching data"; also N-5 clearing is keyed on text equality, so wording and clearing logic are coupled.
- Recommended fix: user to confirm or change wording (e.g. "Could not apply the filter. Please try again."); optionally place the error near the filter. Tests already use the constant, so a wording change is low-cost.
- Status: Open (user decision; flagged as known risk).

### CR-2 (Medium) Browser-only behaviour is unverified
- Evidence: implementation-notes section 5: screen-reader announcement (role=status plus aria-live on history, possible double announcement), `.hide` on `#history-filter-row`, `:empty` collapse, Firefox soft-reload restoring select value (N-1) were NOT RUN. Fake DOM cannot cover real `change` events, CSS, or form restoration. CSS inspected statically: `.hide` is defined at `styles.css:197`, after the new rules, and new rules set no `display`, so the cascade looks correct; `.field` uses `display:flex` but `.hide` appears later with equal specificity (class), so it should win if `.hide` is `display:none` (not run in a browser).
- Affected: `index.html`, `styles.css`.
- Recommended fix: manual browser and screen-reader check in Stage 7, recorded as not-run if skipped.
- Status: Open / Not Verified.

### CR-3 (Low) Redundant key normalisation in three places (DRY)
- Evidence: `isHistoryFilterKey` is checked in `filterTransactions`, in `renderTransactions`, and in the change handler; the handler also pre-validates `candidate`. Defensive, correct, but triplicated.
- Affected: `script.js`.
- Recommended fix: optional; normalise once in `renderTransactions` or the handler. Not blocking.
- Status: Open (optional).

### CR-4 (Low) Hard-coded stored type strings duplicate existing constants
- Evidence: `HISTORY_FILTERS.income.type: "Money Received"`, `expenses.type: "Expense"` while `TRANSACTION_TYPES = ["Expense", "Money Received"]` exists at `script.js:3` (other code at line 42 also hard-codes "Money Received", so this matches existing style).
- Recommended fix: optional; leave as is for consistency.
- Status: Open (optional).

### CR-5 (Low) Mutation check not performed on new tests
- Evidence: implementation-notes section 3 states no deliberately broken implementation was run. By reading, the tests would fail on plausible breakages: wrong type mapping (itemTypes assertions), missing balance invariance (balance test), removed init sync (N-1 test expects reset from "income"), removed `repositoryReady` guard (snapshot includes balanceHidden/empty state, which would change), mutating render order (failure snapshot tests with forced article/Intl failure), clear-all-errors in N-5 (unrelated-error assertion). This is reviewer inference, not executed.
- Recommended fix: optionally run a quick manual mutation pass in Stage 7.
- Status: Open (optional).

### CR-6 (Low) Harness and test fragility
- Evidence: `itemTypes` depends on fake DOM child positions (`item.children[0].children[0]`); `Intl.NumberFormat` override via `vm.runInContext`; `createApp` signature extended with `initialFilterValue`. Acceptable and restored in `finally`; but coupling to row markup structure would break on unrelated markup changes.
- Status: Open (informational).

### CR-7 (Low) Stale status and error positioning (cosmetic)
- Evidence: "Transaction added." status may persist after switching filters (AR-4/Q-A3, accepted). Failure error appears in the form area, not the history card.
- Status: Accepted by design; informational.

## Review areas

| Area | Result | Evidence |
|------|--------|----------|
| Functional correctness | Pass | `filterTransactions` is pure, non-mutating, preserves order; Income = "Money Received", Expenses = "Expense"; default All; unknown keys fall back to All (own-property check blocks "constructor"/"__proto__"). Balance always computed from all transactions. |
| Acceptance criteria | Pass (AC-1..AC-4) | AC-1: select with All/Income/Expenses, label "Show", markup test. AC-2/AC-3: integration tests for narrowing and return to All. AC-4: exact messages; original empty state only when total is 0; no filter message in load failure. |
| FR/NFR | Pass; NFR-1 partly Not Verified | FR-1..FR-8 covered by tests; FR-8 test confirms filter retained on add. NFR-1 accessibility label/role present statically; announcement not verified (CR-2). |
| Constraints N-1, N-2, N-3, N-5 | N-1/N-2/N-5 Pass; N-3 Not Verified | N-1: init sync plus `autocomplete="off"`, tested. N-2: build-then-swap in `renderTransactions`, failure tests assert identical DOM snapshot and restored select/filter. N-5: clears only own message, tested. N-3: CSS cascade checked statically only (CR-2). |
| AR-7 | Open | CR-1. |
| Security | Pass | No `innerHTML`; rows created via existing `createTransactionElement`; literal-text test for markup-like notes; no secrets in diff. |
| Error handling | Pass | try/catch in handler restores select and previous filter; `renderLoadFailure` hides filter row and clears message; handler no-op when repository not ready. |
| Test coverage / quality | Pass with notes | 14 new tests, 29/29 passing (executed). Failure paths are covered with real forced failures. Mutation check not executed (CR-5). |
| Code clarity / DRY | Pass with notes | Clear structure; minor duplication (CR-3, CR-4). |
| Regression risk | Low | `renderTransactions` third parameter defaults to module state; existing call sites unchanged; pre-existing tests unmodified apart from harness ids. |
| Dependency safety | Not Applicable / Not Verified | No `package.json` or lockfile exists (checked); no new dependencies added in the diff; no scanner evidence, so not claimed as Passed. |
| Configuration / secrets | Pass | No config or secret changes in the four reviewed files. |

## Approval

Status: Draft / Awaiting Approval. No approval recorded.

## Approval

Status: Approved. Approval evidence: User message in main session, 2026-11-03: "1. approve stage 6 2.yes 3. start stage 7 4. yes". Interpretation: Stage 6 code review approved; CR-1 answer "yes" is ambiguous (keep vs new wording) so CR-1 stays OPEN/unresolved, wording unchanged, no source change, no other finding fixed; start Stage 7; commit code-review.md and workflow-session.json (no push).

Dispositions: CR-1 OPEN (unresolved: neither accepted nor fixed; "No transaction found" unchanged). CR-2 carried to Stage 7 as NOT RUN manual item. CR-3..CR-7 not fixed (no user direction). Approval does not authorize push or Stage 8.
