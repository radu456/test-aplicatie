// Buget Zilnic - Varianta 1 (simplă)
// Totul salvat în localStorage

const LS_KEY = "budgetDaily_v1";

function now() {
  return new Date();
}

function fmtMoney(n) {
  if (isNaN(n)) n = 0;
  return n.toFixed(2);
}

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function defaultState() {
  const d = now();
  const year = d.getFullYear();
  const month = d.getMonth();
  return {
    currentMonth: `${year}-${String(month + 1).padStart(2, "0")}`,
    settings: {
      monthlyBudget: 3100,
      warnThreshold: 65,
      redThreshold: 20,
    },
    expenses: {
      // "YYYY-MM-DD": [{amount, note, time}]
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return parsed || defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = loadState();

function getMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ensureCorrectMonth() {
  const d = now();
  const mk = getMonthKey(d);
  if (state.currentMonth !== mk) {
    // Lună nouă: resetăm cheltuieli
    state.currentMonth = mk;
    state.expenses = {};
    saveState();
  }
}

function sumExpensesForDay(dayKey) {
  const arr = state.expenses[dayKey] || [];
  return arr.reduce((s, x) => s + Number(x.amount || 0), 0);
}

function sumExpensesThisMonth() {
  let total = 0;
  for (const k of Object.keys(state.expenses)) {
    total += sumExpensesForDay(k);
  }
  return total;
}

function daysLeftInMonth(d) {
  const totalDays = daysInMonth(d.getFullYear(), d.getMonth());
  return totalDays - d.getDate();
}

function calcBudget() {
  ensureCorrectMonth();

  const d = now();
  const todayKey = ymd(d);

  const monthlyBudget = Number(state.settings.monthlyBudget || 0);
  const totalDays = daysInMonth(d.getFullYear(), d.getMonth());
  const dailyBase = totalDays > 0 ? monthlyBudget / totalDays : 0;

  const spentMonth = sumExpensesThisMonth();
  const spentToday = sumExpensesForDay(todayKey);

  const remainMonth = monthlyBudget - spentMonth;

  const daysLeft = daysLeftInMonth(d);
  const dailyFuture = daysLeft > 0 ? remainMonth / daysLeft : 0;

  const remainToday = dailyBase - spentToday;

  return {
    todayKey,
    monthlyBudget,
    totalDays,
    dailyBase,
    spentMonth,
    spentToday,
    remainMonth,
    remainToday,
    daysLeft,
    dailyFuture,
    dailyAvg: totalDays > 0 ? spentMonth / totalDays : 0,
  };
}

function render() {
  const info = calcBudget();

  // Clock
  const d = now();
  document.getElementById("clock").textContent =
    `${d.toLocaleDateString("ro-RO")} ${d.toLocaleTimeString("ro-RO")}`;

  // Dashboard
  const big = document.getElementById("remainTodayBig");
  big.textContent = `${fmtMoney(info.remainToday)} RON`;

  big.classList.remove("red", "warn");
  if (info.remainToday <= Number(state.settings.redThreshold || 0)) {
    big.classList.add("red");
  } else if (info.remainToday <= Number(state.settings.warnThreshold || 0)) {
    big.classList.add("warn");
  }

  document.getElementById("spentToday").textContent = fmtMoney(info.spentToday);
  document.getElementById("remainToday").textContent = fmtMoney(info.remainToday);
  document.getElementById("dailyBudgetFuture").textContent =
    `${fmtMoney(info.dailyFuture)} RON`;

  // Stats
  document.getElementById("monthlyBudget").textContent = `${fmtMoney(info.monthlyBudget)} RON`;
  document.getElementById("monthlySpent").textContent = `${fmtMoney(info.spentMonth)} RON`;
  document.getElementById("daysLeft").textContent = String(info.daysLeft);
  document.getElementById("dailyAvg").textContent = `${fmtMoney(info.dailyAvg)} RON`;

  // Settings UI
  document.getElementById("settingMonthlyBudget").value = state.settings.monthlyBudget;
  document.getElementById("settingWarnThreshold").value = state.settings.warnThreshold;
  document.getElementById("settingRedThreshold").value = state.settings.redThreshold;

  // History
  renderHistory();
}

function renderHistory() {
  const div = document.getElementById("history");
  div.innerHTML = "";

  const keys = Object.keys(state.expenses).sort((a, b) => b.localeCompare(a));
  if (keys.length === 0) {
    div.innerHTML = `<div class="small">Nicio cheltuială încă.</div>`;
    return;
  }

  for (const dayKey of keys) {
    const total = sumExpensesForDay(dayKey);
    const arr = state.expenses[dayKey] || [];

    const dayDiv = document.createElement("div");
    dayDiv.className = "historyDay";

    const title = document.createElement("div");
    title.className = "historyDayTitle";
    title.textContent = `${dayKey} — ${fmtMoney(total)} RON`;
    dayDiv.appendChild(title);

    for (const e of arr) {
      const line = document.createElement("div");
      line.className = "small";
      const note = e.note ? ` • ${e.note}` : "";
      line.textContent = `${e.time || ""} — ${fmtMoney(Number(e.amount || 0))} RON${note}`;
      dayDiv.appendChild(line);
    }

    div.appendChild(dayDiv);
  }
}

function addExpense(amount, note) {
  ensureCorrectMonth();
  const d = now();
  const key = ymd(d);

  if (!state.expenses[key]) state.expenses[key] = [];
  state.expenses[key].push({
    amount: Number(amount),
    note: String(note || "").trim(),
    time: d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
  });

  saveState();
  render();
}

function resetMonth() {
  const d = now();
  state.currentMonth = getMonthKey(d);
  state.expenses = {};
  saveState();
  render();
}

// UI Events
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  const amount = Number(document.getElementById("expenseAmount").value);
  const note = document.getElementById("expenseNote").value;

  if (!amount || amount <= 0) return;

  addExpense(amount, note);

  document.getElementById("expenseAmount").value = "";
  document.getElementById("expenseNote").value = "";
  document.getElementById("expenseAmount").focus();
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  state.settings.monthlyBudget = Number(document.getElementById("settingMonthlyBudget").value || 0);
  state.settings.warnThreshold = Number(document.getElementById("settingWarnThreshold").value || 0);
  state.settings.redThreshold = Number(document.getElementById("settingRedThreshold").value || 0);
  saveState();
  render();
});

document.getElementById("resetMonthBtn").addEventListener("click", () => {
  resetMonth();
});

// Ticking
render();
setInterval(render, 1000);
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
