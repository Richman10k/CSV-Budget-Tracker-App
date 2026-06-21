/**
 * SubscriptionDetector.js — bridges the pure detection algorithm
 * (utils/detectRecurring) with persistence (SubscriptionModel) and provides
 * summary math for the dashboard.
 */
import {detectRecurring, monthlyEquivalent} from '../utils/detectRecurring';
import TransactionModel from '../data/TransactionModel';
import SubscriptionModel from '../data/SubscriptionModel';
import RecurringPatternModel from '../data/RecurringPatternModel';

/** Analyze a provided transaction list into subscription candidates. */
export function analyze(transactions, options) {
  return detectRecurring(transactions, options);
}

/**
 * Load all transactions, detect recurring charges (excluding any merchants the
 * user has chosen to ignore), and reconcile them into the subscriptions table
 * (preserving user edits/cancellations). Returns the detected candidates.
 */
export async function runDetection() {
  const [transactions, ignoredKeys] = await Promise.all([
    TransactionModel.getAll(),
    RecurringPatternModel.getIgnoredKeys(),
  ]);
  const candidates = detectRecurring(transactions, {ignoredKeys});
  await SubscriptionModel.syncDetected(candidates);
  return candidates;
}

/**
 * Summary metrics for the dashboard from stored subscriptions.
 * @returns {{activeCount, monthlyTotal, yearlyTotal, flaggedCount, dueSoon}}
 */
export function summarizeSubscriptions(subscriptions) {
  const active = (subscriptions || []).filter(s => s.status === 'active');
  let monthlyTotal = 0;
  let flaggedCount = 0;
  const now = Date.now();
  const soonWindow = 7 * 24 * 60 * 60 * 1000;
  let dueSoon = 0;

  active.forEach(s => {
    monthlyTotal += monthlyEquivalent(s.amount, s.interval);
    if (s.flags && s.flags.length > 0) {
      flaggedCount += 1;
    }
    if (s.nextDue && s.nextDue - now <= soonWindow && s.nextDue - now >= 0) {
      dueSoon += 1;
    }
  });

  return {
    activeCount: active.length,
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    flaggedCount,
    dueSoon,
  };
}

/** Human-readable text for a subscription flag code. */
export function describeFlag(flag) {
  switch (flag) {
    case 'unknown_merchant':
      return 'Unfamiliar merchant';
    case 'price_increase':
      return 'Price increased';
    case 'duplicate_charge':
      return 'Possible duplicate charge';
    case 'irregular_interval':
      return 'Irregular billing interval';
    default:
      return flag;
  }
}

export default {analyze, runDetection, summarizeSubscriptions, describeFlag};
