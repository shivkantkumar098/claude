# Architecture: AG-10 - Filter transactions by type

- Run ID: AG-10-4 (branch `feature/AG-10-4`)
- Stage: 2 - Architecture Design
- Input: `requirements.md` revision 2, APPROVED by the user on 2026-11-02 (committed c2a435c)
- Revision: Draft 1 (2026-11-02), approved unchanged
- **Status: APPROVED (2026-11-02).** Approved by the user ("approve stage 2"). Approval covers Stage 2 only. It is not approval for Stage 3, any commit, any push, or any pull request.
- No application code was written or changed in this stage. Only this file was created.

## 1. Architecture Overview and Objectives

**Objective.** Add a client-side, view-only filter (All / Income / Expenses) to the existing transaction history of the static "Vidyarthi Khataa" app, with type-specific empty messages, while leaving storage, validation, the balance calculation, and the add-transaction flow unchanged in behavior.

**Approach in one paragraph.** Introduce a single in-memory value, `activeFilter` (default `"all"`), next to the existing in-memory `transactions` array. The visible list is always derived at render time as `filterTransactions(transactions, activeFilter)`; nothing derived is stored. A native radio group in the history card changes `activeFilter` and re-renders only the history list region. The existing `renderTransactions` entry point keeps its contract (receives the full list and the balance) and applies the active filter internally, so the load path and the add-transaction path pick up the filter with no change to their control flow. The load-failure path hides the filter group and never renders a filter message.

**Design principles (all taken from the repository's existing conventions).** No new dependencies; DOM built with `createElement`/`textContent`; visibility through `showElement` (`.hide`) and `hidden`; status through `role`/`aria-live`; labelled controls; 600px breakpoint; integer paise; storage schema untouched.

## 2. Requirements and Constraints (extracted from the approved requirements)

| Area | Summary | IDs |
|---|---|---|
| Control | Labelled, keyboard-operable single-choice control with exactly All, Income, Expenses; default All; control type settled here | FR-001, FR-008, D-02, D-04, AC-001, AC-007, AC-013 |
| Filtering | Income = `Money Received`; Expenses = `Expense`; All = everything; view-only over in-memory data | FR-002..004, FR-006, FR-007, BR-001, BR-002, BR-004, D-01 |
| Empty messages | "No income transactions found." / "No expense transactions found." when transactions exist but none match; existing "No transactions yet. Add one to get started." only when nothing is stored | FR-005, FR-010, D-03, AC-004..006 |
| Add flow | Keep active filter; save, update balance, show "Transaction added."; hide non-matching new item | FR-011, D-05, AC-009 |
| Balance | Always reflects all transactions | FR-012, D-06, AC-008 |
| Load failure | Existing load-error state wins; filter hidden or disabled (settled here); no "no matches" message | FR-013, D-07, AC-012 |
| Persistence | None; resets to All on reload; no storage or schema change | FR-008, D-08, AC-007, AC-008 |
| Presentation | Visible items keep format and relative order | FR-009, AC-010 |
| NFR | Accessibility via existing live region, `textContent`, 600px layout, no new deps, client-side performance, no off-device data | NFR-001..006, D-09 |
| Out of scope | Count of matches (D-10), documentation (D-11), other criteria, sort/search/pagination, changes to add/validate/store/migrate | D-10, D-11 |

## 3. Existing System Context (verified by inspection in this stage)

All items below were read from the files on branch `feature/AG-10-4`; line numbers refer to the current files.

| Fact | Evidence |
|---|---|
| Static app: `index.html`, `script.js`, `styles.css`; vanilla JS, no modules, no bundler. `package.json`, `.github` CI, README: Not Found. Only `docs/codemie/analytics/*.json` exist under `docs/`. | File listing |
| Tests: `tests/app.test.cjs`, `node:test` + `node:vm` with a hand-written fake DOM. Baseline executed in this stage: `node --test tests/` on Node v20.17.0 gave 15 tests, 15 pass, 0 fail, 0 skipped. | Command run in this stage |
| Types: `TRANSACTION_TYPES = ["Expense", "Money Received"]`; `isStoredTransaction` rejects any other type, so every loaded record has exactly one of the two types. | `script.js` lines 3, 116-124 |
| Persistence: `localStorage` key `transactions`, envelope `{schemaVersion: 1, transactions}`; only `transactionRepository.load()` and `.save()` touch storage. `load()` may write once (legacy migration). | `script.js` lines 204-259 |
| Module-level state: `transactions` (array), `repositoryReady`, `isSaving`, `isLoading`. | `script.js` lines 289-292 |
| `showElement(el, visible)` toggles the `hide` class and is null-tolerant. | `script.js` lines 294-298 |
| `renderTransactions(nextTransactions, balanceInPaise)`: builds the list element first (so a render error occurs before any DOM mutation), then `transactionHistory.replaceChildren(list)`, sets the balance text and un-hides it, and sets `emptyState.hidden = nextTransactions.length !== 0`. | `script.js` lines 387-398 |
| `renderLoadFailure(error)`: sets `repositoryReady=false`, disables save, hides balance and `#empty-state`, clears the history, writes `#load-error`, shows it and the retry button. | `script.js` lines 400-412 |
| `loadTransactions()`: load, compute balance, render, then assign `transactions`, set `repositoryReady`, enable save, hide load-error/retry; any throw goes to `renderLoadFailure`. Called on retry click and once at start-up. | `script.js` lines 414-436, 526-530 |
| Submit handler: guards on `isSaving/isLoading/!repositoryReady`; validates; builds `updatedTransactions` and `updatedBalance` from the full list; saves; assigns `transactions`; `form.reset()`; `renderTransactions(transactions, updatedBalance)`; sets "Transaction added."; a render failure after a successful save shows a form error. | `script.js` lines 449-524 |
| History markup: `section.history-card` containing `h2#history-heading`, `p#load-error[role=alert]`, `button#retry-load`, `p#empty-state[hidden]` with the "No transactions yet..." text, and `div#transaction-history[aria-live=polite]`. **`#empty-state` is a sibling of, not inside, the `aria-live` region.** | `index.html` lines 94-104 |
| Existing form select is labelled with `<label for>`; there is no `fieldset`/`legend`, radio input, or `autocomplete="off"` on a radio anywhere. | `index.html` |
| CSS: `.hide {display:none}` is declared near the end of the file (line 183), after the component rules, and is the same specificity as single-class rules; one `@media (max-width: 600px)` block; inputs use `min-height: 2.75rem`; muted text colour `#5c6678`. | `styles.css` |
| Fake DOM (`FakeElement`): supports `addEventListener` (one listener per event name per element), `dispatch(name)` (event has only `preventDefault`; no `target`), `setAttribute/removeAttribute`, `append`, `replaceChildren`, `textContent`, `value`, `disabled`, `hidden`, and `classList.toggle` only (no `add`/`remove`/`contains`). Elements are served by `document.getElementById` from a fixed id list; unknown ids return `null`. `querySelector`, `closest`, event delegation, radio-group exclusivity: Not Found. | `tests/app.test.cjs` lines 24-93, 114-168 |
| The test harness exposes internals by appending a snippet inside the same `vm` script, so top-level `const`/`let` of `script.js` are reachable from that snippet. | `tests/app.test.cjs` lines 152-165 |
| Content-Security-Policy meta/header: Not Found. | `index.html` |
| Git: branch `feature/AG-10-4`; only untracked item is `.claude/AgentOutput/AG-10-4/workflow-session.json`. | `git status` |

## 4. Proposed Architecture

### 4.1 Components

Existing components that remain unchanged in behavior: `transactionRepository`, `validateTransaction`, `calculateAvailableBalance`, `formatINR`, `formatTransactionDate`, `createTransactionElement`, `createTransactionId`, the add-transaction form and its submit-handler control flow.

| # | Component | Kind | Responsibility | Inputs / outputs | Depends on |
|---|---|---|---|---|---|
| C1 | History filter markup | New (`index.html`) | A `fieldset.history-filter` with a `legend` ("Filter by type") holding three native radio inputs (`name="history-filter"`, ids `filter-all`, `filter-income`, `filter-expenses`, values `all`/`income`/`expenses`), each with an explicit `<label for>` reading All / Income / Expenses. The All radio carries `checked`; all radios carry `autocomplete="off"`. The fieldset ships with the `hide` class (revealed by script only after a successful load). Placed directly under `#history-heading`. Not inside `#transaction-form`. | User selection in; `change` events out | None |
| C2 | Filter definition | New (`script.js`) | One constant `TRANSACTION_FILTERS` mapping each key to its stored type and empty message: `all` -> no type restriction, no message; `income` -> `Money Received`, "No income transactions found."; `expenses` -> `Expense`, "No expense transactions found.". It is the only place where the Income/Expenses to stored-type mapping (D-01, BR-004) and the filter messages (D-03) are defined. | Read by C3, C4 | `TRANSACTION_TYPES` (for tests to assert coverage) |
| C3 | Filter predicate | New pure function `filterTransactions(list, filterKey)` | Returns a new array containing the items whose `type` matches the filter's type, in original order; `all` returns every item; an unknown key behaves as `all` (BR-003). Never mutates its input, never reads the DOM or storage. | In: array, key. Out: new array | C2 |
| C4 | View state and control binding | New (`script.js`) | Holds `let activeFilter = "all"` (in-memory only). `setActiveFilter(key)` normalizes the key (unknown -> `all`), re-renders the history list via C5, then commits state. `syncFilterControls()` projects `activeFilter` onto the three radios by setting `checked` explicitly on each. Start-up wiring attaches one `change` listener per radio, each bound by closure to its own key (not read from `event.target` or the DOM `value`); the listener does nothing when `!repositoryReady`. | In: radio `change` events. Out: calls to C5; radio `checked` projection | C2, C5, `repositoryReady` |
| C5 | History renderer | Changed (`script.js`) | Split of today's `renderTransactions`: **`renderHistoryList(allTransactions)`** builds the visible view from `allTransactions` and `activeFilter`, then updates `#transaction-history` and `#empty-state` (decision table in 4.3). **`renderTransactions(allTransactions, balanceInPaise)`** keeps its signature and call sites: it calls `renderHistoryList` and then sets/unhides the balance exactly as today. The filter-change path calls only `renderHistoryList`, so the balance DOM is never touched by a filter change. All list/message elements are built before any DOM mutation (preserves today's atomicity). | In: full list (+ balance). Out: DOM | C3, C2, `createTransactionElement` |
| C6 | Load lifecycle hook | Changed (`script.js`) | `renderLoadFailure` additionally hides C1 (`showElement(filter, false)`); `loadTransactions` success path additionally shows C1 after `repositoryReady = true`. No other change to either function. | Existing flow | C1, `showElement` |
| C7 | Add-transaction flow | Unchanged control flow | Continues to call `renderTransactions(transactions, updatedBalance)` with the full list; the filter is applied inside C5 (D-05 follows without new code in the handler). | Existing | C5 |
| C8 | Styles | Changed (`styles.css`) | Rules for `.history-filter` (reset fieldset border/padding/min-width, margin below), its `legend`, an inner `.filter-options` flex row with `flex-wrap: wrap`, option labels with `min-height: 2.75rem` touch height, and the in-list empty message (shares the muted colour with `#empty-state`). Native radio focus ring is kept. Must not set `display` on the fieldset itself (see Section 9, R-04). New rules go before the `.hide` rule. A rule inside the existing 600px media block only if inspection shows wrapping is insufficient. | n/a | None |
| C9 | Tests | Changed (`tests/app.test.cjs`) | Fake DOM id list and required-controls test extended with the four new ids; the harness snippet exports the new pure function/constant; new tests per Section 11. | n/a | C1..C6 |

### 4.2 State model

| State | Owner | Lifetime | Source of truth for |
|---|---|---|---|
| `transactions` (existing) | `script.js` | Page session; reloaded from storage | Full history; balance |
| `activeFilter` (new) | `script.js` | Page session only; initial `"all"`; never written to storage, URL, or cookies | Which subset is displayed |
| Radio `checked` flags | DOM | Derived projection | None; always overwritten from `activeFilter` by `syncFilterControls()` |
| Visible list | DOM | Derived on every render | None; never stored |

### 4.3 Render decision table (`renderHistoryList`)

| Stored count | Visible count | `#empty-state` | `#transaction-history` content |
|---|---|---|---|
| 0 | 0 | shown (`hidden=false`), existing text | existing behaviour (empty list container); the filter is ignored for messaging, so the "Add one to get started" prompt shows under every option (FR-010, AC-006) |
| > 0 | 0 (filter `income` or `expenses`) | hidden | a single message paragraph (class `empty-message`) with that filter's message, **instead of** the list (FR-005, AC-004, AC-005) |
| > 0 | > 0 | hidden | `div.transaction-list` with the matching items in original order (FR-002..004, FR-009) |

Because exactly one branch runs per render, the two kinds of empty message can never appear together (FR-010).

### 4.4 Component diagram

```mermaid
flowchart LR
  subgraph Browser["Browser page (static app, no server)"]
    subgraph HTML["index.html"]
      FG["C1 Filter fieldset<br/>3 radios: All / Income / Expenses"]
      HL["#transaction-history<br/>aria-live=polite"]
      ES["#empty-state<br/>(nothing stored)"]
      BAL["#balance-amount"]
      LE["#load-error / #retry-load"]
      FORM["Add-transaction form"]
    end
    subgraph JS["script.js"]
      DEF["C2 TRANSACTION_FILTERS"]
      PRED["C3 filterTransactions()"]
      ST["C4 activeFilter + setActiveFilter()<br/>syncFilterControls()"]
      REND["C5 renderHistoryList() /<br/>renderTransactions()"]
      LIFE["C6 loadTransactions() /<br/>renderLoadFailure()"]
      SUB["C7 submit handler (unchanged flow)"]
      REPO["transactionRepository (unchanged)"]
      TX["transactions[] (in memory)"]
    end
    LS[("localStorage<br/>key: transactions<br/>schemaVersion 1")]
  end

  FG -- "change" --> ST
  ST --> REND
  DEF --> PRED
  DEF --> REND
  PRED --> REND
  TX --> REND
  REND --> HL
  REND --> ES
  REND --> BAL
  LIFE --> REPO
  REPO <--> LS
  LIFE --> TX
  LIFE --> REND
  LIFE -- "show on success / hide on failure" --> FG
  LIFE --> LE
  FORM --> SUB
  SUB --> REPO
  SUB --> TX
  SUB --> REND
  ST -. "no storage access" .- LS
```

### 4.5 Data-flow diagrams

**Filter change**

```mermaid
sequenceDiagram
  actor U as Student
  participant R as Radio (change)
  participant S as setActiveFilter
  participant P as filterTransactions
  participant H as renderHistoryList
  participant D as DOM (#transaction-history, #empty-state)
  U->>R: choose Income / Expenses / All
  R->>S: key bound by closure
  alt repositoryReady is false
    S-->>R: ignore (no render, no message)
  else ready
    S->>S: normalize key (unknown -> all)
    S->>H: render(transactions) using candidate key
    H->>P: filterTransactions(transactions, key)
    P-->>H: new array (original order)
    H->>D: list, or empty-filter message, or existing empty-state
    S->>S: commit activeFilter, syncFilterControls()
  end
  Note over S,D: No storage read or write. Balance DOM untouched.
```

**Add transaction under an active filter (D-05)**

```mermaid
sequenceDiagram
  actor U as Student
  participant F as Submit handler (existing)
  participant Repo as transactionRepository
  participant T as transactions[]
  participant R as renderTransactions
  U->>F: submit valid transaction
  F->>F: build updatedTransactions and updatedBalance from the FULL list
  F->>Repo: save(updatedTransactions)
  alt save fails
    F-->>U: existing form error; nothing changes
  else saved
    F->>T: transactions = updatedTransactions
    F->>R: renderTransactions(transactions, updatedBalance)
    R->>R: renderHistoryList applies activeFilter (unchanged selection)
    R->>R: set balance from full list
    F-->>U: "Transaction added." (item shown only if it matches)
  end
```

**Load / retry, success and failure (D-07)**

```mermaid
flowchart TD
  A["loadTransactions()"] --> B{"repository.load() and balance OK?"}
  B -- yes --> C["renderTransactions(list, balance)<br/>applies activeFilter (default all)"]
  C --> D["transactions = list; repositoryReady = true"]
  D --> E["show filter group; hide load-error and retry"]
  B -- no --> F["renderLoadFailure(error)"]
  F --> G["repositoryReady = false; hide filter group;<br/>hide #empty-state and balance; clear history;<br/>show load-error and retry"]
  C -- "render throws" --> F
```

## 5. Proposed Decisions

PD-01 to PD-05 were proposed in Draft 1 and became approved decisions on the user's Stage 2 approval of 2026-11-02 (see Section 13). The decision text below is unchanged from Draft 1.

### PD-01 - Control type: native radio group (confirms the user's lean)

- **Proposal.** Use a `fieldset`/`legend` containing three native `input type="radio"` elements with explicit `<label for>`.
- **Rationale.**
  1. All three options are visible at once, which serves the story goal ("quickly review one kind") with one interaction per switch instead of open-select-choose.
  2. Native radios give a programmatic group label (`legend`), single-choice semantics, and arrow-key/Space operation with no custom ARIA or key handling, satisfying FR-001, NFR-001, AC-013 and D-04.
  3. A `change` event fires only on the radio that becomes checked, so the handler needs no extra logic.
  4. Three short labels wrap cleanly with `flex-wrap`, so the 600px requirement (NFR-003) needs little or no extra CSS.
  5. The radios sit outside `#transaction-form`, so `form.reset()` cannot affect them.
- **Rejected alternatives.**
  - Labelled `<select>`: matches the existing form's control, but hides the options behind a click, and the existing `.field select` styles are scoped to the form. Acceptable per D-04, rejected for usability.
  - Buttons with `aria-pressed` or a `role="tablist"`: needs custom ARIA, roving tabindex, and key handling; more JS and more a11y risk for no benefit; not testable with the current fake DOM without extra support.
  - Radios visually restyled as a segmented control: still a native radio underneath, so it is a styling choice rather than an architectural alternative; deferred to implementation and permitted if the native focus indicator is kept.

### PD-02 - Load failure: hide the filter (do not disable it)

- **Proposal.** On load failure, hide the filter fieldset using the existing `showElement(filter, false)` helper (`hide` class). Show it again only after a successful load. Add a defensive guard so that a filter change while `repositoryReady` is false does nothing (no state change, no render, no message). On load failure the history container is cleared and no filter message is ever created, so the existing `#load-error` state is the only history-area content.
- **Rationale.**
  1. FR-013/D-07 require the load-error to take precedence and storage failure never to look like an empty history. A visible but disabled control still advertises a working "history", and a disabled "All" radio would appear selected over nothing.
  2. Hiding removes the control from the tab order and the accessibility tree, so there is no inert focus stop or confusing disabled announcement.
  3. It mirrors what `renderLoadFailure` already does to the balance and `#empty-state` (hidden), keeping one consistent failure presentation.
  4. `showElement` is already used and is supported by the fake DOM (`classList.toggle`), so it is testable (`className` contains `hide`).
  5. The control is not hidden when the load succeeds with zero stored transactions: AC-006 requires "No transactions yet..." under every option, which presupposes a visible filter.
- **Rejected alternatives.**
  - Disable the radios (`disabled`): leaves a dead control visible and potentially announced; risks looking like valid state; needs re-enabling logic of the same size as show/hide.
  - Keep enabled and show a different message: violates D-07.
  - Use the `hidden` attribute instead of the `hide` class: `hidden` is overridden by any author `display` rule on the same element, a silent failure. The `hide` class plus the rule "never set `display` on the fieldset" is safer (R-04).
- **Guard note.** The handler guard is defense in depth; a hidden control cannot normally be operated. It also makes the behavior testable by dispatching `change` after a failed load.

### PD-03 - Filter empty messages live inside the existing live region

- **Finding.** `#empty-state` is outside the `aria-live` region (`index.html` lines 100-103). Changing its text or `hidden` flag is therefore not reliably announced, while AC-013/NFR-001 require list or empty-message changes caused by the filter to be announced via the existing live region.
- **Proposal.** Render the two filter-specific messages as a paragraph built with `createElement`/`textContent` and placed **inside** `#transaction-history` (replacing the list), so the existing `aria-live="polite"` region announces them. Leave `#empty-state` and its text exactly as is for the "nothing stored" case (it is not a filter-result change). The `#transaction-history` element and its `aria-live` attribute are not modified.
- **Rationale.** Inserting content into an always-rendered live region is the most reliable announcement path; it reuses the existing region as D-09 requires; it keeps the "nothing stored" behaviour and existing tests untouched.
- **Rejected alternatives.**
  - Reuse `#empty-state` with dynamic text: not inside the live region, announcement unreliable; also a hidden-to-visible toggle with simultaneous text change is a known weak announcement path.
  - Move `#empty-state` inside the live region: `replaceChildren` on `#transaction-history` would delete it, and it alters existing markup and tests.
  - Add `role="status"` to `#empty-state`: toggling `hidden` on a live region is unreliable, and it creates a second live region.
  - Add a separate screen-reader-only announcement (such as "3 income transactions"): would be a count, which D-10 rules out.

### PD-04 - Derive the view at render time; keep `renderTransactions` signature

- **Proposal.** `transactions` remains the only copy of the data. The filtered subset is computed inside `renderHistoryList` on every render. `renderTransactions(allTransactions, balanceInPaise)` keeps its signature and both call sites; callers continue to compute the balance from the full list (FR-012, D-06). Filter changes call `renderHistoryList` only.
- **Rationale.** Smallest change to existing flows; D-05 holds without touching the submit handler; the balance cannot be affected by a filter change because balance code is not on that path; no derived state to drift.
- **Rejected alternatives.**
  - Store a `filteredTransactions` array: duplicate state that can go stale after adds/reloads.
  - Hide/show existing item elements with CSS or a class: leaves non-matching nodes in the DOM and in the live region, cannot produce the empty message cleanly, and needs per-item tagging.
  - Change `renderTransactions` to accept the visible subset from callers: pushes filtering into every caller and risks computing the balance from the subset.
  - Persist the filter or encode it in the URL: out of scope (D-08).

### PD-05 - State is the source of truth for the radios; defeat browser form-state restoration

- **Proposal.** At start-up, and on every `setActiveFilter`, call `syncFilterControls()` so the radios' `checked` flags are always overwritten from `activeFilter` (all three set explicitly). Radios also carry `autocomplete="off"`. Markup ships with All `checked`.
- **Rationale.** Browsers may restore form control state after a reload or history navigation, which could leave "Income" visually selected while `activeFilter` is `all` (a violation of AC-007). Explicit projection from state removes the dependency on browser behavior. The exact timing of restoration relative to script execution in each browser is **Not Verified** in this stage (see R-03).
- **Rejected alternative.** Reading the initial filter from the checked radio: reintroduces the restoration problem and implicitly persists state, contradicting D-08.

## 6. Technology Choices and Rationale

| Concern | Choice | Rationale | Alternatives considered |
|---|---|---|---|
| Language/runtime | Existing vanilla JS, no modules (NFR-004) | Repository convention; tests load `script.js` source into `vm` | Introducing a framework or bundler: rejected, violates NFR-004 and the test harness model |
| Control | Native radio group (PD-01) | See PD-01 | `select`, ARIA buttons/tabs |
| Filtering | Pure array filter by stored type, O(n) per render (NFR-005) | Trivially testable, no new state; history is bounded by localStorage size and already re-rendered fully on each add | Indexing/caching by type: unnecessary, no performance target (D-09) |
| State | Module-level `let activeFilter` | Same pattern as `transactions`/`repositoryReady` | Persisting to storage/URL: out of scope (D-08) |
| DOM building | `createElement` + `textContent` | Existing convention; NFR-002 | `innerHTML`/templates: rejected for XSS risk |
| Visibility | `showElement` (`hide` class) for the filter; `hidden` for the existing `#empty-state` and balance | Follows existing conventions; avoids the `hidden`/`display` override trap | n/a |
| Styling | Plain CSS in `styles.css`; existing colour palette and spacing | NFR-003 | CSS framework: rejected |
| Tests | Existing `node:test` + `vm` fake DOM | NFR-004 | Browser E2E tooling: Not Found in repo, would add dependencies |

New dependencies: none.

## 7. Security and Privacy

| Concern | Treatment | IDs |
|---|---|---|
| XSS | Notes, types, amounts, dates and the two new messages are all set via `textContent`; no `innerHTML`. Filter keys are internal constants, never taken from user text, URL, or storage. The new markup is static. | NFR-002, AC-011 |
| Data integrity | The filter path performs no `localStorage` access (no `getItem`, no `setItem`); `filterTransactions` returns a new array and does not mutate records. | FR-007, BR-002, AC-008 |
| Privacy | No network calls, no logging, no analytics; selection is not stored in storage, cookies or URL. | NFR-006, D-08 |
| Trust boundary | The only external input to this feature is a user click on one of three internal-valued radios. Unknown keys normalize to All (BR-003). Stored data is still validated by the existing `isStoredTransaction`. | BR-003 |
| Secrets | None involved. This document contains none. | - |
| CSP | Not Found (no policy configured); not introduced by this change. | - |

## 8. Error Handling and Failure Scenarios

| Scenario | Behavior | IDs |
|---|---|---|
| Storage unreadable, corrupt, or invalid legacy data (initial load or retry) | Existing `renderLoadFailure`: load-error + retry shown, balance, `#empty-state` and history cleared, save disabled; **filter hidden**; no filter message created. Retry success re-shows the filter and renders with the in-memory `activeFilter` (unchanged because the control was unreachable). | FR-013, AC-012, D-07 |
| Filter change while `repositoryReady` is false | Ignored (guard) | FR-013, AC-012 |
| Stored count 0 | Existing message, shown under every option; no filter message | FR-010, AC-006 |
| Transactions exist, selected type has none | Type-specific message only; no "Add one..." prompt | FR-005, FR-010, AC-005 |
| Add transaction under a filter, non-matching | Saved, balance updated, "Transaction added." shown, item not visible, selection unchanged | FR-011, AC-009 |
| Add transaction under a filter whose list was empty, matching | Message replaced by the list containing the new item | FR-011 |
| Save failure | Existing form error; `transactions`, selection and storage untouched | existing |
| Render failure after successful save | Existing "saved, but the history could not refresh" form error; filter state unaffected | existing |
| Unexpected render exception during a filter change (not reachable with validated data: records are validated at load, `formatINR`/`formatTransactionDate` are safe for validated values) | Because list/message elements are built before DOM mutation, the previous list stays. The handler reverts `activeFilter` and re-syncs the radios so the control never disagrees with the list, then surfaces the failure through the existing `renderLoadFailure(error)`. Flagged for the design reviewer (R-06). | NFR-002 |
| Unknown filter key | Normalized to All | BR-003 |
| Repeated switching | Each render replaces the container's children, so there are no stale or duplicated items | Requirements Section 8 |

## 9. Accessibility

- **Label and operation.** `fieldset`/`legend` names the group; each radio has a `<label for>`; native arrow-key, Tab, and Space behavior; native focus indicator retained (the existing translucent outline style is not reused for radios). Touch target height `2.75rem`, matching existing inputs. (NFR-001, AC-013, FR-001)
- **Announcements.** The list and the filter-specific empty messages are rendered inside `#transaction-history` (`aria-live="polite"`), so changes caused by the filter are announced there (PD-03). The "Transaction added." status continues to use `#save-status` (`role="status"`). Known trade-off: replacing the list re-announces the visible items (existing behavior on add; no count or summary is added because D-10 excludes counts).
- **Visibility.** The filter is removed from the accessibility tree on load failure (PD-02).
- **Responsive.** Options wrap in a flex row; verified manually at 600px and below at Verification (NFR-003).
- **Language/semantics.** Labels are plain text; `lang="en"` already set.

## 10. Dependencies and Integration Points

| Dependency | Nature | Change |
|---|---|---|
| `TRANSACTION_TYPES`, `isStoredTransaction` | Guarantees every record has exactly one of two types | None |
| `transactionRepository` / `localStorage` | Source of data on load | None; the feature does not call it |
| `calculateAvailableBalance` | Balance from the full list | None; never called with a filtered list |
| `createTransactionElement`, `formatINR`, `formatTransactionDate` | Item presentation | None (FR-009) |
| `showElement`, `renderLoadFailure`, `loadTransactions` | Visibility and lifecycle | Small additions (C6) |
| Submit handler | Add flow | No control-flow change |
| `tests/app.test.cjs` | Existing 15 tests must keep passing | Id list and exports extended (C9) |
| External systems (Jira, network, backend, CI) | Not applicable to the runtime design; no `.github` CI found | None |

## 11. Testability Strategy (outline only; test code belongs to later stages)

**What the fake DOM needs.** Add `history-filter`, `filter-all`, `filter-income`, `filter-expenses` to the id list in `createApp` and the required-controls test. Radios are plain `FakeElement`s: the script sets `.checked` on each (a plain property assignment, supported) and reads nothing from `event.target`; tests trigger `elements["filter-income"].dispatch("change")`. The fake has no radio-group exclusivity, which is why `syncFilterControls()` sets all three flags explicitly. The new code must use only supported APIs (`classList.toggle`, `append`, `replaceChildren`, `textContent`, `hidden`) and be null-tolerant for the new ids, matching the existing `if (transactionForm)` pattern, so a missing id cannot crash start-up.

**Exports.** The harness snippet adds `filterTransactions` and `TRANSACTION_FILTERS` for unit tests. `activeFilter` is reachable inside the same `vm` script if a test needs it.

**Test outline (mapped to requirements).**

| Level | Scenario | IDs |
|---|---|---|
| Static/markup | `index.html` has the fieldset, legend, three radios with labels exactly All/Income/Expenses, All `checked`, `name` shared, `autocomplete="off"`, filter outside the form, filter initially `hide` | FR-001, AC-001, AC-013, FR-008 |
| Unit | `filterTransactions`: income only, expenses only, all, empty input, order preserved, input not mutated, unknown key -> all | FR-002..004, FR-009, BR-003, AC-002, AC-003, AC-010 |
| Unit | Every member of `TRANSACTION_TYPES` is covered by exactly one non-all filter | FR-006, BR-001, BR-004, D-01 |
| Integration | Default after load: All checked, full history, filter visible; with empty storage the filter is visible and shows the existing message | FR-004, FR-008, AC-007, AC-006 |
| Integration | Select Income/Expenses via `change`: only matching items rendered; switch back to All restores everything; repeated switching has no duplicates | AC-002, AC-003 |
| Integration | Only expenses stored + Income: "No income transactions found.", no articles, `#empty-state.hidden` true, "Add one to get started" absent; mirror case | FR-005, FR-010, AC-004, AC-005 |
| Integration | Message is inside `#transaction-history` (found through `collectText(history)`) | PD-03, NFR-001, AC-013 |
| Integration | Storage write spy: zero `setItem` calls and unchanged envelope after filter changes; balance text unchanged | FR-007, FR-012, AC-008, D-06 |
| Integration | Under Income, add an expense: saved (envelope count +1), balance updated, "Transaction added.", selection unchanged, item not visible; add an income: visible | FR-011, AC-009, D-05 |
| Integration | Corrupt storage and read failure: filter has `hide`, no filter message, load-error governs; `change` dispatched during failure does nothing; retry success shows the filter again | FR-013, AC-012, D-07 |
| Integration | Markup-like note under a filter rendered as text, no `img` tag | NFR-002, AC-011 |
| Integration | `activeFilter` reset: a new `createApp` on the same storage starts at All after a previous app had Income selected | AC-007, D-08 |
| Regression | Existing 15 tests unchanged in intent and still pass | NFR-004 |
| Manual (Verification stage; not automatable here) | Real-browser check of keyboard operation, screen-reader announcement of the empty message, 600px layout, and reload behavior (form-state restoration, R-03) | NFR-001, NFR-003, AC-007, AC-013 |

Coverage limit to state honestly at Verification: the fake DOM cannot prove real announcements, real CSS, or real browser restoration; those are manual checks.

## 12. Risks, Trade-offs, and Assumptions

| ID | Item | Type | Mitigation / disposition |
|---|---|---|---|
| R-01 | Live-region re-announcement of the whole list on every filter change (verbose for long histories) | Trade-off | Accepted: existing behavior on add; no count/summary allowed by D-10; D-09 sets no further target |
| R-02 | Screen-reader behavior of in-region empty message cannot be proven by the fake DOM | Risk | Manual check at Verification; PD-03 chooses the most reliable insertion pattern |
| R-03 | Browser restoration of radio state on reload could desync control and list (Not Verified here) | Risk | PD-05 (explicit sync + `autocomplete="off"`); manual reload check in Firefox and Chromium-based browsers at Verification |
| R-04 | `hidden` attribute or `.hide` class can be overridden by author `display` rules on the same element | Risk | Use `hide` class, place new CSS before `.hide`, and never set `display` on the fieldset; put flex on the inner `.filter-options` |
| R-05 | Edits to `renderTransactions` could regress balance, empty-state, or atomicity | Risk | Keep signature and call order; filter-change path excludes balance; existing 15 tests plus new regression cases |
| R-06 | The defensive "revert and show load failure" on unexpected render error adds a branch that is practically unreachable | Trade-off | Kept small; design reviewer may drop it in Stage 3 without affecting any requirement |
| R-07 | Retry success keeps `activeFilter` (not reset to All); not specified by the requirements | Assumption (A-S2) | Behavior is consistent because the hidden control could not change during failure; reviewer to confirm |
| R-08 | After a successful retry the retry button is hidden, which may drop keyboard focus | Pre-existing | Out of scope, unchanged |
| A-S1 | Legend wording "Filter by type" is a presentation choice, not a requirement; the three option labels are fixed by D-02 | Assumption | Low impact |
| A-S2 | See R-07 | Assumption | See R-07 |
| A-S3 | Document order places the filter directly under the history heading, above the load-error | Assumption | Cosmetic; can change at implementation without architectural effect |
| A-S4 | No performance target applies (D-09); O(n) filtering per render is adequate for localStorage-sized histories | Assumption | Consistent with D-09 |

Accepted-risk status: assumptions A-S1 to A-S4 and R-07 are confirmed by the user's Stage 2 approval of 2026-11-02 (see Section 13). The approval message did not separately name any other risk as accepted; R-01 to R-06 and R-08 keep the mitigation or disposition stated in the table above.

## 13. Approval Status, Proposed Decisions, and Unresolved Questions

**Approved decisions (approved by the user on 2026-11-02):** PD-01 radio group; PD-02 hide filter on load failure; PD-03 empty messages inside the live region; PD-04 derive view at render time and keep `renderTransactions` signature; PD-05 state-driven radio sync with `autocomplete="off"`.

The two decisions the requirements explicitly left to this stage are **PD-01 (radio group)** and **PD-02 (hide, not disable)**. PD-03 to PD-05 are design details found necessary while meeting the approved requirements; none adds a functional requirement or changes a confirmed decision.

**Confirmed assumptions:** A-S1 to A-S4 and R-07 (Section 12) are confirmed by the user's Stage 2 approval of 2026-11-02.

**Unresolved questions:** None requiring user input to proceed.

**Not done in this stage:** no code, no test changes, no commit, no push, no PR, no change to `workflow-session.json`.

**Approval scope:** this approval covers Stage 2 (Architecture Design) only. There is no approval for Stage 3 (Design Review), any commit, any push, or any pull request; each requires its own explicit human approval.

- Approval status: **APPROVED**
- Approval evidence: user message "approve stage 2", given in reply to the Stage 2 report and relayed by the orchestrator
- Approval date: 2026-11-02

## 14. Requirements-to-Components Traceability

### 14.1 Functional requirements

| ID | Components / decisions | Verified by (test outline) |
|---|---|---|
| FR-001 | C1, C8, PD-01 | Markup test; manual keyboard check |
| FR-002 | C2, C3, C5 | Unit filter (income); integration select Income |
| FR-003 | C2, C3, C5 | Unit filter (expenses); integration select Expenses |
| FR-004 | C3, C5 | Unit filter (all); integration back to All |
| FR-005 | C2, C5, PD-03 | Empty-message integration (both cases) |
| FR-006 | C2, C3 | Type-coverage unit test |
| FR-007 | C3, C4, C5 (no repository call), PD-04 | Write-spy test; no-mutation unit test |
| FR-008 | C1 (`checked`), C4 (`activeFilter="all"`, no persistence), PD-05 | Default and recreate-app tests; markup test |
| FR-009 | C3 (order), C5 (reuses `createTransactionElement`) | Order/presentation tests |
| FR-010 | C5 decision table (single branch per render) | Both-message exclusivity tests |
| FR-011 | C5 via unchanged C7, PD-04 | Add-under-filter tests |
| FR-012 | C5 (`renderHistoryList` excludes balance), PD-04 | Balance-unchanged test |
| FR-013 | C6, C4 guard, PD-02 | Load-failure tests |

### 14.2 Non-functional requirements

| ID | Components / decisions |
|---|---|
| NFR-001 | C1 (fieldset/legend/labels), PD-03 (in-region message), PD-02 (accessibility tree), Section 9 |
| NFR-002 | C5 (`textContent`), Section 7 |
| NFR-003 | C8, PD-01 (wrap), manual 600px check |
| NFR-004 | Section 6 (no deps), C9 (existing suite kept) |
| NFR-005 | C3 (client-side O(n)), PD-04 |
| NFR-006 | Section 7 (no network/logging/storage) |

### 14.3 Acceptance criteria

| ID | Components / decisions |
|---|---|
| AC-001 | C1, PD-01 |
| AC-002 | C2, C3, C5 |
| AC-003 | C3, C5 |
| AC-004 | C5, PD-03 |
| AC-005 | C2, C5, PD-03 |
| AC-006 | C5 decision table, C1 filter stays visible on empty history |
| AC-007 | C1, C4, PD-05 |
| AC-008 | C4, C5 (no storage, no balance on filter path), PD-04 |
| AC-009 | C5 via C7, PD-04 |
| AC-010 | C3, C5 |
| AC-011 | C5 (`textContent`), Section 7 |
| AC-012 | C6, C4 guard, PD-02 |
| AC-013 | C1, PD-01, PD-03, Section 9 |

### 14.4 Business rules

| ID | Components / decisions |
|---|---|
| BR-001 | C2 and C3 (each record falls in exactly one non-all bucket); validated by existing `isStoredTransaction` |
| BR-002 | C4, C5, PD-04 (view-only) |
| BR-003 | C3 and C4 (normalize unknown key to All) |
| BR-004 | C2 (single mapping definition) |

### 14.5 Confirmed decisions from requirements

| ID | Where honored |
|---|---|
| D-01 | C2, C3 |
| D-02 | C1 (labels All / Income / Expenses) |
| D-03 | C2 messages, C5 decision table, PD-03 |
| D-04 | C1, PD-01, PD-05 (default All) |
| D-05 | C5 via C7, PD-04 |
| D-06 | C5, PD-04 |
| D-07 | C6, PD-02 |
| D-08 | C4 (memory only), PD-05, Section 7 |
| D-09 | Section 9, C8; no extra targets introduced |
| D-10 | Honored by omission: no count anywhere, including screen-reader-only text (PD-03 rejected alternative) |
| D-11 | Honored by omission: no documentation changes planned |

### 14.6 Traceability gaps

- None. Every FR, NFR, AC, BR, and D item above maps to at least one component or decision.
- Observed tension (resolved by PD-03, not a gap): AC-013/NFR-001 ask that empty-message changes be announced via the existing live region, but the existing `#empty-state` sits outside that region. PD-03 resolves it for filter-driven messages; the "nothing stored" message intentionally remains where it is because the filter never changes it.
- Items not verifiable by automated tests (announcement, real CSS at 600px, browser form-state restoration) are listed for manual Verification in Section 11 so they are not silently dropped.

## 15. Revision History

| Revision | Date | Summary |
|---|---|---|
| Draft 1 | 2026-11-02 | Initial architecture draft for AG-10 (run AG-10-4). Proposes PD-01 to PD-05. Awaiting human approval. |
| Draft 1 (approved) | 2026-11-02 | Approval recorded only: status, Section 5 intro, Section 12 accepted-risk note, and Section 13 updated. Approved by user message "approve stage 2" (relayed by the orchestrator); PD-01 to PD-05 approved, A-S1 to A-S4 and R-07 confirmed. Design content, IDs, and traceability unchanged. Covers Stage 2 only. |
