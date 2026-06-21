/**
 * cashFlow.js — pure projection of future subscription outflows.
 *
 * Walks each active subscription forward from its next due date by its billing
 * interval and buckets the charges into upcoming months. No I/O — feed it the
 * decrypted subscriptions list.
 */
import {addDays, addMonths} from '../utils/formatDate';

function stepDate(ms, interval) {
  switch (interval) {
    case 'weekly':
      return addDays(ms, 7);
    case 'biweekly':
      return addDays(ms, 14);
    case 'yearly':
      return addMonths(ms, 12);
    case 'monthly':
    default:
      return addMonths(ms, 1);
  }
}

/**
 * Project monthly subscription outflows.
 * @param {Array} subscriptions decrypted subscriptions
 * @param {Object} [options]
 * @param {number} [options.months=6] how many months to project (1-12)
 * @param {number} [options.from=Date.now()] anchor date (start of this month)
 * @returns {Array} buckets [{year, month, total, items:[{name, amount}]}]
 */
export function projectCashFlow(subscriptions = [], options = {}) {
  const months = Math.max(1, Math.min(options.months || 6, 12));
  const anchor = new Date(options.from || Date.now());
  const startIdx = anchor.getFullYear() * 12 + anchor.getMonth();
  const endIdx = startIdx + months - 1;

  const buckets = [];
  for (let i = 0; i < months; i++) {
    const idx = startIdx + i;
    buckets.push({
      year: Math.floor(idx / 12),
      month: ((idx % 12) + 12) % 12,
      total: 0,
      items: [],
    });
  }

  (subscriptions || [])
    .filter(s => s.status === 'active' && s.amount > 0)
    .forEach(s => {
      let d = s.nextDue || Date.now();
      let guard = 0;
      while (guard++ < 2000) {
        const di = new Date(d);
        const idx = di.getFullYear() * 12 + di.getMonth();
        if (idx > endIdx) {
          break;
        }
        if (idx >= startIdx) {
          const b = buckets[idx - startIdx];
          b.total += s.amount;
          b.items.push({name: s.name, amount: s.amount});
        }
        d = stepDate(d, s.interval);
      }
    });

  buckets.forEach(b => b.items.sort((a, c) => c.amount - a.amount));
  return buckets;
}

export default {projectCashFlow};
