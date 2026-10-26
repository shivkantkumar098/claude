# Implementation Notes: AG-10 - Filter transactions by type

Run ID: AG-10-3 | Branch: feature/AG-10-3 | Stage 5 status: awaiting human approval (approval evidence lives only in workflow-session.json).

## Completed tasks

T1-T11 implemented. T12 (manual Chrome checks) NOT RUN.

## Changed files

- `index.html`: filter `.field` with `<label for="transaction-filter">Show</label>` and `<select id="transaction-filter" name="filter">` (all/income/expenses); permanent `<p id="filter-message" role="status">` and `<p id="filter-empty-state" role="status">`, empty and not hidden.
- `script.js`: `FILTER_STORAGE_KEY`, `TRANSACTION_FILTERS`, `DEFAULT_FILTER`, `isKnownFilter`, `filterTransactions`, `filterPreference` (read/write, never throws, no removeItem); `activeFilter`, `lastBalanceInPaise`, `setActiveFilter`, `setFilterMessage`; modified `renderTransactions`, `renderLoadFailure`, `loadTransactions`, submit handler; new `change` listener; one-time startup preference read before the first `loadTransactions()`.
- `styles.css`: `.filter-field`, `#filter-empty-state`/`#filter-message` margin/color, `:empty` margin reset. No `display` rules on the message elements.
- `tests/app.test.cjs`: fake DOM ids, per-key `failKeys` storage option, vm hook additions (`filterTransactions`, `isKnownFilter`), 13 new tests.

## Decisions

- Startup call site inspected: single `loadTransactions();` at the end of `script.js`; preference read inserted immediately before it (once; Retry does not re-read).
- Unknown stored value (including empty string): message "unknown value", All shown, stored value overwritten with `all` (best effort).
- Change handler: ignored unless `repositoryReady`; render exceptions are swallowed and the previous DOM is left in place (no `setFormError`, to avoid showing a form error for a non-form action).
- Add-flow reset placed after `transactions = updatedTransactions` and before the existing guarded render; not applied on save failure.
- Noted consequence (PR-4): `renderLoadFailure` clears `#filter-message`, so a startup "unknown value" message does not reappear after a successful Retry.

## Deviations from plan

- None in scope. Minor placement choice: `#filter-message` sits above `#empty-state`; `#filter-empty-state` sits after `#empty-state`, both inside the history section.
- Existing tests edited only in the two id lists, `createApp` (filter initial value), vm hook, and `createStorage` (additive `failKeys`).

## Tests executed

- `node --test tests/` (repo root): exit 0; tests 28, pass 28, fail 0, cancelled 0, skipped 0 (15 pre-existing + 13 new).

## Not run

- T12 manual Chrome checks (keyboard operation, label association, reload persistence, Not found / unknown value display, load-error state, add-while-hidden): NOT RUN.
- Screen-reader announcement: NOT RUN.
- Mutation spot-check of new tests: NOT RUN.
- No CI exists.

## Working tree

Changed by this stage: index.html, script.js, styles.css, tests/app.test.cjs, implementation-notes.md. The untracked analytics JSON was not touched. No commit, push, or Jira action performed. `workflow-session.json`: only `5-implementation` set to "awaiting approval".

## Risks

- Announcement behavior of `role="status"` containers unverified in a browser.
- Git warns LF will become CRLF on `tests/app.test.cjs` (line-ending normalization only).
