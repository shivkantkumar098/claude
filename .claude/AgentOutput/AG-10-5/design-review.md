# Design Review: AG-10 Filter transactions by type

- Jira issue: AG-10, run ID AG-10-5, branch `feature/AG-10-5`
- Inputs reviewed: `requirements.md` (Approved), `architecture.md` (Approved, D-1..D-6, Q-A1..Q-A3)
- Repository files inspected: `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`
- Status: **Approved** (user, 2026-11-03; see section 8), with decision 1 still OPEN. Not committed.
- Architecture changes below are PROPOSED only. `architecture.md` has not been modified.

## 1. Verdict

No true blockers. The design is a small, view-only change that fits the existing code. It covers AC-1..AC-4 and FR-1..FR-8. There are 0 Critical, 0 High, 5 Medium and 5 Low findings. All Medium findings are cheap design clarifications. Recommended: fold them into `architecture.md` before planning, or carry them into `impl-plan.md` as explicit constraints. The user chooses.

## 2. Verified architecture claims (passed review areas)

| Claim in architecture.md | Result | Evidence |
|---|---|---|
| `renderTransactions` is called from load, retry and submit | Confirmed | script.js 424 (via `loadTransactions`, also the retry handler), 511 |
| `emptyState.hidden = nextTransactions.length !== 0` | Confirmed | script.js 397 |
| `renderLoadFailure` hides balance and `#empty-state` and clears history | Confirmed | script.js 400-412 |
| Balance is computed from all transactions | Confirmed | script.js 423, 483 |
| Stored types are `"Expense"` / `"Money Received"` and whitelist-validated | Confirmed | script.js 3, 116-124 |
| Notes rendered with `textContent` only | Confirmed | script.js 365-380 |
| Fake DOM: one listener per event name, no `querySelector`/`dataset`, unknown ids return null | Confirmed | tests 48-50, 148 |
| `transactionForm.reset()` does not touch a filter outside the form | Confirmed by design (the filter sits in `.history-card`, outside `<form>`); the fake `reset()` only touches named ids (tests 79-88) | index.html 32-92 |
| Existing empty-state and load-failure tests remain valid if `#empty-state` is untouched | Confirmed | tests 317-330, 421-448 |
| `#empty-state` has no CSS `display`, so the `hidden` attribute works | Confirmed | styles.css 125-128 |
| `.field select` styling is reusable | Partly. It is scoped to `.field` (styles.css 69-95), see F-4 | styles.css |
| CI configuration not found | Not independently re-verified beyond the earlier stage | n/a |

Unverified (not testable at this stage): real-browser/screen-reader announcement behaviour (see F-3); CI.

## 3. Requirement coverage

| Req | Covered by | Assessment |
|---|---|---|
| AC-1 / FR-1 / FR-7 | `#history-filter` select, 3 options, default `all`, label "Show" | Covered |
| AC-2 / FR-2 / FR-5 | `HISTORY_FILTERS` map, pure `filterTransactions`, render-time filtering | Covered |
| AC-3 / FR-3 | `all` returns the full list | Covered |
| AC-4 / FR-4 / NFR-4 | Separate `#filter-empty-state`, exact strings, three render rules | Covered |
| FR-6 | Balance from the full array | Covered |
| FR-8 | Filter state is applied inside `renderTransactions`, so the submit path honours it | Covered |
| NFR-1 | Label, native select, `role="status"` | Covered, with a caveat (F-3) |
| NFR-2 | `textContent`, whitelist map | Covered |
| NFR-3 / NFR-5 | No deps, tests planned | Covered |

## 4. Findings

Severity scale: Critical / High / Medium / Low. "Blocker" means it must be resolved before Stage 4. None are blockers.

### F-1 Hide mechanism for the filter control is unspecified and `hidden` can silently fail
- Severity: Medium. Category: Component boundaries / error handling. Blocker: No (risk, recommend resolving).
- Evidence: Architecture D-5 says "hide (or disable)" the filter on load failure but names no element to hide. A `<label>` plus `<select>` need a wrapper (for example `#history-filter-row`). The codebase uses two hiding mechanisms: the `hidden` attribute (`#empty-state`, `#balance-amount`) and the `.hide` class via `showElement` (errors, retry). `hidden` only works while no author CSS sets `display` on that element. A flex/grid filter row (the "Layout for the filter row" in the styles.css row of the component table) would defeat `hidden`, so the filter would remain visible during load failure.
- Impact: NFR-4 could be violated visibly (filter shown beside the load error) with no test failure, because the fake DOM does not model CSS.
- Recommendation: Specify a wrapper id and use `showElement(wrapper, visible)` / `.hide` (display:none, already global) for the row. Use the `hidden` attribute only on `#filter-empty-state`, which must not receive a `display` rule. State the initial markup state (visible; the script runs synchronously at end of body, so no flash).
- Status: Open. Proposed.

### F-2 Change handler failure can leave select and view out of sync
- Severity: Medium. Category: Error handling. Blocker: No.
- Evidence: The architecture says the handler updates state and then re-renders, and "catches RangeError and leaves the view unchanged". The state `activeHistoryFilter` and the visible select value would already have changed. `renderTransactions` can also throw midway (`formatINR`, `formatTransactionDate`), after `replaceChildren` is already done (script.js 394-395), which leaves a half-rendered view.
- Impact: Displayed filter differs from the displayed list, and later renders (for example an add) apply the new filter anyway. The recalculation RangeError is practically unreachable, since the same transactions passed `calculateAvailableBalance` on load or add. The practical risk is low but the described semantics are inconsistent.
- Recommendation: Specify a commit-after-success order: compute the balance and the filtered list first, then render; on any throw restore the previous `activeHistoryFilter` and `select.value`, and show a message through the existing `formError` (as the submit path does at script.js 515-517). Alternatively drop the RangeError catch and cache the last balance. Document which.
- Status: Open. Proposed.

### F-3 `role="status"` on a toggled-hidden element may not be announced reliably
- Severity: Medium. Category: Accessibility (NFR-1). Blocker: No. Accepted/deferred risk is reasonable.
- Evidence: D-6 puts `role="status"` on `#filter-empty-state`, which is toggled via `hidden`. Live regions are announced most reliably when the region exists in the accessibility tree and its text changes. Revealing an element that was `display:none` is inconsistently announced across screen readers. The architecture itself flags this as "to be validated in review". It is not verifiable here without a browser or screen reader. Separately, `#transaction-history` is `aria-live="polite"` and `replaceChildren` re-announces the whole list on each filter change, which is verbose (existing behaviour, amplified by the filter).
- Impact: Empty message may not be spoken to some screen-reader users (AC-4 satisfied visually, NFR-1 partially).
- Recommendation: Prefer a persistent `role="status"` element that is always rendered, with `textContent` set and cleared (and visually hidden when empty) instead of toggling `hidden`. Record manual screen-reader verification as a Stage 7 not-run item if no tooling is available. Otherwise accept the risk.
- Status: Open. Proposed.

### F-4 Existing `.field select` styles do not apply outside `.field`
- Severity: Medium. Category: Maintainability / integration. Blocker: No.
- Evidence: `.field`, `.field label`, `.field select` rules are descendant selectors (styles.css 69-95). The filter lives in `.history-card`, outside any `.field`. The architecture says "reuse `.field select` look" without saying how.
- Impact: The select renders unstyled or inconsistent, or the implementer duplicates rules.
- Recommendation: Either wrap the label and select in `<div class="field">` (and override the form-grid layout locally if needed), or add a shared selector (for example extend the rule with `.history-filter select`). State the choice in the architecture or plan.
- Status: Open. Proposed.

### F-5 Handler must not depend on `event.target`
- Severity: Medium. Category: Testability. Blocker: No.
- Evidence: The fake `dispatch` creates an event with only `prevented` and `preventDefault` (tests 52-61). There is no `target`/`currentTarget`. Also only one listener per event name is kept (AR-3).
- Impact: A handler written as `event.target.value` would pass in browsers and throw in the test harness, which is a test-authoring trap.
- Recommendation: Specify that the handler reads `historyFilterSelect.value` directly, registers exactly one `change` listener inside a null guard, and that the tests set `elements["history-filter"].value` then call `dispatch("change")`. Also note `createApp` must add the new ids (`history-filter`, the wrapper, `filter-empty-state`) or the elements will be null and the new tests would silently not exercise anything; the markup test must be extended in step.
- Status: Open. Proposed.

### F-6 Internal inconsistency on filter-change before repository ready
- Severity: Low. Category: Documentation consistency. Blocker: No.
- Evidence: Section 7 says a change before ready is "Ignored (state still updated ... or reset to All; see Q-A1)". Q-A1 was resolved as "control is hidden, so the case does not arise". The two are not consistent about whether state is updated.
- Impact: Ambiguous implementation guidance for a case that cannot occur through the UI.
- Recommendation: Replace with one rule: when `!repositoryReady`, the handler returns without changing state (and the select value is irrelevant because the row is hidden).
- Status: Open. Proposed.

### F-7 Filter visibility when the history is empty
- Severity: Low. Category: UX / requirement edge. Blocker: No.
- Evidence: Render rule for total = 0 shows only `#empty-state`; the architecture does not say whether the filter row is shown. A filter over zero transactions has no function.
- Impact: Minor UX noise; either behaviour satisfies AC-1..AC-4 (AC-1 says the history "has options").
- Recommendation: Keep the filter always visible when loaded (simplest, deterministic, matches AC-1). Record this choice.
- Status: Open. Proposed.

### F-8 Implicit module-state dependency in `renderTransactions` (AR-2)
- Severity: Low. Category: Maintainability. Blocker: No. Accept.
- Evidence: Signature stays `(nextTransactions, balanceInPaise)` but reads `activeHistoryFilter`. This matches the existing style of module state (`transactions`, `repositoryReady`).
- Impact: Small hidden coupling; guarantees all three render paths honour the filter, which outweighs it.
- Recommendation: Accept as designed. Keep `filterTransactions` pure and taking the key as a parameter so it stays unit-testable.
- Status: Accepted (recommended).

### F-9 Terminology mismatch and stale status text (R-1, AR-4)
- Severity: Low. Category: Risk. Blocker: No. Already user-accepted (R-1, Q-A3).
- Evidence: UI says Income/Expenses; form and history rows say "Money Received"/"Expense". Filtering "Income" shows rows labelled "Money Received". "Transaction added." may remain after a filter change.
- Impact: Cosmetic/comprehension only.
- Recommendation: No change. Keep the mapping in one constant and test it.
- Status: Accepted (user-accepted earlier).

### F-10 Unknown filter value fallback and O(n) re-render
- Severity: Low. Category: Robustness / scalability. Blocker: No.
- Evidence: Unknown key falls back to All, while a tampered `select.value` would still show the tampered option text. Each change rebuilds the full list.
- Impact: Negligible for a local single-user app.
- Recommendation: Accept. Optionally normalise `select.value` back to `all` when the key is unknown.
- Status: Accepted/deferred.

## 5. Checks by area

| Area | Result |
|---|---|
| Requirement coverage | Passed (all ACs and FRs traced) |
| Component boundaries | Passed with F-1, F-4 |
| Security | Passed: `textContent` only, whitelist map, no new storage, network or secrets; trust boundary unchanged |
| Error handling | Passed with F-2, F-6 |
| Integrations | Passed: repository and balance logic untouched; no external integrations |
| Maintainability | Passed with F-8 |
| Testability | Passed with F-5 |
| Accessibility | Partly verified; F-3 needs manual or screen-reader check |

## 6. Blockers

None. There are no true blockers, so no unblocking condition is defined.

## 7. Decisions needed from the user

1. Fold F-1, F-2, F-4, F-5 and F-6 (Medium and doc-consistency items) into `architecture.md` before Stage 4? Or carry them into `impl-plan.md` as constraints and leave `architecture.md` unchanged? (Recommended: fold into `architecture.md`, then re-review.)
2. F-3: switch to an always-present live region (recommended), or accept the `role="status"` toggle risk and mark screen-reader verification as not-run?
3. F-7: confirm the filter stays visible when the history is empty (recommended).
4. Confirm acceptance of F-8, F-9, F-10.

## 8. Approval

Status: Approved. Approval evidence: user message in main session, 2026-11-03: "approve". Scope: Stage 3 design review only; not approval to change `architecture.md`, to commit, push, or start Stage 4.

The user did not answer decisions 1-4 individually. Their dispositions are therefore recorded as follows.

UNCONFIRMED assumptions (reviewer recommendations adopted from a bare "approve"; the user should confirm or override):
- F-3: use an always-present live region for the filter empty message.
- F-7: the filter stays visible when the history is empty.
- F-8, F-9, F-10: accepted.

OPEN (needs an explicit user answer before Stage 4):
- Decision 1: update `architecture.md` for F-1, F-2, F-4, F-5 and F-6 (reviewer recommendation, needs renewed architecture approval and a re-review), or carry them as constraints in `impl-plan.md` with `architecture.md` unchanged. `architecture.md` has not been modified.

No true blockers exist (section 6).

## 9. Focused re-review of architecture revision 2

Scope: only the changed parts of `architecture.md` revision 2 (Draft, awaiting approval), checked against `requirements.md`, findings F-1..F-10, and the real `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`. No files other than this one were edited; nothing was executed. Section 8 above and its approval evidence are unchanged. This re-review is not approval of revision 2; that approval belongs to the user.

### 9.1 Resolution status of F-1..F-7

| Finding | Status | Check against the repo |
|---|---|---|
| F-1 hide mechanism | Resolved | Wrapper `#history-filter-row` plus `showElement` / `.hide`. `.hide { display:none }` is at styles.css 183, after `.field { display:flex }` (line 69), equal specificity, so `.hide` wins. The fake `classList.toggle` updates `className`, so tests can assert `hide`. See N-3 for a CSS ordering caveat. |
| F-2 commit-after-success | Resolved at design level | Third parameter plus commit-after-success is coherent. Existing call sites (script.js 424, 511) pass two args and stay valid. See N-2 (balance formatting must be part of the build phase). |
| F-3 live region (UNCONFIRMED) | Resolved in design, still unconfirmed by user | Always-present `role="status"` with text set and cleared. Real announcement is not verifiable here (AR-6). See N-4. |
| F-4 styling | Resolved | `.field`, `.field label`, `.field select` (styles.css 69-95) apply to a `div.field` wrapper anywhere. `.field` is `display:flex; column`, so no grid dependency. |
| F-5 `event.target` and ids | Resolved | Handler reads `select.value`, one listener, null guard, new ids added to `createApp` (tests 115-132). The fake `FakeElement.value` defaults to `""`, see N-1. |
| F-6 not-ready rule | Resolved | One rule, consistent between sections 3, 4 and 7. |
| F-7 row visible when empty (UNCONFIRMED) | Resolved in design, still unconfirmed by user | Stated consistently in sections 4, 7 and 11. |

F-8, F-9, F-10 remain Accepted; the revision notes them consistently.

### 9.2 New findings

None are Critical or High. None are blockers.

#### N-1 Select value can diverge from `activeHistoryFilter` at page load
- Severity: Medium. Category: Correctness / integration. Blocker: No (recommend resolving in the plan).
- Evidence: `activeHistoryFilter` is in-memory and starts as `"all"` (FR-7, A-7). The `<select>` lives outside `<form>`. Browsers (notably Firefox, on soft reload and history navigation) may restore a previous `<select>` value from form-state restoration, and the script runs `loadTransactions` with `"all"`. The architecture says nothing about initial sync. In the fake DOM, `value` defaults to `""`, which is not a valid key, so tests also need a defined start value.
- Impact: The control can show "Income" while the list shows All, violating AC-1 (default All) and FR-7 with no test failure.
- Recommendation: Add `autocomplete="off"` to the select (as the amount input already does) and/or set `historyFilterSelect.value = activeHistoryFilter` once at init before the first render. In `createApp`, set `elements["history-filter"].value = "all"`.
- Status: Open. Proposed. Risk, not blocker.

#### N-2 Build-then-swap must include the balance string
- Severity: Low. Category: Error handling. Blocker: No.
- Evidence: Today `formatINR(balanceInPaise)` runs at script.js 395, after `replaceChildren` (394). Revision 2 says the list and message are built before mutating the DOM, but does not name the balance text. `formatINR` can throw `RangeError`.
- Impact: If left in place, a throw leaves the new list with the old balance, which weakens the "previous view intact" guarantee in sections 6 and 7.
- Recommendation: In the plan, compute `formatINR(balanceInPaise)` in the build phase and perform all DOM assignments (list swap, balance, `#empty-state.hidden`, filter message, wrapper show) only after every throwing call has completed.
- Status: Open. Proposed.

#### N-3 CSS cascade caveats for the wrapper and the live region
- Severity: Low. Category: Maintainability. Blocker: No.
- Evidence: `.hide` is the last rule in styles.css (line 183). A new `.history-filter { display:... }` rule placed after it, or any later rule with equal or higher specificity, would defeat `.hide` (the same failure class as F-1). Separately, `:empty` does not match an element that contains whitespace, so the markup must be exactly `<p id="filter-empty-state" role="status"></p>` with no inner whitespace or newline (the existing `#empty-state` is formatted across lines, which is a copy trap).
- Impact: Wrapper might not hide on load failure, or the empty region keeps its spacing. Neither is detectable in the fake DOM.
- Recommendation: Plan constraint: no `display` declaration on `.history-filter` (use margins only), or place any such rule before `.hide`; write the live region with no inner whitespace. Cover the wrapper `hide` class by test and the CSS by manual check.
- Status: Open. Proposed.

#### N-4 Live region test and double-announcement limits
- Severity: Low. Category: Accessibility / testability. Blocker: No. Accept.
- Evidence: The always-present region cannot be validated for announcement or `:empty` styling in the fake DOM. `#transaction-history` is also `aria-live="polite"`, so a filter change may announce both the list and the status message. AR-6 already records this.
- Impact: Possible verbosity; announcement behaviour unverified.
- Recommendation: Accept; keep manual screen-reader verification as a Stage 7 not-run item. Tests assert only `textContent` set or cleared and the `role` attribute in markup.
- Status: Accepted (recommended).

#### N-5 Filter-failure message can go stale
- Severity: Low. Category: UX / error handling. Blocker: No.
- Evidence: The failure message uses `formError` (a form-area `role="alert"`), which is cleared only by the next submit (script.js 443-447). A later successful filter change does not clear it, and the filter control is physically distant from the form.
- Impact: A stale error may remain next to the form after the filter works again. Practically hard to trigger.
- Recommendation: Either clear `formError` on a successful filter change only when the handler set it (track with a local flag), or accept it as cosmetic like AR-4. Decide with the AR-7 wording at planning.
- Status: Open (deferrable).

### 9.3 Check of the specifically requested items

- `renderTransactions` third parameter: sound. The default keeps existing calls valid; only the handler overrides it. AR-2 is correctly revised. The unknown-key empty message is covered because the handler normalises first.
- Commit-after-success handler: consistent with the submit path pattern (script.js 515-517) and with section 7. Subject to N-2.
- Always-present `role="status"` plus `:empty`: valid design; subject to N-3.
- Wrapper hide through `.hide` / `showElement`: correct and verified against styles.css; the show-after-success step is placed in "successful render / retry path" without naming the function. Recommend putting it inside `renderTransactions`' final assignment phase so load, retry and add all restore it and a throw never leaves it half-updated.
- Fake-DOM implications: workable. `getElementById` returns null for unlisted ids, so the three new ids must be added; the fake select starts at `""` (N-1); wrapper visibility is assertable via `className` containing `hide`; `:empty` and announcements are not testable.
- AR-7 (formError wording): acceptable as an open item for planning. It is not user-confirmed wording and does not block approval.

### 9.4 Blockers versus risks

- True blockers: none. No unblocking condition is required.
- Risks to carry into `impl-plan.md` as constraints: N-1 (recommended), N-2, N-3, N-5; accepted: N-4, AR-6.
- Still needing user answers (not blockers): confirm or override F-3 and F-7 (UNCONFIRMED), AR-7 wording, and approve revision 2.

### 9.5 Re-review verdict

Revision 2 resolves F-1..F-7 and is consistent with AC-1..AC-4 and FR-1..FR-8. It introduces no blockers. One Medium risk (N-1) and four Low items (N-2..N-5) are new; none require an architecture change before approval, and all can be folded into the plan as constraints, or into `architecture.md` if the user prefers. Revision 2 is not approved by this review; no approval is recorded.

### 9.6 Approval of the focused re-review

Status: Approved (focused re-review and architecture revision 2). Approval evidence: User message in main session, 2026-11-03: "Approve al" (truncated; orchestrator interpretation: approves architecture.md revision 2, the focused re-review, F-3 and F-7 as recommended, N-1/N-2/N-3/N-5 as impl-plan constraints, N-4 accepted with manual screen-reader check recorded as a Stage 7 not-run item; AR-7 formError wording deferred to planning). The message is ambiguous, so it is NOT authorization to commit, push, or start Stage 4. The original Section 8 approval text is unchanged. Dispositions: F-3 and F-7 confirmed as recommended; N-1, N-2, N-3, N-5 become implementation-plan constraints; N-4 accepted (manual screen-reader check is a Stage 7 not-run item); AR-7 open.
