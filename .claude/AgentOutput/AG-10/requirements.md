# Requirements: AG-10 Filter transactions by type

Status: Awaiting Approval (DRAFT, not approved)
Stage: 1 - Requirements Analysis
Branch: feature/AG-10-1

## 1. Jira Reference

| Field | Value |
|---|---|
| Issue key | AG-10 |
| Title | Filter transactions by type |
| Type / Priority / Status | Story / Medium / To Do |
| Source | Jira (https://shivkantkr.atlassian.net/browse/AG-10), retrieved live by the orchestrator via Atlassian MCP |
| Comments / linked issues | None |
| Reviewed | Summary, description, acceptance criteria. No Confluence or other documents were referenced. |

Note: The Jira text contains stray markdown asterisks. This is a formatting glitch and is not treated as a requirement.

Story: As a student, I want to filter my transaction history by income or expenses, so that I can quickly review one kind of transaction.

## 2. Business Objective and Scope

Objective: Let a student quickly review only one kind of transaction (income or expense) in the transaction history.

In scope:
- A filter control on the transaction history with three options.
- Filtering of the displayed history by transaction type.
- An empty-result message when nothing matches.

Out of scope (not stated in Jira; to be confirmed, see Q-005 to Q-007):
- Filtering by date, amount, or note; text search; sorting.
- Changes to how transactions are added, stored, or validated.
- Changes to the available balance calculation.
- Persisting the selected filter across reloads.

## 3. Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| FR-001 | The transaction history section shall offer a filter with exactly three options: All, Income, Expenses. | AC-001 |
| FR-002 | When Income or Expenses is selected, the history shall show only transactions of the matching type. | AC-002 |
| FR-003 | When All is selected, the history shall show the full transaction history. | AC-003 |
| FR-004 | When the selected filter yields no transactions, the history shall show a clear empty-state message. | AC-004 |

## 4. Acceptance Criteria (from Jira, verbatim intent)

- AC-001: The transaction history has filter options All, Income, and Expenses.
- AC-002: Selecting an option shows only matching transactions.
- AC-003: Selecting All shows the full history.
- AC-004: If there are no matching transactions, a clear empty message appears.

## 5. Business and Validation Rules

- BR-001 (Confirmed, AC-002): A transaction matches Income or Expenses based on its type.
- BR-002 (Assumption A-001): "Income" maps to the existing type "Money Received", and "Expenses" maps to the existing type "Expense".
- BR-003 (Assumption A-002): The default selection on load is All.
- BR-004 (Assumption A-003): Filtering is a display-only operation. It does not alter stored transactions or the available balance.

## 6. Non-Functional Requirements

No non-functional targets are specified in Jira. Targets are Not Found and are not invented. Notes for the later stages, derived from existing repo conventions (not Jira):

- NFR-001 (Proposed, needs confirmation) Accessibility: the filter control should have an accessible label and be keyboard operable, consistent with the existing labelled form controls and `aria-live` history region. No measurable target specified.
- NFR-002 (Proposed) Security: any new text rendered must use `textContent` (the existing code renders notes as literal text; an existing test covers this). No new data or storage is expected.
- NFR-003 (Proposed) Performance: no target specified. History is a small, client-side, in-memory list.
- NFR-004 (Proposed) Testability: new behavior should be covered by tests in the existing `node:test` style.

## 7. Error Scenarios and Edge Cases

- EC-001: Filter yields no results while other transactions exist (for example Income selected, only expenses stored). Show the filtered empty message (FR-004).
- EC-002: No transactions exist at all. The existing message "No transactions yet. Add one to get started." applies. Whether a filtered empty message differs from it is Q-002.
- EC-003: A transaction is added while a filter is active. Whether it is shown depends on its type matching the filter; the current rendering would need to respect the active filter (Q-004).
- EC-004: Load failure (corrupt or unreadable storage). The existing code deliberately hides the empty state and shows an error plus retry. The filter must not cause an empty message to be shown in this state (existing behavior; confirm).
- EC-005: Legacy-migrated transactions are all type "Expense" and must be filterable as Expenses.
- EC-006: Selecting a filter should not affect the balance (A-003).

## 8. Repository Findings (relevant to requirements)

Inspected: `index.html`, `script.js`, `styles.css`, `tests/app.test.cjs`, `docs/`. Git: branch `feature/AG-10-1`, no commits, all files untracked. No `package.json`.

- Stack: Static vanilla HTML, CSS, and JavaScript (no framework, no build system). Data persisted in browser `localStorage` under key `transactions` (schemaVersion 1).
- Transaction model: `{ id, type, amountInPaise, date (YYYY-MM-DD), note? }`. `TRANSACTION_TYPES = ["Expense", "Money Received"]`. Type is the only income/expense discriminator.
- Terminology mismatch: UI and data say "Money Received" and "Expense"; Jira says "Income" and "Expenses" (Q-001).
- History rendering: `renderTransactions(nextTransactions, balanceInPaise)` rebuilds `#transaction-history` from the full list in stored order (oldest first, appended on add), updates the balance, and toggles `#empty-state`. It is called on load and after each save. There is no existing filter state or control.
- Existing empty state: `<p id="empty-state" hidden>No transactions yet. Add one to get started.</p>`, shown only when the list is empty. This message would be misleading for a filtered empty result.
- Balance: `calculateAvailableBalance` starts from INR 100 and uses all transactions. It must continue to use the full list.
- Existing form `<select id="transaction-type">` offers "Expense" and "Money Received" and is a style/label precedent.
- Tests: Node built-in `node:test` in `tests/app.test.cjs`, with `node:vm` and a hand-written `FakeElement` DOM stub (supports `addEventListener`, `dispatch`, `append`, `replaceChildren`, `classList.toggle`). Required element IDs are enumerated in two lists (HTML check and `createApp`). Any new element used by `script.js` must be added to the stub, otherwise `getElementById` returns null. No CI configuration found. Test run command not documented (assumed `node --test tests/`; Not Verified).
- Conventions: `showElement` + `hide` class for toggling, `hidden` attribute for some elements, `aria-live` regions, `textContent` rendering.

## 9. Dependencies and Constraints

- Depends on the existing transaction model and `renderTransactions` flow.
- Must not change the storage schema, the balance calculation, or the add-transaction behavior (inferred; confirm in Q-005).
- Existing tests must continue to pass; the test DOM stub will need extension for any new element.
- Constraint: Jira provides no UI design, so control type (select, radio, buttons) is a design decision for Stage 2 unless specified by the user.

## 10. Assumptions (not confirmed by Jira)

- A-001: "Income" corresponds to type "Money Received" and "Expenses" to type "Expense". The visible labels in the new filter use the Jira wording (All, Income, Expenses).
- A-002: Default selection on page load is All.
- A-003: Filtering affects only the displayed list. Balance and storage are unaffected.
- A-004: The filter state is session-only (in memory); it is not persisted across reloads.
- A-005: Display order within the filtered list is unchanged from the current order.
- A-006: The filter applies immediately on selection (no separate apply button).

## 11. Missing or Conflicting Requirements

- Conflict/terminology: Jira says Income/Expenses; the app says Money Received/Expense (Q-001).
- Missing: wording of the empty message (AC-004 says only "clear").
- Missing: behavior when a transaction is added while a filter is active.
- Missing: control type and placement, and accessibility expectations.
- Missing: whether the filtered empty state differs from the existing "No transactions yet" state.
- Untestable as written: "clear empty message" has no exact text; proposed testable form is a message naming the filter, for example "No income transactions found." (pending Q-002).

## 12. Unresolved Questions

- Q-001: Should the new filter's labels be exactly "All / Income / Expenses" (Jira), or should the app's "Money Received" wording be used? (A-001 assumes Jira labels with a mapping.)
- Q-002: What exact empty-message text is wanted for each filter (Income and Expenses), and should it differ from the existing "No transactions yet. Add one to get started." text when there are no transactions at all?
- Q-003: Should the default filter be All on load? (A-002)
- Q-004: When a transaction is added while a filter is active, should the active filter stay applied (new item shown only if it matches), or should the filter reset to All?
- Q-005: Should the balance remain based on all transactions regardless of the filter? (A-003)
- Q-006: Should the selected filter persist across page reloads? (A-004)
- Q-007: Is any other filtering or sorting (date, amount) expected? Assumed out of scope.

## 13. Requirements Traceability Matrix

| AC | Requirement | Business rule | Edge cases | Notes |
|---|---|---|---|---|
| AC-001 | FR-001 | BR-002, BR-003 | - | NFR-001 |
| AC-002 | FR-002 | BR-001, BR-002, BR-004 | EC-003, EC-005, EC-006 | |
| AC-003 | FR-003 | BR-004 | EC-006 | |
| AC-004 | FR-004 | - | EC-001, EC-002, EC-004 | Message text Q-002 |

NFR-001 to NFR-004 are proposed from repo conventions and are not traceable to a Jira AC.

## 14. Approval Status

- Stage status: Awaiting Approval
- Approval: Pending
- Approval evidence: None recorded
- Nothing in this document has been approved by a human.
