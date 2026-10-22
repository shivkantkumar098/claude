# Code Review: AG-10 Filter transactions by type

- Stage: 6 Code Review (status: Awaiting Approval; nothing here is approved)
- Reviewer: code-review-agent (Claude Code)
- Scope: `git diff b4a13c9 HEAD` on feature/AG-10-1 (7 commits 1df4d17..e457b57; index.html, script.js, styles.css, tests/app.test.cjs). Working tree clean at review start.
- Verdict: **Approve with conditions** (0 blocker, 0 major, 3 minor, 5 notes). No unresolved Critical or High finding.

## Evidence
Executed by me:
- `git diff b4a13c9 HEAD`, `git status --short` (clean), CRLF counts, grep checks.
- `node --test tests/`: 37 tests, 37 pass, 0 fail, 0 cancelled, 0 skipped (about 165 ms).

Read only (not executed): all source/test diffs, architecture.md D-004/D-005, implementation-notes.md.

Not verified: real-browser rendering/layout, browser form-state restoration (design-review F-01; only the stub case "startup forces All" is tested), screen-reader announcement of `#filter-empty-state` and of the disabled-select state (F-04), keyboard flow, Object.hasOwn on target browsers, dependency/security scanners (no manifest/lockfile or scanner present; dependency area Not Verified), CI (none found).

## Findings

### Minor
- **M-1 Filter error persists after a successful filter change.** `script.js:565-584`: the failure path calls `setFormError(...)`, but the success path only calls `clearSaveStatus()` (line 573), not `setFormError("")`. After a failed then successful filter change, "The filter could not be applied..." stays visible while the view is correct. Test `tests/app.test.cjs:725-747` ("then recovers") asserts the view and select value but never asserts the error is cleared, so the stale message is untested. Fix: call `setFormError("")` (or clearSubmissionFeedback) at the start of the change handler and assert it in the test.
- **M-2 Filter error is shown in the form's `#form-error`, away from the control.** `script.js:581`. The message appears in the add-transaction form area, not next to the history filter, and also overwrites/shares a slot with form validation errors. Acceptable per plan reuse, but discoverability/a11y is weaker. Fix (optional): dedicated message element near the select, or confirm the reuse as intended.
- **M-3 Failure rollback is only partial in the DOM.** `script.js:412-427, 575-581`: `renderTransactions` mutates several nodes (`replaceChildren`, balance, empty states) sequentially; if it throws after the first, the catch restores `activeFilter`/select but not the already-changed DOM. The test only fails the first mutation (`replaceChildren`), so it cannot detect this. Low likelihood (DOM ops rarely throw). Fix: build values first, apply DOM writes last, or re-render with the previous filter in the catch.

### Notes
- N-1 Test stub fidelity: the stub `<select>` accepts any `.value` (`tests/app.test.cjs:611-614`, line 141). A real select coerces an unmatched value to "" , so tests for "invalid value treated as All" exercise `normalizeFilterKey` but not real DOM behavior. Real-browser check needed in Verification.
- N-2 `script.js:412` exceeds the surrounding ~80-column wrap style (no formatter config found); cosmetic.
- N-3 `clearSaveStatus` split from `clearSubmissionFeedback` (`script.js:475-483`) is a small, justified refactor, not scope creep. No undeclared features found.
- N-4 `Object.hasOwn` (`script.js:68,71`) needs modern browsers; already recorded as a risk.
- N-5 A focused select that becomes disabled on load failure (`script.js:435`) loses focus; minor a11y edge, not verified.

## Area assessment
- **Functional / ACs:** FR-001..004 and EC-001..006 map to code and tests: filter outside the form (select at index.html, not in `<form>`, so `transactionForm.reset()` does not touch it), original order preserved, balance computed from all transactions (`calculateAvailableBalance(transactions)`), filter-empty message separate from "No transactions yet", legacy-migrated records appear under Expenses, no storage writes on filter change (tested). Decisions honored: D-004 keep filter plus exact note text (`script.js:5-6, 547-551`); D-005 wording ("No income/expense transactions found."); label "Filter by type"; failure text exact.
- **Security/privacy:** No `innerHTML` in script.js (grep: none); messages set via `textContent`; filter key validated via own-key check (`Object.hasOwn`), prototype keys covered by a unit test; no secrets or config added.
- **Error handling / load-failure:** filter disabled in HTML, enabled only on successful load, disabled and cleared on failure, handler guarded by `repositoryReady`/`isLoading`; retry re-enables (tested).
- **Accessibility (read only):** proper `<label for>`, `autocomplete="off"`, `role="status"` on filter-empty message. Actual announcements not verified.
- **Maintainability:** no new comments (consistent with surrounding code); naming consistent; working tree is CRLF uniformly in all four files (HEAD blobs are LF via git normalization, same as baseline), so no line-ending drift.
- **Regression risk:** balance, form reset, save flow, load-failure/retry covered by existing plus new tests (15 baseline to 37, all passing). Save-flow change is limited to the status message.
- **Test quality:** tests assert behavior (visible types, order, messages, storage unchanged, balance); no vacuous tests found; see M-1/M-3/N-1 gaps.

## Conditions before PR
1. Fix or explicitly accept M-1 (and add the assertion).
2. Verification stage must include manual real-browser checks (F-01 form restoration, layout, keyboard) and screen-reader check (F-04), or record them as not verified.

## Recommended fixes (no code was changed by this review)
M-1: clear form error at start of the change handler. M-3: re-render with previous filter in catch. M-2 optional.
