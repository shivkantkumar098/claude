# Implementation Plan: AG-10 - Filter transactions by type

- Run ID: AG-10-4 (branch `feature/AG-10-4`)
- Stage: 4 - Implementation Planning
- Date: 2026-11-02
- Author: `implementation-planner` (Claude Code), one-shot run; no conversation with the user took place
- **Status: APPROVED (Stage 4) - 2026-11-02.** Evidence: the user's message "approve stage 4" (2026-11-02, relayed by the orchestrator), which explicitly included PL-01 (guarded `pageshow` re-sync), PL-02, PL-04 and the three-batch split. **This approval covers Stage 4 only.** It does NOT authorize implementation, any code edit, commit, push, or pull request. Each implementation batch (Batch 1: TASK-001..007; Batch 2: TASK-008..015; Batch 3: TASK-016) still needs its own explicit user approval, and the user must first choose keep-current-context vs fresh-context for Stage 5. All task statuses below remain `Not Started` (or `Deferred to Stage 7`); approval of the plan does not start any task.
- This run edited only this file. No application code, no tests, no `architecture.md`, `requirements.md`, `design-review.md`, or `workflow-session.json` were touched. Nothing was staged, committed, or pushed.

## 1. Context

| Item | Value |
|---|---|
| Jira issue | AG-10 "Filter transactions by type" (Story, project AG) |
| Requirements | `requirements.md` revision 2, APPROVED 2026-11-02 ("approve stage 1"), committed c2a435c. FR-001..013, NFR-001..006, AC-001..013, BR-001..004, D-01..D-11 |
| Architecture | `architecture.md` Draft 2, APPROVED 2026-11-02 ("approve Draft 2"). Draft 1 committed 9b19c82. C1..C9, PD-01..PD-05, M-1..M-4 |
| Design review | `design-review.md`, Stage 3 APPROVED 2026-11-02 ("yes,APPROVE Stage 3"). DR-001..DR-010 Resolved; DR-011 and DR-014 deferred to this plan (UD-7); DR-012 accepted as unreachable, no guard (UD-6); DR-013 ignored (UD-8). Committed cc90ae8 |
| Approval of this plan | APPROVED (Stage 4) - 2026-11-02, user message "approve stage 4" (relayed by the orchestrator). Stage 4 only; Stage 5 batches need separate approval |

### 1.1 Repository intelligence (inspected in this stage)

| Fact | Evidence |
|---|---|
| Branch `feature/AG-10-4`; only untracked item is `.claude/AgentOutput/AG-10-4/workflow-session.json` (before this file was written) | `git status --short`, `git branch --show-current` |
| Static app: `index.html` (108 lines), `script.js` (530 lines), `styles.css` (202 lines), `tests/app.test.cjs` (462 lines). No `package.json`, no `.github` CI, no README: Not Found | `ls`, directory listing |
| Baseline **executed in this stage**: `node --test tests/` on Node v20.17.0 gave 15 tests, 15 pass, 0 fail, 0 cancelled, 0 skipped | Command run |
| `index.html`: history section lines 94-104: `h2#history-heading` (95), `p#load-error.hide[role=alert]` (96), `button#retry-load.hide` (97-99), `p#empty-state[hidden]` with "No transactions yet. Add one to get started." (100-102), `div#transaction-history[aria-live=polite]` (103). Form is lines 32-91, so the filter placed after line 95 is outside the form. Two existing inputs already use `autocomplete="off"` (lines 56, 82) | Read |
| `script.js`: `TRANSACTION_TYPES` line 3; `calculateAvailableBalance` 39-52; `isStoredTransaction` 116-124 (uses `TRANSACTION_TYPES.includes`, lines 116, 120); `transactionRepository` 204-259 (only place calling `getItem`/`setItem`: lines 143, 209, 239); DOM lookups 261-282 (`retryLoadButton` line 277); module state `transactions/repositoryReady/isSaving/isLoading` lines 289-292; `showElement` 294-298 (null-tolerant); `createTransactionElement` 357-385; `renderTransactions` 387-398; `renderLoadFailure` 400-412; `loadTransactions` 414-436 (`repositoryReady = true` at 426, `showElement(loadError, false)` 428, `showElement(retryLoadButton, false)` 429); submit handler 449-524 (`renderTransactions(transactions, updatedBalance)` at 511); retry listener 526-528; start-up call `loadTransactions();` at **line 530**. No `innerHTML` anywhere in `script.js` (Grep). `window` is used only for `window.localStorage` (134) and `window.crypto` (331) | Read, Grep |
| `styles.css`: `#empty-state` rule 125-128 (margin 0, colour `#5c6678`); `.hide {display:none}` at 183-185 (after all component rules); one `@media (max-width: 600px)` block at 187-202 (adjusts `.wrapper`, `#transaction-form`, card padding); `.field ...` rules are scoped to `.field` (lines 69-96) so unscoped radios are unaffected | Read |
| `tests/app.test.cjs`: `FakeElement` 24-93 (`classList.toggle` only, one listener per event name, `dispatch` event has only `preventDefault`, no `target`, `hidden` initial `false`, no `checked` property defined); `createStorage` 95-112 (exposes `values`, no call counters); `createApp(storage)` 114-168 with fixed id list 115-132, `window` stub with only `localStorage` and `crypto` (141-146, **no `addEventListener`**), export snippet 152-162; required-controls test 173-200; existing assertions on `#empty-state.hidden`: line 323 (`false`, empty storage), 334 (`true`), 374 (`true`), 426 (`true`), 447 (`false`) | Read |
| Cross-realm note: objects returned from the `vm` context have different prototypes; `assert.deepEqual` from `node:assert/strict` would fail on them. Existing tests use `JSON.parse(JSON.stringify(...))` (line 285) | Read |

## 2. Task Breakdown

IDs use the project skill format (`TASK-nnn`). Priorities: **P0** = required for the feature or its core evidence; **P1** = required quality or evidence work; **P2** = optional. "Status" is `Not Started` for every task (nothing is implemented). Line numbers are those of the files today and will shift as edits are made.

### 2.1 Summary table

| Task ID | Priority | Task | Affected Files | Dependencies | Acceptance Criteria (summary; details in 2.2) | Status |
|---|---|---|---|---|---|---|
| TASK-001 | P0 | Pre-edit checks and baseline | none (read-only) | none | Git state recorded; `node --test tests/` 15/15 before edits | Not Started |
| TASK-002 | P0 | Filter markup in `index.html` | `index.html` | TASK-001 | Fieldset/legend/3 radios/labels present, ships `hide`, outside the form | Not Started |
| TASK-003 | P0 | Filter definition, predicate, state declaration | `script.js` | TASK-001 | `TRANSACTION_FILTERS`, `normalizeFilterKey`, `filterTransactions`, `let activeFilter` declared before first use | Not Started |
| TASK-004 | P0 | DOM references and renderer split | `script.js` | TASK-003 | `renderHistoryList(allTransactions, filterKey = activeFilter)`; `renderTransactions` delegates; empty messages inside `#transaction-history` | Not Started |
| TASK-005 | P0 | Load-lifecycle hooks | `script.js` | TASK-004 | Filter hidden in `renderLoadFailure`, shown after successful load | Not Started |
| TASK-006 | P0 | Selection state, radio sync, event wiring, guarded `pageshow` | `script.js` | TASK-004, TASK-005 | `setActiveFilter`, `syncFilterControls`, per-radio `change` listeners with ready guard, start-up sync, guarded `pageshow` | Not Started |
| TASK-007 | P1 | Filter and empty-message styles | `styles.css` | TASK-002 | Styles before `.hide`; no `display` on fieldset; 600px decision recorded | Not Started |
| TASK-008 | P0 | Test harness updates | `tests/app.test.cjs` | TASK-003 | New ids, `hide` start, `#empty-state` starts hidden (DR-011), exports, counters, window stub option; existing 15 pass | Not Started |
| TASK-009 | P1 | Static markup tests | `tests/app.test.cjs` | TASK-002, TASK-008 | Required-ids test extended; new markup test passes | Not Started |
| TASK-010 | P0 | Unit tests: predicate and type coverage | `tests/app.test.cjs` | TASK-003, TASK-008 | Predicate and coverage tests pass | Not Started |
| TASK-011 | P0 | Integration tests: default, selection, empty messages, live region | `tests/app.test.cjs` | TASK-006, TASK-008 | AC-001..006, AC-010 scenarios pass | Not Started |
| TASK-012 | P0 | Integration tests: no storage access, balance unchanged, state not persisted | `tests/app.test.cjs` | TASK-006, TASK-008 | Write/read spies, balance, re-created-app tests pass | Not Started |
| TASK-013 | P0 | Integration tests: add under filter, markup-like notes under filter | `tests/app.test.cjs` | TASK-006, TASK-008 | AC-009, AC-011 scenarios pass | Not Started |
| TASK-014 | P0 | Integration tests: load failure, guard, retry | `tests/app.test.cjs` | TASK-005, TASK-006, TASK-008 | AC-012 scenarios pass with meaningful assertions | Not Started |
| TASK-015 | P1 | Tests: start-up default (TDZ, DR-014), radio sync, `pageshow` | `tests/app.test.cjs` | TASK-006, TASK-008 | Start-up shows no load failure; sync and `pageshow` tests pass | Not Started |
| TASK-016 | P0 | Full regression run, self-review checks, implementation notes | `.claude/AgentOutput/AG-10-4/implementation-notes.md` (new Stage 5 artifact) | TASK-007, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014, TASK-015 | All tests pass with actual output reported; scope checks pass | Not Started |
| TASK-017 | P1 | Manual check M-1: keyboard operation (Verification stage) | none | TASK-016 | Result supplied by user or reviewer, else "Not Run (manual)" | Deferred to Stage 7 |
| TASK-018 | P1 | Manual check M-2: reload in two browsers (Verification stage) | none | TASK-016 | As above | Deferred to Stage 7 |
| TASK-019 | P1 | Manual check M-3: screen reader announcements (Verification stage) | none | TASK-016 | As above | Deferred to Stage 7 |
| TASK-020 | P1 | Manual check M-4: 600px layout (Verification stage) | none | TASK-016 | As above | Deferred to Stage 7 |

### 2.2 Task details

#### TASK-001 - P0 - Pre-edit checks and baseline

- **Description.** Before the first edit: run `git status` and `git branch --show-current` and confirm branch `feature/AG-10-4`, that `index.html`, `script.js`, `styles.css`, and `tests/app.test.cjs` have no uncommitted user changes, and that only the orchestrator-owned `workflow-session.json` (and later this plan) is untracked. Run `node --test tests/` and record the actual result (expected 15 pass, as measured in this stage). Confirm the Stage 4 plan is approved by the user and the exact files to change match Section 4.
- **Affected files.** None (read-only).
- **Dependencies.** None.
- **Acceptance.** Git state recorded in `implementation-notes.md`; baseline result recorded with actual numbers; any unexpected uncommitted change in the four target files is reported and implementation stops until the user decides.
- **Check.** `node --test tests/`.
- **Traceability.** NFR-004; CLAUDE.md sections 9 and 17.
- **Status.** Not Started.

#### TASK-002 - P0 - Filter markup in `index.html`

- **Description.** Insert, directly after `<h2 id="history-heading">` (currently line 95) and before `#load-error`, inside `section.history-card` and outside `<form id="transaction-form">`:
  - `<fieldset class="history-filter hide" id="history-filter">` with `<legend>Filter by type</legend>` (A-S1 wording, presentation choice).
  - An inner wrapper (suggested `div.filter-options`, one `span.filter-option` per option) holding three native radios in the order All, Income, Expenses: `type="radio" name="history-filter"`, ids `filter-all`, `filter-income`, `filter-expenses`, values `all`, `income`, `expenses`, each followed by `<label for="filter-...">` reading exactly `All`, `Income`, `Expenses` (D-02).
  - `checked` on the All radio only. `autocomplete="off"` on each radio as a **best-effort** hint (UD-4, PD-05); it is not asserted by any test.
  - The fieldset ships with the `hide` class (revealed by script only after a successful load). Use the `hide` class, not the `hidden` attribute (PD-02, R-04).
  - Do not touch `#empty-state`, its text, or `#transaction-history` / its `aria-live="polite"` attribute.
- **Affected files.** `index.html` (history section, lines 94-104).
- **Dependencies.** TASK-001.
- **Acceptance.** Exactly three radios with the stated ids/values/labels; All checked; shared `name`; fieldset has `hide`; fieldset lies after `</form>` and inside the history section; `#empty-state` markup byte-identical; no ids matching the existing negative regex (`budget|expense-title|edit|delete`) - `filter-*` ids do not match (verified against the regex at test line 199).
- **Check.** Existing `node --test tests/` still passes (markup is read by the required-controls test); TASK-009 covers the new markup.
- **Traceability.** FR-001, FR-008, AC-001, AC-007 (default), AC-013, NFR-001; D-02, D-04; PD-01, PD-02, PD-05; C1.
- **Status.** Not Started.

#### TASK-003 - P0 - Filter definition, predicate, and state declaration (`script.js`)

- **Description.**
  1. Add `TRANSACTION_FILTERS` in the pure-helper area near the top (for example after `calculateAvailableBalance`, lines 39-52): `all` -> no type restriction, no message; `income` -> type `Money Received`, message `No income transactions found.`; `expenses` -> type `Expense`, message `No expense transactions found.` (D-01, D-03, BR-004). This is the only place the Income/Expenses mapping and the two filter messages are defined.
  2. Add `normalizeFilterKey(key)`: returns `key` only if it is an **own** property of `TRANSACTION_FILTERS` (use `Object.prototype.hasOwnProperty.call`, so inputs like `"constructor"` or `"__proto__"` fall back), otherwise `"all"` (BR-003).
  3. Add pure `filterTransactions(list, filterKey)`: normalizes the key, returns a **new** array of matching items in original order; `all` returns a new array with every item; never mutates the input, never reads the DOM or storage.
  4. **DR-014 item 1 (TDZ).** Declare `let activeFilter = "all";` with the existing module state (next to `transactions`, `repositoryReady`, `isSaving`, `isLoading`, lines 289-292), i.e. before the `loadTransactions();` call at line 530 and before any call to `renderHistoryList`, whose default parameter `filterKey = activeFilter` is evaluated at call time. Declaring it after line 530 would raise a temporal-dead-zone `ReferenceError` inside `loadTransactions`' `try`, which the existing `catch` would turn into a **false load-failure screen**. TASK-015 tests this.
- **Affected files.** `script.js`.
- **Dependencies.** TASK-001.
- **Acceptance.** Functions behave as stated; no DOM or storage access in 1-3; `activeFilter` declared before first use; no use of `innerHTML`.
- **Check.** `node --test tests/` (15/15 still pass; nothing calls the new code yet); unit tests in TASK-010.
- **Traceability.** FR-002, FR-003, FR-004, FR-006, FR-007, FR-008, FR-009, BR-001, BR-002, BR-003, BR-004, D-01, D-03, D-08, NFR-005, AC-002, AC-003, AC-010; C2, C3, C4 (state); DR-014 item 1.
- **Status.** Not Started.

#### TASK-004 - P0 - DOM references and renderer split (`script.js`)

- **Description.**
  1. Add null-tolerant lookups after the existing ones (after line 277): `historyFilter = document.getElementById("history-filter")` and a `filterControls` object `{ all, income, expenses }` from `filter-all`, `filter-income`, `filter-expenses`. Every later use must tolerate `null` (the existing test harness does not yet define these ids; this is how the 15 existing tests keep passing before TASK-008).
  2. Replace the body of `renderTransactions` (lines 387-398) with the split from architecture C5:
     - `renderHistoryList(allTransactions, filterKey = activeFilter)`: normalize the key; compute `visible = filterTransactions(allTransactions, key)`; **build the replacement node first** (before any DOM mutation, preserving today's atomicity): if `visible.length > 0` or `allTransactions.length === 0`, a `div.transaction-list` containing `createTransactionElement` items (empty list container when nothing is stored, as today); otherwise (`allTransactions.length > 0` and nothing visible) a single `p.empty-message` whose `textContent` is the filter's message. Then `transactionHistory.replaceChildren(node)` and `emptyState.hidden = allTransactions.length !== 0`. The stored count (not the visible count) drives `#empty-state`, so the "Add one to get started" prompt shows under every option when nothing is stored (FR-010, AC-006) and never shows when only the filter is empty. The filter message lives **inside** `#transaction-history` so the existing live region announces it (PD-03).
     - `renderTransactions(allTransactions, balanceInPaise)` keeps its signature and both call sites (lines 424 and 511), calls `renderHistoryList(allTransactions)` (default key = committed `activeFilter`), then sets `balanceAmount.textContent = formatINR(balanceInPaise)` and `balanceAmount.hidden = false` exactly as today. Add a one-line comment that `allTransactions` must be the **full** list (P-1 contract).
  3. Messages and list items are set via `createElement`/`textContent` only (NFR-002).
- **Affected files.** `script.js` (lines ~277 and 387-398).
- **Dependencies.** TASK-003.
- **Acceptance.** Decision table of architecture 4.3 holds for all three rows; `renderTransactions` signature unchanged; balance code is not reachable from `renderHistoryList`; the two filter messages are never rendered together with the empty-state prompt; with the unchanged harness, `node --test tests/` still reports 15/15.
- **Check.** `node --test tests/` (expect 15 pass, null-tolerance proof); TASK-011/013 cover behavior.
- **Traceability.** FR-002..FR-005, FR-009, FR-010, FR-011 (via unchanged submit handler), FR-012, NFR-001, NFR-002, AC-002..AC-006, AC-009, AC-010, AC-011, AC-013, D-03, D-05, D-06, PD-03, PD-04; C5, C7.
- **Status.** Not Started.

#### TASK-005 - P0 - Load-lifecycle hooks (`script.js`)

- **Description.** In `renderLoadFailure` (lines 400-412) add `showElement(historyFilter, false)`. In `loadTransactions` (lines 414-436), add `showElement(historyFilter, true)` after `repositoryReady = true` (alongside the existing `showElement(loadError, false)` / `showElement(retryLoadButton, false)` lines 428-429). No other change to either function. `renderLoadFailure` already clears `#transaction-history` (line 405), so no filter message can survive a failure. Do **not** call `renderLoadFailure` from any filter path, and add **no** `try/finally` re-sync (DR-012 accepted as unreachable, UD-6).
- **Affected files.** `script.js`.
- **Dependencies.** TASK-004 (the `historyFilter` reference).
- **Acceptance.** After a successful load (including zero stored transactions) the fieldset has no `hide`; after a load failure it has `hide`, history is empty, no filter message exists, and the existing load-error state is unchanged.
- **Check.** `node --test tests/` (15/15); TASK-014.
- **Traceability.** FR-013, AC-006 (filter stays visible on empty history), AC-012, D-07, PD-02; C6.
- **Status.** Not Started.

#### TASK-006 - P0 - Selection state, radio sync, event wiring, guarded `pageshow` (`script.js`)

- **Description.** Add, just before the final `loadTransactions();` (line 530) and after the retry listener (526-528):
  1. `syncFilterControls()`: for each of the three radios (if not null) set `checked = (key === activeFilter)` explicitly on all three (the fake DOM has no radio-group exclusivity; real browsers are projected from state per PD-05).
  2. `setActiveFilter(filterKey)`: `const next = normalizeFilterKey(filterKey)`; `renderHistoryList(transactions, next)` with the **candidate** key and the full list; **then** `activeFilter = next`; then `syncFilterControls()`. Touches no storage, no balance DOM (FR-007, FR-012). No `try/finally` (DR-012).
  3. One `change` listener per radio, each bound by closure to its own key (never read `event.target` or the DOM `value`), that returns immediately when `!repositoryReady` (the PD-02 defence-in-depth guard) and otherwise calls `setActiveFilter(key)`. Guard `if (radio)` for null ids.
  4. A call to `syncFilterControls()` once at start-up, before `loadTransactions();`.
  5. **Plan decision PL-01 (DR-014 item 2): include the optional `pageshow` re-sync**, guarded exactly as architecture requires:
     `if (typeof window.addEventListener === "function") { window.addEventListener("pageshow", syncFilterControls); }`.
     Rationale: start-up sync cannot help if a browser restores form state after the script runs, which architecture R-03 leaves Not Verified; a `pageshow` re-projection from `activeFilter` is the only code-level mitigation for that late-restoration case, it costs three lines, it is idempotent (re-applies the in-memory state), and it is harmless on a bfcache restore (state and list already agree). Cost: it is not automatable against real browsers, and it means check M-2 evidences the **combined** mitigation (start-up sync + `pageshow` + best-effort `autocomplete="off"`), not any one of them. The guard is mandatory because the harness `window` has no `addEventListener` (an unguarded call would crash start-up in every test). If the user prefers to omit it, delete this bullet and the `pageshow` part of TASK-015; no other task changes.
- **Affected files.** `script.js`.
- **Dependencies.** TASK-004, TASK-005.
- **Acceptance.** Selecting a radio re-renders only the history list; unknown key falls back to All; change events while `!repositoryReady` do nothing; radios always mirror `activeFilter`; start-up does not throw under the existing harness (no `window.addEventListener`); the submit handler is not edited.
- **Check.** `node --test tests/` -> 15/15 (still using the unchanged harness: null-tolerance and the `pageshow` guard are exercised by every existing test).
- **Traceability.** FR-001, FR-004, FR-007, FR-008, FR-011, FR-012, FR-013, BR-002, BR-003, AC-003, AC-007, AC-008, AC-012, D-04, D-05, D-06, D-08, PD-02, PD-05; C4.
- **Status.** Not Started.

#### TASK-007 - P1 - Filter and empty-message styles (`styles.css`)

- **Description.** Add rules **before** the `.hide` rule (line 183): `.history-filter` (reset `border: 0; padding: 0; margin: 0 0 1rem; min-width: 0`), its `legend` (padding 0, `font-weight: 600`, margin below), `.filter-options` (`display: flex; flex-wrap: wrap; gap`), `.filter-option` and its label (touch height `min-height: 2.75rem`, aligned with the radio, cursor pointer), and `.empty-message` sharing the muted colour of `#empty-state` (extend the existing rule at lines 125-128 to a selector list, or add an equivalent rule; `margin: 0; color: #5c6678`). Keep the native radio focus ring. **Never set `display` on `.history-filter` itself** (R-04); flex goes on the inner wrapper only.
  **Plan decision PL-02 (600px):** add **no** rule to the `@media (max-width: 600px)` block (lines 187-202) by default, because `flex-wrap` on three short labels already adapts to narrow widths and no evidence of a need exists; the layout is confirmed by manual check M-4 (TASK-020). If M-4 reports overflow or clipping, a minimal rule in that block is added through a new approved Stage 5 batch. This is a recorded decision, not an omission.
- **Affected files.** `styles.css`.
- **Dependencies.** TASK-002 (class names).
- **Acceptance.** New rules appear before `.hide`; no `display` on the fieldset; no change to existing selectors beyond the empty-message selector list; the 600px block is unchanged (PL-02).
- **Check.** `node --test tests/` (no effect on tests); visual evidence is manual M-4. Static self-check: grep the new CSS for `.history-filter {` and confirm no `display` declaration.
- **Traceability.** NFR-001, NFR-003, D-09; C8; R-04.
- **Status.** Not Started.

#### TASK-008 - P0 - Test harness updates (`tests/app.test.cjs`)

- **Description.** Harness-only changes (no assertions of new behavior yet):
  1. Add `history-filter`, `filter-all`, `filter-income`, `filter-expenses` to the id list in `createApp` (lines 115-132).
  2. After creating elements, set `elements["history-filter"].className = "hide"` to mirror the shipped markup (P-4(b)), so "visible after successful load" assertions are meaningful.
  3. **DR-011.** Set `elements["empty-state"].hidden = true` in `createApp` to mirror the shipped `<p id="empty-state" hidden>` (index.html line 100), so the empty-storage assertion `hidden === false` is meaningful. **Plan decision PL-04:** this makes the existing assertions at lines 374 and 426 (`hidden === true`) satisfiable without any render. To keep their strength unchanged, give `createApp` an options argument with `emptyStateHidden` (default `true`) and pass `{ emptyStateHidden: false }` in those two existing tests only; their intent and expectations do not change. (Lines 323, 334 and 447 stay meaningful.) For new tests use the "sentinel" technique: before the action under test, set the fake element to the opposite of the expected value (for example `elements["empty-state"].hidden = false` before a filter change), then assert the expected value afterwards. Request this edit to existing tests at Batch approval time; if the user declines, report the two weakened assertions instead.
  4. Extend the export snippet (lines 153-162) with `filterTransactions`, `TRANSACTION_FILTERS`, `TRANSACTION_TYPES`, `loadTransactions`, `setActiveFilter`, and `getActiveFilter: () => activeFilter`. (Architecture C9 names the first two; `TRANSACTION_TYPES` is needed for the coverage test, and `loadTransactions`/`setActiveFilter`/`getActiveFilter` for the failure-after-success, unknown-key, and state tests. Test-file only; no app change.)
  5. Add call counters to `createStorage` (lines 95-112): `writes` (array or count of `setItem` calls) and `reads` (count of `getItem` calls) - the write spy must live in the test (architecture Section 11); existing behavior unchanged.
  6. Let `createApp` accept an option to give the `window` stub an `addEventListener` that records listeners (for example `options.windowEvents` object returned from `createApp`), default none, so the default harness still has no `addEventListener` and keeps proving the `pageshow` guard.
  7. Add `filter-*` ids to the required-controls id list (lines 174-191) - done in TASK-009.
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-003 (exports reference `filterTransactions` and `TRANSACTION_FILTERS`, which must exist or the export snippet raises `ReferenceError` at start-up).
- **Acceptance.** `node --test tests/` -> 15/15 pass with the harness changes alone (and with TASK-004..006 in place); the default harness `window` still has no `addEventListener`.
- **Check.** `node --test tests/`.
- **Traceability.** DR-005 (P-4), DR-011, DR-014 item 2 (test hook), NFR-004; C9.
- **Status.** Not Started.

#### TASK-009 - P1 - Static markup tests

- **Description.** Add the four new ids to the required-controls test (lines 173-200) and add one new markup test that parses `index.html` text (tolerant of attribute order): fieldset `id="history-filter"` with classes `history-filter` and `hide`; `<legend>` containing "Filter by type"; three `type="radio"` inputs sharing `name="history-filter"`, with ids/values `filter-all/all`, `filter-income/income`, `filter-expenses/expenses`; labels `for` each id with text exactly All / Income / Expenses; only All carries `checked`; the fieldset appears after `id="history-heading"` and after `</form>` (outside the form); `#empty-state` markup has `hidden` and the text "No transactions yet. Add one to get started."; `#transaction-history` keeps `aria-live="polite"` and the filter message class does not appear in `index.html` (messages are script-rendered); `#empty-state` is not inside `#transaction-history`. **Do not assert `autocomplete="off"`** (best-effort, PD-05).
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-002, TASK-008.
- **Acceptance.** Tests pass against the new markup and would fail if a radio, label, `checked`, or the `hide` class were removed.
- **Check.** `node --test tests/`.
- **Traceability.** FR-001, FR-008, AC-001, AC-006 (prompt text exists), AC-013, D-02; C1, C9.
- **Status.** Not Started.

#### TASK-010 - P0 - Unit tests: predicate and type coverage

- **Description.** Tests (use the JSON round-trip or compare ids/fields, because results come from another `vm` realm): `filterTransactions` returns only `Money Received` for `income`, only `Expense` for `expenses`, everything for `all`, `[]` for empty input; original order preserved; input array not mutated and result is a new array for every key (including `all`); unknown/invalid keys (`"bogus"`, `undefined`, `null`, `""`, `"constructor"`, `"__proto__"`) behave as `all`. Coverage test (mandatory per DR-007): the set of non-`all` filter types equals `TRANSACTION_TYPES` with each type owned by exactly one filter; `TRANSACTION_FILTERS` keys are exactly `all`, `income`, `expenses`; the mapping is Income -> `Money Received`, Expenses -> `Expense`; the two messages equal the approved strings exactly.
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-003, TASK-008.
- **Acceptance.** All pass; a deliberately swapped mapping or a missing type would fail them.
- **Check.** `node --test tests/`.
- **Traceability.** FR-002, FR-003, FR-004, FR-006, FR-009, BR-001, BR-003, BR-004, D-01, D-03, AC-002, AC-003, AC-010, DR-007.
- **Status.** Not Started.

#### TASK-011 - P0 - Integration tests: default, selection, empty messages, live region

- **Description.** Using `createApp` with seeded storage envelopes (`{schemaVersion: 1, transactions: [...]}`):
  - Default after load with both types: All radio checked, Income/Expenses unchecked, all items rendered, filter visible (the `hide` class set by TASK-008 was removed by script), `#empty-state.hidden === true`.
  - Empty storage: filter visible; `#empty-state.hidden === false` (meaningful due to DR-011); no `.empty-message` in history; dispatch `change` on Income and on Expenses with empty storage and show the "Add one" prompt remains (`hidden === false`) and no filter message is created (AC-006).
  - Select Income, Expenses, back to All, and a repeated sequence: item counts and contents are correct, no duplicates, relative (insertion) order preserved (count `article` nodes via `collectTagNames`; check amounts/dates/notes in order).
  - Empty-filter cases: only expenses stored + Income: history contains exactly one `p.empty-message` child with "No income transactions found.", no `article` nodes, and `#empty-state.hidden === true` asserted with the **sentinel** technique (set `hidden = false` immediately before the `change`). Mirror case: only income + Expenses -> "No expense transactions found.". The "Add one to get started" prompt is asserted only through `#empty-state.hidden`, never through absent text (the fake `#empty-state.textContent` is `""`).
  - Message is inside `#transaction-history` (found via `collectText(elements["transaction-history"])` and by DOM-tree membership, not via `#empty-state`).
  - Radios mirror state after each change (`checked` true only on the selected one).
  - `setActiveFilter("bogus")` leaves `getActiveFilter() === "all"` and renders everything (BR-003).
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-006, TASK-008.
- **Acceptance.** All pass; assertions are not vacuous (each "true/visible/hidden" check has a sentinel or an opposite starting value).
- **Check.** `node --test tests/`.
- **Traceability.** FR-001, FR-002..FR-005, FR-009, FR-010, BR-003, AC-001..AC-006, AC-010, AC-013 (in-region part), D-03, PD-03.
- **Status.** Not Started.

#### TASK-012 - P0 - Integration tests: no storage access, balance unchanged, state not persisted

- **Description.** (a) Write/read spy: after start-up note `storage.writes` and `storage.reads` counts and the envelope string; dispatch all three filters in sequence; assert zero additional `setItem` calls and zero additional `getItem` calls and an identical envelope string. (b) Balance: capture `#balance-amount.textContent` (for example a mixed history yielding a known balance) and assert it is identical after each filter change and still equals the full-list balance. (c) State not persisted: select Income in one app, create a second app on the same storage, assert `getActiveFilter() === "all"`, All radio checked, full list shown, and the storage key set is unchanged (only `transactions`). Label this test in its name as a **state-not-persisted** check; it does not prove a browser reload resets the radio (that is M-2, TASK-018).
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-006, TASK-008.
- **Acceptance.** Pass; would fail if `setActiveFilter` wrote to storage or recomputed the balance.
- **Check.** `node --test tests/`.
- **Traceability.** FR-007, FR-008, FR-012, BR-002, AC-007 (state part), AC-008, D-06, D-08, NFR-006.
- **Status.** Not Started.

#### TASK-013 - P0 - Integration tests: add under filter, markup-like notes under filter

- **Description.** With Income active and one income stored: add an Expense -> envelope count +1, balance equals the full-list balance, `#save-status` "Transaction added.", selection unchanged (`getActiveFilter()` and radio), new item not rendered, `#form-error` empty. Add an Income -> item rendered. With only expenses stored and Income active (message shown): add an income -> message replaced by a list containing the new item; add an expense instead -> message remains. With empty storage and Income active: add an Expense -> "No income transactions found." shown and `#empty-state.hidden === true` (sentinel: it is `false` before the add). Failed save under a filter (`failWrites`): selection and list unchanged, existing form error shown. Markup-like note (`<img src=x onerror=alert(1)>`) under Income and Expenses filters renders as literal text, `collectTagNames` has no `img` (AC-011).
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-006, TASK-008.
- **Acceptance.** Pass.
- **Check.** `node --test tests/`.
- **Traceability.** FR-005, FR-010, FR-011, FR-012, AC-009, AC-011, D-05, D-06, NFR-002.
- **Status.** Not Started.

#### TASK-014 - P0 - Integration tests: load failure, guard, retry

- **Description.** (a) Corrupt storage (`{bad json`) and read failure (`failReads`): `load-error` text non-empty, history has no children / no `.empty-message`, no "No income/expense transactions found." text anywhere, `#empty-state.hidden === true`, balance hidden, save disabled (AC-012). (b) Guard: during the failure dispatch `change` on `filter-income` and `filter-expenses`; assert `getActiveFilter()` still `"all"`, history still empty, and `#empty-state.hidden` still `true` after first setting it to `false` as a sentinel. (c) Retry: recover storage, dispatch retry click; filter is shown (the initial `hide` removed), list rendered under All. (d) **Hide after a prior success** (so the hide assertion is not vacuous given the fake starts with `hide`): start with healthy storage (filter visible), set `options.failReads = true`, call the exported `loadTransactions()`, assert the filter has `hide`, history is cleared, and the load-error governs. Existing tests for corrupt storage and read failure keep their intent.
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-005, TASK-006, TASK-008.
- **Acceptance.** Pass; (d) would fail if `renderLoadFailure` did not hide the filter.
- **Check.** `node --test tests/`.
- **Traceability.** FR-013, AC-012, D-07, PD-02.
- **Status.** Not Started.

#### TASK-015 - P1 - Tests: start-up default (DR-014 TDZ), radio sync, `pageshow`

- **Description.**
  - **TDZ / start-up (DR-014 item 1).** Start the app with seeded transactions and assert `#load-error.textContent === ""`, `#load-error` has `hide`, balance visible and correct, items rendered, filter visible. This is the meaningful check: a TDZ `ReferenceError` on `activeFilter` would be swallowed by `loadTransactions`' `catch` and surface as a load-failure screen, so the test must assert the **absence** of the load-error state, not merely that start-up did not throw. Optional secondary check: assert in the test that `appSource.indexOf("let activeFilter")` precedes the first `renderHistoryList(` call site and the final `loadTransactions();` (brittle to formatting; include only if kept simple).
  - **Start-up sync.** After `createApp`, `filter-all.checked === true` and the other two `=== false` (the fake radios start without a `checked` value, so this proves the explicit projection).
  - **`pageshow` (PL-01).** With the window-stub option from TASK-008, assert a `pageshow` listener was registered; set `filter-income.checked = true` (simulating late restoration), invoke the captured listener, and assert All checked, Income/Expenses unchecked, and the displayed list unchanged. With the default harness (no `addEventListener`) the existing tests running without a crash are the guard check; add one explicit test that creates the default harness and asserts start-up completed (load-error empty).
- **Affected files.** `tests/app.test.cjs`.
- **Dependencies.** TASK-006, TASK-008.
- **Acceptance.** Pass; moving `let activeFilter` below the `loadTransactions();` call (as a mutation check, run locally and reverted, or reasoned in review) would fail the start-up test.
- **Check.** `node --test tests/`.
- **Traceability.** FR-008, AC-007 (state/projection part), D-04, D-08, PD-05, DR-002, DR-014.
- **Status.** Not Started.

#### TASK-016 - P0 - Full regression run, self-review checks, implementation notes

- **Description.** Run the full suite `node --test tests/` and record actual counts (baseline 15; expect 15 plus the new tests, all passing; do not state a figure not observed). Run scope and safety checks and record actual outputs: `git status` and `git diff --stat` show only the four expected files (Section 4) plus `implementation-notes.md`; Grep confirms no `innerHTML` in `script.js` and that `getItem`/`setItem` appear only in `transactionRepository` (lines currently 143, 209, 239; new code must add none); confirm `TRANSACTION_SCHEMA_VERSION` unchanged; confirm no new files besides the artifact; confirm the submit-handler control flow and `transactionRepository`, `validateTransaction`, `calculateAvailableBalance`, `createTransactionElement` are unedited; confirm no count of matching items and no documentation file added (D-10, D-11); confirm there is no `try/finally` re-sync in `setActiveFilter` (DR-012). Write `.claude/AgentOutput/AG-10-4/implementation-notes.md` (changed files, decisions PL-01..PL-05, deviations from plan, actual test results, Not Run items). Do not commit or push.
- **Affected files.** `.claude/AgentOutput/AG-10-4/implementation-notes.md` (new); read-only checks elsewhere.
- **Dependencies.** TASK-007, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014, TASK-015.
- **Acceptance.** Test results reported from actual execution; manual items listed as Not Run (manual); deviations (if any) stated; no secrets in the artifact.
- **Check.** `node --test tests/`; `git status`; `git diff --stat`.
- **Traceability.** NFR-002, NFR-004, NFR-006, D-10, D-11, CLAUDE.md sections 9, 10, 17 (new test files committed with the branch: no new test files are planned, `tests/app.test.cjs` is already tracked).
- **Status.** Not Started.

#### TASK-017 to TASK-020 - P1 - Manual checks for the Verification stage

These are **Stage 7 (Verification)** items, not Stage 5 work. They are to be run by the user or a reviewer (UD-3). Each must be reported **Not Run (manual)** unless a person supplies a result; never reported as passed on the strength of the fake-DOM tests (CLAUDE.md section 10). If a browser or screen reader is unavailable, report that as the blocker.

| Task | Check | Steps | Pass condition | Traceability |
|---|---|---|---|---|
| TASK-017 | M-1 Keyboard | Open the app; Tab to the filter group; use arrow keys and Space; observe focus indicator and labels | Selection and list change by keyboard alone; focus visible; group name "Filter by type" and labels All / Income / Expenses are exposed | FR-001, NFR-001, AC-013 |
| TASK-018 | M-2 Reload, two browsers (Firefox and a Chromium-based browser) | Select Income; perform a normal reload; if practical also back/forward navigation | **Reworded pass condition (DR-014 item 3):** after a **normal reload** the All radio is checked **and** the full list is shown. After **back/forward navigation** the radio and the list must **agree with each other** (a page restored from the back/forward cache with Income selected and the Income list shown is consistent and is **not** a defect; a control/list disagreement in either browser is a failure to report). Because PL-01 includes the `pageshow` sync, this check evidences the combined mitigation and cannot isolate the effect of `autocomplete="off"` | AC-007, FR-008, D-08, R-03 |
| TASK-019 | M-3 Screen reader | Switch between filters; switch to a filter with no matches | The list or empty message change is announced through the existing live region (`#transaction-history`); note any arrow-key chatter (DR-006, accepted under R-01 unless unusable) | AC-013, NFR-001, AC-004, AC-005 |
| TASK-020 | M-4 Narrow viewport | View at 600px width and below (and a very narrow width) | Options wrap without overflow or clipped labels; touch height adequate. A failure re-opens PL-02 (add a rule in the 600px block) through a new approved Stage 5 batch | NFR-003 |

- **Dependencies (all four).** TASK-016.
- **Status (all four).** Deferred to Stage 7; expected report "Not Run (manual)" unless evidence is supplied.

## 3. Dependency Order

Execution order (every dependency refers to an existing task ID; no cycles):

1. TASK-001
2. TASK-002 and TASK-003 (independent of each other; both need TASK-001)
3. TASK-004 (needs TASK-003)
4. TASK-005 (needs TASK-004)
5. TASK-006 (needs TASK-004, TASK-005)
6. TASK-007 (needs TASK-002)
7. TASK-008 (needs TASK-003)
8. TASK-009 (needs TASK-002, TASK-008); TASK-010 (needs TASK-003, TASK-008)
9. TASK-011, TASK-012, TASK-013, TASK-015 (each needs TASK-006, TASK-008); TASK-014 (needs TASK-005, TASK-006, TASK-008)
10. TASK-016 (needs TASK-007, 009..015)
11. TASK-017..TASK-020 at Stage 7 (need TASK-016)

Dependency list for cycle check: 001 -> none; 002 -> 001; 003 -> 001; 004 -> 003; 005 -> 004; 006 -> 004, 005; 007 -> 002; 008 -> 003; 009 -> 002, 008; 010 -> 003, 008; 011 -> 006, 008; 012 -> 006, 008; 013 -> 006, 008; 014 -> 005, 006, 008; 015 -> 006, 008; 016 -> 007, 009, 010, 011, 012, 013, 014, 015; 017..020 -> 016. All edges point from a later-numbered task to an earlier-numbered one, so no cycle exists.

Rationale for app-code-first ordering: the test harness exports and fake elements reference identifiers that must exist (TASK-008 depends on TASK-003). After TASK-006, the **unchanged** harness must still give 15/15, which proves the null-tolerance and the `pageshow` guard before any test is edited.

## 4. Files Expected to Change and Not to Change

**Expected to change (4 repository files):**

| File | Tasks | Nature |
|---|---|---|
| `index.html` | TASK-002 | Add filter fieldset in the history section only |
| `script.js` | TASK-003, 004, 005, 006 | Add filter constant/predicate/state, split renderer, lifecycle hooks, selection wiring |
| `styles.css` | TASK-007 | Add filter and empty-message rules before `.hide`; 600px block unchanged by default (PL-02) |
| `tests/app.test.cjs` | TASK-008..015 | Harness extensions and new tests; two existing tests receive the `emptyStateHidden: false` option (PL-04, subject to approval) |

**New artifact (Stage 5, not a repository source file):** `.claude/AgentOutput/AG-10-4/implementation-notes.md` (TASK-016). `workflow-session.json` is updated by the orchestrator, not by implementation tasks.

**Expected NOT to change:** the storage schema and everything that reads or writes it (`TRANSACTION_STORAGE_KEY`, `TRANSACTION_SCHEMA_VERSION`, `transactionRepository`, legacy migration); `validateTransaction`, `isStoredTransaction`, `calculateAvailableBalance`, `formatINR`, `formatTransactionDate`, `createTransactionElement`, `createTransactionId`; the submit handler's control flow (lines 449-524); `#empty-state` markup and its text; `#transaction-history` and its `aria-live`; the add-transaction form markup; `requirements.md`, `architecture.md`, `design-review.md` (see note N-1); `CLAUDE.md`, `.claude/agents`, `.claude/skills`, `.claude/hooks`, `.claude/settings.json`; `.env*`, `.mcp.json`, `.gitignore`; `docs/`; no `package.json`, CI file, README, or other new file (NFR-004, D-11).

## 5. Testing Strategy and Smallest Checks per Task

Single command for all checks: `node --test tests/` (Node built-in runner; Node v20.17.0 used in this stage; no `package.json` script exists: Not Found).

| After task | Smallest check | Expected |
|---|---|---|
| TASK-001 | `node --test tests/` | 15 pass (measured this stage) |
| TASK-002, 003 | same | 15 pass (new code is not yet exercised) |
| TASK-004, 005, 006 | same (unchanged harness) | 15 pass; proves null-tolerance and the `pageshow` guard |
| TASK-007 | same + grep: no `display` declared in `.history-filter` | 15 pass |
| TASK-008 | same | 15 pass with harness changes |
| TASK-009..015 | same after each task | 15 + new tests pass |
| TASK-016 | same, plus `git status`, `git diff --stat`, Grep for `innerHTML`, `setItem`, `getItem` | All pass; scope as in Section 4 |
| TASK-017..020 | manual in a browser | "Not Run (manual)" unless evidence supplied |

Levels: **unit** (TASK-010), **static markup** (TASK-009), **integration** with the fake DOM (TASK-011..015), **regression** (existing 15 tests), **manual** (TASK-017..020). Edge cases covered: unknown filter keys, own-property check, empty storage, one type absent, add while filtered (matching, non-matching, empty-filter, empty storage), failed save under filter, markup-like note, load failure before and after a prior success, guard during failure, retry, repeated switching, TDZ start-up, late restoration.

Coverage limit to state at Verification: the fake DOM cannot prove real announcements, real CSS at 600px, keyboard behavior, or real browser form-state restoration.

## 6. Requirement Traceability

### 6.1 Functional requirements

| ID | Implementation tasks | Test / evidence tasks |
|---|---|---|
| FR-001 | TASK-002, 006, 007 | TASK-009, 011, 017 |
| FR-002 | TASK-003, 004 | TASK-010, 011 |
| FR-003 | TASK-003, 004 | TASK-010, 011 |
| FR-004 | TASK-003, 004, 006 | TASK-010, 011 |
| FR-005 | TASK-003, 004 | TASK-011, 013 |
| FR-006 | TASK-003 | TASK-010 |
| FR-007 | TASK-003, 004, 006 | TASK-012, 016 |
| FR-008 | TASK-002, 003, 006 | TASK-009, 011, 012, 015, 018 |
| FR-009 | TASK-003, 004 | TASK-010, 011 |
| FR-010 | TASK-004 | TASK-011, 013 |
| FR-011 | TASK-004, 006 (submit handler unchanged) | TASK-013 |
| FR-012 | TASK-004, 006 | TASK-012, 013 |
| FR-013 | TASK-005, 006 | TASK-014 |

### 6.2 Non-functional requirements

| ID | Implementation tasks | Test / evidence tasks |
|---|---|---|
| NFR-001 | TASK-002, 004, 007 | TASK-009, 011, 017, 019 (announcements are manual evidence) |
| NFR-002 | TASK-004 | TASK-013, 016 (no `innerHTML`) |
| NFR-003 | TASK-007 | TASK-020 (manual evidence) |
| NFR-004 | TASK-001 (no dependency, static app) | TASK-008, 016 (existing suite kept) |
| NFR-005 | TASK-003, 004 (client-side O(n)) | Code review only; no numeric target (D-09) |
| NFR-006 | TASK-006 (no network, logging, or storage on the filter path) | TASK-012, 016 |

### 6.3 Acceptance criteria

| ID | Implementation tasks | Test / evidence tasks |
|---|---|---|
| AC-001 | TASK-002 | TASK-009, 011 |
| AC-002 | TASK-003, 004 | TASK-010, 011 |
| AC-003 | TASK-003, 004, 006 | TASK-010, 011 |
| AC-004 | TASK-004 | TASK-011 |
| AC-005 | TASK-003, 004 | TASK-011 |
| AC-006 | TASK-004, 005 | TASK-011, 009 (prompt text in markup) |
| AC-007 | TASK-002, 003, 006 | TASK-012, 015 (state part); TASK-018 (reload part, manual) |
| AC-008 | TASK-006 | TASK-012 |
| AC-009 | TASK-004 (unchanged submit handler) | TASK-013 |
| AC-010 | TASK-003, 004 | TASK-010, 011 |
| AC-011 | TASK-004 | TASK-013 |
| AC-012 | TASK-005, 006 | TASK-014 |
| AC-013 | TASK-002, 004, 007 | TASK-009, 011 (in-region part); TASK-017, 019 (manual) |

### 6.4 Business rules

| ID | Implementation tasks | Test tasks |
|---|---|---|
| BR-001 | TASK-003 | TASK-010 |
| BR-002 | TASK-003, 004, 006 | TASK-012 |
| BR-003 | TASK-003, 006 | TASK-010, 011 |
| BR-004 | TASK-003 | TASK-010 |

### 6.5 Confirmed decisions

| ID | Where honored |
|---|---|
| D-01 | TASK-003; TASK-010 |
| D-02 | TASK-002; TASK-009 |
| D-03 | TASK-003, 004; TASK-011 |
| D-04 | TASK-002, 006; TASK-009, 011 |
| D-05 | TASK-004 (unchanged handler); TASK-013 |
| D-06 | TASK-004, 006; TASK-012, 013 |
| D-07 | TASK-005, 006; TASK-014 |
| D-08 | TASK-003, 006; TASK-012, 015, 018 |
| D-09 | TASK-007 (600px, decision PL-02), TASK-017..020 (manual); no extra targets introduced |
| D-10 | Honored by omission (no count anywhere); checked in TASK-016 |
| D-11 | Honored by omission (no documentation change); checked in TASK-016 |

### 6.6 Architecture decisions and review items

| Item | Where handled |
|---|---|
| PD-01 radio group | TASK-002, 007, 017 |
| PD-02 hide on load failure + guard | TASK-005, 006, 014 |
| PD-03 messages in live region | TASK-004, 011, 019 |
| PD-04 derive at render, keep `renderTransactions` signature | TASK-004, 013 |
| PD-05 state-driven sync, `autocomplete="off"` best-effort, guarded optional `pageshow` | TASK-002, 006, 015, 018 |
| DR-011 `#empty-state` starts `hidden = true` in the fake | TASK-008 (with PL-04 and sentinel technique), TASK-011, 013, 014 |
| DR-012 no `try/finally` | TASK-005, 006 (explicit non-action), TASK-016 check |
| DR-014 item 1 (TDZ) | TASK-003, TASK-015 |
| DR-014 item 2 (`pageshow` decision) | TASK-006 (PL-01: include), TASK-015, TASK-018 |
| DR-014 item 3 (M-2 wording) | TASK-018 |
| DR-014 item 4 (blank line before `## 12`) | Note N-1 only |
| DR-013 | Ignored per UD-8 |

### 6.7 Traceability gaps

None. Every FR, NFR, AC, BR, and D item maps to at least one task. Items with **no automated evidence by design**: AC-007 (reload part), AC-013 and NFR-001 (announcements, keyboard), NFR-003 (600px); these map to TASK-017..020 and are reported "Not Run (manual)" unless a person supplies evidence. NFR-005 has no test (no numeric target, D-09).

## 7. Blocked Tasks

- **Blocked for Stage 5: none.** Every implementation task (TASK-001..TASK-016) has all prerequisites available once this plan is approved; no prerequisite is outstanding and no unresolved question prevents safe implementation.
- **Externally dependent (not blockers of implementation):** TASK-017..TASK-020 require a person with a browser (two browsers for M-2) and, for M-3, a screen reader. Prerequisite: Stage 7 reached and a user or reviewer supplies the result. Unblocking condition: that person runs the check and reports the outcome; until then the item is reported "Not Run (manual)", and the absence of a result does not block Stages 5 or 6.
- **Gate for all of Stage 5:** the user's explicit approval of this plan, and then separate approval of each batch below.

## 8. Proposed Batching for Stage 5 (each batch needs its own explicit user approval)

| Batch | Tasks | Content | Exit check |
|---|---|---|---|
| Batch 1 | TASK-001, 002, 003, 004, 005, 006, 007 | Baseline, markup, script logic, CSS | `node --test tests/` -> 15/15 with the **unchanged** harness; report changed files and any deviation |
| Batch 2 | TASK-008, 009, 010, 011, 012, 013, 014, 015 | Harness changes (including the PL-04 edit to two existing tests) and all new tests | `node --test tests/` all pass; actual counts reported |
| Batch 3 | TASK-016 | Full regression, scope checks, `implementation-notes.md` | Actual results; no commit or push |

**Approval state (2026-11-02):** the three-batch split above is an **approved planning decision** (user message "approve stage 4"). It is not approval to run any batch: each batch needs its own explicit approval, after the user chooses keep-current-context vs fresh-context.

Batch 1 is a safe stopping point because no test depends on the new behavior yet. If the user wants smaller steps, Batch 1 can split into (a) TASK-001..003 and (b) TASK-004..007 without changing any dependency. After Batch 3, Stage 6 (Code Review) needs its own approval; manual items TASK-017..020 belong to Stage 7.

## 9. Plan Decisions and Notes (for approval with this plan)

**Approval state (2026-11-02):** PL-01, PL-02 and PL-04 are **approved decisions** (user message "approve stage 4"); the defaults in the table below stand. PL-03, PL-05, PL-06 and N-1..N-3 are unchanged plan notes covered by the same Stage 4 approval. PL-04's edit to the two existing tests is approved as a planning decision only; it is carried out only when Batch 2 is separately approved.

| ID | Decision or note | Default in this plan | Source |
|---|---|---|---|
| PL-01 | Include the optional guarded `pageshow` re-sync (DR-014 item 2) | **Include**, guard `typeof window.addEventListener === "function"`; rationale in TASK-006; user may veto, then drop one bullet and one test | Architecture PD-05 (optional), DR-014 |
| PL-02 | No new rule in the 600px media block unless M-4 shows a need | **No rule** | NFR-003, D-09 |
| PL-03 | Markup uses `div.filter-options` with `span.filter-option` wrappers around each radio/label pair; class names are a suggestion, ids/values/labels are fixed | As stated | Architecture C1, C8 |
| PL-04 | Edit two existing tests (lines 374, 426) only to pass `{ emptyStateHidden: false }` so DR-011's change does not weaken them | **Do it**, subject to batch approval; otherwise report the two weakened assertions | DR-011 |
| PL-05 | The `!repositoryReady` guard lives in the per-radio `change` listener; `setActiveFilter` itself only normalizes, renders, commits, and syncs (so unknown-key behavior is testable directly) | As stated | Architecture C4 |
| PL-06 | `normalizeFilterKey` uses an own-property check | As stated | BR-003 |
| N-1 | The cosmetic blank line before `## 12` in `architecture.md` (DR-014 item 4) is **not** a task: `architecture.md` is approved and must not be edited without the user's approval. Noted only | No action | UD-7 |
| N-2 | DR-012 is accepted as unreachable: **do not add** a `try/finally` re-sync in `setActiveFilter`; code review should not flag its absence | No guard | UD-6 |
| N-3 | DR-013 ignored | No action | UD-8 |

## 10. Risks, Assumptions, and Open Questions

| ID | Item | Type | Disposition |
|---|---|---|---|
| RK-01 | Browser form-state restoration could desync radio and list (architecture R-03; Not Verified) | Risk | Mitigated in code (start-up sync, guarded `pageshow`, best-effort `autocomplete="off"`); evidence only through TASK-018; "Not Run (manual)" if not supplied |
| RK-02 | A TDZ error on `activeFilter` would be masked as a load-failure screen by the existing `catch` | Verified risk | TASK-003 placement rule + TASK-015 test asserting the load-error state is absent |
| RK-03 | Fake-DOM assertions can pass vacuously (initial `hidden`/`hide` values) | Verified risk | DR-011 fix in TASK-008, sentinel technique, TASK-014(d) |
| RK-04 | Setting the fake `#empty-state` to start `hidden` weakens existing assertions at lines 374 and 426 | Verified side effect | PL-04 option; user approval needed for the edit to existing tests |
| RK-05 | `assert.deepEqual` fails across `vm` realms | Verified | Use JSON round-trip or compare fields, as the existing tests do |
| RK-06 | Editing `renderTransactions` could regress balance, empty-state, or atomicity | Risk (architecture R-05) | Keep signature and call order; unchanged-harness 15/15 after TASK-006; new balance and empty-state tests |
| RK-07 | `.hide` / `hidden` can be overridden by an author `display` rule | Risk (R-04) | TASK-007 rule: no `display` on the fieldset; new CSS before `.hide` |
| RK-08 | Whole-list re-announcement and arrow-key chatter in the live region | Accepted (R-01, DR-006) | Manual M-3 |
| RK-09 | Manual-only evidence for AC-007 (reload), AC-013, NFR-001, NFR-003 | Accepted by the user (UD-3) | TASK-017..020 reported Not Run (manual) unless supplied |
| RK-10 | No CI and no `package.json`; the test command is inferred (`node --test tests/`, run successfully in this stage) | Fact | None |
| A-P1 | The plan assumes the user approves PL-01 (include `pageshow`) and PL-04 (edit two existing tests); either can be vetoed at approval without changing other tasks | Assumption | Confirm at plan approval |

**Open questions:** none that block planning or implementation. The only items needing the user's attention at approval are PL-01, PL-02, PL-04 and the batching in Section 8; the plan states a default for each.

## 11. Approval and Readiness

- Plan status: **APPROVED (Stage 4) - 2026-11-02.**
- Approval evidence: user message "approve stage 4" on 2026-11-02, relayed by the orchestrator; it explicitly included PL-01 (guarded `pageshow` re-sync), PL-02, PL-04 and the three-batch split. The orchestrator's relay is the transport of the user's message, not an agent approval.
- Scope of approval: **Stage 4 only.** It does NOT authorize implementation, any code edit, commit, push, or pull request. Stage 5 needs separate explicit approval of each batch in Section 8 (Batch 1: TASK-001..007; Batch 2: TASK-008..015; Batch 3: TASK-016), and the user must first choose keep-current-context vs fresh-context. Task statuses remain `Not Started`.
- Prior-stage approvals relied on: requirements revision 2 ("approve stage 1"), architecture Draft 2 ("approve Draft 2"), design review ("yes,APPROVE Stage 3"), all recorded in the respective artifacts.
- Not done in this stage: no code, no test changes, no edits to other artifacts, no `workflow-session.json` change, no git add/commit/push.
