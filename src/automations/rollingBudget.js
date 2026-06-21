/**
 * rollingBudget.js — pure rolling-budget math.
 *
 * "Rolling" here means unused budget from the *previous* month is added to the
 * current month's limit. We use previous-month-only (not an unbounded running
 * sum) because the budgets table stores a single current limit per category
 * with no per-month history — accumulating across inactive months would
 * massively over-credit categories. Leftover is clamped at 0 (overspending one
 * month doesn't shrink the next).
 */

const TOTAL_KEY = 'TOTAL';

function monthIndex(date) {
  const d = new Date(date);
  return d.getFullYear() * 12 + d.getMonth();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Carry-in (leftover from the previous month) per budgeted category + TOTAL.
 *
 * @param {Array} transactions decrypted transactions
 * @param {Object} budgets {category: limit} map (may include TOTAL)
 * @param {{year:number, month:number}} selectedMonth
 * @returns {Object} {category: carryInAmount} (>= 0; only budgeted categories)
 */
export function computeCarryIn(transactions = [], budgets = {}, selectedMonth) {
  if (!selectedMonth) {
    return {};
  }
  const prevIdx = selectedMonth.year * 12 + selectedMonth.month - 1;

  const spentByCat = {};
  let totalPrev = 0;
  transactions.forEach(t => {
    if (t.type !== 'expense') {
      return;
    }
    if (monthIndex(t.date) !== prevIdx) {
      return;
    }
    const cat = t.category || 'Uncategorized';
    spentByCat[cat] = (spentByCat[cat] || 0) + t.amount;
    totalPrev += t.amount;
  });

  const carryIn = {};
  Object.keys(budgets).forEach(cat => {
    const limit = budgets[cat];
    if (!(limit >= 0)) {
      return;
    }
    const spent = cat === TOTAL_KEY ? totalPrev : spentByCat[cat] || 0;
    const leftover = limit - spent;
    carryIn[cat] = leftover > 0 ? round2(leftover) : 0;
  });
  return carryIn;
}

export default {computeCarryIn};
