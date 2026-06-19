/**
 * formatCurrency.js — money formatting helpers.
 *
 * Uses Intl.NumberFormat when available (Hermes ships Intl on Android) and
 * falls back to a manual formatter so the app never crashes if Intl is missing.
 */

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
};

function manualFormat(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const fixed = Math.abs(Number(amount) || 0).toFixed(2);
  // Thousands separators.
  const [whole, fraction] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${withCommas}.${fraction}`;
}

/** Format an absolute amount, e.g. 1234.5 -> "$1,234.50". */
export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount) || 0;
  try {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(value));
    }
  } catch (e) {
    // fall through to manual
  }
  return manualFormat(value, currency);
}

/**
 * Format with an explicit sign for ledgers: income shows "+$x", expense "-$x".
 * `type` is 'income' | 'expense' (defaults to sign of the amount).
 */
export function formatSigned(amount, type, currency = 'USD') {
  const base = formatCurrency(amount, currency);
  const isIncome = type ? type === 'income' : Number(amount) >= 0;
  return `${isIncome ? '+' : '-'}${base}`;
}

/** Compact format for large headline numbers, e.g. 1234567 -> "$1.2M". */
export function formatCompact(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const value = Math.abs(Number(amount) || 0);
  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${symbol}${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value, currency);
}

export default {formatCurrency, formatSigned, formatCompact};
