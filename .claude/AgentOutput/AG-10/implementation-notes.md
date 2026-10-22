# Implementation Notes: AG-10 Filter transactions by type

Stage: 5 - Implementation
Status: Awaiting Approval (NOT approved)
Branch: feature/AG-10-1
Author: implementation-agent (Claude Code). Not a human review.
Inputs: approved `requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`.

## 1. Pre-edit checks and rollback safety

- `git status` was clean before editing. Current branch: `feature/AG-10-1`.
- Deviation from plan premise: the plan states the repo has no commits and all files are untracked. Actual state: one baseline commit `b4a13c9 initial chg` exists and tracks all four target files, so git can restore the originals (`git checkout b4a13c9 -- <file>`). The plan's R-A is therefore reduced; no untracked-file risk. The first task commit was NOT a root commit.
- Backup (per user instruction) of the ORIGINAL `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`, made before any edit, outside the repo:
  `C:\Users\SHIVKA~1\AppData\Local\Temp\ag10-backup\` (files at the top level, test file in `tests\`). Short-name path as resolved by `$TEMP`; the long form is under `C:\Users\<user>\AppData\Local\Temp\ag10-backup\`.
- Baseline run before edits: `node --test tests/` = 15 tests, 15 pass, 0 fail (Node v20.17.0).
- Line endings: all four files use CRLF; edits preserved CRLF.

## 2. User decisions applied

- Commit per task authorized (stage only task files; no push, no force, no hook bypass). `.claude/`, `.mcp.json`, `.vscode/`, `CLAUDE.md`, `docs/`, `.codemie/` were not staged (`.claude/AgentOutput/` is also in `.gitignore`).
- Wording: label "Filter by type"; failure message "The filter could not be applied. The previous view is kept."
- Full suite (`node --test tests/`) run before each commit; every commit made only on green.

## 3. Tasks completed and commits

| Task | Commit | Files | Suite result before commit |
|---|---|---|---|
| T1 extend test stub | `1df4d17` | tests/app.test.cjs | 15 tests, 15 pass, 0 fail |
| T2 markup + markup test | `942808a` | index.html, tests/app.test.cjs | 16 tests, 16 pass, 0 fail |
| T3 pure filter + unit tests | `9094d82` | script.js, tests/app.test.cjs | 20 tests, 20 pass, 0 fail |
| T4 render integration, startup sync, load failure | `127f77c` | script.js, tests/app.test.cjs | 24 tests, 24 pass, 0 fail |
| T5 change handler + behavior tests | `29e178e` | script.js, tests/app.test.cjs | 33 tests, 33 pass, 0 fail |
| T6 add-while-filtered note | `da31bc0` | script.js, tests/app.test.cjs | 37 tests, 37 pass, 0 fail |
| T7 styles | `e457b57` | styles.css | 37 tests, 37 pass, 0 fail |
| T8 final verification, notes | no commit (artifacts only; `.codemie/` not committed) | this file, workflow-session.json | 37 tests, 37 pass, 0 fail, 0 skipped, 0 cancelled, about 338 ms |

Final `git diff --stat b4a13c9 HEAD`: 4 files, 462 insertions, 6 deletions (index.html +9/-0, script.js +68/-4, styles.css +10/-1, tests/app.test.cjs +375/-1). `git status` clean after T7 (apart from ignored `.codemie/`). Diff scanned for token/secret/password/api key strings: no matches.

## 4. What was implemented

- `index.html`: labelled native select `#transaction-filter` ("Filter by type"; All / Income / Expenses; `autocomplete="off"`, initially `disabled`), placed in the history card outside the form; `<p id="filter-empty-state" role="status">` after `#empty-state`.
- `script.js`: `FILTER_TYPE_BY_KEY`, `FILTER_EMPTY_MESSAGE_BY_KEY`, `normalizeFilterKey`, `filterTransactionsByType` (both use `Object.hasOwn`); `activeFilter` state; `renderTransactions` renders the filtered list, balance stays on the full list, filtered-empty text set via `textContent`; `renderLoadFailure` disables the select and clears the filtered-empty text; `loadTransactions` enables the select after a successful render; startup sync sets the select to `activeFilter` before first load; change handler with not-ready guard, previous-view restore and failure message; `clearSaveStatus` helper (also used by `clearSubmissionFeedback`); submit handler shows "Transaction added. It is hidden by the current filter." when the new record is not visible under the active filter, filter kept (D-004).
- `styles.css`: `#filter-empty-state` added to the `#empty-state` rule; `.history-filter` spacing; select max width 16rem. No `display` rule added to any `hidden` element.
- `tests/app.test.cjs`: stub extended (`initialFilter` option, two new ids, `visibleTypes`, `seedEnvelope`); 22 new tests (markup 1, unit 4, startup/load/failure 4, handler behavior 9, add-while-filtered 4).

## 5. Deviations and decisions

1. Plan premise on git state was wrong (baseline commit exists); see section 1. Commits were made as authorized by the user.
2. Plan T2/T3 ordering deviation (HTML id list in T2, `__appTest` exports in T3) followed as planned.
3. vm-context array prototypes: tests compare via `.map` to ids or text, not cross-realm `deepStrictEqual` on arrays from the app context (one `assert.deepEqual` is used on arrays built in the test realm only). Stub `classList` only supports `toggle`; new code uses only `showElement`/`hidden`/`textContent`. Single listener per event on the select.
4. The handler normalizes inside the `try` block (`activeFilter = normalizeFilterKey(...)` before render) so the previous filter is restored on any throw; behavior matches the plan sketch.
5. The "while failed" disabled assertion (F-08) is covered by the read-failure retry test and the "ignored while not loaded" test.
6. Tests were edited through a temporary helper script in `%TEMP%\ag10-tools\` (outside the repo, not committed) because files are CRLF.
7. A first attempt at T2 test regex escaping failed (syntax error in the test file, caught immediately, nothing committed); the file was reset with `git checkout tests/app.test.cjs` (only that task's uncommitted edit, T1 already committed) and redone.
8. Stale artifacts: `workflow-session.json` knownRisks and `impl-plan.md` still say "no commits"; not edited here beyond adding notes. `impl-plan.md` was not modified.

## 6. Test evidence (actual)

- Command: `node --test tests/` from the repository root. Exit code 0 on the final run. Result: tests 37, pass 37, fail 0, cancelled 0, skipped 0, todo 0. Per-task counts are in section 3. Runs executed by me; Node v20.17.0.
- No linter, build step, package.json or CI exists (Not Found); none run.

## 7. Not performed / not verified

- Real browser check (layout, focus styles, visual spacing, select width) NOT performed.
- Browser form-state restoration on reload / back-forward (F-01) NOT verified in a real browser; mitigated by startup sync and `autocomplete="off"`, covered only against the stub.
- Screen-reader announcement of `#filter-empty-state` and list re-read (F-04) NOT verified.
- `Object.hasOwn` browser baseline (Chrome 93+, Firefox 92+, Safari 15.4+) accepted, not tested in browsers.
- The rendered failure path for the filter is only exercised via a forced stub throw.
- No push, PR, or Jira action was taken. Stage 6 (Code Review) not started.

## 8. Approval status

- Stage status: Awaiting Approval
- Approval: Pending
- Approval evidence: None recorded for Stage 5.

## 9. Follow-up: fix M-1 (post Stage 6)

- Change: `script.js` filter change handler now calls `setFormError("")` right after `clearSaveStatus()` and before the try block, so a stale filter-failure message is cleared on the next change. The catch path still sets the failure message after clearing. `tests/app.test.cjs`: in the render-failure recovery test, added an assertion that `#form-error` is empty after the subsequent successful filter change.
- Commit: bafe52e (local only, not pushed).
- Tests: `node --test tests/` exit 0; tests 37, pass 37, fail 0, cancelled 0, skipped 0, todo 0.
- M-2 and M-3 remain unfixed. Stage 7 (Verification) not started.
