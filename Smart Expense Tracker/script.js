class Expense {
  constructor({ id, title, amount, category, type, date, note }) {
    this.id = id;
    this.title = title;
    this.amount = Number(amount);
    this.category = category;
    this.type = type;
    this.date = date;
    this.note = note || "";
  }

  signedAmount() {
    return this.type === "income" ? this.amount : -this.amount;
  }
}

class ExpenseTracker {
  constructor(storageKey = "hisaab-expenses") {
    this.storageKey = storageKey;
    this.expenses = this.load();
  }

  add(expense) {
    this.expenses.push(expense);
    this.save();
  }

  delete(id) {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.save();
  }

  edit(id, updates) {
    this.expenses = this.expenses.map((e) =>
      e.id === id ? new Expense({ ...e, ...updates }) : e
    );
    this.save();
  }

  find(id) {
    return this.expenses.find((e) => e.id === id);
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.expenses));
  }

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return seedExpenses();
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((e) => new Expense(e));
    } catch {
      return seedExpenses();
    }
  }
}

function seedExpenses() {
  return [
    new Expense({ id: 1, title: "Freelance — landing page", amount: 25000, category: "income", type: "income", date: "2026-08-26" }),
    new Expense({ id: 2, title: "Grocery run — Metro", amount: 4250, category: "food", type: "expense", date: "2026-08-25" }),
    new Expense({ id: 3, title: "Careem to campus", amount: 380, category: "transport", type: "expense", date: "2026-08-24" }),
    new Expense({ id: 4, title: "VU semester dues", amount: 7800, category: "bills", type: "expense", date: "2026-08-22" }),
  ];
}

const tracker = new ExpenseTracker();

function createBudgetMonitor(limit) {
  let spent = 0;

  return function track(amount) {
    spent += amount;
    const pct = Math.min(Math.round((spent / limit) * 100), 999);
    return { spent, limit, pct, isOver: spent > limit, isNear: pct >= 80 };
  };
}

const FOOD_BUDGET_LIMIT = 10000;
const trackFoodBudget = createBudgetMonitor(FOOD_BUDGET_LIMIT);

function refreshBudgetAlert() {
  const monitor = createBudgetMonitor(FOOD_BUDGET_LIMIT);
  let result = { pct: 0, spent: 0 };
  tracker.expenses
    .filter((e) => e.category === "food" && e.type === "expense")
    .forEach((e) => { result = monitor(e.amount); });

  const pctEl = document.getElementById("budget-alert-pct");
  const fillEl = document.getElementById("budget-alert-fill");
  const banner = document.querySelector(".budget-alert");

  pctEl.textContent = `${result.pct}%`;
  fillEl.style.width = `${Math.min(result.pct, 100)}%`;
  banner.style.display = result.pct >= 80 ? "grid" : "none";
}

const CATEGORY_META = {
  income:     { label: "Income",             color: "var(--income)",       iconClass: "t-icon--income" },
  food:       { label: "Food & Grocery",     color: "var(--c-food)",       iconClass: "t-icon--food" },
  transport:  { label: "Transport",          color: "var(--c-transport)",  iconClass: "t-icon--transport" },
  bills:      { label: "Bills & Utilities",  color: "var(--c-bills)",      iconClass: "t-icon--bills" },
  education:  { label: "Education",          color: "var(--c-education)", iconClass: "t-icon--education" },
  other:      { label: "Other",              color: "var(--ink-faint)",   iconClass: "t-icon--bills" },
};

function computeTotals() {
  const income = tracker.expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const expense = tracker.expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  return { income, expense, net: income - expense };
}

function computeCategoryTotals() {
  const expenseOnly = tracker.expenses.filter((e) => e.type === "expense");
  const totalExpense = expenseOnly.reduce((sum, e) => sum + e.amount, 0) || 1;

  const byCategory = expenseOnly.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: Math.round((amount / totalExpense) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

let usdRate = 0.00357;
let displayCurrency = "PKR";

async function fetchExchangeRate() {
  const loading = document.getElementById("loading-state");
  loading.classList.add("is-visible");

  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=PKR");
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    const pkrPerUsd = data?.rates?.PKR;
    if (pkrPerUsd) {
      usdRate = 1 / pkrPerUsd;
      document.getElementById("fx-rate").textContent = `1 USD ≈ ₨ ${pkrPerUsd.toFixed(2)}`;
    }
  } catch (err) {
    console.warn("Exchange rate fetch failed, using fallback rate.", err);
  } finally {
    loading.classList.remove("is-visible");
  }
}

function toDisplayAmount(pkrAmount) {
  return displayCurrency === "PKR"
    ? { sign: "₨", value: Math.round(pkrAmount).toLocaleString() }
    : { sign: "$", value: (pkrAmount * usdRate).toFixed(2) };
}

let activeFilter = "all";
let searchQuery = "";
let sortBy = "date-desc";

function getVisibleExpenses() {
  let list = [...tracker.expenses];

  if (activeFilter !== "all") {
    list = list.filter((e) => e.type === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((e) => e.title.toLowerCase().includes(q));
  }

  list.sort((a, b) => {
    switch (sortBy) {
      case "date-asc":     return new Date(a.date) - new Date(b.date);
      case "amount-desc":  return b.amount - a.amount;
      case "amount-asc":   return a.amount - b.amount;
      case "date-desc":
      default:             return new Date(b.date) - new Date(a.date);
    }
  });

  return list;
}

function iconSvg(category) {
  const paths = {
    income:    '<path d="M12 19V5M5 12l7-7 7 7"/>',
    food:      '<path d="M7 3v18M7 3a3 3 0 013 3v3a3 3 0 01-3 3M17 3v18M17 3a4 4 0 00-4 4v3"/>',
    transport: '<path d="M3 13l2-6a2 2 0 012-1.5h10A2 2 0 0119 7l2 6M5 13h14v5H5zM7 18v2M17 18v2"/>',
    bills:     '<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>',
    education: '<path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    other:     '<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>',
  };
  return paths[category] || paths.other;
}

function renderTransactions() {
  const listEl = document.getElementById("transaction-list");
  const emptyEl = document.getElementById("empty-state");
  const visible = getVisibleExpenses();

  listEl.innerHTML = "";

  emptyEl.classList.toggle("is-visible", visible.length === 0);

  visible.forEach((e) => {
    const meta = CATEGORY_META[e.category] || CATEGORY_META.other;

    const li = document.createElement("li");
    li.className = "transaction";
    li.dataset.id = e.id;
    li.dataset.category = e.category;
    li.dataset.type = e.type;

    const amt = toDisplayAmount(e.amount);
    const sign = e.type === "income" ? "+" : "−";

    li.innerHTML = `
      <span class="t-icon ${meta.iconClass}" aria-hidden="true">
        <svg viewBox="0 0 24 24">${iconSvg(e.category)}</svg>
      </span>
      <span class="t-main">
        <strong>${e.title}</strong>
        <span class="t-meta">${meta.label} · ${formatDate(e.date)}</span>
      </span>
      <span class="t-amount ${e.type}">${sign} ${amt.sign} ${amt.value}</span>
      <span class="t-actions">
        <button class="icon-btn sm" type="button" aria-label="Edit transaction" data-action="edit">
          <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button class="icon-btn sm" type="button" aria-label="Delete transaction" data-action="delete">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </span>
    `;
    listEl.appendChild(li);
  });
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function renderCategoryBars() {
  const container = document.getElementById("category-bars");
  const totals = computeCategoryTotals();
  container.innerHTML = "";

  totals.forEach(({ category, amount, pct }) => {
    const meta = CATEGORY_META[category] || CATEGORY_META.other;
    const li = document.createElement("li");
    li.className = "category-bar";
    li.dataset.category = category;
    const amt = toDisplayAmount(amount);
    li.innerHTML = `
      <div class="category-bar-label">
        <span class="dot" style="--dot: ${meta.color};"></span>
        ${meta.label}
        <span class="category-bar-amt">${amt.sign} ${amt.value}</span>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width:${pct}%; background:${meta.color};"></div>
      </div>
    `;
    container.appendChild(li);
  });
}

function renderSummary() {
  const { income, expense, net } = computeTotals();
  const balanceAmt = toDisplayAmount(income - expense < 0 ? 0 : income - expense);
  const incomeAmt = toDisplayAmount(income);
  const expenseAmt = toDisplayAmount(expense);
  const netAmt = toDisplayAmount(Math.abs(net));

  document.getElementById("balance-amount").textContent = balanceAmt.value;
  document.querySelector("[data-currency-sign]").textContent = balanceAmt.sign;

  document.getElementById("total-income").textContent = `+ ${incomeAmt.sign} ${incomeAmt.value}`;
  document.getElementById("total-expense").textContent = `− ${expenseAmt.sign} ${expenseAmt.value}`;
  document.getElementById("net-change").textContent = `${net >= 0 ? "+" : "−"} ${netAmt.sign} ${netAmt.value}`;

  const savingsRate = income > 0 ? Math.max(Math.round((net / income) * 100), 0) : 0;
  document.getElementById("savings-rate").textContent = `${savingsRate}%`;
  document.querySelector(".gauge").style.setProperty("--gauge-value", savingsRate);
}

function renderAll() {
  renderSummary();
  renderCategoryBars();
  renderTransactions();
  refreshBudgetAlert();
}

document.getElementById("expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  const title = form.title.value.trim();
  const amount = parseFloat(form.amount.value);
  const date = form.date.value;
  const category = form.category.value;
  const type = form.type.value;
  const note = form.note.value.trim();

  if (!title || !amount || !date || !category) return;

  tracker.add(new Expense({
    id: Date.now(),
    title, amount, category, type, date, note,
  }));

  form.reset();
  renderAll();
});

document.getElementById("transaction-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const row = button.closest(".transaction");
  const id = Number(row.dataset.id);

  if (button.dataset.action === "delete") {
    tracker.delete(id);
    renderAll();
  }

  if (button.dataset.action === "edit") {
    const existing = tracker.find(id);
    const newAmount = prompt(`New amount for "${existing.title}"`, existing.amount);
    if (newAmount && !isNaN(newAmount)) {
      tracker.edit(id, { amount: parseFloat(newAmount) });
      renderAll();
    }
  }
});

document.getElementById("search-input").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderTransactions();
});

document.getElementById("sort-select").addEventListener("change", (event) => {
  sortBy = event.target.value;
  renderTransactions();
});

document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip[data-filter]").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    renderTransactions();
  });
});

document.getElementById("currency-pkr").addEventListener("click", () => switchCurrency("PKR"));
document.getElementById("currency-usd").addEventListener("click", () => switchCurrency("USD"));

function switchCurrency(currency) {
  displayCurrency = currency;
  document.getElementById("currency-pkr").classList.toggle("is-active", currency === "PKR");
  document.getElementById("currency-usd").classList.toggle("is-active", currency === "USD");
  renderAll();
}

(async function init() {
  await fetchExchangeRate();
  renderAll();
})();