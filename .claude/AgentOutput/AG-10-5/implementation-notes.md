# Implementation Notes: AG-10 Filter transactions by type

- Jira issue: AG-10, run ID AG-10-5, branch `feature/AG-10-5`
- Stage: 5 Implementation
- Status: **Approved** (user, 2026-11-03; see section 8)
- Nothing was staged, committed, or pushed.

## 1. Completed tasks

| Task | Result |
|------|--------|
| T-1 markup | Done. `index.html`: `div.field.history-filter#history-filter-row` with label "Show", `select#history-filter autocomplete="off"` (All selected / Income / Expenses), and `<p id="filter-empty-state" role="status"></p>` (no inner whitespace). Placed in `.history-card` after `#retry-load`, before `#empty-state`. |
| T-2 styles | Done. `styles.css`: `.history-filter` (margin only), `#filter-empty-state`, `#filter-empty-state:empty`; no `display` property; all placed before `.hide` (still last rule before the media query). |
| T-3 filter logic and render | Done. `HISTORY_FILTERS`, own-key `isHistoryFilterKey`, pure `filterTransactions`, `activeHistoryFilter`, build-then-swap `renderTransactions(list, balance, filterKey = activeHistoryFilter)` (formatINR and row creation before any DOM mutation; wrapper show inside assignment phase), `renderLoadFailure` hides the wrapper and clears the message, init sync `historyFilterSelect.value = activeHistoryFilter` before first load. |
| T-4 change handler | Done. One `change` listener; no-op when `!repositoryReady`; reads `select.value` (never `event.target`); unknown value normalised to All; render in try; on success sets `activeHistoryFilter` and clears `formError` only if its text equals `FILTER_FAILURE_MESSAGE` (N-5); on failure restores select and previous filter and shows `FILTER_FAILURE_MESSAGE`. |
| T-5 harness | Done. Three new ids in `createApp` and markup test; `createApp` gained an optional second parameter `initialFilterValue` (default `"all"`) so N-1 can be tested; `__appTest` exports `HISTORY_FILTERS`, `filterTransactions`, `FILTER_FAILURE_MESSAGE`; markup assertions for options, label, autocomplete, role, exact empty `<p>`. |
| T-6 unit tests | Done (1 test). |
| T-7 integration tests | Done: default/Income/Expenses/All, balance and stored-data unchanged, empty messages, original empty-state only when total = 0, add under active filter, literal note text, not-ready no-op, unknown value normalisation. |
| T-8 failure-path tests | Done: load failure and retry, forced row-creation failure (DOM identical, select and filter restored, later add still uses previous filter), formatINR-only failure (via `Intl.NumberFormat` override), N-5 clear-only-own-message, N-1 init sync. |
| T-9 docs | No doc change: no README exists (`ls README*` found nothing); `docs/` contains only an unrelated analytics export. Notes written (this file). |
| T-10 full suite | Done, see section 3. |
| T-11 | Recorded as NOT RUN, see section 5. |

## 2. Changed files

- `C:\Golu\projects\capstone\claude\index.html` (+9)
- `C:\Golu\projects\capstone\claude\styles.css` (+14)
- `C:\Golu\projects\capstone\claude\script.js` (+75/-3)
- `C:\Golu\projects\capstone\claude\tests\app.test.cjs` (+322/-2)
- This notes file (new).

`.claude/AgentOutput/AG-10-5/workflow-session.json` was already modified before this stage and was not touched by me. `docs/codemie/analytics/*fe4bb36f*.json` is the pre-existing unrelated untracked file; not touched.

Line endings preserved (script.js, styles.css, tests CRLF; index.html LF as before).

## 3. Commands and actual results

1. `node --check script.js` : exit 0.
2. First `node --test tests/` run after writing tests: `# tests 29 / # pass 27 / # fail 2`. Failures (both were test-code bugs, fixed in the tests, not in the app):
   - `unit: filterTransactions filters by type without mutating or reordering`: "Values have same structure but are not reference-equal" (cross-realm array in `deepEqual`); fixed by comparing joined ids.
   - `integration: formatINR as the only throwing call does not mutate the DOM (N-2)`: `Cannot read properties of undefined (reading 'NumberFormat')` (`context.Intl` is not a property of the vm context); fixed by overriding `Intl.NumberFormat` through `vm.runInContext`.
3. Final `node --test tests/` : exit 0, `# tests 29 / # pass 29 / # fail 0 / # cancelled 0 / # skipped 0`. (Pre-existing tests: 15; new: 14. Pre-existing tests were not modified apart from adding ids to the markup test list and the shared `createApp` harness.)

I did not run the suite against a deliberately broken implementation (no mutation check).

## 4. Deviations and decisions

- `createApp` signature extended with an optional `initialFilterValue` argument (harness change beyond the literal T-5 text; needed for the N-1 test).
- Plan T-4 said the balance is computed then render is tried; I put `calculateAvailableBalance` inside the same `try` so a throw there also takes the failure path (restores select, shows message). Behaviour otherwise as planned.
- AR-7: `FILTER_FAILURE_MESSAGE = "No transaction found"` (user wording, typo corrected). It is generic and resembles the empty-state messages; flagged. Tests compare to the exported constant, not a literal.
- N-5: clear-on-success by text match; distance of the message from the filter accepted (cosmetic).
- Stale "Transaction added." status is left untouched (Q-A3).
- Cleanup not done: a temporary helper directory `C:\Golu\projects\capstone\scratch_t` (outside the repository, contains `append.js`, `splice.py`) could not be removed because the SDLC hook blocked the delete command. It is not part of the repo; please remove manually.

## 5. Not testable with the fake DOM / NOT RUN (T-11)

NOT RUN (no browser or screen reader available in this stage):
1. Screen-reader check that the always-present `role="status"` region is announced on change, and double announcement with `#transaction-history` (`aria-live="polite"`) (N-4, AR-6).
2. Browser CSS check: `.hide` hides `#history-filter-row` on load failure, `#filter-empty-state:empty` collapses spacing, select looks consistent with the form select (N-3).
3. Firefox soft-reload with a non-default selection (N-1). Only the init-sync line is covered by the harness (pre-set select value to `"income"`, assert it resets to `"all"`); real form-state restoration timing is not testable.

Also not testable in the fake DOM: real `change` events (`event.target`), CSS cascade, `:empty` matching, focus behaviour, a real `<select>` rejecting unknown values.

## 6. Self-review of diff

Scope: only the four planned source/test files changed; no secrets, tokens, or credentials in the diff (grep for token/secret/password/api key returned nothing); no `innerHTML` use; repository, validators, balance calculation and submit handler logic unchanged (submit handler still calls `renderTransactions` with two arguments).

## 7. Blockers

None.

## 8. Approval

Status: Approved. Approval evidence: User message in main session, 2026-11-03: "1.approve stage 5 2. start stage 6 3.yes". Interpretation: Stage 5 implementation approved; start Stage 6; commit source/test changes locally (no push). Scope: Stage 5 only; not approval to push.
