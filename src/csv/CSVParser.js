/**
 * CSVParser.js — robust, bank-agnostic CSV parsing built on papaparse.
 *
 * Works with the common export shapes from BECU, Chase, Bank of America, etc.:
 *   - a single signed "amount" column, OR
 *   - separate debit/credit (withdrawal/deposit) columns
 * and a variety of date formats. Returns normalized transaction objects plus a
 * list of per-row errors so a malformed file never crashes the app.
 */
import Papa from 'papaparse';

// Header synonyms (compared lower-cased + trimmed).
const FIELD_SYNONYMS = {
  date: ['date', 'transaction date', 'posting date', 'posted date', 'posted', 'trans date', 'date posted'],
  description: ['description', 'memo', 'name', 'payee', 'details', 'transaction', 'narration', 'reference', 'note'],
  amount: ['amount', 'transaction amount', 'amt'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'debit amount'],
  credit: ['credit', 'deposit', 'deposits', 'money in', 'paid in', 'credit amount'],
  balance: ['balance', 'running balance', 'available balance', 'running bal'],
  type: ['type', 'transaction type', 'debit/credit', 'dr/cr', 'cr/dr'],
  category: ['category', 'categories'],
};

/** Find which CSV header maps to each logical field. */
function buildColumnMap(headers) {
  const map = {};
  const lower = headers.map(h => String(h || '').trim().toLowerCase());
  Object.keys(FIELD_SYNONYMS).forEach(field => {
    const idx = lower.findIndex(h => FIELD_SYNONYMS[field].includes(h));
    if (idx !== -1) {
      map[field] = headers[idx];
    }
  });
  return map;
}

/** Parse a money string into a signed number. Handles $, commas, (parens). */
export function parseAmount(raw) {
  if (raw == null || raw === '') {
    return null;
  }
  let s = String(raw).trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true; // accounting negatives: (12.34)
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[^0-9.-]/g, ''); // strip currency symbols, commas, spaces
  if (s === '' || s === '-' || s === '.') {
    return null;
  }
  let value = parseFloat(s);
  if (Number.isNaN(value)) {
    return null;
  }
  if (negative) {
    value = -Math.abs(value);
  }
  return value;
}

/** Parse a date string (ISO, US M/D/Y, or D/M/Y) into epoch ms, or null. */
export function parseDate(raw) {
  if (!raw) {
    return null;
  }
  const s = String(raw).trim();

  // ISO yyyy-mm-dd (optionally with time)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  // m/d/y or d/m/y with / or - separators
  const parts = s.split(/[/\-.]/).map(p => p.trim());
  if (parts.length === 3) {
    let [a, b, c] = parts;
    // Identify the 4-digit (or 2-digit) year position.
    let year;
    let first;
    let second;
    if (c.length === 4 || c.length === 2) {
      year = c;
      first = a;
      second = b;
    } else {
      year = a;
      first = b;
      second = c;
    }
    let y = Number(year);
    if (year.length === 2) {
      y += 2000;
    }
    let month = Number(first);
    let day = Number(second);
    // If "first" can't be a month (>12) but "second" can, swap (D/M/Y locale).
    if (month > 12 && day <= 12) {
      const tmp = month;
      month = day;
      day = tmp;
    }
    const d = new Date(y, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  const fallback = Date.parse(s);
  return Number.isNaN(fallback) ? null : fallback;
}

/** Decide income/expense + magnitude from the available columns. */
function deriveAmountAndType(row, cols) {
  // Separate debit/credit columns take priority.
  if (cols.debit || cols.credit) {
    const debit = cols.debit ? parseAmount(row[cols.debit]) : null;
    const credit = cols.credit ? parseAmount(row[cols.credit]) : null;
    if (debit != null && Math.abs(debit) > 0) {
      return {amount: Math.abs(debit), type: 'expense'};
    }
    if (credit != null && Math.abs(credit) > 0) {
      return {amount: Math.abs(credit), type: 'income'};
    }
  }
  // Single amount column.
  if (cols.amount) {
    const value = parseAmount(row[cols.amount]);
    if (value == null) {
      return null;
    }
    // An explicit type column overrides the sign if present.
    if (cols.type) {
      const t = String(row[cols.type] || '').toLowerCase();
      if (/credit|cr|deposit|income/.test(t)) {
        return {amount: Math.abs(value), type: 'income'};
      }
      if (/debit|dr|withdraw|expense|purchase/.test(t)) {
        return {amount: Math.abs(value), type: 'expense'};
      }
    }
    return {amount: Math.abs(value), type: value < 0 ? 'expense' : 'income'};
  }
  return null;
}

/**
 * Parse CSV text into { transactions, errors, columns, total }.
 * Never throws on row-level problems — those are collected in `errors`.
 */
export function parseCSV(content) {
  const result = {transactions: [], errors: [], columns: {}, total: 0};

  if (!content || !String(content).trim()) {
    result.errors.push({row: 0, message: 'The file is empty.'});
    return result;
  }

  const parsed = Papa.parse(String(content), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: h => String(h || '').trim(),
  });

  if (!parsed.meta || !parsed.meta.fields || parsed.meta.fields.length === 0) {
    result.errors.push({row: 0, message: 'No column headers found.'});
    return result;
  }

  const cols = buildColumnMap(parsed.meta.fields);
  result.columns = cols;

  if (!cols.date || (!cols.amount && !cols.debit && !cols.credit)) {
    result.errors.push({
      row: 0,
      message:
        'Could not find a date and an amount column. Expected headers like ' +
        '"Date" and "Amount" (or "Debit"/"Credit").',
    });
    return result;
  }

  parsed.data.forEach((row, i) => {
    result.total += 1;
    const rowNum = i + 2; // +1 for header, +1 for 1-based

    const dateMs = parseDate(row[cols.date]);
    if (dateMs == null) {
      result.errors.push({row: rowNum, message: `Invalid date: "${row[cols.date]}"`});
      return;
    }

    const at = deriveAmountAndType(row, cols);
    if (!at) {
      result.errors.push({row: rowNum, message: 'Missing or invalid amount.'});
      return;
    }

    const description = cols.description
      ? String(row[cols.description] || '').trim()
      : '';

    result.transactions.push({
      date: dateMs,
      description: description || 'Transaction',
      merchant: description || 'Transaction',
      amount: at.amount,
      type: at.type,
      balance: cols.balance ? parseAmount(row[cols.balance]) : null,
      category: cols.category ? String(row[cols.category] || '').trim() : '',
      source: 'csv',
    });
  });

  return result;
}

export default {parseCSV, parseAmount, parseDate};
