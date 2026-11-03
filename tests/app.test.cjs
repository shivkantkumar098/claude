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
  return {
    values,
    getItem(key) {
      if (options.failReads) {
        throw new Error("storage read denied");
      }
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (options.failWrites) {
        throw new Error("storage quota exceeded");
      }
      values.set(key, String(value));
    },
  };
};

const createApp = (storage = createStorage(), initialFilterValue = "all") => {
  const ids = [
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
    "history-filter-row",
    "filter-empty-state",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  Object.entries(elements).forEach(([id, element]) => {
    element.id = id;
  });
  elements["transaction-form"].elementsById = elements;
  elements["transaction-type"].value = "Expense";
  elements["history-filter"].value = initialFilterValue;

  let nextId = 1;
  const window = {
    localStorage: storage,
    crypto: {
      randomUUID: () => `test-${nextId++}`,
    },
  };
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
      HISTORY_FILTERS,
      filterTransactions,
      FILTER_FAILURE_MESSAGE
    };`,
    context,
    { filename: "script.js" },
  );

  return { context, elements, storage };
};

const transactionsFrom = (storage) =>
  JSON.parse(storage.values.get("transactions")).transactions;

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
    "history-filter-row",
    "filter-empty-state",
  ]) {
    assert.match(htmlSource, new RegExp(`\\bid="${id}"`), `missing #${id}`);
  }

  assert.match(htmlSource, /<label\b[^>]*for="history-filter"[^>]*>\s*Show\s*<\/label>/);
  const selectMatch = htmlSource.match(/<select\b[^>]*id="history-filter"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(selectMatch, "missing history filter select");
  assert.match(selectMatch[0], /autocomplete="off"/);
  const options = [...selectMatch[1].matchAll(/<option\b([^>]*)>\s*([^<]*?)\s*<\/option>/g)].map(
    (match) => ({ value: /value="([^"]*)"/.exec(match[1])[1], text: match[2], attrs: match[1] }),
  );
  assert.deepEqual(
    options.map(({ value, text }) => [value, text]),
    [
      ["all", "All"],
      ["income", "Income"],
      ["expenses", "Expenses"],
    ],
  );
  assert.match(options[0].attrs, /\bselected\b/);
  assert.match(htmlSource, /<p id="filter-empty-state" role="status"><\/p>/);

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

  app = createApp(storage);
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
  const { elements } = createApp(storage);

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

const seedStorage = (entries) =>
  createStorage({
    transactions: JSON.stringify({ schemaVersion: 1, transactions: entries }),
  });

const MIXED = [
  { id: "t1", type: "Money Received", amountInPaise: 10000, date: "2026-10-01" },
  { id: "t2", type: "Expense", amountInPaise: 2500, date: "2026-10-02", note: "Lunch" },
  { id: "t3", type: "Money Received", amountInPaise: 500, date: "2026-10-03" },
  { id: "t4", type: "Expense", amountInPaise: 100, date: "2026-10-04" },
];

const changeFilter = (elements, value) => {
  elements["history-filter"].value = value;
  elements["history-filter"].dispatch("change");
};

const listItems = (elements) => elements["transaction-history"].children[0].children;

const itemTypes = (elements) =>
  listItems(elements).map((item) => item.children[0].children[0].textContent);

const domSnapshot = (elements) =>
  JSON.stringify({
    types: elements["transaction-history"].children.length ? itemTypes(elements) : [],
    text: collectText(elements["transaction-history"]),
    balance: elements["balance-amount"].textContent,
    balanceHidden: elements["balance-amount"].hidden,
    emptyHidden: elements["empty-state"].hidden,
    filterMessage: elements["filter-empty-state"].textContent,
    rowClass: elements["history-filter-row"].className,
  });

const failArticleCreation = (context) => {
  const originalCreate = context.document.createElement;
  context.document.createElement = (tag) => {
    if (tag === "article") {
      throw new Error("forced render failure");
    }
    return originalCreate(tag);
  };
  return () => {
    context.document.createElement = originalCreate;
  };
};

test("unit: filterTransactions filters by type without mutating or reordering", () => {
  const { context } = createApp();
  const { filterTransactions, HISTORY_FILTERS } = context.__appTest;
  const input = MIXED.map((entry) => ({ ...entry }));
  const before = JSON.stringify(input);

  assert.equal(
    filterTransactions(input, "income").map(({ id }) => id).join(","),
    "t1,t3",
  );
  assert.equal(
    filterTransactions(input, "expenses").map(({ id }) => id).join(","),
    "t2,t4",
  );
  const all = filterTransactions(input, "all");
  assert.equal(all.map(({ id }) => id).join(","), "t1,t2,t3,t4");
  assert.notEqual(all, input);
  for (const unknown of ["x", "constructor", "__proto__", undefined, null, 5]) {
    assert.equal(
      filterTransactions(input, unknown).map(({ id }) => id).join(","),
      "t1,t2,t3,t4",
      `unknown key ${String(unknown)} should behave as All`,
    );
  }
  assert.equal(JSON.stringify(input), before);
  assert.equal(HISTORY_FILTERS.income.emptyMessage, "No income transactions.");
  assert.equal(HISTORY_FILTERS.expenses.emptyMessage, "No expense transactions.");
});

test("integration: filter defaults to All, narrows to Income/Expenses, and returns to All", () => {
  const { elements } = createApp(seedStorage(MIXED));

  assert.equal(elements["history-filter"].value, "all");
  assert.deepEqual(itemTypes(elements), ["Money Received", "Expense", "Money Received", "Expense"]);
  assert.equal(elements["history-filter-row"].className.includes("hide"), false);

  changeFilter(elements, "income");
  assert.deepEqual(itemTypes(elements), ["Money Received", "Money Received"]);
  changeFilter(elements, "expenses");
  assert.deepEqual(itemTypes(elements), ["Expense", "Expense"]);
  changeFilter(elements, "all");
  assert.deepEqual(itemTypes(elements), ["Money Received", "Expense", "Money Received", "Expense"]);
  assert.equal(elements["filter-empty-state"].textContent, "");
});

test("integration: balance and stored data are unchanged by filtering", () => {
  const storage = seedStorage(MIXED);
  const stored = storage.values.get("transactions");
  const { elements } = createApp(storage);
  const balance = elements["balance-amount"].textContent;

  for (const value of ["income", "expenses", "all"]) {
    changeFilter(elements, value);
    assert.equal(elements["balance-amount"].textContent, balance);
    assert.equal(elements["balance-amount"].hidden, false);
    assert.equal(storage.values.get("transactions"), stored);
  }
});

test("integration: filter with no matches shows exact message and keeps empty-state hidden", () => {
  const { context, elements } = createApp(seedStorage([MIXED[0], MIXED[2]]));
  const { HISTORY_FILTERS } = context.__appTest;

  changeFilter(elements, "expenses");
  assert.equal(itemTypes(elements).length, 0);
  assert.equal(elements["filter-empty-state"].textContent, HISTORY_FILTERS.expenses.emptyMessage);
  assert.equal(elements["empty-state"].hidden, true);

  changeFilter(elements, "income");
  assert.equal(elements["filter-empty-state"].textContent, "");

  const second = createApp(seedStorage([MIXED[1]]));
  changeFilter(second.elements, "income");
  assert.equal(
    second.elements["filter-empty-state"].textContent,
    second.context.__appTest.HISTORY_FILTERS.income.emptyMessage,
  );
});

test("integration: empty history shows only the original empty state under every filter", () => {
  const { elements } = createApp();

  for (const value of ["income", "expenses", "all"]) {
    changeFilter(elements, value);
    assert.equal(elements["empty-state"].hidden, false);
    assert.equal(elements["filter-empty-state"].textContent, "");
    assert.equal(elements["history-filter-row"].className.includes("hide"), false);
  }
});

test("integration: adding a transaction keeps the active filter and persists", () => {
  const storage = seedStorage([MIXED[0]]);
  const { elements } = createApp(storage);
  changeFilter(elements, "income");

  elements["transaction-amount"].value = "10";
  elements["transaction-type"].value = "Expense";
  elements["transaction-date"].value = "2026-10-14";
  elements["transaction-form"].dispatch("submit");

  assert.equal(transactionsFrom(storage).length, 2);
  assert.equal(elements["history-filter"].value, "income");
  assert.deepEqual(itemTypes(elements), ["Money Received"]);
  assert.equal(elements["balance-amount"].textContent, "₹190.00");
  assert.equal(elements["save-status"].textContent, "Transaction added.");

  elements["transaction-amount"].value = "5";
  elements["transaction-type"].value = "Money Received";
  elements["transaction-date"].value = "2026-10-15";
  elements["transaction-form"].dispatch("submit");
  assert.deepEqual(itemTypes(elements), ["Money Received", "Money Received"]);
  changeFilter(elements, "expenses");
  assert.deepEqual(itemTypes(elements), ["Expense"]);
});

test("integration: markup-like notes stay literal text under each filter", () => {
  const noteValue = "<img src=x onerror=alert(1)>";
  const { elements } = createApp(seedStorage([{ ...MIXED[1], note: noteValue }, MIXED[0]]));

  for (const value of ["all", "expenses", "income", "all"]) {
    changeFilter(elements, value);
    const history = elements["transaction-history"];
    assert.equal(collectTagNames(history).includes("img"), false);
    if (value !== "income") {
      assert.equal(collectText(history).includes(noteValue), true);
    }
  }
});

test("integration: filter change is a no-op while the repository is not ready", () => {
  const { elements } = createApp(createStorage({ transactions: "{bad json" }));
  const before = domSnapshot(elements);

  changeFilter(elements, "income");

  assert.equal(domSnapshot(elements), before);
  assert.equal(elements["form-error"].textContent, "");
});

test("integration: unknown select value normalises to All", () => {
  const { elements } = createApp(seedStorage(MIXED));
  changeFilter(elements, "income");

  changeFilter(elements, "constructor");

  assert.equal(elements["history-filter"].value, "all");
  assert.equal(itemTypes(elements).length, 4);
});

test("integration: load failure hides filter row and message; retry restores them", () => {
  const options = { failReads: true };
  const storage = seedStorage(MIXED);
  const failing = {
    values: storage.values,
    getItem: (key) => {
      if (options.failReads) {
        throw new Error("storage read denied");
      }
      return storage.getItem(key);
    },
    setItem: (key, value) => storage.setItem(key, value),
  };
  const { elements } = createApp(failing);

  assert.equal(elements["history-filter-row"].className.includes("hide"), true);
  assert.equal(elements["filter-empty-state"].textContent, "");
  assert.equal(elements["empty-state"].hidden, true);

  options.failReads = false;
  elements["retry-load"].dispatch("click");
  assert.equal(elements["history-filter-row"].className.includes("hide"), false);
  assert.equal(itemTypes(elements).length, 4);
});

test("integration: failed filter render leaves DOM untouched and restores the previous filter (N-2, F-2)", () => {
  const { context, elements } = createApp(seedStorage([MIXED[0], MIXED[2]]));
  const { FILTER_FAILURE_MESSAGE } = context.__appTest;
  changeFilter(elements, "income");
  const before = domSnapshot(elements);

  const restore = failArticleCreation(context);
  changeFilter(elements, "all");
  restore();

  assert.equal(domSnapshot(elements), before);
  assert.equal(elements["history-filter"].value, "income");
  assert.notEqual(elements["form-error"].textContent, "");
  assert.equal(elements["form-error"].textContent, FILTER_FAILURE_MESSAGE);
  assert.equal(elements["form-error"].className.includes("hide"), false);

  // The previous filter is still the active one for later renders.
  elements["transaction-amount"].value = "1";
  elements["transaction-type"].value = "Expense";
  elements["transaction-date"].value = "2026-10-14";
  elements["transaction-form"].dispatch("submit");
  assert.deepEqual(itemTypes(elements), ["Money Received", "Money Received"]);
});

test("integration: formatINR as the only throwing call does not mutate the DOM (N-2)", () => {
  const { context, elements } = createApp(seedStorage([MIXED[1], MIXED[3]]));
  const before = domSnapshot(elements);

  // Income view has zero rows, so the balance formatting is the only formatINR call.
  vm.runInContext(
    `globalThis.__origNumberFormat = Intl.NumberFormat;
     Intl.NumberFormat = function () { throw new Error("forced format failure"); };`,
    context,
  );
  try {
    changeFilter(elements, "income");
  } finally {
    vm.runInContext("Intl.NumberFormat = globalThis.__origNumberFormat;", context);
  }

  assert.equal(domSnapshot(elements), before);
  assert.equal(elements["history-filter"].value, "all");
  assert.notEqual(elements["form-error"].textContent, "");
});

test("integration: successful filter change clears only the filter failure message (N-5)", () => {
  const { context, elements } = createApp(seedStorage(MIXED));
  const restore = failArticleCreation(context);
  changeFilter(elements, "income");
  restore();
  assert.notEqual(elements["form-error"].textContent, "");

  changeFilter(elements, "expenses");
  assert.equal(elements["form-error"].textContent, "");
  assert.equal(elements["form-error"].className.includes("hide"), true);

  // An unrelated form error is not cleared by a later successful filter change.
  elements["form-error"].textContent = "Unrelated save problem";
  changeFilter(elements, "income");
  assert.equal(elements["form-error"].textContent, "Unrelated save problem");
});

test("integration: select value restored by the browser is re-synced on load (N-1)", () => {
  const { elements } = createApp(seedStorage(MIXED), "income");

  // Init sync forces the select back to the rendered (All) state.
  assert.equal(elements["history-filter"].value, "all");
  assert.equal(itemTypes(elements).length, 4);
});
