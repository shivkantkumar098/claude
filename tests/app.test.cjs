const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "script.js"),
  "utf8",
);
const htmlSource = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8",
);

const collectText = (element) =>
  `${element.textContent}${element.children.map(collectText).join("")}`;

const collectTagNames = (element) => [
  element.tagName,
  ...element.children.flatMap(collectTagNames),
];

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.hidden = false;
    this.classList = {
      toggle: (name, force) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        if (force) {
          names.add(name);
        } else {
          names.delete(name);
        }
        this.className = [...names].join(" ");
      },
    };
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  dispatch(name) {
    const event = {
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
    this.listeners[name]?.(event);
    return event;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  append(...elements) {
    this.children.push(...elements);
  }

  replaceChildren(...elements) {
    this.children = [...elements];
  }

  reset() {
    const elements = Object.values(this.elementsById || {});
    for (const element of elements) {
      if (element.id === "transaction-amount" || element.id === "transaction-note") {
        element.value = "";
      } else if (element.id === "transaction-type") {
        element.value = "Expense";
      }
    }
  }

  get innerHTML() {
    return this.children.map((child) => child.innerHTML || child.textContent).join("");
  }
}

const createStorage = (seed = {}, options = {}) => {
  const values = new Map(Object.entries(seed));
  const storage = {
    values,
    // Spies: every setItem attempt is recorded in `writes`, every getItem call is counted in `reads`.
    writes: [],
    reads: 0,
    getItem(key) {
      storage.reads += 1;
      if (options.failReads) {
        throw new Error("storage read denied");
      }
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      storage.writes.push([key, String(value)]);
      if (options.failWrites) {
        throw new Error("storage quota exceeded");
      }
      values.set(key, String(value));
    },
  };
  return storage;
};

// options.emptyStateHidden (default true) mirrors the shipped `<p id="empty-state" hidden>`.
// options.windowEvents, when an object, gives the window stub an addEventListener that records
// listeners into it; by default the stub has none, which exercises the guarded pageshow path.
// options.omitIds (default none) removes those ids from the fake page so getElementById returns null.
// options.filterHiddenAtStart (default true) mirrors the shipped `hide` class on #history-filter;
// false starts the filter visible so only script code can hide it.
const createApp = (storage = createStorage(), options = {}) => {
  const {
    emptyStateHidden = true,
    windowEvents = null,
    omitIds = [],
    filterHiddenAtStart = true,
  } = options;
  const ids = [
    "history-filter",
    "filter-all",
    "filter-income",
    "filter-expenses",
    "transaction-date",
    "transaction-form",
    "transaction-type",
    "transaction-amount",
    "transaction-note",
    "transaction-history",
    "empty-state",
    "balance-amount",
    "save-transaction",
    "form-error",
    "save-status",
    "load-error",
    "retry-load",
    "amount-error",
    "type-error",
    "date-error",
  ].filter((id) => !omitIds.includes(id));
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  Object.entries(elements).forEach(([id, element]) => {
    element.id = id;
  });
  elements["transaction-form"].elementsById = elements;
  elements["transaction-type"].value = "Expense";
  // Mirror the shipped markup: the filter ships with `hide`, #empty-state ships `hidden`.
  if (elements["history-filter"] && filterHiddenAtStart) {
    elements["history-filter"].className = "hide";
  }
  elements["empty-state"].hidden = emptyStateHidden;

  let nextId = 1;
  const window = {
    localStorage: storage,
    crypto: {
      randomUUID: () => `test-${nextId++}`,
    },
  };
  if (windowEvents) {
    window.addEventListener = (name, callback) => {
      windowEvents[name] = callback;
    };
  }
  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tagName) => new FakeElement(tagName),
  };
  const context = vm.createContext({ window, document, console });
  vm.runInContext(
    `${appSource}\n;globalThis.__appTest = {
      parseAmountToPaise,
      formatINR,
      calculateAvailableBalance,
      getLocalDateString,
      formatTransactionDate,
      isValidTransactionDate,
      validateTransaction,
      transactionRepository,
      filterTransactions,
      TRANSACTION_FILTERS,
      TRANSACTION_TYPES,
      loadTransactions,
      setActiveFilter,
      getActiveFilter: () => activeFilter
    };`,
    context,
    { filename: "script.js" },
  );

  return { context, elements, storage, document };
};

const transactionsFrom = (storage) =>
  JSON.parse(storage.values.get("transactions")).transactions;

const toPlain = (value) => JSON.parse(JSON.stringify(value));

const hasClass = (element, name) => element.className.split(/\s+/).includes(name);

const makeTransaction = (id, type, amountInPaise, date, note) => ({
  id,
  type,
  amountInPaise,
  date,
  ...(note === undefined ? {} : { note }),
});

const envelopeStorage = (list, options) =>
  createStorage(
    { transactions: JSON.stringify({ schemaVersion: 1, transactions: list }) },
    options,
  );

const EXPENSE_A = makeTransaction("t-1", "Expense", 1234, "2026-10-14", "Lunch");
const INCOME_A = makeTransaction("t-2", "Money Received", 5000, "2026-10-15", "Refund");
const EXPENSE_B = makeTransaction("t-3", "Expense", 250, "2026-10-16", "Tea");
const INCOME_B = makeTransaction("t-4", "Money Received", 700, "2026-10-17");
// 10000 - 1234 + 5000 - 250 + 700 paise
const MIXED = [EXPENSE_A, INCOME_A, EXPENSE_B, INCOME_B];
const MIXED_BALANCE = "₹142.16";

const renderedArticles = (elements) =>
  elements["transaction-history"].children.flatMap((child) =>
    child.tagName === "div" ? child.children : [],
  );

const renderedTexts = (elements) => renderedArticles(elements).map(collectText);

const emptyMessages = (elements) =>
  elements["transaction-history"].children.filter((child) =>
    hasClass(child, "empty-message"),
  );

const selectFilter = (elements, key) => {
  elements[`filter-${key}`].dispatch("change");
};

const radioStates = (elements) => ({
  all: elements["filter-all"].checked,
  income: elements["filter-income"].checked,
  expenses: elements["filter-expenses"].checked,
});

const addTransaction = (elements, { type, amount, note = "" }) => {
  elements["transaction-type"].value = type;
  elements["transaction-amount"].value = amount;
  elements["transaction-date"].value = "2026-10-20";
  elements["transaction-note"].value = note;
  elements["transaction-form"].dispatch("submit");
};

test("integration: index.html exposes every required app control and local asset", () => {
  for (const id of [
    "transaction-date",
    "transaction-form",
    "transaction-type",
    "transaction-amount",
    "transaction-note",
    "transaction-history",
    "empty-state",
    "balance-amount",
    "save-transaction",
    "form-error",
    "save-status",
    "load-error",
    "retry-load",
    "amount-error",
    "type-error",
    "date-error",
    "history-filter",
    "filter-all",
    "filter-income",
    "filter-expenses",
  ]) {
    assert.match(htmlSource, new RegExp(`\\bid="${id}"`), `missing #${id}`);
  }

  assert.match(htmlSource, /<form\b[^>]*id="transaction-form"/);
  assert.match(htmlSource, /<button\b[^>]*id="save-transaction"[^>]*type="submit"/);
  assert.match(htmlSource, /<link\b[^>]*href="styles\.css"/);
  assert.match(htmlSource, /<script\b[^>]*src="script\.js"/);
  assert.doesNotMatch(htmlSource, /id="(?:budget|expense-title|edit|delete)[^"]*"/i);
});

test("unit: amount parsing accepts positive INR cents and rejects invalid precision", () => {
  const { context } = createApp();
  const { parseAmountToPaise } = context.__appTest;

  assert.equal(parseAmountToPaise("0.01"), 1);
  assert.equal(parseAmountToPaise("12.30"), 1230);
  assert.equal(parseAmountToPaise(".5"), 50);
  for (const invalid of ["", "0", "-1", "abc", "1.234", "90071992547409.92"]) {
    assert.equal(parseAmountToPaise(invalid), null, `expected ${invalid} to reject`);
  }
});

test("unit: balance starts at INR 100 and applies integer-paise entries", () => {
  const { context } = createApp();
  const { calculateAvailableBalance, formatINR } = context.__appTest;
  const transactions = [
    { type: "Money Received", amountInPaise: 10050 },
    { type: "Expense", amountInPaise: 2525 },
  ];

  assert.equal(calculateAvailableBalance([]), 10000);
  assert.equal(
    calculateAvailableBalance([{ type: "Expense", amountInPaise: 1234 }]),
    8766,
  );
  assert.equal(
    calculateAvailableBalance([{ type: "Money Received", amountInPaise: 1234 }]),
    11234,
  );
  assert.equal(calculateAvailableBalance(transactions), 17525);
  assert.equal(
    calculateAvailableBalance([{ type: "Expense", amountInPaise: 101234 }]),
    -91234,
  );
  assert.throws(
    () =>
      calculateAvailableBalance([
        { type: "Money Received", amountInPaise: Number.MAX_SAFE_INTEGER },
      ]),
    /available balance is outside the supported range/i,
  );
  assert.equal(formatINR(0), "₹0.00");
  assert.equal(formatINR(7525), "₹75.25");
  assert.equal(formatINR(-100001), "-₹1,000.01");
});

test("unit: calendar dates validate leap days and display DD/MM/YYYY", () => {
  const { context } = createApp();
  const { formatTransactionDate, getLocalDateString, isValidTransactionDate } =
    context.__appTest;

  assert.equal(isValidTransactionDate("2024-02-29"), true);
  assert.equal(isValidTransactionDate("2023-02-29"), false);
  assert.equal(isValidTransactionDate("2026-13-01"), false);
  assert.equal(formatTransactionDate("2026-10-14"), "14/10/2026");
  assert.equal(getLocalDateString(new Date(2026, 9, 14)), "2026-10-14");
});

test("unit: validation identifies amount, type, and date errors", () => {
  const { context } = createApp();
  const { validateTransaction } = context.__appTest;
  const result = validateTransaction({
    amount: "1.234",
    type: "Credit",
    date: "2023-02-29",
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["amount", "date", "type"]);
});

test("unit: legacy migration maps whole and fractional rupees without rounding", () => {
  const storage = createStorage({
    budget: "9999",
    expenses: JSON.stringify([
      { title: "Whole", amount: 12 },
      { title: "Paise", amount: 12.34 },
    ]),
  });
  const { context } = createApp(storage);

  const migrated = context.__appTest.transactionRepository.load();
  assert.deepEqual(
    JSON.parse(JSON.stringify(migrated)).map(({ amountInPaise, type, note }) => ({
      amountInPaise,
      type,
      note,
    })),
    [
      { amountInPaise: 1200, type: "Expense", note: "Whole" },
      { amountInPaise: 1234, type: "Expense", note: "Paise" },
    ],
  );
  assert.equal(storage.values.get("budget"), "9999");
  assert.equal(storage.values.get("expenses"), JSON.stringify([
    { title: "Whole", amount: 12 },
    { title: "Paise", amount: 12.34 },
  ]));
  assert.equal(context.__appTest.transactionRepository.load().length, 2);
});

test("unit: malformed legacy input does not partially write migrated transactions", () => {
  const originalExpenses = JSON.stringify([
    { title: "Valid", amount: 10.25 },
    { title: "Invalid", amount: 0 },
  ]);
  const storage = createStorage({ budget: "450", expenses: originalExpenses });
  const { context } = createApp(storage);

  assert.throws(() => context.__appTest.transactionRepository.load(), /legacy expense 2/i);
  assert.equal(storage.values.has("transactions"), false);
  assert.equal(storage.values.get("expenses"), originalExpenses);
  assert.equal(storage.values.get("budget"), "450");
});

test("integration: empty app loads; saving transaction persists, renders, and updates balance", () => {
  const storage = createStorage();
  const { elements } = createApp(storage);

  assert.equal(elements["balance-amount"].textContent, "₹100.00");
  assert.equal(elements["balance-amount"].hidden, false);
  assert.equal(elements["empty-state"].hidden, false);
  assert.equal(elements["save-transaction"].disabled, false);

  elements["transaction-amount"].value = "12.34";
  elements["transaction-date"].value = "2026-10-14";
  elements["transaction-note"].value = "Lunch";
  const event = elements["transaction-form"].dispatch("submit");

  assert.equal(event.prevented, true);
  assert.equal(elements["save-status"].textContent, "Transaction added.");
  assert.equal(elements["balance-amount"].textContent, "₹87.66");
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(transactionsFrom(storage).length, 1);
  const history = collectText(elements["transaction-history"]);
  assert.equal(history.includes("Expense"), true);
  assert.equal(history.includes("₹12.34"), true);
  assert.equal(history.includes("14/10/2026"), true);
  assert.equal(history.includes("Lunch"), true);
});

test("integration: invalid submission shows field feedback and does not persist", () => {
  const storage = createStorage();
  const { elements } = createApp(storage);
  elements["transaction-amount"].value = "0";
  elements["transaction-date"].value = "2026-10-14";

  elements["transaction-form"].dispatch("submit");

  assert.equal(elements["amount-error"].textContent.length > 0, true);
  assert.equal(elements["transaction-amount"].attributes["aria-invalid"], "true");
  assert.equal(transactionsFrom(storage).length, 0);
});

test("integration: reload restores saved records without changing balance", () => {
  const storage = createStorage();
  let app = createApp(storage);
  app.elements["transaction-amount"].value = "100.50";
  app.elements["transaction-type"].value = "Money Received";
  app.elements["transaction-date"].value = "2026-10-14";
  app.elements["transaction-form"].dispatch("submit");

  assert.equal(app.elements["balance-amount"].textContent, "₹200.50");
  app.elements["transaction-amount"].value = "12.34";
  app.elements["transaction-type"].value = "Expense";
  app.elements["transaction-date"].value = "2026-10-14";
  app.elements["transaction-note"].value = "Lunch";
  app.elements["transaction-form"].dispatch("submit");
  assert.equal(app.elements["balance-amount"].textContent, "₹188.16");

  // emptyStateHidden: false keeps the hidden === true assertion below meaningful (PL-04).
  app = createApp(storage, { emptyStateHidden: false });
  assert.equal(app.elements["balance-amount"].textContent, "₹188.16");
  assert.equal(app.elements["empty-state"].hidden, true);
  assert.equal(transactionsFrom(storage).length, 2);
  const history = collectText(app.elements["transaction-history"]);
  assert.equal(history.includes("Money Received"), true);
  assert.equal(history.includes("₹100.50"), true);
  assert.equal(history.includes("Expense"), true);
  assert.equal(history.includes("₹12.34"), true);
  assert.equal(history.includes("14/10/2026"), true);
  assert.equal(history.includes("Lunch"), true);
});

test("integration: markup-like notes are rendered as literal text", () => {
  const storage = createStorage();
  const { elements } = createApp(storage);
  const noteValue = "<img src=x onerror=alert(1)>";

  elements["transaction-amount"].value = "1";
  elements["transaction-date"].value = "2026-10-14";
  elements["transaction-note"].value = noteValue;
  elements["transaction-form"].dispatch("submit");

  const history = elements["transaction-history"];
  assert.equal(collectText(history).includes(noteValue), true);
  assert.equal(collectTagNames(history).includes("img"), false);
});

test("integration: failed save preserves form, state, and no-success feedback", () => {
  const initialEnvelope = JSON.stringify({ schemaVersion: 1, transactions: [] });
  const storage = createStorage(
    { transactions: initialEnvelope },
    { failWrites: true },
  );
  const { elements } = createApp(storage);
  elements["transaction-amount"].value = "5.25";
  elements["transaction-date"].value = "2026-10-14";
  elements["transaction-note"].value = "Keep this";

  elements["transaction-form"].dispatch("submit");

  assert.match(elements["form-error"].textContent, /could not be saved/i);
  assert.equal(elements["save-status"].textContent, "");
  assert.equal(elements["transaction-amount"].value, "5.25");
  assert.equal(elements["transaction-note"].value, "Keep this");
  assert.equal(elements["balance-amount"].textContent, "₹100.00");
  assert.equal(storage.values.get("transactions"), initialEnvelope);
});

test("integration: corrupt storage shows an error, hides empty state, and disables submit", () => {
  const storage = createStorage({ transactions: "{bad json" });
  // emptyStateHidden: false keeps the hidden === true assertion below meaningful (PL-04).
  const { elements } = createApp(storage, { emptyStateHidden: false });

  assert.notEqual(elements["load-error"].textContent, "");
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(elements["balance-amount"].hidden, true);
  assert.equal(elements["save-transaction"].disabled, true);
  assert.equal(elements["retry-load"].className.includes("hide"), false);
});

test("integration: storage read failure is visible and retry loads after recovery", () => {
  const options = { failReads: true };
  const storage = createStorage({}, options);
  const { elements } = createApp(storage);

  assert.notEqual(elements["load-error"].textContent, "");
  assert.equal(elements["balance-amount"].hidden, true);
  assert.equal(elements["save-transaction"].disabled, true);

  options.failReads = false;
  elements["retry-load"].dispatch("click");

  assert.equal(elements["load-error"].className.includes("hide"), true);
  assert.equal(elements["balance-amount"].textContent, "₹100.00");
  assert.equal(elements["save-transaction"].disabled, false);
  assert.equal(elements["empty-state"].hidden, false);
});

test("integration: unsafe legacy value blocks migration without altering source keys", () => {
  const expenses = JSON.stringify([
    { title: "First", amount: 12.34 },
    { title: "Bad precision", amount: 2.345 },
  ]);
  const storage = createStorage({ budget: "800", expenses });
  const { elements } = createApp(storage);

  assert.notEqual(elements["load-error"].textContent, "");
  assert.equal(storage.values.has("transactions"), false);
  assert.equal(storage.values.get("expenses"), expenses);
  assert.equal(storage.values.get("budget"), "800");
});

// ---------------------------------------------------------------------------
// AG-10: filter transactions by type
// ---------------------------------------------------------------------------

const tagOf = (html, pattern) => {
  const match = pattern.exec(html);
  assert.notEqual(match, null, `missing ${pattern}`);
  return match[0];
};

const attributeOf = (tag, name) => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
};

const hasBooleanAttribute = (tag, name) =>
  new RegExp(`\\s${name}(?=[\\s/>])`).test(tag);

test("markup: history filter is a labelled radio group after the form, hidden until load", () => {
  const fieldsetBlock = tagOf(
    htmlSource,
    /<fieldset\b[^>]*\bid="history-filter"[^>]*>[\s\S]*?<\/fieldset>/,
  );
  const fieldsetOpen = tagOf(fieldsetBlock, /^<fieldset\b[^>]*>/);
  const classes = attributeOf(fieldsetOpen, "class").split(/\s+/);
  assert.equal(classes.includes("history-filter"), true);
  assert.equal(classes.includes("hide"), true);
  assert.equal(hasBooleanAttribute(fieldsetOpen, "hidden"), false);
  assert.match(fieldsetBlock, /<legend\b[^>]*>\s*Filter by type\s*<\/legend>/);

  const radios = fieldsetBlock.match(/<input\b[^>]*>/g) || [];
  assert.equal(radios.length, 3);
  const expected = [
    ["filter-all", "all", "All"],
    ["filter-income", "income", "Income"],
    ["filter-expenses", "expenses", "Expenses"],
  ];
  expected.forEach(([id, value, labelText], index) => {
    const radio = radios[index];
    assert.equal(attributeOf(radio, "type"), "radio");
    assert.equal(attributeOf(radio, "name"), "history-filter");
    assert.equal(attributeOf(radio, "id"), id);
    assert.equal(attributeOf(radio, "value"), value);
    assert.equal(hasBooleanAttribute(radio, "checked"), id === "filter-all");
    assert.match(
      fieldsetBlock,
      new RegExp(`<label\\b[^>]*\\bfor="${id}"[^>]*>\\s*${labelText}\\s*</label>`),
    );
  });

  const formEnd = htmlSource.indexOf("</form>");
  const headingStart = htmlSource.indexOf('id="history-heading"');
  const fieldsetStart = htmlSource.indexOf('id="history-filter"');
  assert.equal(headingStart > formEnd && formEnd > -1, true);
  assert.equal(fieldsetStart > headingStart, true, "filter must follow the history heading");
  assert.equal(fieldsetStart > formEnd, true, "filter must be outside the form");

  const emptyState = tagOf(htmlSource, /<p\b[^>]*\bid="empty-state"[^>]*>[\s\S]*?<\/p>/);
  assert.equal(hasBooleanAttribute(emptyState.match(/^<p\b[^>]*>/)[0], "hidden"), true);
  assert.match(emptyState, /No transactions yet\. Add one to get started\./);

  const historyContainer = tagOf(
    htmlSource,
    /<div\b[^>]*\bid="transaction-history"[^>]*>[\s\S]*?<\/div>/,
  );
  assert.equal(attributeOf(historyContainer, "aria-live"), "polite");
  assert.equal(historyContainer.includes("empty-state"), false);
  assert.doesNotMatch(htmlSource, /empty-message/, "filter messages are script-rendered");
});

test("unit: filterTransactions selects by type, keeps order, and never mutates the input", () => {
  const { context } = createApp();
  const { filterTransactions } = context.__appTest;
  const input = [EXPENSE_A, INCOME_A, EXPENSE_B, INCOME_B];
  const snapshot = toPlain(input);

  assert.deepEqual(
    toPlain(filterTransactions(input, "income")).map(({ id }) => id),
    ["t-2", "t-4"],
  );
  assert.deepEqual(
    toPlain(filterTransactions(input, "expenses")).map(({ id }) => id),
    ["t-1", "t-3"],
  );
  assert.deepEqual(
    toPlain(filterTransactions(input, "all")).map(({ id }) => id),
    ["t-1", "t-2", "t-3", "t-4"],
  );
  assert.deepEqual(toPlain(filterTransactions([], "income")), []);
  assert.deepEqual(toPlain(filterTransactions([], "all")), []);

  for (const key of ["all", "income", "expenses"]) {
    const result = filterTransactions(input, key);
    assert.notEqual(result, input, `${key} must return a new array`);
  }
  assert.deepEqual(toPlain(input), snapshot);
  assert.equal(input.length, 4);
});

test("unit: unknown or inherited filter keys behave as All", () => {
  const { context } = createApp();
  const { filterTransactions } = context.__appTest;
  const allIds = ["t-1", "t-2", "t-3", "t-4"];

  for (const invalid of ["bogus", undefined, null, "", "constructor", "__proto__", "toString", 7]) {
    assert.deepEqual(
      toPlain(filterTransactions(MIXED, invalid)).map(({ id }) => id),
      allIds,
      `expected ${String(invalid)} to fall back to All`,
    );
  }
});

test("unit: filter definitions cover every transaction type exactly once", () => {
  const { context } = createApp();
  const { TRANSACTION_FILTERS, TRANSACTION_TYPES } = context.__appTest;
  const filters = toPlain(TRANSACTION_FILTERS);

  assert.deepEqual(Object.keys(filters), ["all", "income", "expenses"]);
  assert.deepEqual(filters.all, { type: null, emptyMessage: null });
  assert.equal(filters.income.type, "Money Received");
  assert.equal(filters.expenses.type, "Expense");
  assert.equal(filters.income.emptyMessage, "No income transactions found.");
  assert.equal(filters.expenses.emptyMessage, "No expense transactions found.");

  const filterTypes = Object.entries(filters)
    .filter(([key]) => key !== "all")
    .map(([, definition]) => definition.type);
  assert.equal(new Set(filterTypes).size, filterTypes.length, "a type is owned by two filters");
  assert.deepEqual([...filterTypes].sort(), [...toPlain(TRANSACTION_TYPES)].sort());
});

test("integration: after load the filter is visible with All selected and every record shown", () => {
  const { elements } = createApp(envelopeStorage(MIXED), { emptyStateHidden: false });

  assert.equal(hasClass(elements["history-filter"], "hide"), false);
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
  assert.equal(renderedArticles(elements).length, 4);
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(emptyMessages(elements).length, 0);
});

test("integration: empty storage keeps the filter visible and the add prompt under every option", () => {
  const { elements } = createApp(createStorage());

  assert.equal(hasClass(elements["history-filter"], "hide"), false);
  assert.equal(elements["empty-state"].hidden, false);
  assert.equal(emptyMessages(elements).length, 0);

  for (const key of ["income", "expenses", "all"]) {
    elements["empty-state"].hidden = true; // sentinel: the render must flip it back
    selectFilter(elements, key);
    assert.equal(elements["empty-state"].hidden, false, `prompt must show under ${key}`);
    assert.equal(emptyMessages(elements).length, 0, `no filter message under ${key}`);
    assert.equal(renderedArticles(elements).length, 0);
    assert.equal(collectText(elements["transaction-history"]).includes("transactions found"), false);
  }
});

test("integration: selecting Income, Expenses, and All shows the right records in stored order", () => {
  const { elements } = createApp(envelopeStorage(MIXED));
  const expectInOrder = (texts, expectations) => {
    assert.equal(texts.length, expectations.length);
    expectations.forEach((parts, index) => {
      parts.forEach((part) => {
        assert.equal(texts[index].includes(part), true, `item ${index} missing ${part}`);
      });
    });
  };
  const incomeItems = [
    ["Money Received", "₹50.00", "15/10/2026", "Refund"],
    ["Money Received", "₹7.00", "17/10/2026"],
  ];
  const expenseItems = [
    ["Expense", "₹12.34", "14/10/2026", "Lunch"],
    ["Expense", "₹2.50", "16/10/2026", "Tea"],
  ];

  selectFilter(elements, "income");
  expectInOrder(renderedTexts(elements), incomeItems);
  assert.deepEqual(radioStates(elements), { all: false, income: true, expenses: false });

  selectFilter(elements, "expenses");
  expectInOrder(renderedTexts(elements), expenseItems);
  assert.deepEqual(radioStates(elements), { all: false, income: false, expenses: true });

  selectFilter(elements, "all");
  expectInOrder(renderedTexts(elements), [
    expenseItems[0],
    incomeItems[0],
    expenseItems[1],
    incomeItems[1],
  ]);
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });

  for (const key of ["income", "income", "expenses", "all", "income", "all"]) {
    selectFilter(elements, key);
    const expectedCount = key === "all" ? 4 : 2;
    assert.equal(renderedArticles(elements).length, expectedCount, `count under ${key}`);
    assert.equal(emptyMessages(elements).length, 0);
    assert.equal(elements["transaction-history"].children.length, 1, "no duplicate containers");
  }
});

test("integration: Income with only expenses stored shows a live-region message, not the add prompt", () => {
  const { elements } = createApp(envelopeStorage([EXPENSE_A, EXPENSE_B]));

  elements["empty-state"].hidden = false; // sentinel
  selectFilter(elements, "income");

  const messages = emptyMessages(elements);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].tagName, "p");
  assert.equal(messages[0].textContent, "No income transactions found.");
  assert.equal(elements["transaction-history"].children.length, 1);
  assert.equal(elements["transaction-history"].children.includes(messages[0]), true);
  assert.equal(renderedArticles(elements).length, 0);
  assert.equal(collectTagNames(elements["transaction-history"]).includes("article"), false);
  assert.equal(
    collectText(elements["transaction-history"]).includes("No income transactions found."),
    true,
  );
  assert.equal(elements["empty-state"].hidden, true);
  // The add prompt must not be rendered into the history region in place of the filter message.
  assert.equal(
    collectText(elements["transaction-history"]).includes("No transactions yet"),
    false,
  );
});

test("integration: Expenses with only income stored shows the expense message", () => {
  const { elements } = createApp(envelopeStorage([INCOME_A, INCOME_B]));

  elements["empty-state"].hidden = false; // sentinel
  selectFilter(elements, "expenses");

  const messages = emptyMessages(elements);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].textContent, "No expense transactions found.");
  assert.equal(renderedArticles(elements).length, 0);
  assert.equal(elements["empty-state"].hidden, true);

  selectFilter(elements, "income");
  assert.equal(emptyMessages(elements).length, 0, "message replaced by the list");
  assert.equal(renderedArticles(elements).length, 2);

  selectFilter(elements, "all");
  assert.equal(emptyMessages(elements).length, 0);
  assert.equal(renderedArticles(elements).length, 2);
});

test("integration: an invalid filter value falls back to All and re-syncs the radios", () => {
  const { context, elements } = createApp(envelopeStorage(MIXED));
  const { setActiveFilter, getActiveFilter } = context.__appTest;

  selectFilter(elements, "income");
  assert.equal(getActiveFilter(), "income");
  assert.equal(renderedArticles(elements).length, 2);

  setActiveFilter("bogus");
  assert.equal(getActiveFilter(), "all");
  assert.equal(renderedArticles(elements).length, 4);
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });

  selectFilter(elements, "expenses");
  setActiveFilter("constructor");
  assert.equal(getActiveFilter(), "all");
  assert.equal(renderedArticles(elements).length, 4);
});

test("integration: filtering never reads or writes storage and leaves the stored envelope identical", () => {
  const storage = envelopeStorage(MIXED);
  const { elements } = createApp(storage);
  const writesBefore = storage.writes.length;
  const readsBefore = storage.reads;
  const envelopeBefore = storage.values.get("transactions");

  for (const key of ["income", "expenses", "all", "income", "all"]) {
    selectFilter(elements, key);
  }

  assert.equal(storage.writes.length, writesBefore, "setItem called during filtering");
  assert.equal(storage.reads, readsBefore, "getItem called during filtering");
  assert.equal(storage.values.get("transactions"), envelopeBefore);
  assert.deepEqual([...storage.values.keys()], ["transactions"]);
});

test("integration: the available balance always reflects every record, not the filtered view", () => {
  const { elements } = createApp(envelopeStorage(MIXED));
  assert.equal(elements["balance-amount"].textContent, MIXED_BALANCE);

  elements["balance-amount"].textContent = "SENTINEL"; // any balance write would replace it
  elements["balance-amount"].hidden = false;
  for (const key of ["income", "expenses", "all"]) {
    selectFilter(elements, key);
    assert.equal(elements["balance-amount"].textContent, "SENTINEL", `balance touched under ${key}`);
    assert.equal(elements["balance-amount"].hidden, false);
  }

  selectFilter(elements, "income");
  addTransaction(elements, { type: "Expense", amount: "1.00" });
  assert.equal(elements["balance-amount"].textContent, "₹141.16");
});

test("integration: state-not-persisted: filter selection is not stored and a re-created app starts at All", () => {
  const storage = envelopeStorage(MIXED);
  const first = createApp(storage);
  selectFilter(first.elements, "income");
  assert.equal(first.context.__appTest.getActiveFilter(), "income");
  const writesBefore = storage.writes.length;
  const keysBefore = [...storage.values.keys()];

  const second = createApp(storage);

  assert.equal(second.context.__appTest.getActiveFilter(), "all");
  assert.deepEqual(radioStates(second.elements), { all: true, income: false, expenses: false });
  assert.equal(renderedArticles(second.elements).length, 4);
  assert.equal(storage.writes.length, writesBefore);
  assert.deepEqual([...storage.values.keys()], keysBefore);
  assert.deepEqual(keysBefore, ["transactions"]);
  assert.equal(storage.values.get("transactions").includes("income"), false);
});

test("integration: adding a non-matching record under Income saves it but keeps it hidden", () => {
  const storage = envelopeStorage([INCOME_A]);
  const { context, elements } = createApp(storage);
  selectFilter(elements, "income");
  assert.equal(renderedArticles(elements).length, 1);

  addTransaction(elements, { type: "Expense", amount: "3.00", note: "Snack" });

  assert.equal(transactionsFrom(storage).length, 2);
  assert.equal(transactionsFrom(storage)[1].type, "Expense");
  assert.equal(elements["balance-amount"].textContent, "₹147.00");
  assert.equal(elements["save-status"].textContent, "Transaction added.");
  assert.equal(elements["form-error"].textContent, "");
  assert.equal(context.__appTest.getActiveFilter(), "income");
  assert.deepEqual(radioStates(elements), { all: false, income: true, expenses: false });
  assert.equal(renderedArticles(elements).length, 1);
  assert.equal(collectText(elements["transaction-history"]).includes("Snack"), false);

  selectFilter(elements, "all");
  assert.equal(renderedArticles(elements).length, 2);
  assert.equal(collectText(elements["transaction-history"]).includes("Snack"), true);
});

test("integration: adding a matching record under Income renders it immediately", () => {
  const storage = envelopeStorage([INCOME_A]);
  const { context, elements } = createApp(storage);
  selectFilter(elements, "income");

  addTransaction(elements, { type: "Money Received", amount: "2.00", note: "Bonus" });

  assert.equal(transactionsFrom(storage).length, 2);
  assert.equal(elements["save-status"].textContent, "Transaction added.");
  assert.equal(context.__appTest.getActiveFilter(), "income");
  assert.equal(renderedArticles(elements).length, 2);
  assert.equal(collectText(elements["transaction-history"]).includes("Bonus"), true);
  assert.equal(elements["balance-amount"].textContent, "₹152.00");
});

test("integration: adding under a filter replaces or keeps the empty-filter message correctly", () => {
  const storage = envelopeStorage([EXPENSE_A]);
  const { elements } = createApp(storage);
  selectFilter(elements, "income");
  assert.equal(emptyMessages(elements).length, 1);

  addTransaction(elements, { type: "Expense", amount: "1.00" });
  assert.equal(emptyMessages(elements).length, 1, "message remains for a non-matching add");
  assert.equal(emptyMessages(elements)[0].textContent, "No income transactions found.");
  assert.equal(renderedArticles(elements).length, 0);

  addTransaction(elements, { type: "Money Received", amount: "2.00", note: "Bonus" });
  assert.equal(emptyMessages(elements).length, 0, "message replaced by the list");
  assert.equal(renderedArticles(elements).length, 1);
  assert.equal(collectText(elements["transaction-history"]).includes("Bonus"), true);
  assert.equal(transactionsFrom(storage).length, 3);
});

test("integration: first record added under a filter shows the filter message, not the add prompt", () => {
  const storage = createStorage();
  const { elements } = createApp(storage);
  selectFilter(elements, "income");
  assert.equal(elements["empty-state"].hidden, false); // sentinel precondition

  addTransaction(elements, { type: "Expense", amount: "4.00" });

  assert.equal(transactionsFrom(storage).length, 1);
  assert.equal(emptyMessages(elements).length, 1);
  assert.equal(emptyMessages(elements)[0].textContent, "No income transactions found.");
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(elements["save-status"].textContent, "Transaction added.");
});

test("integration: a failed save under a filter keeps the selection, list, and error feedback", () => {
  const storage = envelopeStorage([INCOME_A, EXPENSE_A], { failWrites: true });
  const { context, elements } = createApp(storage);
  selectFilter(elements, "income");
  const before = renderedTexts(elements);

  addTransaction(elements, { type: "Money Received", amount: "9.00", note: "Keep" });

  assert.match(elements["form-error"].textContent, /could not be saved/i);
  assert.equal(elements["save-status"].textContent, "");
  assert.equal(context.__appTest.getActiveFilter(), "income");
  assert.deepEqual(radioStates(elements), { all: false, income: true, expenses: false });
  assert.deepEqual(renderedTexts(elements), before);
  assert.equal(transactionsFrom(storage).length, 2);
});

test("integration: markup-like notes are literal text under Income and Expenses filters", () => {
  const noteValue = "<img src=x onerror=alert(1)>";
  for (const [key, type] of [
    ["income", "Money Received"],
    ["expenses", "Expense"],
  ]) {
    const { elements } = createApp(createStorage());
    selectFilter(elements, key);

    addTransaction(elements, { type, amount: "1.00", note: noteValue });

    const history = elements["transaction-history"];
    assert.equal(renderedArticles(elements).length, 1, `item shown under ${key}`);
    assert.equal(collectText(history).includes(noteValue), true);
    assert.equal(collectTagNames(history).includes("img"), false);
  }
});

const failedLoadScenarios = [
  ["corrupt storage", () => createStorage({ transactions: "{bad json" })],
  ["storage read failure", () => createStorage({}, { failReads: true })],
];

for (const [label, makeStorage] of failedLoadScenarios) {
  test(`integration: load failure (${label}) hides the filter and shows only the load error`, () => {
    const { elements } = createApp(makeStorage(), { emptyStateHidden: false });
    const history = elements["transaction-history"];

    assert.notEqual(elements["load-error"].textContent, "");
    assert.equal(hasClass(elements["history-filter"], "hide"), true);
    assert.equal(history.children.length, 0);
    assert.equal(emptyMessages(elements).length, 0);
    assert.doesNotMatch(
      collectText(history) + collectText(elements["load-error"]),
      /No (?:income|expense) transactions found/,
    );
    assert.equal(elements["empty-state"].hidden, true);
    assert.equal(elements["balance-amount"].hidden, true);
    assert.equal(elements["save-transaction"].disabled, true);
  });

  test(`integration: filter changes are ignored while the load has failed (${label})`, () => {
    const { context, elements } = createApp(makeStorage(), { emptyStateHidden: false });
    assert.equal(elements["empty-state"].hidden, true);

    selectFilter(elements, "income");
    selectFilter(elements, "expenses");

    // An unguarded render of the empty list would add a container and flip hidden to false.
    assert.equal(context.__appTest.getActiveFilter(), "all");
    assert.equal(elements["transaction-history"].children.length, 0);
    assert.equal(emptyMessages(elements).length, 0);
    assert.equal(elements["empty-state"].hidden, true);
    assert.equal(hasClass(elements["history-filter"], "hide"), true);
  });
}

test("integration: retry after a failed load reveals the filter and renders under All", () => {
  const options = { failReads: true };
  const { context, elements } = createApp(envelopeStorage(MIXED, options));
  assert.equal(hasClass(elements["history-filter"], "hide"), true);

  options.failReads = false;
  elements["retry-load"].dispatch("click");

  assert.equal(hasClass(elements["history-filter"], "hide"), false);
  assert.equal(context.__appTest.getActiveFilter(), "all");
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
  assert.equal(renderedArticles(elements).length, 4);

  selectFilter(elements, "income");
  assert.equal(renderedArticles(elements).length, 2);
});

test("integration: a load failure after a successful load hides the filter and clears the filter message", () => {
  const options = {};
  const { context, elements } = createApp(envelopeStorage([EXPENSE_A], options), {
    emptyStateHidden: false,
  });
  selectFilter(elements, "income");
  assert.equal(hasClass(elements["history-filter"], "hide"), false);
  assert.equal(emptyMessages(elements).length, 1);
  assert.equal(elements["balance-amount"].hidden, false);

  options.failReads = true;
  elements["empty-state"].hidden = false; // sentinel
  context.__appTest.loadTransactions();

  assert.equal(hasClass(elements["history-filter"], "hide"), true);
  assert.equal(elements["transaction-history"].children.length, 0);
  assert.equal(emptyMessages(elements).length, 0);
  assert.notEqual(elements["load-error"].textContent, "");
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(elements["balance-amount"].hidden, true);

  selectFilter(elements, "expenses"); // ignored: repository is not ready
  assert.equal(elements["transaction-history"].children.length, 0);
  assert.equal(hasClass(elements["history-filter"], "hide"), true);
});

test("integration: start-up with saved records shows no load-error state (activeFilter declared before first use)", () => {
  const { context, elements } = createApp(envelopeStorage(MIXED), { emptyStateHidden: false });

  // Behavioral guard for the declaration order: reading activeFilter before its `let` runs would
  // throw inside the first load, which would surface as a load-error state instead of the list.
  assert.equal(elements["load-error"].textContent, "");
  assert.equal(hasClass(elements["load-error"], "hide"), true);
  assert.equal(hasClass(elements["retry-load"], "hide"), true);
  assert.equal(hasClass(elements["history-filter"], "hide"), false);
  assert.equal(elements["balance-amount"].textContent, MIXED_BALANCE);
  assert.equal(elements["balance-amount"].hidden, false);
  assert.equal(renderedArticles(elements).length, 4);
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(context.__appTest.getActiveFilter(), "all");
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
});

test("integration: start-up projects the All selection onto every radio explicitly", () => {
  for (const storage of [createStorage(), envelopeStorage(MIXED)]) {
    const { elements } = createApp(storage);
    assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
    assert.equal(elements["filter-income"].checked, false);
    assert.equal(elements["filter-expenses"].checked, false);
  }
});

test("integration: default harness has no window.addEventListener and start-up still succeeds", () => {
  const { context, elements } = createApp(envelopeStorage(MIXED));

  assert.equal(vm.runInContext("typeof window.addEventListener", context), "undefined");
  assert.equal(elements["load-error"].textContent, "");
  assert.equal(elements["balance-amount"].textContent, MIXED_BALANCE);
  assert.equal(renderedArticles(elements).length, 4);
});

test("integration: pageshow re-projects the in-memory selection onto the radios without re-rendering", () => {
  const windowEvents = {};
  const { context, elements } = createApp(envelopeStorage(MIXED), { windowEvents });
  assert.equal(typeof windowEvents.pageshow, "function");

  // Late restoration of form state while All is the active filter.
  elements["filter-income"].checked = true;
  const listBefore = renderedTexts(elements);
  windowEvents.pageshow();
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
  assert.deepEqual(renderedTexts(elements), listBefore);

  // Same, with Income active: radios and list stay in agreement with the state.
  selectFilter(elements, "income");
  const incomeList = renderedTexts(elements);
  elements["filter-all"].checked = true;
  elements["filter-income"].checked = false;
  windowEvents.pageshow();
  assert.equal(context.__appTest.getActiveFilter(), "income");
  assert.deepEqual(radioStates(elements), { all: false, income: true, expenses: false });
  assert.deepEqual(renderedTexts(elements), incomeList);
  assert.equal(incomeList.length, 2);
});

// ---------------------------------------------------------------------------
// AG-10 follow-up (Batch 4): gap tests G-1..G-4 from the Stage 7 verification report
// ---------------------------------------------------------------------------

test("integration: a render failure inside setActiveFilter leaves the committed filter, radios, and list untouched", () => {
  const { context, elements, document } = createApp(envelopeStorage(MIXED));
  const { setActiveFilter, getActiveFilter } = context.__appTest;
  const history = elements["transaction-history"];
  const listNodeBefore = history.children[0];
  const textsBefore = renderedTexts(elements);
  assert.equal(textsBefore.length, 4);
  assert.equal(getActiveFilter(), "all");

  // Make the next createElement call (the first one the filter render makes) throw once.
  const realCreateElement = document.createElement;
  let injectedFailures = 0;
  document.createElement = (tagName) => {
    if (injectedFailures === 0) {
      injectedFailures += 1;
      throw new Error("injected createElement failure");
    }
    return realCreateElement(tagName);
  };

  // Render-first, commit-after: the throw must happen before activeFilter is assigned.
  assert.throws(() => setActiveFilter("income"), /injected createElement failure/);
  assert.equal(injectedFailures, 1, "the injected failure must have fired inside the render");
  assert.equal(getActiveFilter(), "all", "activeFilter was committed before the render finished");
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
  assert.equal(history.children[0], listNodeBefore, "the rendered list node was replaced");
  assert.equal(history.children.length, 1);
  assert.deepEqual(renderedTexts(elements), textsBefore);

  // Same through the change listener: the failure propagates and nothing is committed.
  injectedFailures = 0;
  assert.throws(() => selectFilter(elements, "expenses"), /injected createElement failure/);
  assert.equal(injectedFailures, 1);
  assert.equal(getActiveFilter(), "all");
  assert.deepEqual(radioStates(elements), { all: true, income: false, expenses: false });
  assert.deepEqual(renderedTexts(elements), textsBefore);

  // Once the fault is gone the same call succeeds and commits normally.
  document.createElement = realCreateElement;
  setActiveFilter("income");
  assert.equal(getActiveFilter(), "income");
  assert.deepEqual(radioStates(elements), { all: false, income: true, expenses: false });
  assert.equal(renderedArticles(elements).length, 2);
});

test("integration: start-up and the add flow work when the filter elements are missing from the page", () => {
  const filterIds = ["history-filter", "filter-all", "filter-income", "filter-expenses"];
  const storage = envelopeStorage([EXPENSE_A, INCOME_A]);
  const { context, elements } = createApp(storage, {
    omitIds: filterIds,
    emptyStateHidden: false,
  });

  for (const id of filterIds) {
    assert.equal(elements[id], undefined, `#${id} should be absent from the fake page`);
  }
  assert.equal(elements["load-error"].textContent, "");
  assert.equal(hasClass(elements["load-error"], "hide"), true);
  assert.equal(hasClass(elements["retry-load"], "hide"), true);
  assert.equal(elements["save-transaction"].disabled, false);
  assert.equal(elements["balance-amount"].hidden, false);
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(context.__appTest.getActiveFilter(), "all");
  assert.equal(renderedArticles(elements).length, 2);

  addTransaction(elements, { type: "Money Received", amount: "2.00", note: "Bonus" });

  assert.equal(transactionsFrom(storage).length, 3);
  assert.equal(elements["save-status"].textContent, "Transaction added.");
  assert.equal(elements["form-error"].textContent, "");
  assert.equal(elements["balance-amount"].textContent, "₹139.66");
  assert.equal(renderedArticles(elements).length, 3);
  assert.equal(collectText(elements["transaction-history"]).includes("Bonus"), true);

  // The state setter also tolerates the missing radios.
  context.__appTest.setActiveFilter("income");
  assert.equal(context.__appTest.getActiveFilter(), "income");
  assert.equal(renderedArticles(elements).length, 2);
  context.__appTest.setActiveFilter("all");
  assert.equal(renderedArticles(elements).length, 3);
});

test("integration: start-up with empty storage works when the filter elements are missing", () => {
  const { elements } = createApp(createStorage(), {
    omitIds: ["history-filter", "filter-all", "filter-income", "filter-expenses"],
  });

  assert.equal(elements["load-error"].textContent, "");
  assert.equal(elements["empty-state"].hidden, false);
  assert.equal(elements["save-transaction"].disabled, false);

  addTransaction(elements, { type: "Expense", amount: "1.00" });

  assert.equal(elements["save-status"].textContent, "Transaction added.");
  assert.equal(elements["empty-state"].hidden, true);
  assert.equal(renderedArticles(elements).length, 1);
});

const describeNode = (node) => ({
  tagName: node.tagName,
  className: node.className,
  textContent: node.textContent,
  attributes: { ...node.attributes },
  children: node.children.map(describeNode),
});

test("integration: an item is rendered identically under All and under its matching filter", () => {
  const { elements } = createApp(envelopeStorage(MIXED));
  const describeAll = () => renderedArticles(elements).map(describeNode);

  // MIXED order: EXPENSE_A, INCOME_A, EXPENSE_B, INCOME_B
  const underAll = describeAll();
  assert.equal(underAll.length, 4);
  // Guard against a vacuous comparison: the with-note and without-note shapes both carry content.
  assert.deepEqual(
    underAll[1].children.map((child) => child.className),
    ["transaction-heading", "transaction-meta", "transaction-note"],
  );
  assert.deepEqual(
    underAll[3].children.map((child) => child.className),
    ["transaction-heading", "transaction-meta"],
  );
  assert.equal(underAll[1].className, "transaction-item");
  assert.equal(underAll[1].tagName, "article");

  selectFilter(elements, "income");
  const underIncome = describeAll();
  assert.equal(underIncome.length, 2);
  assert.deepEqual(underIncome[0], underAll[1]);
  assert.deepEqual(underIncome[1], underAll[3]);

  selectFilter(elements, "expenses");
  const underExpenses = describeAll();
  assert.equal(underExpenses.length, 2);
  assert.deepEqual(underExpenses[0], underAll[0]);
  assert.deepEqual(underExpenses[1], underAll[2]);

  // Back to All reproduces the original structure exactly.
  selectFilter(elements, "all");
  assert.deepEqual(describeAll(), underAll);
});

test("integration: a load failure at start-up hides a filter that was visible, so the hide comes from the script", () => {
  for (const [label, makeStorage] of failedLoadScenarios) {
    const { elements } = createApp(makeStorage(), {
      emptyStateHidden: false,
      filterHiddenAtStart: false,
    });

    assert.notEqual(elements["load-error"].textContent, "", `${label}: load-error expected`);
    assert.equal(hasClass(elements["history-filter"], "hide"), true, `${label}: filter not hidden`);
    assert.equal(elements["transaction-history"].children.length, 0);
    assert.equal(elements["empty-state"].hidden, true);
  }
});
