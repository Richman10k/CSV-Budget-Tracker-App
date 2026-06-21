/**
 * budgetSuggestions.js — pure, offline auto-budget logic (no I/O, fully
 * testable). Looks at recent expense history and proposes a sensible monthly
 * limit per category: average monthly spend + a little headroom, rounded to a
 * "nice" number (e.g. ~$420/mo on Food -> suggest $450).
 *
 * Operates on the already-decrypted transaction list held in AppDataContext, so
 * nothing here touches SQLite or crypto directly.
 */

// Round suggested limits up to a tidy increment that scales with magnitude.
const NICE_STEPS = [
  {max: 50, step: 5},
  {max: 200, step: 10},
  {max: 1000, step: 25},
  {max: Infinity, step: 50},
];

function roundUpNice(value) {
  if (!(value > 0)) {
    return 0;
  }
  const {step} = NICE_STEPS.find(s => value <= s.max);
  return Math.ceil(value / step) * step;
}

/** Comparable month index so date math ignores day-of-month. */
function monthIndex(date) {
  const d = new Date(date);
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Build per-category budget suggestions from spending history.
 *
 * @param {Array}  transactions decrypted transactions ({type, category, amount, date})
 * @param {Object} budgets      existing {category: limit} map (for "current")
 * @param {Object} [options]
 * @param {number} [options.lookbackMonths=3] window of recent months to average
 * @param {number} [options.headroom=1.05]    multiplier applied before rounding
 * @returns {{months:number, suggestions:Array}} months actually averaged + rows
 *          sorted by spend desc: {category, avgMonthly, suggested, current, hasLimit}
 */
export function suggestBudgets(transactions = [], budgets = {}, options = {}) {
  const lookback = Math.max(1, options.lookbackMonths || 3);
  const headroom = options.headroom || 1.05;

  const expenses = transactions.filter(t => t.type === 'expense' && t.amount > 0);
  if (expenses.length === 0) {
    return {months: 0, suggestions: []};
  }

  // Window = the most recent `lookback` month-buckets that contain expenses,
  // anchored to the latest month with data (not "today", so imported history
  // from earlier months still produces suggestions).
  const latest = expenses.reduce((m, t) => Math.max(m, monthIndex(t.date)), -Infinity);
  const minIndex = latest - (lookback - 1);

  const inWindow = expenses.filter(t => {
    const idx = monthIndex(t.date);
    return idx >= minIndex && idx <= latest;
  });

  const monthsPresent = new Set(inWindow.map(t => monthIndex(t.date)));
  const monthCount = Math.max(monthsPresent.size, 1);

  const totals = {};
  inWindow.forEach(t => {
    const cat = t.category || 'Uncategorized';
    totals[cat] = (totals[cat] || 0) + t.amount;
  });

  const suggestions = Object.keys(totals)
    .map(category => {
      const avgMonthly = totals[category] / monthCount;
      const hasLimit = Object.prototype.hasOwnProperty.call(budgets, category);
      return {
        category,
        avgMonthly,
        suggested: roundUpNice(avgMonthly * headroom),
        current: hasLimit ? budgets[category] : null,
        hasLimit,
      };
    })
    .filter(s => s.suggested > 0)
    .sort((a, b) => b.avgMonthly - a.avgMonthly);

  return {months: monthCount, suggestions};
}

export default {suggestBudgets};
