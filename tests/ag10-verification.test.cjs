const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

class El {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.hidden = false;
    this.classList = { toggle: () => {} };
  }
  addEventListener(n, cb) { this.listeners[n] = cb; }
  dispatch(n) { this.listeners[n]?.({ preventDefault() {} }); }
  setAttribute() {}
  removeAttribute() {}
  append(...e) { this.children.push(...e); }
  replaceChildren(...e) { this.children = [...e]; }
  reset() {}
}

const build = (records) => {
  const values = new Map();
  let writes = 0;
  if (records) values.set("transactions", JSON.stringify({ schemaVersion: 1, transactions: records }));
  const storage = {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => { writes += 1; values.set(k, String(v)); },
  };
  const ids = ["transaction-date","transaction-form","transaction-type","transaction-amount","transaction-note","transaction-history","empty-state","balance-amount","save-transaction","form-error","save-status","load-error","retry-load","amount-error","type-error","date-error","transaction-filter","filter-empty-state"];
  const els = Object.fromEntries(ids.map((id) => [id, new El()]));
  els["transaction-type"].value = "Expense";
  els["transaction-filter"].value = "all";
  let n = 1;
  const ctx = vm.createContext({
    window: { localStorage: storage, crypto: { randomUUID: () => `v-${n++}` } },
    document: { getElementById: (id) => els[id] || null, createElement: (t) => new El(t) },
    console,
  });
  vm.runInContext(appSource, ctx, { filename: "script.js" });
  return { els, writes: () => writes, values };
};

const types = (els) => els["transaction-history"].children[0].children.map((a) => a.children[0].children[0].textContent);
const pick = (els, v) => { els["transaction-filter"].value = v; els["transaction-filter"].dispatch("change"); };
const rec = (id, type, p) => ({ id, type, amountInPaise: p, date: "2026-10-14" });
const MIXED = [rec("1","Expense",100), rec("2","Money Received",900), rec("3","Expense",300), rec("4","Money Received",50), rec("5","Expense",7)];
const EXPECT = { all: null, income: "Money Received", expenses: "Expense" };

test("verification: balance, storage and order hold for every filter transition", () => {
  const { els, writes, values } = build(MIXED);
  const stored = values.get("transactions");
  const bal = els["balance-amount"].textContent;
  const keys = Object.keys(EXPECT);
  for (const a of keys) for (const b of keys) {
    pick(els, a); pick(els, b);
    const want = EXPECT[b] ? MIXED.filter((r) => r.type === EXPECT[b]).map((r) => r.type) : MIXED.map((r) => r.type);
    assert.deepEqual(types(els), want);
    assert.equal(els["balance-amount"].textContent, bal);
    assert.equal(els["transaction-filter"].value, b);
  }
  assert.equal(writes(), 0);
  assert.equal(values.get("transactions"), stored);
});

test("verification: order within filtered view follows stored order (amount sequence)", () => {
  const { els } = build(MIXED);
  pick(els, "expenses");
  const amounts = els["transaction-history"].children[0].children.map((a) => a.children[0].children[1].textContent);
  assert.equal(amounts.length, 3);
  assert.match(amounts[0], /1\.00/); assert.match(amounts[1], /3\.00/); assert.match(amounts[2], /0\.07/);
});

test("verification: empty-state messages are mutually exclusive for every dataset and filter", () => {
  const sets = { none: [], onlyIncome: MIXED.filter((r) => r.type === "Money Received"), onlyExpense: MIXED.filter((r) => r.type === "Expense"), mixed: MIXED };
  for (const [name, data] of Object.entries(sets)) {
    const { els } = build(data);
    for (const k of Object.keys(EXPECT)) {
      pick(els, k);
      const plain = els["empty-state"].hidden === false;
      const filtered = els["filter-empty-state"].textContent !== "";
      assert.ok(!(plain && filtered), `${name}/${k}: both empty messages shown`);
      const visible = types(els).length;
      assert.equal(plain, data.length === 0, `${name}/${k} plain`);
      assert.equal(filtered, data.length > 0 && visible === 0, `${name}/${k} filtered`);
    }
  }
});

test("verification: adding under each filter persists exactly one write and keeps filter", () => {
  for (const k of Object.keys(EXPECT)) {
    const { els, writes } = build(MIXED);
    pick(els, k);
    els["transaction-amount"].value = "1";
    els["transaction-type"].value = "Money Received";
    els["transaction-date"].value = "2026-10-14";
    els["transaction-form"].dispatch("submit");
    assert.equal(writes(), 1);
    assert.equal(els["transaction-filter"].value, k);
    assert.equal(els["balance-amount"].textContent, "₹" + ((100 + 9 + 0.5 + 1 - 1 - 3 - 0.07)).toFixed(2));
  }
});

test("verification: an empty-string select value (real browser coercion of unknown value) maps to All", () => {
  const { els } = build(MIXED);
  pick(els, "income");
  pick(els, "");
  assert.equal(els["transaction-filter"].value, "all");
  assert.equal(types(els).length, 5);
});
