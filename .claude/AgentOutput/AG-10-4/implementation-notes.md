# Implementation Notes: AG-10 - Filter transactions by type

- Run ID: AG-10-4 (branch `feature/AG-10-4`)
- Stage: 5 - Implementation (Batch 3 / TASK-016: regression, scope checks, notes)
- Date: 2026-11-02
- Author: `implementation-agent` (Claude Code), one-shot runs; no conversation with the user took place inside these runs
- **Status: APPROVED (Stage 5) - 2026-11-02.** Approval evidence: the user explicitly approved Stage 5 (Implementation) on 2026-11-02 with the messages "1.approve stage 5 2.yes" and, after a follow-up, "approva stage 5" (relayed by the orchestrator). This approval covers Stage 5 only. It does NOT authorize Stage 6 (Code Review), any push, or any pull request.
- Batch 3 run (original draft): wrote only this file. It edited no application code, no tests, no other artifact, and did not touch `workflow-session.json`. Nothing was staged, committed, or pushed.

## 1. Task status

Approved plan: `impl-plan.md` (Stage 4 approved 2026-11-02, "approve stage 4"). Each batch was separately approved by the user. Batch 1 and Batch 2 were implemented in earlier runs and committed; Batch 3 is this run.

| Task | Batch | Status | Evidence |
|---|---|---|---|
| TASK-001 Pre-edit checks and baseline | 1 | Completed (earlier run) | Baseline 15 tests / 15 pass (plan stage and Batch 1, as reported by those runs; not re-run here) |
| TASK-002 Filter markup in `index.html` | 1 | Completed, commit ad97230 | Diff in section 4; covered by markup test 16 |
| TASK-003 Filter definition, predicate, state | 1 | Completed, commit ad97230 | `TRANSACTION_FILTERS`, `normalizeFilterKey`, `filterTransactions`, `let activeFilter` (declared in the module-state block) |
| TASK-004 DOM references and renderer split | 1 | Completed, commit ad97230 | `renderHistoryList`, `renderTransactions` delegates; signature unchanged |
| TASK-005 Load-lifecycle hooks | 1 | Completed, commit ad97230 | `showElement(historyFilter, false)` in `renderLoadFailure`; `showElement(historyFilter, true)` in `loadTransactions` |
| TASK-006 Selection state, radio sync, events, `pageshow` | 1 | Completed, commit ad97230 | `syncFilterControls`, `setActiveFilter`, per-radio `change` listeners with `repositoryReady` guard, start-up sync, guarded `pageshow` |
| TASK-007 Filter and empty-message styles | 1 | Completed, commit ad97230; **visual check not run** | CSS inspected statically only (section 6) |
| TASK-008 Test harness updates | 2 | Completed, commit 818c856 | Section 5 |
| TASK-009 Static markup tests | 2 | Completed, commit 818c856 | Test 16 plus the extended required-controls test (test 1) |
| TASK-010 Unit tests | 2 | Completed, commit 818c856 | Tests 17-19 |
| TASK-011 Integration: default, selection, messages, live region | 2 | Completed, commit 818c856 | Tests 20-25 |
| TASK-012 Integration: no storage access, balance, state not persisted | 2 | Completed, commit 818c856 | Tests 26-28 |
| TASK-013 Integration: add under filter, markup-like notes | 2 | Completed, commit 818c856 | Tests 29-34 |
| TASK-014 Integration: load failure, guard, retry | 2 | Completed, commit 818c856 | Tests 35-40 |
| TASK-015 Start-up default (TDZ), radio sync, `pageshow` | 2 | Completed, commit 818c856 | Tests 41-44 |
| TASK-016 Regression, scope checks, notes | 3 | Completed in this run (this document); Stage 5 approved 2026-11-02 | Sections 3 and 4 |
| TASK-017..020 Manual checks M-1..M-4 | Stage 7 | **Not Run (manual)** | Not Stage 5 work; see section 8 |

## 2. Commits on the branch (main..HEAD)

| Commit | Content |
|---|---|
| c2a435c | Stage 1: approved requirements |
| 9b19c82 | Stage 2: approved architecture (Draft 1) |
| cc90ae8 | Stage 3: design review and architecture amendment (Draft 2) |
| 2d92f74 | Stage 4: approved implementation plan |
| ad97230 | Stage 5 Batch 1: `index.html`, `script.js`, `styles.css` |
| 818c856 | Stage 5 Batch 2: `tests/app.test.cjs` |

Git state at the start of this run: branch `feature/AG-10-4`; `git status --short` showed only `?? .claude/AgentOutput/AG-10-4/workflow-session.json` (orchestrator-owned, untouched). This file is the only new file produced by this run.

## 3. Test results (actual execution in this run)

Environment: Node v20.17.0 (`node --version`). No `package.json`, no CI configuration; the commands were inferred from the repository (plan RK-10).

| Command | Exit code | Result |
|---|---|---|
| `node --test tests/` | 0 | tests 44, suites 0, **pass 44, fail 0, cancelled 0, skipped 0**, todo 0, duration about 342 ms |
| `node --check script.js` | 0 | No syntax errors (no output) |

- Baseline before this feature: 15 tests, 15 pass (plan stage). Batch 2 added **29 tests (15 -> 44)**; the first 15 are the original tests, kept with their intent (two of them received the harness option described in section 5).
- All 44 test names were listed from the run output: tests 1-15 are the pre-existing tests (test 1 was extended with the four new ids); 16-19 markup and unit tests; 20-34 filter behaviour tests; 35-40 load-failure tests; 41-44 start-up, sync, and `pageshow` tests.
- Note: `grep -c "^test("` returns 40 for the file because some tests are generated in a loop; the runner total of 44 is the authoritative figure.

### 3.1 Mutation checks (reported by the earlier Batch 2 run; NOT executed in this run)

The Batch 2 implementation run reported mutation checks run on temporary copies of the app/test files (never on the repository files), to confirm tests are not vacuous. These are labelled **agent-reported**; this run did not repeat them and cannot independently confirm them. The plan's two mutation-style acceptance points are covered as follows:

- TASK-014(d) "would fail if `renderLoadFailure` did not hide the filter": agent-reported as checked on a temp copy.
- TASK-015 "moving `let activeFilter` below `loadTransactions();` would fail the start-up test": agent-reported as checked on a temp copy; see deviation D-2 for the actual failure mode.

Leftover temporary folders from those checks: **24 directories named `mut-*` remain under the OS temporary directory** (outside the repository). Deleting them was not authorized and a policy hook blocked an attempted delete; no workaround was attempted. They are not part of the repository and are not tracked. The user may delete them manually.

## 4. Scope and safety checks (real commands, run in this run)

| Check | Command | Result |
|---|---|---|
| Files changed on branch vs main | `git diff --name-status main...HEAD` | Exactly: `A` `.claude/AgentOutput/AG-10-4/{architecture,design-review,impl-plan,requirements}.md`; `M` `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`. No other file. Pass |
| Diff size | `git diff --stat main...HEAD` | 8 files, 2387 insertions, 14 deletions. Code: `index.html` +36, `script.js` +94 / small deletions, `styles.css` +33/-, `tests/app.test.cjs` +665/- |
| Working tree | `git status --short` | Only the untracked, orchestrator-owned `workflow-session.json`; `git diff --quiet HEAD` reports tracked files clean |
| Storage schema unchanged | `git show main:script.js` vs working file, grep for `TRANSACTION_STORAGE_KEY`, `TRANSACTION_SCHEMA_VERSION` | Both constants unchanged (`"transactions"`, `1`) at lines 1-2. Their usages shifted by +17 lines only (e.g. `schemaVersion !== TRANSACTION_SCHEMA_VERSION` at main line 194 is now line 211). `git diff main...HEAD -- script.js` filtered for those names, `getItem`, `setItem`, `transactionRepository`, `validateTransaction`, `isStoredTransaction`, `calculateAvailableBalance(` returned **no changed lines**. Pass |
| `getItem`/`setItem` only in the repository/legacy code | grep on main and HEAD | Same three call sites in both: legacy `getItem("expenses")` (main 143 / now 160), `getItem(TRANSACTION_STORAGE_KEY)` (209 / 226), `setItem(TRANSACTION_STORAGE_KEY, ...)` (239 / 256). The new code adds none. Pass |
| Repository and submit handler unchanged | `git diff main...HEAD -U0 -- script.js` hunk headers | Old-side hunks start at lines 53, 277, 292, 387-397, 405, 429, 529. Main's repository (about 204-259) and submit handler (450-524) fall in none of them; the last hunk is an insertion after the retry listener (old line 529, before the final `loadTransactions();`). Pass |
| No `innerHTML` and similar sinks | grep for `innerHTML\|outerHTML\|insertAdjacentHTML\|document.write\|eval(` in `script.js`, `index.html` | No matches (exit 1). New messages and items use `createElement` and `textContent`. Pass |
| No `try/finally` re-sync in `setActiveFilter` (DR-012) | Read of the new block and grep for `try`/`finally` in it | None present (the only `try/finally` remains in `loadTransactions`, unchanged except the one added `showElement` line). Pass |
| No secrets in branch diff | Case-insensitive grep of `git diff main...HEAD` for key/secret/password/token/bearer/authorization/AKIA/ghp_/PEM patterns | Four hits, all prose in the stage artifacts (statements such as "no secrets" and a "Secrets: None" table row; one approval-scope sentence matched on the word "authorization"). No credential-like values. Pass |
| No new dependency or config files | `git diff --name-only main...HEAD` filtered for package manifests/locks, `.github`, `.env`, `.mcp.json`, `node_modules` | No matches. `git ls-files` secret-ish names: only `.env.example` and `.mcp.json.example` (pre-existing placeholders). Pass |
| Approved artifacts unchanged since approval commits | `git log --oneline -- <artifact>`; `git diff --stat 2d92f74 HEAD -- .claude/AgentOutput/` | `requirements.md` last changed in c2a435c; `architecture.md` in cc90ae8 (Draft 2, the approved version; 9b19c82 was Draft 1); `design-review.md` in cc90ae8; `impl-plan.md` in 2d92f74. The diff of `.claude/AgentOutput/` between 2d92f74 and HEAD is empty. Pass |
| No match count, no documentation change (D-10, D-11) | Read of full branch diff and name-status | No count of matching items anywhere; no `docs/` or README change. Pass |
| CSS constraints (TASK-007) | `grep -n "^\.hide\|@media" styles.css` and diff | New rules sit before `.hide` (line 214); `.history-filter` declares no `display`; flex is on `.filter-options` only; `#empty-state` rule extended to `#empty-state, .empty-message`; the only `@media (max-width: 600px)` block (line 218) is unchanged (PL-02). Pass |

## 5. Changed files and rationale

| File | Rationale |
|---|---|
| `index.html` | Adds `fieldset#history-filter.history-filter.hide` with `legend` "Filter by type" and three native radios (`filter-all`, `filter-income`, `filter-expenses`, shared `name="history-filter"`, labels All / Income / Expenses, All `checked`, `autocomplete="off"` best-effort) after `#history-heading`, outside the form, before `#load-error`. `#empty-state` and `#transaction-history` (with `aria-live="polite"`) untouched |
| `script.js` | `TRANSACTION_FILTERS` (single source of the Income/Expenses mapping and the two messages), `normalizeFilterKey` (own-property check), pure `filterTransactions`; `let activeFilter` in the module-state block; DOM references; `renderHistoryList` split out of `renderTransactions` (builds the replacement node first; stored count drives `#empty-state`; filter message placed inside the live region); lifecycle hooks in `renderLoadFailure` / `loadTransactions`; `syncFilterControls`, `setActiveFilter`, per-radio `change` listeners with `repositoryReady` guard, start-up sync, guarded `pageshow` |
| `styles.css` | Filter, legend, option layout, and `.empty-message` styles before `.hide`; no `display` on the fieldset; 600px block untouched |
| `tests/app.test.cjs` | Harness updates (new ids, `hide` start class for the filter, `#empty-state` starting `hidden`, extra exports, storage read/write counters, optional recording `window.addEventListener`) and 29 new tests |
| `.claude/AgentOutput/AG-10-4/implementation-notes.md` | This document (new Stage 5 artifact, uncommitted) |

## 6. Key decisions and how they were handled

- **PL-01 (included `pageshow`).** `if (typeof window.addEventListener === "function") { window.addEventListener("pageshow", syncFilterControls); }`. The guard is required because the default harness `window` has no `addEventListener`; the default harness still lacks it, so every pre-existing test exercises the guard (and test 43 asserts it explicitly). Test 44 uses the recording window option. M-2 therefore evidences a combined mitigation (start-up sync + `pageshow` + best-effort `autocomplete="off"`), not any one part.
- **PL-02 (600px).** No rule added to the media block. The layout relies on `flex-wrap`; not visually confirmed (M-4 Not Run).
- **PL-03 / PL-05 / PL-06.** `div.filter-options` with `span.filter-option` wrappers; the `repositoryReady` guard lives in the per-radio listener while `setActiveFilter` only normalizes, renders with the candidate key, then commits and syncs; `normalizeFilterKey` uses an own-property check (so `"constructor"` and `"__proto__"` fall back to All) and also requires a string.
- **PL-04.** The fake `#empty-state` now starts `hidden = true` (DR-011). To keep the two existing assertions that expect `hidden === true` (the "reload restores saved records" and "corrupt storage" tests) meaningful, they now call `createApp(storage, { emptyStateHidden: false })`. Their expectations are unchanged. The same option was also passed in three new tests that need the opposite starting value (sentinel technique).
- **DR-011.** Done as above; new tests use the sentinel technique (set the fake element to the opposite of the expected value immediately before the action).
- **DR-012.** No `try/finally` re-sync in `setActiveFilter`, per UD-6; code review should not flag its absence.
- **DR-014 item 1 (TDZ).** `let activeFilter` is declared next to `transactions`/`repositoryReady`, well before `loadTransactions();`. Test 41 asserts the load-error state is absent and records are rendered at start-up. See deviation D-2 for what a violation would actually look like.
- **DR-014 item 2.** Handled by PL-01 (included, guarded).
- **DR-014 item 3.** The M-2 pass condition wording stays as in the plan (normal reload: All checked and full list; back/forward: radio and list agree).
- **DR-013 and N-1.** Ignored/not actioned as planned (`architecture.md` not edited).
- **Contract note.** `renderTransactions` keeps its signature and both call sites; the full stored list is always passed (comment added in code). Balance code is not reachable from `renderHistoryList`.

## 7. Deviations from the plan

No deviation changed behaviour, scope, or the file set. Two items are wording problems in the approved plan, found during implementation:

- **D-1 (TASK-014(b) sentinel instruction).** The plan asks to assert `#empty-state.hidden` "still `true` after first setting it to `false` as a sentinel" during the guarded `change` events. That is self-contradictory: if the guard works, nothing touches `#empty-state`, so it stays at the sentinel `false`, not `true`. A plain assertion `#empty-state.hidden === true` was used instead. It is non-vacuous without a sentinel because `renderLoadFailure` itself sets it to `true` and the test uses `emptyStateHidden: false` (so the fake does not start at `true`); an unguarded filter render would flip it to `false`. The test also checks `getActiveFilter() === "all"`, no children in `#transaction-history`, no `.empty-message`, and the filter still hidden (tests 36 and 38). The guard is still meaningfully tested.
- **D-2 (TASK-015 / DR-014 TDZ wording).** The plan and DR-014 say a temporal-dead-zone error on `activeFilter` would surface as a false load-failure screen. With the shipped ordering this is inaccurate: `syncFilterControls()` runs at start-up before `loadTransactions();` and reads `activeFilter`, so a mis-ordered declaration throws at top level and crashes start-up rather than being caught by `loadTransactions`' `catch`. (The agent-reported mutation check observed a start-up crash.) Test 41 still fails in that case, so the mutation acceptance holds, but its comment/rationale differs from the plan wording. No code change was needed.
- **Informational.** `emptyStateHidden: false` was also passed in three new tests, in addition to the two existing tests named in PL-04. This is consistent with the plan's sentinel technique.

## 8. Not run, blockers, and limitations

- **Not Run (manual), Stage 7 items:** M-1 keyboard operation (TASK-017), M-2 reload in Firefox and a Chromium browser (TASK-018), M-3 screen reader announcements (TASK-019), M-4 narrow/600px layout (TASK-020). To be run by the user or a reviewer at Verification; none is reported as passed.
- **Not Run:** TASK-007's visual check (no browser rendering was performed; CSS was checked statically only).
- **Not Run in this batch:** the mutation checks (section 3.1); results above are agent-reported from the Batch 2 run on temporary copies.
- **Coverage limit:** the fake-DOM tests cannot prove real screen-reader announcements, real CSS at 600px, keyboard behaviour, or real browser form-state restoration (plan section 5; R-03 remains Not Verified).
- **No CI** and no `package.json`: no CI result exists to report.
- **Blockers:** none for Stage 5. Housekeeping only: 24 leftover `mut-*` folders in the OS temp directory (section 3.1), deletion not authorized.
- **Not done by design:** no commit, push, or PR; this notes file is untracked and must be committed with the branch only after the user's authorization. Stage 6 has not been started.

## 9. Requirement coverage traceability (automated evidence only)

Test numbers refer to the order in the `node --test tests/` output of this run. "Manual" means Not Run (manual).

| Requirement | Automated tests | Manual / other |
|---|---|---|
| FR-001 (labelled radio group) / AC-001 / D-02 | 16 (markup), 1 (ids), 20 | M-1 |
| FR-002, FR-003 / AC-002, AC-003 | 17, 19, 22 | none |
| FR-004 (switching, back to All) / AC-003 | 17, 22 | none |
| FR-005 / AC-004, AC-005 (empty-filter messages) | 23, 24, 32 | M-3 (announcement) |
| FR-006 (order preserved, no mutation) / AC-010 | 17, 22 | none |
| FR-007 (no storage access) / AC-008 | 26 | none |
| FR-008 (default All, state not persisted) / AC-007 | 20, 28, 42, 44 | M-2 (reload) |
| FR-009 / BR-001, BR-003, BR-004 | 17, 18, 19, 25 | none |
| FR-010 (add prompt on empty storage) / AC-006 | 21 (prompt visible under every option), 16 (prompt text in markup) | none |
| FR-011 / AC-009 (add under filter) | 29, 30, 31, 32 | none |
| FR-012 (balance unaffected) | 27, 26 | none |
| FR-013 / AC-012 (load failure) | 35-40 | none |
| NFR-001 / AC-013 (accessibility, in-region) | 16, 23 (message inside `#transaction-history`) | M-1, M-3 |
| NFR-002 / AC-011 (no HTML injection) | 34 (and existing 11); grep: no `innerHTML` | none |
| NFR-003 (narrow viewport) | none | M-4 (plus static CSS review) |
| NFR-004 (existing suite kept) | 1-15 pass | none |
| NFR-005 (performance) | none (no numeric target, D-09) | code review only |
| NFR-006 (no network/logging/storage on filter path) | 26 | code review |
| D-10, D-11 (no count, no docs) | none (honoured by omission) | section 4 checks |

## 10. Approval status

Stage 5 is **APPROVED - 2026-11-02**. Evidence: user messages "1.approve stage 5 2.yes" and, after a follow-up, "approva stage 5" (relayed by the orchestrator).

- The approval covers Stage 5 (Implementation) only. It does NOT authorize Stage 6 (Code Review), any push, or any pull request; Stage 6 must not start until the user separately requests it. No commit, push, or PR has been authorized by this approval.
- The manual checks M-1..M-4 (TASK-017..020) and the TASK-007 visual check remain **Not Run (manual)**; the approval does not change that.
- The leftover `mut-*` temporary folders (section 3.1) are outside the repository and were not deleted; the user will handle them.
