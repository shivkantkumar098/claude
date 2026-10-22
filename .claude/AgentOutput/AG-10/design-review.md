# Design Review: AG-10 Filter transactions by type

Status: Awaiting Approval (DRAFT, not approved)
Stage: 3 - Design Review
Branch: feature/AG-10-1
Reviewer: design-review-agent (Claude Code). Review only; no source, test, requirements, or architecture file was modified.
Inputs: `requirements.md` (Stage 1, human-approved), `architecture.md` (Stage 2, human-approved with user decisions D-004 and D-005; Q-001..Q-007 defaults in architecture section 11 stand). Approval evidence is in `workflow-session.json`.
Repository files inspected: `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`.

## 1. Verdict

**Approve with conditions.** There are no blockers. The design is small, fits the existing vanilla-JS structure, covers FR-001..FR-004 and EC-001..EC-006, and its claims about existing code are accurate. One Major finding (F-01) and several Minor findings should be carried into the implementation plan as explicit conditions. This verdict is a recommendation; it is not human approval.

## 2. Verification of architecture claims against the repository

| Claim in architecture.md | Result |
|---|---|
| `TRANSACTION_TYPES` at `script.js:3`; `calculateAvailableBalance` at 39; `renderTransactions(nextTransactions, balanceInPaise)` at 387; `renderLoadFailure` at 400; `loadTransactions` calls render at 424; submit handler calls render at 511; module state at 289; `showElement` at 294 | Confirmed |
| `calculateAvailableBalance` is called only with the full list (load l.423, submit l.483) | Confirmed |
| `#empty-state` (`hidden`) and `#transaction-history` (`aria-live="polite"`) at `index.html:100-103`; `.field`/label/select pattern at 33-45 | Confirmed |
| `#transaction-filter` placed outside `<form id="transaction-form">` so `reset()` does not touch it | Confirmed. The history card is a separate `<section>` (index.html:94). Real `form.reset()` affects only form-associated controls. The stub `reset()` only touches `transaction-amount`, `transaction-note`, and `transaction-type` |
| Tests: `ids` list in `createApp` (l.115), HTML-presence list (l.174), `__appTest` export snippet (l.153), `elements["transaction-type"].value = "Expense"` precedent (l.138) | Confirmed |
| Stub `addEventListener` keeps one listener per event name; `dispatch("change")` is usable | Confirmed (`this.listeners[name] = callback`; `dispatch` calls it) |
| Stub supports `.hidden`, `.disabled`, `.value`, `textContent`, `replaceChildren`, `classList.toggle` | Confirmed. `classList` has only `toggle`; new code must not use `classList.add/remove/contains` |
| `renderLoadFailure` hides `#empty-state`, clears history, disables submit | Confirmed. It does not currently touch any filter state; the planned addition is needed |
| Existing tests need no semantic change once the stub is extended | Plausible, Not Verified (nothing was executed in this stage) |

Inaccuracies and stale statements in architecture.md (no factual error about existing code was found):
- Header status still reads "Awaiting Approval (DRAFT, not approved)" and section 12 says "Approval: Pending", although the user approved it (see `workflow-session.json`). Same staleness in `requirements.md`. Housekeeping only; not edited per instructions.
- Section 3.7 and D-004/D-005 are still phrased as "needs user choice / pending"; the user has since decided them.
- Section 3.3 says the filtered-empty wording's source is "the visible filter label". The test stub has no `<option>` elements, so the text cannot be read from DOM labels (see F-05).
- Section 3.5 sketch uses `filter in FILTER_TYPE_BY_KEY`; the doc itself says an own-key check is preferred, but the sketch is incorrect as written (see F-03).

## 3. Requirement coverage

| Requirement | Covered by design? | Notes |
|---|---|---|
| FR-001 / AC-001 (exactly All, Income, Expenses) | Yes | Native labelled select, 3.3 |
| FR-002 / AC-002 | Yes | `FILTER_TYPE_BY_KEY` mapping (A-001), pure function |
| FR-003 / AC-003 | Yes | "all" returns the full list |
| FR-004 / AC-004 | Yes | Separate `#filter-empty-state`, wording per D-005 |
| EC-001 | Yes | Filtered-empty shown only if full list non-empty |
| EC-002 | Yes | `#empty-state` semantics unchanged |
| EC-003 / D-004 | Yes, with gaps | See F-02 (stale success note) |
| EC-004 | Yes | Needs both hide-filter-empty and disable-select in `renderLoadFailure` |
| EC-005 | Yes | Legacy rows are type "Expense" (script.js:182) |
| EC-006 / BR-004 | Yes | Balance computed from full list; filter applied only inside render |
| NFR-001..004 | Yes, with minor gaps | F-04, F-06, F-07 |

## 4. Findings

Severity scale: Blocker (must be fixed before the next stage), Major (should be resolved or explicitly accepted, carry into plan), Minor (improve during planning/implementation), Note (informational). Status for all: Open (not yet verified as addressed).

### Blockers
None.

### Major

**F-01 Possible desync between the select's displayed value and `activeFilter` (Potential risk, not confirmed in a browser)**
- Category: correctness / regression.
- Evidence: Design initialises `activeFilter = "all"` (3.4) and never reads the select at startup; the markup has no `autocomplete="off"`. Browsers (notably Firefox on soft reload, and back/forward navigation) may restore the previous value of form controls, including a `<select>` outside a `<form>`. I did not test this here; it is a known browser behavior that is Not Verified for this app.
- Impact: The select could show "Income" while the list shows All, breaking AC-002/AC-003 and A-004 (session-only, default All). The test stub would not catch this.
- Recommendation: At startup, either force `transactionFilter.value = "all"` before first render, or initialise `activeFilter` from the validated `transactionFilter.value`. Pick one in the plan (forcing "all" matches A-002/A-004). Optionally add `autocomplete="off"` on the select.
- Blocker status: Not a blocker; accept only with this mitigation in the plan. Unblock/closure condition: plan names the chosen startup sync and a test sets `elements["transaction-filter"].value = "expenses"` before app load (or equivalent) to assert the rendered list agrees with the select.

### Minor

**F-02 Stale "hidden by the current filter" note (D-004)**
- Evidence: `saveStatus` is only cleared by `clearSubmissionFeedback()` on the next submit (script.js:443-447). The design does not say what happens to it on filter change.
- Impact: After "Transaction added. It is hidden by the current filter." the user switches to All; the note stays and is now wrong.
- Recommendation: Clear (or hide) `saveStatus` in the filter change handler. Compute the "hidden" condition with the same mapping as the filter (for example, `filterTransactionsByType([transaction], activeFilter).length === 0`) so there is one source of truth. Note that with the form's default type "Expense" after `reset()`, adding under an Income filter will usually hit this path, so it should be tested.

**F-03 Prototype-key hazard in the sketched filter function**
- Evidence: `filter in FILTER_TYPE_BY_KEY` (architecture 3.5) is true for inherited keys such as `"constructor"` or `"toString"`; the filter would then compare against a non-string and return an empty list, contradicting the stated contract (unknown returns full list).
- Impact: Latent only (handler validates), but it undermines the unit contract and any key-validation reuse.
- Recommendation: Make the own-key check mandatory (`Object.hasOwn`, or a `Map`, or `Object.create(null)`), and use the same check in the handler validation. Add a unit test for `"constructor"`/`"toString"`/`undefined`.

**F-04 Live-region reliability of `#filter-empty-state`**
- Evidence: Design uses `<p role="status" hidden>` toggled with text set at render (3.3, 3.9). Live regions that are inserted or un-hidden at the same moment as their content are frequently not announced by screen readers. Not tested here.
- Recommendation: Prefer keeping the element rendered (not `hidden`) and changing its text, or accept the limitation. Also note `#transaction-history` is `aria-live="polite"` and is fully replaced on each filter change, which may cause the full list to be read out; consider whether that is acceptable. Record the decision in the plan; manual screen-reader check is not available in the automated tests.

**F-05 Source of the filtered-empty wording**
- Evidence: Architecture 3.3 says the visible label is the source; the stub has no option nodes, and D-005 fixes the text ("No income transactions found." / "No expense transactions found.").
- Recommendation: Define the wording in a constant map keyed by filter key next to `FILTER_TYPE_BY_KEY` and set it with `textContent`. Do not read it from the DOM.

**F-06 Weak accessible name "Show" for the select**
- Evidence: Label text `Show` (3.3). In a screen-reader control list it reads as "Show, combo box" without context.
- Recommendation: Use a more descriptive label such as "Show transactions" or "Filter by type" (keep the `for`/`id` association). Wording is a plan-level detail; AC-001 constrains only the three options.

**F-07 Error path of the change handler is under-specified**
- Evidence: 3.6 says to show a `setFormError`-style message. `#form-error` lives inside the form card (index.html:86) and is `role="alert"`, far from the history control; `activeFilter` would already have been changed when render fails, so the select and visible list disagree.
- Recommendation: Decide in the plan whether to revert `activeFilter`/select on failure or show an error near the history; at minimum reuse an existing element and test the failure path. Low likelihood (render uses already-validated data), so keep it simple.

**F-08 Disabled-state and re-enable ordering on load failure/retry**
- Evidence: `renderLoadFailure` runs from `loadTransactions`' catch (script.js:430-431); success path sets `repositoryReady`/`saveButton.disabled` after the render (424-427).
- Recommendation: Re-enable the select only after a successful render, in the same place as `saveButton.disabled = false`; disable it in `renderLoadFailure`. Consider also disabling it initially in HTML, mirroring `#save-transaction` (index.html:88). Add a test that after failure then successful retry the select is enabled and the previously chosen filter is still applied consistently (links to F-01).

### Notes

- N-01 Implicit dependency of `renderTransactions` on module state `activeFilter` (architecture R-4). Acceptable and consistent with existing style; no tests export `renderTransactions`, so a third parameter has no test impact either way. Either is fine.
- N-02 Recomputing the balance in the change handler is correct and safe: the same data already passed `calculateAvailableBalance` at load or save, so a new `RangeError` is not expected.
- N-03 Security: new text uses `textContent`; the select value is validated against a fixed key set; no new storage, network, or secrets. No security issue found. The existing literal-text note test is unaffected.
- N-04 CSS: `#empty-state` is styled by ID only (styles.css:125), so `#filter-empty-state` must be added to that rule or given its own. `.hide` is `display:none` while `hidden` relies on the UA style; do not put a `display` rule on a `hidden` element. `.history-filter` reusing `.field` (display:flex) is fine because that container is never hidden.
- N-05 Test plan in architecture section 8 is adequate. Additions recommended: startup sync (F-01), prototype keys (F-03), stale note (F-02), load failure then retry (F-08), and a test that a filter change makes no write to `storage.values` and does not clear form inputs.
- N-06 Repository has no commits and no CI config; the test command (`node --test tests/`) is unverified. Existing risk R-6 stands; resolve at Verification by running and reporting actual output.

## 5. Risk disposition

| Risk | Disposition |
|---|---|
| F-01 | Accept only with the startup-sync mitigation in the plan (condition) |
| F-02..F-08 | Carry into the implementation plan; none block Stage 4 |
| Architecture R-1..R-7 | Adequately mitigated by the design; R-5 now covered by D-004 plus F-02 |
| Unverified | Browser behavior (F-01, F-04); full test-suite pass after changes; accessibility with real assistive technology; nothing was executed in this stage |

## 6. Conditions for the implementation plan

1. Specify the startup sync between select value and `activeFilter` (F-01) and test it.
2. Use an own-key check or Map for the filter mapping and validation (F-03).
3. Clear the "hidden by the current filter" note on filter change and derive it from the shared mapping (F-02).
4. Hold the per-filter empty-state wording in a constant map (F-05).
5. Define the change-handler failure behavior and the disable/re-enable placement (F-07, F-08).
6. Update the test stub and both ID lists first, then add the tests listed in architecture section 8 and N-05.

## 7. Passed review areas vs unverified areas

Passed (verified by reading files): all line/function/ID claims in section 2; requirement coverage; separation of balance from filtered view; form-reset independence; textContent rendering; test stub extension points.
Unverified: runtime behavior in any browser; test execution; screen-reader behavior; that existing tests pass after the change.

## 8. Approval Status

- Stage status: Awaiting Approval
- Approval: Pending
- Approval evidence: None recorded for this stage
- Nothing in this document has been approved by a human. No architecture changes were made; any change to `architecture.md` would require user agreement.
