# Design Review: AG-10 - Filter transactions by type

Run ID: AG-10-3 | Branch: feature/AG-10-3 | Stage 3 status: AWAITING HUMAN APPROVAL
Reviewed: `.claude/AgentOutput/AG-10-3/architecture.md` against `requirements.md` and the repository files `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs` (all read this run).

## 1. Verdict

APPROVE WITH CHANGES.

The architecture is sound, minimal and consistent with repo conventions. Requirement coverage is complete (every FR/NFR/AC maps to a component and a test). No Critical findings. There is one High finding (F-1) and three Medium findings (F-2, F-3, F-4) that need an explicit design resolution before Stage 4 planning. None needs a requirements change. `architecture.md` was NOT edited in this review (per instruction); the required changes in section 5 should be folded into it, or carried into `impl-plan.md`, only with the user's agreement.

## 2. Findings

Legend: Confirmed = verified in the code or artifacts. Potential = a risk depending on implementation.

### F-1 High (Confirmed) - Filter change during load failure breaks the load-error state
- Category: Correctness / edge case.
- Evidence: Architecture section 4 (AS-5) leaves the select visible and says "inert behavior is acceptable". But `applyFilter` calls `renderTransactions`, and the current `renderTransactions` (script.js:387-398) unconditionally sets `balanceAmount.hidden = false` and `emptyState.hidden = (list length !== 0)`. After `renderLoadFailure` (script.js:400-412), `transactions` is `[]`. A filter change would therefore show "No transactions yet" and a fabricated INR 100.00 balance beside the load error. That violates the existing contract ("No empty history is being shown") and the requirement's "load-error takes precedence".
- Impact: A user can make the app show a false empty history and wrong balance after a storage failure. This is a data-trust regression.
- Recommendation: `applyFilter`/the `change` handler must not render unless `repositoryReady` is true. Preferably also set `filterSelect.disabled = true` in `renderLoadFailure` and enable it on a successful load. Add a test (failReads, then change filter: empty-state stays hidden, balance stays hidden).
- Status: Open. Blocker for Stage 4 sign-off of the design, resolved by the change in section 5 (R-1). It is not a requirements blocker.

### F-2 Medium (Confirmed) - `applyFilter` render semantics conflict with the submit flow (FR-009)
- Category: Data flow / error handling.
- Evidence: C4 says `applyFilter` "re-renders". C9 calls `applyFilter("all")` after save and "then render the full list". In the current handler (script.js:507-518) `transactions` is assigned before render, and render failure is handled in a dedicated try/catch ("saved, but the history could not refresh"). If `applyFilter` renders internally (a) the module `transactions` must already be updated or it will render a stale list, (b) a render exception occurs outside the existing try/catch, and (c) there are two renders per add. Also `applyFilter` would need the new balance; architecture says it uses "balanceOfAll" without saying where it comes from, and `calculateAvailableBalance` can throw RangeError (script.js:47) inside a `change` handler with no catch.
- Impact: Stale or doubled render, or an uncaught exception on a filter change or add.
- Recommendation: Split state from rendering: `setActiveFilter(value, {persist})` only updates `activeFilter`, the select value and storage (never throws, never renders). Callers render. In submit, call `setActiveFilter("all")` after `transactions = updatedTransactions` and before the existing guarded `renderTransactions`. Keep the last computed balance in a module variable (or recompute inside try/catch) for the `change` path. Do not reset the filter when `save` fails (add a test).
- Status: Open.

### F-3 Medium (Potential) - Announcement of "Not found" / "unknown value" is not reliably delivered
- Category: Accessibility (NFR-001, minimal).
- Evidence: AS-6 states `role="status"` is used "instead of relying on `hidden` toggling alone", yet C6/C7 are still `<p hidden>` that are un-hidden with text already present. Live regions are generally announced only when content changes inside an already-present region; toggling visibility of a pre-filled element is unreliable. In addition, `#transaction-history` is `aria-live="polite"` and is fully replaced (`replaceChildren`) on every filter change, so assistive tech may read the whole list each time. The existing `#empty-state` has the same pattern but is outside the new requirement.
- Impact: Screen-reader users may not hear the empty or unknown-value message. Given the "minimal, Chrome" decision (D-5) this is not a blocker; keyboard operation and the label are met.
- Recommendation: Make the two message elements permanent `role="status"` containers that are always present and not `hidden`, with empty text by default; set `textContent` to "Not found" / "unknown value" and clear it to hide. (Empty paragraphs need no `hidden`.) Treat announcement as manual-check-only in Chrome and report it as not run unless executed.
- Status: Open; may be accepted as a limitation if the user prefers the current approach.

### F-4 Medium (Confirmed ambiguity) - Empty history with a non-All filter: AC-007 vs architecture
- Category: Requirement interpretation.
- Evidence: AC-007: "With a non-All filter and no matches, 'Not found' is shown". Architecture C5 shows "No transactions yet" when the whole history is empty, regardless of filter, and "Not found" only when the history is non-empty but the filtered list is empty. FR-008 and requirements section 8 support this reading, but section 8 also flags Q-2 for the empty-history + Income case, and the Stage 2 defaults list (AS-1..AS-6) does not mention this choice explicitly.
- Impact: Possible mismatch with the user's expectation. Low implementation cost either way.
- Recommendation: State the interpretation as an explicit assumption (AS-7) in the architecture and add a test for empty history + Income/Expenses (expect "No transactions yet", not "Not found"). Ask the user to confirm at this approval step.
- Status: Open; risk acceptable if confirmed.

### F-5 Low (Confirmed) - Filter restore on every `loadTransactions` call
- Evidence: C8 restores the filter inside `loadTransactions`, which also runs on Retry. If a storage write had failed earlier, the in-memory selection would be overwritten by the stored/default value on retry. An unknown-value message from the first load would also be re-evaluated (the stored value was overwritten with `all`, so the message would silently disappear).
- Recommendation: Read the stored preference once at startup (before the first `loadTransactions`), not on retry. Also state that an empty string stored value is treated as unknown.
- Status: Open, low impact.

### F-6 Low (Potential) - Testability constraints of the fake DOM
- Evidence (tests/app.test.cjs): `getElementById` returns `null` for unlisted ids (line 148); `classList` only implements `toggle` (lines 35-45); `dispatch(name)` passes an event without `target` (lines 52-61); storage fake has no `removeItem` and `failReads`/`failWrites` apply to all keys (lines 95-112); `reset()` only resets known ids (79-88).
- Recommendation: App code must read `filterSelect.value` (not `event.target.value`), use `hidden`/`textContent` (not `classList.add/contains`), null-guard new elements, and never call `removeItem`. Tests must add the three new ids to both id lists and extend the storage fake with a per-key failure option (already noted in architecture section 7). Assert observable DOM state, not `activeFilter`.
- Status: Open; guidance for Stage 4.

### F-7 Low (Confirmed) - Housekeeping in architecture.md
- Evidence: Status still reads "DRAFT, awaiting human approval" (lines 3, 159) while workflow-session.json records Stage 2 approved; `hidden` on new `<p>` elements relies on no CSS `display` rule overriding it (C10 adds styles; do not set `display` on those ids).
- Recommendation: Update status text when architecture is finalized; avoid `display` rules on `[hidden]` message elements.
- Status: Open, cosmetic.

## 3. Areas Reviewed with No Blocking Finding (Passed)

- Requirement coverage and traceability: all FR-001..FR-010, NFR-001..004 and AC-001..AC-009 map to components and tests (architecture section 11). Passed.
- Data integrity: filter is display-only, uses a separate localStorage key, `transactionRepository` and the envelope are untouched; stored-envelope-unchanged test planned. Passed.
- Balance: computed from the full list in all paths (FR-006). Passed, subject to F-2 for the `change` path.
- Security/XSS: closed allow-list validation, `Object.hasOwn`, `textContent` only, no `innerHTML`, no network or secrets. Stored filter value is never rendered as HTML (the message is fixed text). Passed.
- Unknown stored value: falls back to All with a fixed message; add-while-hidden reset only after successful save. Passed (see F-2, F-5 for details).
- Storage failures for the preference: swallowed in the isolated C3 including `window.localStorage` access; no impact on the transaction load error flow. Passed, provided C3 also wraps the `window.localStorage` getter.
- Regression risk: `renderTransactions` keeps its two-argument signature; existing tests use the default All filter. Low, given F-1/F-2 handling.
- Maintainability: small, pure helpers, a single mapping source. Passed.

## 4. Not Verified

- Runtime behavior in Chrome, keyboard operation and screen-reader announcement (no implementation yet; manual checks only).
- No tests were executed in this review (design-only stage); `node --test tests/` has not been run for this stage.
- Jira was not accessed. Provenance of decisions D-1..D-12 is as recorded in requirements.md and workflow-session.json and was not independently verified.

## 5. Required Changes (to resolve before or in Stage 4 planning, subject to user agreement)

- R-1 (F-1): No render, balance or empty-state change from a filter event unless `repositoryReady`; disable the select while load has failed. Add test.
- R-2 (F-2): Separate `setActiveFilter` (state/persist, no render, never throws) from rendering; define the balance source for the `change` path; sequence the add-flow reset after `transactions` assignment and before the guarded render; no reset on save failure.
- R-3 (F-4): Record the empty-history + non-All interpretation as an explicit assumption and add a test; request user confirmation.
- R-4 (F-3): Either adopt always-present `role="status"` message containers or record the announcement limitation as accepted.
- Optional (F-5, F-6, F-7): restore preference once at startup; follow fake-DOM constraints; tidy status text.

## 6. Risk Decisions

- Accepted or deferrable if the user agrees: F-3 (announcement reliability), F-5, F-6, F-7.
- Not to be silently accepted: F-1, F-2 (correctness); F-4 needs a user confirmation.
- No new requirement or approved-decision change is proposed. No decision is attributed to the user by this review.

## 7. Approval Status

- Status: AWAITING HUMAN APPROVAL of Stage 3. No approval evidence recorded here.
- Stage 4 and later are not approved.
