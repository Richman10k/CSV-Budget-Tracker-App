/**
 * formatDate.js — lightweight date helpers (no external date library).
 * All inputs are epoch milliseconds unless noted.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "Jun 19, 2026" */
export function formatDate(ms) {
  const d = new Date(ms);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Jun 19" (no year) */
export function formatShortDate(ms) {
  const d = new Date(ms);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "June 2026" — used for the month switcher header. */
export function formatMonthYear(ms) {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO-ish "2026-06-19" for stable keys / exports. */
export function formatISODate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "Today" / "Yesterday" / "Jun 19" relative label for transaction rows. */
export function formatRelative(ms) {
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const diffDays = Math.floor((startToday - new Date(ms).setHours(0, 0, 0, 0)) / DAY_MS);
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return formatShortDate(ms);
}

/** Add a whole number of days to an epoch ms timestamp. */
export function addDays(ms, days) {
  return ms + days * DAY_MS;
}

/** Add `n` calendar months, clamping the day-of-month when needed. */
export function addMonths(ms, n) {
  const d = new Date(ms);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  // Handle overflow (e.g. Jan 31 + 1 month -> should land end of Feb).
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d.getTime();
}

/** Whole-day difference between two timestamps (b - a), rounded. */
export function daysBetween(a, b) {
  return Math.round((b - a) / DAY_MS);
}

export {DAY_MS};
export default {
  formatDate,
  formatShortDate,
  formatMonthYear,
  formatISODate,
  formatRelative,
  addDays,
  addMonths,
  daysBetween,
  DAY_MS,
};
