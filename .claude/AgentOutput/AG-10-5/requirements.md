# Requirements: AG-10 Filter transactions by type

- Jira issue: AG-10 (Story, Priority Medium, Jira status: To Do)
- Run ID: AG-10-5 (branch `feature/AG-10-5`)
- Artifact status: **Approved** (user, 2026-11-03; see section 11). Not committed.
- Revision: Q1 (filter labels) and Q2 (empty-message wording) confirmed by the user; Q3 and Q4 defaults were accepted by the user on approval.
- Source: Jira AG-10 retrieved via Atlassian MCP on 2026-11-03. Description present; 0 comments; 0 remote links; no linked issues returned. Earlier runs AG-10-1..4 were not used as input.

## 1. Story (confirmed, from Jira)

As a student, I want to filter my transaction history by income or expenses, so that I can quickly review one kind of transaction.

## 2. Acceptance criteria (confirmed, verbatim intent)

| ID | Criterion |
|----|-----------|
| AC-1 | The history has options for **All**, **Income**, and **Expenses**. |
| AC-2 | Selecting an option shows only matching transactions. |
| AC-3 | Selecting **All** shows the full history. |
| AC-4 | If there are no matching transactions, a clear empty message appears. |

Note: the Jira text has stray markdown (`*Expenses*.`, `*All*`); read as formatting typos, not as requirement content.

## 3. Repository context (inspected)

- Plain static app: `index.html`, `script.js` (no framework, no build), `styles.css`, tests in `tests/app.test.cjs` (Node `node:test` with a fake DOM via `vm`).
- Transactions have `type` of `"Expense"` or `"Money Received"` (`TRANSACTION_TYPES`). The word "Income" does not exist in the app today.
- History is rendered by `renderTransactions(transactions, balance)` into `#transaction-history`; existing empty state `#empty-state` reads "No transactions yet. Add one to get started." and is shown only when there are zero transactions in total.
- Balance (`#balance-amount`) is computed from all transactions starting at INR 100.00; load-failure state hides history and balance and shows an error.
- Working tree: only untracked `.claude/AgentOutput/`; branch `feature/AG-10-5`.

## 4. Functional requirements

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| FR-1 | The Transaction history section shall provide a filter control with exactly three options, labelled exactly "All", "Income", "Expenses". | AC-1 | Confirmed (labels confirmed by user, Q1) |
| FR-2 | Selecting "Income" shall display only transactions of stored type "Money Received"; selecting "Expenses" shall display only transactions of stored type "Expense". | AC-2 | Confirmed (mapping confirmed by user, Q1) |
| FR-3 | Selecting "All" shall display every stored transaction. | AC-3 | Confirmed |
| FR-4 | When the selected filter matches no transactions, a filter-specific empty message shall be shown: exactly "No income transactions." for Income and exactly "No expense transactions." for Expenses. These messages are separate from, and shall not replace, the existing "No transactions yet. Add one to get started." message, which remains for a history with zero transactions in total. | AC-4 | Confirmed (wording confirmed by user, Q2) |
| FR-5 | Filtering shall be a view-only operation: it shall not modify, delete, or reorder stored transactions or change localStorage data. | Derived | Assumption (A-2) |
| FR-6 | The available balance shall continue to reflect all transactions regardless of the selected filter. | Derived | User-accepted default (A-3, Q3) |
| FR-7 | The default selection on page load shall be All. | Derived | Assumption (A-5) |
| FR-8 | Adding a transaction while a filter is active shall keep the filter selection and re-render the history under that filter (a newly added non-matching transaction is saved but not shown). | Derived | Assumption (A-6) |

## 5. Non-functional requirements (derived, to be confirmed)

| ID | Requirement |
|----|-------------|
| NFR-1 | Accessibility: the filter control shall be keyboard operable and have an accessible name/label; the result change and empty message shall be announced (history container already uses `aria-live="polite"`). |
| NFR-2 | Security: transaction notes continue to be rendered as text only (no innerHTML); filtering shall not introduce unsafe DOM insertion. |
| NFR-3 | Consistency: follow existing vanilla JS/CSS conventions; no new dependencies. |
| NFR-4 | Load-failure behaviour (error shown, no empty history, no balance) shall be unchanged; the filter shall not show an empty message in that state. |
| NFR-5 | Tests: new behaviour shall be covered in `tests/app.test.cjs` per AC (AC-1..AC-4) plus regression of existing tests. |

## 6. Assumptions and decisions

Confirmed by user:
- C-1 (Q1): Filter labels are exactly "All", "Income", "Expenses" (Jira wording). Income maps to stored type "Money Received"; Expenses maps to stored type "Expense".
- C-2 (Q2): Filter-specific empty messages with the exact strings "No income transactions." and "No expense transactions.", kept separate from "No transactions yet. Add one to get started."

Assumptions not confirmed by Jira (A-3 and A-7 accepted by the user on approval):
- A-2: Filtering does not alter stored data.
- A-3 (user-accepted default, Q3): Balance is computed over all transactions while a filter is active.
- A-5: Default filter is All.
- A-6: The filter persists across adding a transaction within the session.
- A-7 (user-accepted default, Q4): Filter selection is not persisted across page reloads.
- A-8: Control form (select vs radio/segmented buttons) is a design decision, not specified.
- A-9: The existing display order (insertion order) is unchanged.

## 7. Known risks and costs

- R-1 (terminology mismatch, accepted by user via Q1): The filter says "Income"/"Expenses" while the transaction form and stored data use "Money Received"/"Expense". Users may need to infer that Income = Money Received. Cost: the UI vocabulary is inconsistent, and the label-to-type mapping must be implemented and tested explicitly.
- R-2: Q3 and Q4 were resolved by accepting draft defaults (A-3, A-7) rather than by detailed user input; if intent later differs, FR-6 and the persistence behaviour need rework.

## 8. Out of scope (not in Jira)

Filtering by date, amount, or note; search; sorting; persistence of the filter; changes to transaction creation, storage schema, or balance logic.

## 9. Open questions

Resolved (confirmed by user):
- Q1 Labels: "All", "Income", "Expenses"; Income = "Money Received", Expenses = "Expense". Mismatch with form wording recorded as R-1.
- Q2 Empty messages: "No income transactions." and "No expense transactions.", separate from the existing empty-history message.

Resolved (user accepted the draft defaults on approval):
- Q3: Should the balance remain based on all transactions while a filter is active? Accepted: yes (A-3, FR-6).
- Q4: Should the selected filter survive a page reload? Accepted: no (A-7).

## 10. Traceability

| Acceptance criterion | Requirements | Planned verification |
|----------------------|--------------|----------------------|
| AC-1 | FR-1, FR-7, NFR-1 | Markup test: control has exactly the options "All", "Income", "Expenses"; default All |
| AC-2 | FR-2, FR-5, FR-8 | Integration test: Income shows only "Money Received", Expenses shows only "Expense"; storage unchanged |
| AC-3 | FR-3 | Integration test: switching back to All shows full history |
| AC-4 | FR-4, NFR-4 | Integration tests: Income with no matches shows exactly "No income transactions."; Expenses with no matches shows exactly "No expense transactions."; neither uses "No transactions yet. Add one to get started."; empty history still shows the original message; no empty message on load failure |
| (derived) | FR-6, NFR-2, NFR-3, NFR-5 | Balance unchanged test ; literal-text rendering regression; full suite |

## 11. Approval

Status: Approved. Approval evidence: user message in main session, 2026-11-03: "APPROVE, accept defaults for Q3 and Q4". Scope: Stage 1 requirements only; not approval to commit or to start Stage 2. Not committed.
