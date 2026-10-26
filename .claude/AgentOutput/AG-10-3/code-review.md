# Code Review: AG-10 - Filter transactions by type

Run ID: AG-10-3 | Branch: feature/AG-10-3 | Stage 6 | Reviewer: code-review-agent
Scope: uncommitted diff of `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs` against requirements, architecture (incl. section 13), design-review, impl-plan, implementation-notes. Approval is recorded only in `workflow-session.json`.

## Verdict: APPROVE WITH MINOR CHANGES (no Critical, no High)

## Evidence
- `node --test tests/`: 28 tests, 28 pass, 0 fail (re-run by reviewer).
- Reviewer mutation spot-check on a temp copy (repo files untouched): removed add-reset (1 test fails), never-disable (2), no unknown msg (1), no "Not found" (1), empty-state keyed on visible list (1), never-enable (1), no persistence (4), unknown-key guard removed (1). Removing the `repositoryReady` guard in the change handler: 28/28 still pass (see M-1).
- Not run: manual Chrome checks (T12), screen reader, CI (none exists).

## AC coverage
| AC | Status | Evidence |
|---|---|---|
| AC-001 | Met | select with All/Income/Expenses, label `for` association; HTML test |
| AC-002 | Met | `TRANSACTION_FILTERS` maps income->Money Received, expenses->Expense; filter test |
| AC-003 | Met | All restores 3 items; test |
| AC-004/007 | Met | "Not found" only for non-empty history; empty history keeps "No transactions yet" (F-4) |
| AC-005 | Met | balance computed from full list, asserted unchanged |
| AC-006 | Met | key `transactionFilter`, default all, restored after reload |
| AC-008 | Met | reset after save success, not on save failure; tests for hidden, matching, failed save |
| AC-009 | Met at startup | "unknown value" shown, falls back to All (see L-2) |

## Findings

### Critical / High
None.

### Medium
- M-1 Test gap: the `if (!repositoryReady) return;` guard in the `change` handler (script.js ~L619) is not protected. With it removed all 28 tests still pass, because the "load failure" test only asserts `empty-state`/`balance` hidden and `filter-empty-state` empty, which also hold when render throws and is swallowed. Required: assert something the guard uniquely prevents, e.g. that `transaction-history` children stay empty and `lastBalance`-dependent output is untouched, or that no filter value is written to storage after a change on a failed load (`storage.values.has("transactionFilter") === false`; note `chooseFilter` calls `setActiveFilter` which persists).

### Low
- L-1 The same guard path: when the guard is bypassed, `setActiveFilter` would persist a preference during a load-failure state. Covered by the M-1 fix.
- L-2 `renderLoadFailure` clears `#filter-message`, so a startup "unknown value" message is lost on load failure and not restored after a successful Retry (acknowledged as PR-4 in implementation notes). Acceptable under the approved design; mention in PR known limitations. Also, the message persists indefinitely until the user changes the filter.
- L-3 In the add flow, `setActiveFilter(DEFAULT)` runs before the guarded render; if render throws, the select shows All while the DOM list still shows the old filtered view (the error message tells the user to reload, so impact is small).
- L-4 Pre-existing-style swallow: change handler `catch` is silent, so a render failure after a filter change gives the user no feedback (documented decision; consider only if cheap).
- L-5 `tests/app.test.cjs` shows an LF->CRLF warning; line-ending normalization only. Confirm no whole-file rewrite noise before commit.

## Review areas
- Functional correctness: Passed. Logic is small, display-only; stored data never mutated by filtering.
- Edge cases/error handling: Passed. Storage read/write failures for the preference are non-fatal (tested); `Object.hasOwn` blocks `__proto__`/`constructor` keys (tested); empty-string stored value treated as unknown.
- Security/privacy: Passed. All user-derived text uses `textContent`; new messages are constants; no innerHTML, no network, no secrets added. `Object.hasOwn` is fine for Chrome-only target.
- Accessibility: Passed for the minimal level (D-5): labeled native select (keyboard operable), permanent `role="status"` containers. Announcement behavior unverified in a browser.
- Maintainability: Passed. Follows existing patterns, small helpers, no dead code. The `filterSelect`/`filterMessage` null checks match existing defensive style.
- Regression risk: Low. Existing tests unchanged apart from additive id lists, hook exports and `failKeys`. Submit and render paths touched minimally.
- Test quality: Mostly good; mutation checks show 8 of 9 mutants killed. See M-1.
- Configuration/secrets: Passed. No secrets, no config changes. Dependency scan: Not Applicable (no manifest/lockfile).
- Scope creep: None. The untracked analytics JSON must not be committed (unrelated).

## Required changes
1. M-1: strengthen the load-failure test so it fails when the `repositoryReady` guard is removed.
Optional: L-2/L-3 documented as known limitations in the PR; L-5 check before commit.

## Not verified
Manual Chrome behavior, screen-reader announcements, visual styling.
