# Requirements: AG-10 - Filter transactions by type

- Run ID: AG-10-4 (fresh run; branch `feature/AG-10-4`, based on `main` at 5c36761)
- Stage: 1 - Requirements Analysis
- Revision: 2 (2026-11-02) - incorporates user decisions on Q-01 to Q-11
- **Status: APPROVED (revision 2)** - approved by the user on 2026-11-02 (see Section 15). Approval covers Stage 1 only.
- Note: the user's answers to the open questions are recorded as Confirmed Decisions (Section 10). The document was subsequently approved by the user (Section 15).

## 1. Jira Reference

| Item | Value |
|---|---|
| Issue key | AG-10 |
| Title | Filter transactions by type |
| Type / Priority / Status | Story / Medium / To Do |
| Project | AG (agileGithub) |
| URL | https://shivkantkr.atlassian.net/browse/AG-10 |
| Created / Updated | 2026-10-15 (both) |
| Source actually retrieved | Atlassian MCP `jira_get_issue` (all fields, comments, remote links) - retrieval succeeded in this run (draft 1) |
| Comments | None (0 returned) |
| Linked issues / remote links | None (0 returned); issue-link and sub-task fields were not present in the response. Treated as Not Found |
| Attachments / Confluence pages | Not Found |
| Prior-run artifacts | Not used. Earlier runs (AG-10-1 merged then reverted; AG-10-3 open PR #2) are untrusted input and were not read; nothing here is inherited from them |

Source story text (verbatim from Jira, formatting typos preserved):

> **As a** student, **I want** to filter my transaction history by income or expenses, **so that** I can quickly review one kind of transaction.
>
> Acceptance criteria
> - The history has options for **All**, **Income**, and **Expenses**.
> - Selecting an option shows only matching transactions.
> - Selecting **All** shows the full history.
> - If there are no matching transactions, a clear empty message appears.

Note: the Jira markup has unbalanced asterisks around "Expenses" and "All" in two bullets; the intended labels are All / Income / Expenses, which the user confirmed as the filter labels (D-02).

## 2. Existing Repository Findings (inspected in this run)

- Stack: static, dependency-free web app - `index.html`, `script.js` (vanilla JS, no modules, no bundler), `styles.css`. No `package.json`, no `.github` CI configuration, no build system found.
- Product: "Vidyarthi Khataa" - records transactions of type `Expense` or `Money Received`, amount in INR stored as integer paise, date, optional note; shows an available balance (opening balance 10,000 paise = INR 100 plus signed sum).
- Data: transactions persisted in `localStorage` key `transactions` as `{schemaVersion: 1, transactions: [...]}`; each record has `id`, `type` (`Expense` | `Money Received`), `amountInPaise`, `date` (YYYY-MM-DD), optional `note`. Legacy `expenses` key is migrated to `Expense` records.
- History UI: section `#history-heading` ("Transaction history") contains `#load-error`, `#retry-load`, `#empty-state` (text "No transactions yet. Add one to get started."), and `#transaction-history` (`aria-live="polite"`). `renderTransactions(list, balance)` rebuilds the list in stored (insertion) order, updates the balance, and shows `#empty-state` only when the list is empty. `renderLoadFailure` hides balance and empty state and disables saving.
- Conventions: UI built with `createElement`/`textContent` (no `innerHTML`); `.hide` class and `hidden` attribute used for visibility; errors/status use `role="alert"`/`role="status"`/`aria-live`; labelled form controls (`<label for>` + `<select>`); simple card/section CSS with a 600px responsive breakpoint.
- Tests: `tests/app.test.cjs` (Node built-in `node:test` + `node:vm` with hand-written fake DOM; 15 tests, unit + integration). It reads `index.html` and `script.js` directly and asserts required controls exist. Run command is presumably `node --test tests/` (not executed in this stage).
- Docs: no README or feature documentation; `docs/` contains only CodeMie analytics JSON files.
- Git: working tree on `feature/AG-10-4`; only untracked item is `.claude/AgentOutput/`. No filter feature is present on this branch (reverted on `main`).

## 3. Business Objective and Scope

**Objective (confirmed):** let a student review only income or only expense transactions from their transaction history, so that one kind of transaction can be reviewed quickly.

**In scope (confirmed from the story):**
- A filter on the transaction history with options All, Income, Expenses.
- Showing only matching transactions for the selected option; All shows the full history.
- A clear empty message when the selected filter has no matching transactions.

**In scope (confirmed by user decision, Section 10):** type mapping (D-01), filter labels (D-02), separate empty messages (D-03), labelled single-choice control defaulting to All (D-04), behavior when adding a transaction under an active filter (D-05), balance unaffected by the filter (D-06), behavior on load failure (D-07).

**Out of scope (confirmed by user decision unless noted):**
- Persisting the selected filter across reloads or any new storage / schema change (D-08).
- Showing a count of matching items (D-10).
- Documentation updates (README or user docs; none exist) (D-11).
- Accessibility or performance targets beyond existing conventions (D-09).
- Filtering by date, amount, note text, or any criterion other than type (not requested in the story).
- Searching, sorting, pagination, or grouping (not requested in the story).
- Changes to how transactions are added, validated, stored, or migrated (not requested in the story).
- Changing the available-balance calculation (D-06).
- Backend/server, authentication, export (not requested in the story).
- Modifying Jira or other systems.

## 4. Functional Requirements

| ID | Requirement | Basis |
|---|---|---|
| FR-001 | The transaction history section shall present a labelled, keyboard-operable single-choice filter control offering exactly three options, labelled All, Income, and Expenses. A radio group is preferred (all three options visible at once); a labelled select is acceptable; the final control choice may be settled in architecture. | Confirmed (story AC-1; D-02, D-04) |
| FR-002 | When Income is selected, the history shall display only transactions that are income transactions, and no others. | Confirmed (story AC-2) |
| FR-003 | When Expenses is selected, the history shall display only expense transactions, and no others. | Confirmed (story AC-2) |
| FR-004 | When All is selected, the history shall display the full history (every stored transaction). | Confirmed (story AC-3) |
| FR-005 | When the selected option matches no transactions while transactions exist, the history shall display a clear empty message and no transaction items. Income shall show "No income transactions found."; Expenses shall show "No expense transactions found.". | Confirmed (story AC-4; D-03) |
| FR-006 | "Income" shall correspond to transactions of stored type `Money Received`, and "Expenses" to stored type `Expense`. These are the only two stored types, so every transaction belongs to exactly one of the two. | Confirmed (D-01) |
| FR-007 | The filter shall be applied to the already-loaded in-memory transactions and shall not alter, delete, or re-save any stored transaction. | Assumption A-02 (consistent with D-08; not separately asked) |
| FR-008 | The filter shall default to All on page load. The selection shall not be persisted: it resets to All on every reload, and no new storage key or schema change is introduced. | Confirmed (D-04, D-08) |
| FR-009 | Transactions that remain visible under a filter shall keep their existing presentation (type, INR amount, DD/MM/YYYY date, optional note) and relative order. | Assumption A-04 (not covered by a decision) |
| FR-010 | The history shall show the existing message "No transactions yet. Add one to get started." only when no transactions are stored at all. When transactions exist but none match the selected filter, only the filter-specific message of FR-005 shall be shown and the "Add one to get started" prompt shall not appear. | Confirmed (D-03) |
| FR-011 | Adding a new transaction while a filter is active shall keep the current selection. The transaction shall still be saved, the balance updated, and the existing "Transaction added." status shown. If the new transaction does not match the active filter, it shall be hidden from the visible list; if it matches, it shall appear. | Confirmed (D-05) |
| FR-012 | The available balance shall continue to reflect all stored transactions regardless of the selected filter. | Confirmed (D-06) |
| FR-013 | If the transaction history failed to load, the filter control shall be hidden or disabled (hide vs. disable to be settled in architecture) and no filter empty message shall be shown. The existing load-error state shall take precedence, so a storage failure is never presented as an empty history. | Confirmed (D-07) |

## 5. Non-Functional Requirements

Per D-09, no targets beyond existing repository conventions apply. No numeric targets are invented.

| ID | Requirement | Target / Evidence source |
|---|---|---|
| NFR-001 | Accessibility: the filter control shall have a programmatic label and be operable by keyboard, and changes to the displayed list or empty message shall be announced through the existing `aria-live` history region. | Confirmed (D-09): no specific WCAG level or other target beyond existing conventions. Evidence: markup inspection / tests |
| NFR-002 | Security: all rendered text shall continue to be set via `textContent` (no `innerHTML`), so notes remain inert text. | Existing convention; evidence: code review and existing markup-literal test |
| NFR-003 | Usability/visual consistency: the control shall follow the existing styling and its layout shall work at 600px and below. | Confirmed (D-09); no visual spec in Jira (Not Found) |
| NFR-004 | Maintainability/compatibility: no new dependencies or build tooling; remain a static HTML/CSS/vanilla JS app compatible with the existing `node:test` suite. | Existing convention |
| NFR-005 | Performance: filtering shall be performed client-side on in-memory data without perceptible delay. | Confirmed (D-09): no numeric target or data-volume target beyond existing conventions |
| NFR-006 | Privacy: no transaction data shall be sent off-device or logged as a result of filtering. | Existing local-only behavior |

## 6. Acceptance Criteria

IDs AC-001 to AC-004 are the story's criteria. AC-005 to AC-009, AC-012 and AC-013 are refinements confirmed by user decisions (D-xx). AC-010 and AC-011 rest on an assumption and an existing convention respectively and are not covered by a decision.

| ID | Criterion (Given / When / Then) | Origin |
|---|---|---|
| AC-001 | Given the history is shown, then it offers exactly the options labelled All, Income, and Expenses. | Story bullet 1 (confirmed); D-02 |
| AC-002 | Given a history containing both types, when Income is selected, then only income transactions are displayed; and when Expenses is selected, then only expense transactions are displayed. | Story bullet 2 (confirmed) |
| AC-003 | Given any filter was selected, when All is selected, then every stored transaction is displayed. | Story bullet 3 (confirmed) |
| AC-004 | Given a selected option with no matching transactions, then a clear empty message is displayed in the history area and no transaction items are shown. | Story bullet 4 (confirmed) |
| AC-005 | Given only expense transactions exist, when Income is selected, then "No income transactions found." is displayed; given only income transactions exist, when Expenses is selected, then "No expense transactions found." is displayed. In both cases "No transactions yet. Add one to get started." is not shown. | Confirmed (D-03, D-01) |
| AC-006 | Given no transactions are stored at all, then the history shows "No transactions yet. Add one to get started." and does not show "No income transactions found." or "No expense transactions found." | Confirmed (D-03) |
| AC-007 | Given a fresh page load (including after a reload with a previously chosen filter), then All is selected and the full history is displayed. | Confirmed (D-04, D-08) |
| AC-008 | When any filter is selected or changed, then no storage write occurs and the available balance remains the same value (balance always reflects all transactions). | Confirmed (D-06, D-08); the "stored transactions unchanged" part rests on assumption A-02 |
| AC-009 | Given a filter is active, when a transaction is added, then it is saved, the balance updates, "Transaction added." is shown, and the filter selection is unchanged; the new item appears in the list if it matches the active filter and is hidden if it does not. | Confirmed (D-05) |
| AC-010 | Given the filtered view, then each visible transaction shows the same type, amount, date, and note as in the unfiltered view and keeps its relative order. | Assumption A-04 (not covered by a decision) |
| AC-011 | Given a transaction note containing markup-like text, when filtered, then it is rendered as literal text. | NFR-002 (existing convention; not covered by a decision) |
| AC-012 | Given history failed to load (corrupt/unavailable storage), then the existing load-error state is unchanged, the filter control is hidden or disabled, and no "No income transactions found." / "No expense transactions found." message is shown. | Confirmed (D-07) |
| AC-013 | The filter control is labelled, keyboard-operable, and its result changes (list or empty message) are announced via the existing live region. | Confirmed (D-04, D-09); NFR-001 |

## 7. Business and Validation Rules

| ID | Rule | Basis |
|---|---|---|
| BR-001 | Every transaction has exactly one type, either `Expense` or `Money Received`; a transaction therefore appears under exactly one of Income/Expenses and always under All. | Confirmed from repository data model; D-01 |
| BR-002 | Filtering is a view-only operation; it never changes stored data or the balance. | Balance part confirmed (D-06); stored-data part is assumption A-02 (consistent with D-08) |
| BR-003 | Only the three defined options are valid selections; any other value shall be treated as invalid and not applied (fall back to All). | Assumption A-09 (not covered by a decision) |
| BR-004 | Terminology mapping: Income = `Money Received`; Expenses = `Expense`. | Confirmed (D-01) |

## 8. Error Scenarios and Edge Cases

- No transactions stored: show "No transactions yet. Add one to get started." under every option (FR-010 / AC-006).
- Selected type has zero matches while the other type has some: show the filter-specific message and not the "add one" prompt (AC-005).
- Only one transaction exists and it matches / does not match a filter.
- Switching filters repeatedly, including back to All, shall always yield the correct list (no stale or duplicated items).
- Adding a transaction under an active filter, including one that does not match it: saved, balance updated, "Transaction added." shown, item hidden (AC-009, D-05). If the active filter already had no matches, its empty message remains accurate or updates as appropriate to the new data.
- Storage corrupted, unreadable, or legacy data invalid: existing load-failure state governs; the filter is hidden or disabled and must not mask it (AC-012, D-07).
- Save failure or post-save render failure while a filter is active: existing error messages remain; filter state must not cause data loss.
- Transactions with identical amounts/dates/notes or long notes: unaffected; each is filtered solely by type.
- Large histories: no performance target beyond existing conventions (NFR-005, D-09).
- Records with an unrecognized type cannot be loaded (rejected by existing validation), so no "unknown type" filter case exists.
- Reload: filter resets to All (AC-007, D-08).

## 9. Dependencies and Constraints

- Depends on the existing transaction model, `localStorage` repository, `renderTransactions`, and history markup in `index.html`/`script.js`.
- Constraint: dependency-free static app; existing tests (`tests/app.test.cjs`) read `index.html`/`script.js` and must continue to pass; new behavior should be covered by tests in the same style (planning concern for later stages).
- Constraint: must not change the persisted schema (`schemaVersion` 1); confirmed by D-08 (no new storage or schema change).
- No upstream/downstream Jira dependencies or linked issues were found.
- Process constraint: stage output requires explicit human approval before Stage 2.

## 10. Confirmed Decisions

All decisions below are "user decision, 2026-11-02", given in answer to the draft-1 open questions. They are decisions on the questions only; they are not approval of this document.

| ID | Resolves | Decision | Source | Affects |
|---|---|---|---|---|
| D-01 | Q-01 (was A-01) | Income = `Money Received`; Expenses = `Expense`. These are the only two stored types, so every transaction lands in exactly one bucket. | User decision, 2026-11-02 | FR-006, BR-001, BR-004, AC-005 |
| D-02 | Q-02 (was A-11) | Filter labels are All / Income / Expenses (story wording). The add form's "Expense" / "Money Received" are input labels, not filter labels. | User decision, 2026-11-02 | FR-001, AC-001 |
| D-03 | Q-03 (was A-05) | Separate messages. Keep "No transactions yet. Add one to get started." when nothing is stored. Add "No income transactions found." and "No expense transactions found." for empty filter results. The "add one" prompt must not appear when transactions exist but none match. | User decision, 2026-11-02 | FR-005, FR-010, AC-004, AC-005, AC-006 |
| D-04 | Q-04 (was A-03) | A labelled select or radio group, All as default. Radio group is preferred (three options visible at once, keyboard-operable, fits the labelled-control pattern); select is acceptable; the final choice may be settled in architecture. | User decision, 2026-11-02 | FR-001, FR-008, AC-007, AC-013 |
| D-05 | Q-05 (was A-06) | Keep the active filter and hide the new non-matching item. Still save the transaction, update the balance, and show "Transaction added." | User decision, 2026-11-02 | FR-011, AC-009 |
| D-06 | Q-06 (was A-07) | Balance always reflects all transactions; filtering never changes it. | User decision, 2026-11-02 | FR-012, BR-002, AC-008 |
| D-07 | Q-07 (was A-08) | Hide or disable the filter on load failure and show no "no matches" message. The existing load-error state takes precedence, so a storage failure is not shown as an empty history. (Hide vs. disable left to architecture.) | User decision, 2026-11-02 | FR-013, AC-012 |
| D-08 | Q-08 (was A-10) | No persistence. Filter resets to All on reload; no new storage or schema change. | User decision, 2026-11-02 | FR-008, AC-007, AC-008, Section 9 |
| D-09 | Q-09 | No targets beyond existing conventions: labelled keyboard-operable control, announcements through the existing aria-live region, layout works at 600px and below. | User decision, 2026-11-02 | NFR-001, NFR-003, NFR-005, AC-013 |
| D-10 | Q-10 | No count of matching items. | User decision, 2026-11-02 | Scope (out of scope) |
| D-11 | Q-11 | No documentation update (no README or user docs exist). | User decision, 2026-11-02 | Scope (out of scope) |

## 11. Remaining Assumptions (not covered by a decision; confirmed by the Stage 1 approval of this document)

| ID | Assumption | Status |
|---|---|---|
| A-01 | "Income" means `Money Received`; "Expenses" means `Expense`. | Converted to D-01 (confirmed) |
| A-02 | Filtering is purely a display concern over in-memory data; no storage writes. | **Confirmed by Stage 1 approval** ("approve stage 1", 2026-11-02) (consistent with D-08; not separately asked) |
| A-03 | The default selection is All on page load. | Converted to D-04 / D-08 (confirmed) |
| A-04 | Visible transactions retain current formatting and relative (insertion) order; no new sorting is introduced. | **Confirmed by Stage 1 approval** ("approve stage 1", 2026-11-02) |
| A-05 | A filter-specific empty message is required, distinct from the "no transactions at all" message. | Converted to D-03 (confirmed) |
| A-06 | The selected filter persists while the user adds transactions in the same session, and the list refreshes according to it. | Converted to D-05 (confirmed) |
| A-07 | The balance always reflects all transactions, not the filtered subset. | Converted to D-06 (confirmed) |
| A-08 | On load failure, the load-error state takes precedence and the filter message does not appear. | Converted to D-07 (confirmed) |
| A-09 | Unknown/invalid filter values fall back to All. | **Confirmed by Stage 1 approval** ("approve stage 1", 2026-11-02) |
| A-10 | The selected filter is not persisted across page reloads. | Converted to D-08 (confirmed) |
| A-11 | Option labels displayed to the user are exactly "All", "Income", "Expenses". | Converted to D-02 (confirmed) |

Three assumptions were not covered by a decision (A-02, A-04, A-09). They are low-risk and follow existing behavior; the user's Stage 1 approval of 2026-11-02 explicitly included and confirmed them. They are not open questions.

## 12. Questions

| # | Question | Status | Resolution |
|---|---|---|---|
| Q-01 | Confirm that "Income" = `Money Received` and "Expenses" = `Expense`? | **Resolved** | Yes (D-01) |
| Q-02 | Filter labels: "All / Income / Expenses" or add-form wording? | **Resolved** | All / Income / Expenses (D-02) |
| Q-03 | Exact empty-message text(s); one message or separate? | **Resolved** | Separate: keep existing message when nothing is stored; "No income transactions found." / "No expense transactions found." for empty filter results (D-03) |
| Q-04 | Preferred control type; is default All correct? | **Resolved** | Labelled select or radio group, radio group preferred; final choice may be settled in architecture; default All (D-04) |
| Q-05 | Adding a non-matching transaction under an active filter: keep filter or reset to All? | **Resolved** | Keep filter, hide the item, still save / update balance / show "Transaction added." (D-05) |
| Q-06 | Balance remain based on all transactions regardless of filter? | **Resolved** | Yes (D-06) |
| Q-07 | Filter control hidden/disabled when history failed to load? | **Resolved** | Hide or disable; no "no matches" message; load-error takes precedence (D-07) |
| Q-08 | Persist the selected filter across reloads? | **Resolved** | No; resets to All; no new storage or schema change (D-08) |
| Q-09 | Non-functional targets (accessibility level, browsers, history size)? | **Resolved** | None beyond existing conventions (D-09) |
| Q-10 | Show a count of matching items? | **Resolved** | No (D-10) |
| Q-11 | Update documentation? | **Resolved** | No (D-11) |

No open questions remain. Design points deliberately left to Stage 2 (architecture), not requirements questions: radio group vs. select (D-04), and hide vs. disable of the filter on load failure (D-07).

## 13. Requirements Traceability Matrix

| Story criterion / decision | Requirements | Acceptance criteria | Rules / NFRs / Decisions |
|---|---|---|---|
| Options All, Income, Expenses (bullet 1) | FR-001, FR-006, FR-008 | AC-001, AC-007, AC-013 | BR-003, BR-004, NFR-001, NFR-003, D-01, D-02, D-04, D-08, D-09 |
| Selecting an option shows only matching (bullet 2) | FR-002, FR-003, FR-006, FR-009, FR-011 | AC-002, AC-009, AC-010, AC-011 | BR-001, BR-004, NFR-002, D-01, D-05 |
| All shows full history (bullet 3) | FR-004, FR-007 | AC-003, AC-008 | BR-001, BR-002, D-06 |
| Clear empty message when no match (bullet 4) | FR-005, FR-010, FR-013 | AC-004, AC-005, AC-006, AC-012 | NFR-001, D-03, D-07 |
| Decision: balance unaffected | FR-012 | AC-008 | BR-002, D-06 |
| Decision: no persistence | FR-008 | AC-007, AC-008 | D-08 |
| Decision: load-failure behavior | FR-013 | AC-012 | D-07 |
| Cross-cutting | FR-007 | AC-008, AC-012 | NFR-004, NFR-005, NFR-006, D-09 |
| Decisions with no requirement beyond scope | - | - | D-10 (no count), D-11 (no docs) |

Counts: 13 functional requirements (FR-001 to FR-013; FR-013 added in revision 2), 6 non-functional (NFR-001 to NFR-006), 13 acceptance criteria (AC-001 to AC-013: 4 from the story, 7 confirmed by decisions - AC-005 to AC-009, AC-012, AC-013 - and 2 resting on an assumption/existing convention - AC-010, AC-011), 4 business rules (BR-001 to BR-004), 11 confirmed decisions (D-01 to D-11), 11 assumptions (A-01 to A-11: 8 converted to decisions, 3 still assumptions: A-02, A-04, A-09), 11 questions (Q-01 to Q-11: 11 resolved, 0 open).

FR status: confirmed (story or decision) = FR-001 to FR-006, FR-008, FR-010 to FR-013 (11 of 13); assumption-based = FR-007 (A-02), FR-009 (A-04).

## 14. Revision History

| Revision | Date | Summary |
|---|---|---|
| Draft 1 | 2026-11-02 | Initial draft: 12 FR, 6 NFR, 13 AC, 4 BR, 11 assumptions (A-01 to A-11), 11 open questions (Q-01 to Q-11) with proposed defaults. Awaiting human approval. |
| Revision 2 | 2026-11-02 | Incorporated user answers to Q-01 to Q-11 as Confirmed Decisions D-01 to D-11 (new Section 10). Marked Q-01 to Q-11 Resolved; no new questions. Converted assumptions A-01, A-03, A-05, A-06, A-07, A-08, A-10, A-11 to confirmed decisions; A-02, A-04, A-09 remain assumptions. Updated FR-001, FR-005, FR-006, FR-008, FR-010, FR-011, FR-012 wording (control type, separate empty messages, no persistence, hide-new-item behavior); added FR-013 (load-failure behavior). Updated NFR-001, NFR-003, NFR-005 to record D-09. Rewrote AC-005, AC-006, AC-007, AC-008, AC-009, AC-012 with concrete message strings and persistence/load-failure behavior; AC-001, AC-013 annotated. Moved count display, documentation and persistence into confirmed out-of-scope. Updated traceability matrix and counts. No IDs deleted or renumbered. Document is not approved. |
| Revision 2 (final) | 2026-11-02 | Approval state finalized: status changed to APPROVED (revision 2) on the user's explicit "approve stage 1" message of 2026-11-02; assumptions A-02, A-04, A-09 marked confirmed by that approval; Section 15 updated with approval evidence and scope. No requirement, decision, question, or ID content changed. Approval covers Stage 1 only. |

## 15. Approval Status

- Status: **APPROVED (revision 2)**
- Human approval of this document: **Given** by the user on 2026-11-02, including assumptions A-02, A-04, and A-09, which are confirmed by this approval.
- Approval evidence: user message "approve stage 1", 2026-11-02 (relayed to this agent by the orchestrator). Decision evidence: user answers of 2026-11-02 to Q-01 to Q-11, summarized in Section 10.
- Scope of approval: Stage 1 (Requirements Analysis) only. This is NOT approval for Stage 2 (Architecture Design), for any commit, for any push, or for any pull request; each requires its own explicit user approval or authorization.
- Not committed or pushed.
