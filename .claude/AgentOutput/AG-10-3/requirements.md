# Requirements: AG-10 - Filter transactions by type

Run ID: AG-10-3 | Branch: feature/AG-10-3 | Stage 1 status: APPROVED

## 1. Jira Reference

- Issue: AG-10, "Filter transactions by type" (Story, Priority Medium, Status To Do)
- Project: AG (agileGithub). Assignee/reporter: Shivkant Kumar
- Source: Jira via Atlassian MCP (`jira_get_issue`, retrieved this run; fields, comments, changelog, remote links requested)
- Created/updated: 2026-10-15. Comments: none. Changelog: none. Remote links: none. Linked issues: none returned. Attachments/Confluence: Not Found.
- Story: As a student, I want to filter my transaction history by income or expenses, so that I can quickly review one kind of transaction.
- Original acceptance criteria (verbatim intent; Jira markup has some unbalanced asterisks):
  1. History has options for All, Income, Expenses.
  2. Selecting an option shows only matching transactions.
  3. Selecting All shows the full history.
  4. If there are no matching transactions, a clear empty message appears.

## 2. Repository State (current main, inspected)

- Stack: static front end, `index.html` (108 lines), `script.js` (530 lines, vanilla JS), `styles.css`. No `package.json`, no CI config (`.github` absent), no build step.
- Tests: `tests/app.test.cjs`, Node built-in test runner (`node:test`) with `vm` and a hand-written fake DOM.
- Data model: transactions persisted in `localStorage` key `transactions` (schema version 1) via `transactionRepository`; fields include `amountInPaise`, `type`, `date`, optional `note`. Types are `Expense` and `Money Received` (`TRANSACTION_TYPES`).
- History: `renderTransactions()` renders the full list and sets `#empty-state` ("No transactions yet. Add one to get started.") when the list is empty. No filter UI or filter logic exists on main.
- Git history: AG-10 was implemented before on `feature/AG-10-1` (tasks T1-T7, fix M-1, 5 verification tests) and merged by PR #1 (29b7a0a). Commit 5c36761 on main reverted that merge, so main currently contains NO AG-10 implementation. `feature/AG-10-1` (local and origin) still holds that earlier work (head 2570ed5). `feature/AG-10-2` has no commits beyond 4b3bc3a (no unique work). `feature/AG-10-3` is at main (5c36761). No AG-10 workflow artifacts exist in any branch's tree, so earlier requirements/approvals cannot be verified.
- Implication: AG-10-3 is a fresh implementation against current main. The AG-10-1 commits are a reference only; reuse is a Stage 2/4 decision and is not assumed here.
- Untracked file `docs/codemie/analytics/...5be63969....json` is unrelated and must not be touched or committed with this work.

## 3. Business Objective and Scope

Objective: let a student review only income or only expense transactions in the existing history.

In scope: a filter control on the history with All / Income / Expenses; filtering displayed history; empty message when a filter matches nothing.
Out of scope (not stated in Jira; to confirm): changing stored data, balance calculation, search, date or amount filters, sorting, pagination, Jira changes.

## 4. Functional Requirements

- FR-001: The Transaction history section provides a filter with exactly three options: All, Income, Expenses. (Confirmed, AC-001)
- FR-002: Selecting Income shows only income transactions; selecting Expenses shows only expense transactions. (Confirmed, AC-002)
- FR-003: Selecting All shows the full history. (Confirmed, AC-003)
- FR-004: When the selected filter matches no transactions, a clear empty message is shown. (Confirmed, AC-004)
- FR-005: Mapping of labels to stored types: Income = `Money Received`; Expenses = `Expense`. (DECISION D-6, user-confirmed; Jira says "Income" but the app type is `Money Received`)
- FR-006: Filtering affects display only; stored transactions and the Available Balance are unchanged by the filter. (ASSUMPTION A-2)
- FR-007: The selected filter persists across page reloads and is restored on load; default when nothing is stored is All. (DECISION D-1, user-confirmed)
- FR-008: When a non-All filter has no matching transactions, the empty message is "Not found" (DECISION D-2, user-confirmed; exact casing/punctuation as given by user, to be finalized at design). The existing "No transactions yet" message remains for a truly empty history.
- FR-009: When a transaction is added that the active filter would hide, the filter resets to All so the new transaction is visible. (DECISION D-3, user-confirmed)
- FR-010: If the persisted/received filter value is unknown or invalid, a message is displayed to the user (exact wording TBD at design; the resulting displayed list, e.g. fall back to All, is to be confirmed). (DECISION D-4, user-confirmed in principle)

## 5. Non-Functional Requirements

- NFR-001: Accessibility - minimal level (DECISION D-5, user-confirmed): the filter is keyboard operable with an accessible label; changes announced via the existing `aria-live="polite"` history region. No formal WCAG level specified.
- NFR-004: Supported browser: Chrome (DECISION D-5, user-confirmed). Other browsers not required.
- NFR-002: Filtering must not alter or lose persisted data, and must not introduce secrets or network calls. (ASSUMPTION, consistent with existing client-only design)
- NFR-003: Follow existing conventions (vanilla JS, `textContent` rendering, node:test with fake DOM). Performance targets: Not specified in Jira; none assumed.

## 6. Acceptance Criteria (testable)

- AC-001: Given the history, the filter shows options All, Income, Expenses.
- AC-002: Given mixed transactions, selecting Income shows only `Money Received` entries and selecting Expenses shows only `Expense` entries.
- AC-003: Given any filter active, selecting All shows every stored transaction.
- AC-004: Given no transactions of the selected type, a clear empty message is displayed and no transaction items are shown.
- AC-005 (derived from FR-006): After filtering, Available Balance equals the balance computed from all transactions.
- AC-006 (FR-007): On first load with nothing stored the selection is All; after selecting Income or Expenses and reloading, the same selection is restored.
- AC-007 (FR-008): With a non-All filter and no matches, "Not found" is shown.
- AC-008 (FR-009): Adding a transaction hidden by the active filter resets the filter to All and the new transaction is visible.
- AC-009 (FR-010): An unknown stored filter value results in a visible message.

AC-001 to AC-004 come from Jira; AC-005 is derived from assumption A-2; AC-006 to AC-009 come from user clarifications given after the first draft. All need approval.

## 7. Business and Validation Rules

- BR-001: A transaction belongs to exactly one type (Income or Expense); filters are mutually exclusive except All.
- BR-002: Only known filter values (All, Income, Expenses) are accepted; unknown values must not hide data silently (fall back to All or report; Q-4).
- BR-003: Existing validation for adding transactions (amount, type, date) is unchanged.

## 8. Error Scenarios and Edge Cases

- Empty history with All selected: existing "No transactions yet" message remains.
- Empty history with Income/Expenses selected: message must be clear and consistent (Q-2).
- Load failure (storage unavailable or corrupt): existing load-error state takes precedence; no empty/filter message should imply empty history (existing behavior).
- Adding a transaction while a filter hides its type: new entry is saved and counted in the balance but may not be displayed; user feedback behavior unspecified (Q-3). (AG-10-1 added a note for this; not confirmed as a requirement.)
- Filter selection persistence across reloads: required (D-1); storage-unavailable behavior unspecified (Q-10).
- Legacy-migrated data and notes containing HTML: continue to be rendered as text.

## 9. Dependencies and Constraints

- Depends on `transactionRepository`, `renderTransactions`, `#empty-state`, and the DOM stub in `tests/app.test.cjs`.
- The AG-10-1 branch contains prior work touching the same files (conflict/reuse consideration).
- No CI; verification relies on `node --test tests/`.
- Constraints: client-side only; do not modify Jira; unrelated untracked analytics JSON excluded.

## 10. Assumptions (unconfirmed)

- A-2 Filtering is display-only; balance is unaffected.
- A-5 Single-select control (radio group, select, or buttons) - UI form is a design decision for Stage 2.
- A-7 On an unknown filter value, show the "unknown value" message and display All.
- A-6 Earlier AG-10-1 implementation and any approvals are not binding on this run.

## 10a. Decisions (user clarifications, received after first draft; not an approval of the document)

- D-1 Filter selection persists across reloads.
- D-2 Filtered-empty message is "Not found".
- D-3 Adding a hidden transaction resets the filter to All.
- D-4 Unknown filter value: a message is displayed.
- D-5 Minimal accessibility; Chrome only.
- D-6 Income maps to `Money Received`.
- D-7 Clean implementation; AG-10-1 work is not carried over as a requirement (design may still consult it).
- D-8 Jira AC asterisks are cosmetic markup typos.

## 11. Unresolved Questions

- Q-9 (partly resolved, D-9): the message wording is "unknown value" as given by the user (exact casing/punctuation to finalize at design). Which list is displayed alongside is still unspecified; ASSUMPTION A-7: fall back to showing All.
- Q-10 (partly resolved, D-10): the filter is stored in browser `localStorage`. Remaining design detail: key name (separate from the `transactions` key assumed) and behavior if `localStorage` is unavailable (assumed: filter works for the session, defaults to All, no crash).

Resolved since the last draft: Q-11 "Not found" text confirmed (D-11); Q-12 revert reason answered (D-12). No unresolved material questions remain apart from the two design-level details above.

### Decisions D-9 to D-12 (user clarifications)
- D-9: Unknown filter value message reads "unknown value".
- D-10: Persistence uses `localStorage`.
- D-11: "Not found" is the correct empty message.
- D-12: The AG-10-1 merge was reverted so AG-10 could be re-run from a clean state; the revert was not due to a known defect. Consequently this run is a clean implementation.

## 12. Requirements Traceability Matrix

| Requirement | Jira AC / Source | Acceptance Criteria | Status |
|---|---|---|---|
| FR-001 | AC-1 Jira | AC-001 | Confirmed |
| FR-002 | AC-2 Jira | AC-002 | Confirmed |
| FR-003 | AC-3 Jira | AC-003 | Confirmed |
| FR-004 | AC-4 Jira | AC-004 | Confirmed |
| FR-005 | Story wording / D-6 | AC-002 | Decision |
| FR-006 | Inferred | AC-005 | Assumption |
| FR-007 | D-1 | AC-006 | Decision |
| FR-008 | AC-4 Jira / D-2 | AC-004, AC-007 | Decision |
| FR-009 | D-3 | AC-008 | Decision |
| FR-010 | D-4 | AC-009 | Decision (details open, Q-9) |
| NFR-001, NFR-004 | D-5 | AC-001..AC-004 (manual/automated checks) | Decision |
| NFR-002, NFR-003 | Inferred | AC-001..AC-004 | Assumption |

## 13. Approval Status

- Status: APPROVED (Stage 1)
- Approval evidence: user message "approve stage 1" received during the AG-10-3 run, after the revised draft incorporating D-1 to D-12
- Approved by / date: user (Shivkant Kumar), 2026-10-26
- Note: Stage 2 and later stages are not approved. Remaining design-level details (localStorage key, unavailable-storage behavior, list shown with the "unknown value" message) are deferred to Stage 2.
