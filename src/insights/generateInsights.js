/**
 * generateInsights.js — pure, offline "mini-AI" summary engine.
 *
 * Turns the raw decrypted dataset into a short, ranked list of rich insight
 * cards (spikes, top category, subscription creep, budget status, savings).
 * No I/O, no ML — just deterministic rules over the data so it stays private,
 * instant, and unit-testable. Currency formatting is injected so the engine has
 * no UI dependency.
 */

function monthIndex(date) {
  const d = new Date(date);
  return d.getFullYear() * 12 + d.getMonth();
}

function categoryTotals(transactions, targetIdx) {
  const totals = {};
  let total = 0;
  transactions.forEach(t => {
    if (t.type !== 'expense') {
      return;
    }
    if (monthIndex(t.date) !== targetIdx) {
      return;
    }
    const cat = t.category || 'Uncategorized';
    totals[cat] = (totals[cat] || 0) + t.amount;
    total += t.amount;
  });
  return {totals, total};
}

/**
 * @param {Array} transactions decrypted transactions
 * @param {Array} subscriptions decrypted subscriptions
 * @param {Object} [options]
 * @param {{year,month}} [options.selectedMonth] defaults to latest data month
 * @param {Object} [options.budgets] {category: limit}
 * @param {Function} [options.fmt] currency formatter (number -> string)
 * @returns {Array} insight cards: {id, tone, icon, title, detail}
 */
export function generateInsights(transactions = [], subscriptions = [], options = {}) {
  const fmt = options.fmt || (n => `$${Math.round(n)}`);
  const budgets = options.budgets || {};
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    return [];
  }

  const curIdx = options.selectedMonth
    ? options.selectedMonth.year * 12 + options.selectedMonth.month
    : expenses.reduce((m, t) => Math.max(m, monthIndex(t.date)), -Infinity);
  const prevIdx = curIdx - 1;

  const cur = categoryTotals(transactions, curIdx);
  const prev = categoryTotals(transactions, prevIdx);
  const income = transactions
    .filter(t => t.type === 'income' && monthIndex(t.date) === curIdx)
    .reduce((s, t) => s + t.amount, 0);

  const insights = [];

  // 1) Biggest spending spike vs last month (>=20% and >$20 jump).
  let spike = null;
  Object.keys(cur.totals).forEach(cat => {
    const now = cur.totals[cat];
    const before = prev.totals[cat] || 0;
    if (before <= 0) {
      return;
    }
    const pct = ((now - before) / before) * 100;
    const jump = now - before;
    if (pct >= 20 && jump >= 20 && (!spike || pct > spike.pct)) {
      spike = {cat, pct: Math.round(pct), jump};
    }
  });
  if (spike) {
    insights.push({
      id: 'spike',
      tone: 'negative',
      icon: 'trending-up',
      title: `Spending spike: ${spike.cat}`,
      detail: `+${spike.pct}% vs last month (${fmt(spike.jump)} more)`,
    });
  }

  // 2) Top category this month.
  const topCat = Object.keys(cur.totals).sort(
    (a, b) => cur.totals[b] - cur.totals[a],
  )[0];
  if (topCat) {
    insights.push({
      id: 'top',
      tone: 'neutral',
      icon: 'star',
      title: `Top category: ${topCat}`,
      detail: `${fmt(cur.totals[topCat])} this month`,
    });
  }

  // 3) Subscription creep — total monthly increase across flagged subs.
  const creep = (subscriptions || [])
    .filter(s => s.status === 'active' && s.priceChange)
    .reduce((sum, s) => sum + (s.priceChange.current - s.priceChange.previous), 0);
  if (creep > 0) {
    insights.push({
      id: 'creep',
      tone: 'warning',
      icon: 'autorenew',
      title: 'Subscription creep',
      detail: `+${fmt(creep)} across price-raised subscriptions`,
    });
  }

  // 4) Budget status — how many categories are over their limit this month.
  const overCats = Object.keys(budgets).filter(
    cat => cat !== 'TOTAL' && cur.totals[cat] != null && cur.totals[cat] > budgets[cat],
  );
  if (overCats.length > 0) {
    insights.push({
      id: 'overbudget',
      tone: 'negative',
      icon: 'alert',
      title: `${overCats.length} categor${overCats.length > 1 ? 'ies' : 'y'} over budget`,
      detail: overCats.slice(0, 3).join(', '),
    });
  }

  // 5) Savings / net for the month (only when there's income to compare).
  if (income > 0) {
    const net = income - cur.total;
    insights.push({
      id: 'net',
      tone: net >= 0 ? 'positive' : 'negative',
      icon: net >= 0 ? 'piggy-bank' : 'trending-down',
      title: net >= 0 ? 'You saved this month' : 'You overspent this month',
      detail:
        net >= 0
          ? `${fmt(net)} left after expenses`
          : `${fmt(Math.abs(net))} more spent than earned`,
    });
  }

  return insights;
}

/**
 * Monthly net-spending series for a small sparkline: the most recent `count`
 * months ending at the latest data month, oldest-first.
 * @returns {number[]} spending totals per month
 */
export function monthlySpendingSeries(transactions = [], count = 6) {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    return [];
  }
  const latest = expenses.reduce((m, t) => Math.max(m, monthIndex(t.date)), -Infinity);
  const series = new Array(count).fill(0);
  expenses.forEach(t => {
    const offset = latest - monthIndex(t.date);
    if (offset >= 0 && offset < count) {
      series[count - 1 - offset] += t.amount;
    }
  });
  return series;
}

export default {generateInsights, monthlySpendingSeries};
