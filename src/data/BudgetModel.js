/**
 * BudgetModel.js — CRUD for monthly budget limits (encrypted limit values).
 *
 * A budget is keyed by category. The special category 'TOTAL' represents the
 * overall monthly spending limit. Domain shape:
 *   { category, limit (number), createdAt, updatedAt }
 */
import {encrypt, decrypt, sanitizeText} from '../encryption/Crypto';
import {run, all} from './Database';

export const TOTAL_KEY = 'TOTAL';

async function decodeRow(row) {
  const limitStr = await decrypt(row.enc_limit);
  return {
    category: row.category,
    limit: parseFloat(limitStr) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All budgets as an array of domain objects. */
export async function getAll() {
  const rows = await all('SELECT * FROM budgets ORDER BY category;');
  return Promise.all(rows.map(decodeRow));
}

/** All budgets as a { category: limit } map for quick lookups. */
export async function getMap() {
  const list = await getAll();
  const map = {};
  list.forEach(b => {
    map[b.category] = b.limit;
  });
  return map;
}

/** Insert or update a category's monthly limit (upsert by unique category). */
export async function setLimit(category, limit) {
  const now = Date.now();
  const encLimit = await encrypt(String(Number(limit || 0).toFixed(2)));
  await run(
    `INSERT INTO budgets (category, enc_limit, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(category) DO UPDATE SET enc_limit = excluded.enc_limit,
                                         updated_at = excluded.updated_at;`,
    [sanitizeText(category, 64), encLimit, now, now],
  );
}

/** Remove a category budget. */
export async function remove(category) {
  await run('DELETE FROM budgets WHERE category = ?;', [category]);
}

/** The overall monthly limit (TOTAL), or 0 if unset. */
export async function getTotalLimit() {
  const map = await getMap();
  return map[TOTAL_KEY] || 0;
}

export default {
  TOTAL_KEY,
  getAll,
  getMap,
  setLimit,
  remove,
  getTotalLimit,
};
