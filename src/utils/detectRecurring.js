/**
 * detectRecurring.js — pure recurring-charge detection.
 *
 * Given a list of (decrypted) transactions it groups charges by merchant,
 * looks for a consistent cadence + amount, and returns subscription
 * candidates with cost projections and risk flags. No I/O, no encryption —
 * easy to reason about and unit test.
 */
import {addDays, addMonths, daysBetween} from './formatDate';

// A small set of well-known recurring merchants. Anything outside this list is
// flagged "unknown_merchant" so the user can eyeball unfamiliar charges.
const KNOWN_MERCHANTS = new Set([
  'netflix', 'spotify', 'hulu', 'disney', 'youtube', 'amazon prime', 'prime',
  'apple', 'icloud', 'google', 'microsoft', 'adobe', 'dropbox', 'hbo', 'max',
  'paramount', 'peacock', 'audible', 'patreon', 'github', 'openai', 'chatgpt',
  'notion', 'slack', 'zoom', 'linkedin', 'nytimes', 'wsj', 'planet fitness',
  'la fitness', 'peloton', 'doordash', 'instacart', 'walmart', 'costco',
]);

// Cadence definitions: target gap in days + accepted tolerance.
const CADENCES = [
  {interval: 'weekly', days: 7, tol: 2},
  {interval: 'biweekly', days: 14, tol: 3},
  {interval: 'monthly', days: 30, tol: 4},
  {interval: 'yearly', days: 365, tol: 20},
];

const FLAGS = {
  UNKNOWN: 'unknown_merchant',
  PRICE_INCREASE: 'price_increase',
  DUPLICATE: 'duplicate_charge',
  IRREGULAR: 'irregular_interval',
};

/** Normalize a merchant/description into a stable grouping key. */
export function normalizeMerchant(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ') // drop punctuation
    .replace(/\b\d+\b/g, ' ') // drop standalone numbers (store ids, dates)
    .replace(/\b(pos|purchase|debit|card|payment|recurring|autopay|ach|xx+)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pretty display name from a normalized key ("title case"). */
function titleCase(key) {
  return key
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function median(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Classify a median gap (in days) into a cadence, or null if none fit. */
function classifyInterval(medianGapDays) {
  for (const c of CADENCES) {
    if (Math.abs(medianGapDays - c.days) <= c.tol) {
      return c;
    }
  }
  return null;
}

/** Compute the next due date from the last charge + interval. */
function projectNextDue(lastChargeMs, interval) {
  switch (interval) {
    case 'weekly':
      return addDays(lastChargeMs, 7);
    case 'biweekly':
      return addDays(lastChargeMs, 14);
    case 'yearly':
      return addMonths(lastChargeMs, 12);
    case 'monthly':
    default:
      return addMonths(lastChargeMs, 1);
  }
}

/** Normalize a per-charge amount to an equivalent monthly cost. */
export function monthlyEquivalent(amount, interval) {
  switch (interval) {
    case 'weekly':
      return amount * 4.333;
    case 'biweekly':
      return amount * 2.167;
    case 'yearly':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
}

/**
 * Detect subscription candidates from transactions.
 * @param {Array} transactions decrypted transactions
 * @returns {Array} candidate subscriptions
 */
export function detectRecurring(transactions) {
  // Only outgoing charges can be subscriptions.
  const charges = (transactions || []).filter(t => t.type === 'expense');

  // Group by normalized merchant.
  const groups = new Map();
  for (const tx of charges) {
    const key = normalizeMerchant(tx.merchant || tx.description);
    if (!key) {
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tx);
  }

  const candidates = [];

  for (const [key, items] of groups.entries()) {
    if (items.length < 2) {
      continue; // need at least two charges to infer a cadence
    }
    const sorted = [...items].sort((a, b) => a.date - b.date);

    // Gaps between consecutive charges (days).
    const gaps = [];
    const flags = new Set();
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(sorted[i - 1].date, sorted[i].date);
      if (gap === 0 && Math.abs(sorted[i].amount - sorted[i - 1].amount) < 0.01) {
        flags.add(FLAGS.DUPLICATE); // same-day same-amount = likely duplicate
        continue;
      }
      gaps.push(gap);
    }
    if (gaps.length === 0) {
      continue;
    }

    const medGap = median(gaps);
    const cadence = classifyInterval(medGap);
    if (!cadence) {
      continue; // not a recognizable recurring cadence
    }

    // Flag irregular spacing (high variance relative to tolerance).
    const irregular = gaps.some(g => Math.abs(g - cadence.days) > cadence.tol * 2);
    if (irregular) {
      flags.add(FLAGS.IRREGULAR);
    }

    const amounts = sorted.map(t => Math.abs(t.amount));
    const firstAmount = amounts[0];
    const lastAmount = amounts[amounts.length - 1];
    if (lastAmount - firstAmount > 0.01) {
      flags.add(FLAGS.PRICE_INCREASE);
    }

    if (!KNOWN_MERCHANTS.has(key) && ![...KNOWN_MERCHANTS].some(m => key.includes(m))) {
      flags.add(FLAGS.UNKNOWN);
    }

    const lastCharge = sorted[sorted.length - 1].date;
    const amount = lastAmount; // most recent charge is the current price
    candidates.push({
      name: titleCase(key) || 'Subscription',
      merchantKey: key,
      amount,
      interval: cadence.interval === 'biweekly' ? 'weekly' : cadence.interval,
      monthlyCost: monthlyEquivalent(amount, cadence.interval),
      yearlyCost: monthlyEquivalent(amount, cadence.interval) * 12,
      nextDue: projectNextDue(lastCharge, cadence.interval),
      lastCharge,
      occurrences: sorted.length,
      category: sorted[sorted.length - 1].category || 'Subscriptions',
      flags: [...flags],
    });
  }

  // Highest monthly cost first.
  candidates.sort((a, b) => b.monthlyCost - a.monthlyCost);
  return candidates;
}

export {FLAGS};
export default detectRecurring;
