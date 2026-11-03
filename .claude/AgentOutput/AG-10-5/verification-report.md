# Verification Report: AG-10 Filter transactions by type

- Jira issue: AG-10, run ID AG-10-5, branch `feature/AG-10-5`
- Stage: 7 Verification
- Status: **Approved** (user, 2026-11-03; see Approval section).
- Verified commit: e5c0417 (plus 305a38a docs). Working tree clean except the unrelated untracked `docs/codemie/analytics/*fe4bb36f*.json` (not touched).
- No source or existing test modified, no new test file created, nothing committed or pushed.

## 1. Commands and actual results

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `node --test tests/` | 0 | tests 29, pass 29, fail 0, cancelled 0, skipped 0, todo 0 |
| 2 | `node --check script.js` | 0 | no syntax errors |
| 3 | `node --test tests/` (second run) | 0 | tests 29, pass 29, fail 0 (same result) |
| 4 | Mutation check (section 4) | n/a | 5 of 29 tests failed under the break; source restored |

No linter, type-checker, or static-analysis tool is configured (no `package.json`); none run.

## 2. Acceptance criteria and requirements

| ID | Verdict | Evidence |
|----|---------|----------|
| AC-1 | Passed | Markup test asserts select `#history-filter` with options All/Income/Expenses, label "Show", default All (tests/app.test.cjs markup test; suite pass). |
| AC-2 | Passed | Test 17 (Income/Expenses narrowing), unit test 16 (`filterTransactions`); mapping Income=`Money Received`, Expenses=`Expense` at `script.js:296` onward. |
| AC-3 | Passed | Test 17 returns to All and shows full history. |
| AC-4 | Passed | Test 19: exact "No income transactions." / "No expense transactions."; original "No transactions yet..." only when total = 0; no filter message on load failure (test 25). |
| FR-1..FR-4 | Passed | As above. |
| FR-5 | Passed | Tests assert stored data unchanged and no reorder/mutation (tests 16, 17). |
| FR-6 | Passed | Balance-unchanged integration test. |
| FR-7 | Passed | Default All in markup/integration tests; N-1 init sync test 29. |
| FR-8 | Passed | Test 21 (add under active filter). |
| NFR-1 | Partly Passed / Not Verified | Label and `role="status"` verified statically by markup test; actual announcement NOT RUN. |
| NFR-2 | Passed | Literal-text note test; no `innerHTML` in diff (review + grep by reviewer). |
| NFR-3 | Passed (static) | No new dependencies/files beyond planned four. |
| NFR-4 | Passed | Test 25 (load failure hides filter row and message; retry restores). |
| NFR-5 | Passed | 14 new tests cover AC-1..AC-4. |
| N-2, N-5 | Passed | Tests 26, 27, 28 (failure leaves DOM identical, select restored; only own message cleared). |

## 3. Applicable checks

- Missing/invalid input: Passed. Unknown select value normalises to All (test 24); handler no-op when repository not ready.
- Not-found / empty behaviour: Passed (test 19, original empty state test).
- Secret exclusion: Passed. Grep for token/secret/password/api key in `index.html`, `script.js`, `styles.css`, `tests/` returned nothing; tracked secret-like files are only `.env.example` and `.mcp.json.example` (placeholders).
- Deterministic output: Passed for test results (two consecutive runs both 29/29); app has no generated output.
- Empty source directories: Not Applicable (no generator or source-scanning feature).
- Generated README/ARCHITECTURE validation: Not Applicable. `ls README* ARCHITECTURE*` found no files and no generator exists; manual-section preservation also Not Applicable.
- CI configuration: Not Found (`.github` does not exist). No external CI evidence; none claimed.
- Dependency scan: Not Applicable (no `package.json` or lockfile).

## 4. Mutation check (executed, reversible)

- Break: `script.js` line 296, `income.type` changed from `"Money Received"` to `"Expense"`.
- Result: 29 tests, 24 pass, 5 fail (tests 16, 17, 19, 21, 26). The tests detect a wrong type mapping.
- Restore: `git checkout -- script.js`. Afterwards `git diff --stat` empty; `git status --short` shows only the unrelated untracked `docs/codemie/analytics/*fe4bb36f*.json`. Only this single mutation was run; CR-5 other breakages remain reviewer inference.

## 5. Results by category

- **Passed:** `node --test tests/` (29/29, twice); `node --check script.js`; AC-1..AC-4; FR-1..FR-8; NFR-2, NFR-4, NFR-5; N-1 (harness init-sync only), N-2, N-5; secret scan; mutation detection (single mutation).
- **Failed:** none.
- **Blocked:** none.
- **Not Verified / NOT RUN:**
  1. Manual screen-reader check of `role="status"` plus `aria-live="polite"` on history, possible double announcement (NFR-1, N-4).
  2. Browser CSS check: `.hide` hiding `#history-filter-row`, `#filter-empty-state:empty` collapse, select styling consistency (N-3, CR-2).
  3. Firefox soft-reload select value restoration (T-11, N-1, CR-2); only the harness init-sync line is covered.
- **Not Applicable / Not Found:** generated README/ARCHITECTURE validation, empty source directory handling, dependency scan, linter/type-check (none configured), CI config (Not Found).

## 6. Open items

- CR-1 (Medium) OPEN/unresolved: `FILTER_FAILURE_MESSAGE = "No transaction found"` unchanged, as instructed; it resembles an empty-state message. Not verified as acceptable.
- CR-2 carried as the NOT RUN items above.
- CR-3..CR-7 unfixed, non-blocking.
- Per implementation notes, temp directory `C:\Golu\projects\capstone\scratch_t` (outside repo) needs manual removal.

## 7. Conclusion

All applicable automated checks passed with real execution evidence; no failures. Verification is complete for what is automatable; browser/screen-reader aspects and CR-1 remain open.

## Approval

Status: Approved. Approval evidence: User message in main session, 2026-11-03: "1.approve of stage 7 2.keep the wording and accept the risk 3.start 4.yes". Interpretation: Stage 7 verification approved; CR-1 resolved by keeping "No transaction found" and accepting the risk (no source change); start Stage 8 (prepare only); commit verification-report.md and workflow-session.json (no push, no PR). CR-1 accepted by the user (risk: generic wording resembles empty-state messages). Approval does not authorize push or PR creation.
