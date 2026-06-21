/**
 * TransactionModel.js — CRUD for transactions with transparent field
 * encryption. Callers work with plain JS objects; this module handles
 * encrypt-on-write / decrypt-on-read and de-duplication.
 *
 * Domain shape (decrypted):
 *   {
 *     id, date (epoch ms), type ('income'|'expense'), category,
 *     description, amount (positive number), balance (number|null),
 *     merchant, source, createdAt
 *   }
 */
import {encrypt, decrypt, deterministicToken, sanitizeText} from '../encryption/Crypto';
import {run, all, batch} from './Database';

/** Build the keyed de-dupe token for a transaction. */
async function buildDedupeHash(tx) {
  const amount = Number(tx.amount || 0).toFixed(2);
  const desc = String(tx.description || '').toLowerCase().trim();
  return deterministicToken(`${tx.date}|${tx.type}|${amount}|${desc}`);
}

/** Encrypt the sensitive fields of a transaction into an insertable tuple. */
async function encodeInsert(tx) {
  const createdAt = tx.createdAt || Date.now();
  const [encDescription, encAmount, encBalance, encMerchant, dedupeHash] =
    await Promise.all([
      encrypt(sanitizeText(tx.description || '')),
      encrypt(String(Number(tx.amount || 0).toFixed(2))),
      tx.balance == null || tx.balance === ''
        ? Promise.resolve(null)
        : encrypt(String(Number(tx.balance).toFixed(2))),
      encrypt(sanitizeText(tx.merchant || tx.description || '')),
      buildDedupeHash(tx),
    ]);
  return [
    `INSERT OR IGNORE INTO transactions
       (date, type, category, enc_description, enc_amount, enc_balance,
        enc_merchant, dedupe_hash, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      tx.date,
      tx.type === 'income' ? 'income' : 'expense',
      sanitizeText(tx.category || 'Uncategorized', 64),
      encDescription,
      encAmount,
      encBalance,
      encMerchant,
      dedupeHash,
      sanitizeText(tx.source || 'import', 64),
      createdAt,
    ],
  ];
}

/** Decrypt a raw DB row into a domain transaction. */
export async function decodeRow(row) {
  const [description, amountStr, balanceStr, merchant] = await Promise.all([
    row.enc_description ? decrypt(row.enc_description) : Promise.resolve(''),
    decrypt(row.enc_amount),
    row.enc_balance ? decrypt(row.enc_balance) : Promise.resolve(null),
    row.enc_merchant ? decrypt(row.enc_merchant) : Promise.resolve(''),
  ]);
  let receipt = null;
  if (row.enc_receipt_uri) {
    try {
      const json = await decrypt(row.enc_receipt_uri);
      receipt = json ? JSON.parse(json) : null;
    } catch (e) {
      receipt = null;
    }
  }
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    category: row.category || 'Uncategorized',
    description,
    amount: parseFloat(amountStr) || 0,
    balance: balanceStr == null ? null : parseFloat(balanceStr),
    merchant,
    receipt,
    source: row.source,
    createdAt: row.created_at,
  };
}

/**
 * Decrypt a list of rows in parallel. Rows that can't be decrypted with the
 * current key (legacy/corrupt data) are skipped and purged so a single bad row
 * never breaks the whole screen.
 */
export async function decodeRows(rows) {
  const decoded = await Promise.all(
    rows.map(async row => {
      try {
        return await decodeRow(row);
      } catch (e) {
        return {__corruptId: row.id};
      }
    }),
  );
  const good = [];
  const corruptIds = [];
  decoded.forEach(r => {
    if (r && r.__corruptId != null) {
      corruptIds.push(r.__corruptId);
    } else {
      good.push(r);
    }
  });
  if (corruptIds.length > 0) {
    const placeholders = corruptIds.map(() => '?').join(',');
    try {
      await run(
        `DELETE FROM transactions WHERE id IN (${placeholders});`,
        corruptIds,
      );
    } catch (e) {
      // best-effort cleanup
    }
  }
  return good;
}

/* ------------------------------- Writes -------------------------------- */

/** Insert a single transaction. Returns the new row id (or null if a dupe). */
export async function insert(tx) {
  const [sql, params] = await encodeInsert(tx);
  const result = await run(sql, params);
  return result.insertId || null;
}

/**
 * Bulk insert (used by CSV import). Skips exact duplicates via the UNIQUE
 * dedupe_hash + INSERT OR IGNORE. Returns {received, inserted, skipped}.
 */
export async function insertMany(transactions) {
  if (!transactions || transactions.length === 0) {
    return {received: 0, inserted: 0, skipped: 0};
  }
  const before = await count();
  const statements = await Promise.all(transactions.map(encodeInsert));
  await batch(statements);
  const after = await count();
  const inserted = after - before;
  return {
    received: transactions.length,
    inserted,
    skipped: transactions.length - inserted,
  };
}

/** Update mutable fields (category/description/amount/type) of a transaction. */
export async function update(id, patch) {
  const sets = [];
  const params = [];
  if (patch.category != null) {
    sets.push('category = ?');
    params.push(sanitizeText(patch.category, 64));
  }
  if (patch.type != null) {
    sets.push('type = ?');
    params.push(patch.type === 'income' ? 'income' : 'expense');
  }
  if (patch.description != null) {
    sets.push('enc_description = ?');
    params.push(await encrypt(sanitizeText(patch.description)));
  }
  if (patch.amount != null) {
    sets.push('enc_amount = ?');
    params.push(await encrypt(String(Number(patch.amount).toFixed(2))));
  }
  if (sets.length === 0) {
    return;
  }
  params.push(id);
  await run(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?;`, params);
}

/** Attach/detach an encrypted receipt reference ({id, ext} or null). */
export async function setReceipt(id, receipt) {
  const enc = receipt ? await encrypt(JSON.stringify(receipt)) : null;
  await run('UPDATE transactions SET enc_receipt_uri = ? WHERE id = ?;', [enc, id]);
}

/** Delete a single transaction by id. */
export async function remove(id) {
  await run('DELETE FROM transactions WHERE id = ?;', [id]);
}

/* ------------------------------- Reads --------------------------------- */

/** Total number of transactions. */
export async function count() {
  const rows = await all('SELECT COUNT(*) AS c FROM transactions;');
  return rows[0] ? rows[0].c : 0;
}

/** Most recent N transactions (decrypted), newest first. */
export async function getRecent(limit = 50) {
  const rows = await all(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?;',
    [limit],
  );
  return decodeRows(rows);
}

/** Transactions within [startMs, endMs] inclusive, newest first. */
export async function getByDateRange(startMs, endMs) {
  const rows = await all(
    'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC;',
    [startMs, endMs],
  );
  return decodeRows(rows);
}

/** All transactions for a given calendar month (monthIndex is 0-based). */
export async function getMonth(year, monthIndex) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();
  return getByDateRange(start, end);
}

/** Every transaction (decrypted) — used by search and subscription detection. */
export async function getAll() {
  const rows = await all(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC;',
  );
  return decodeRows(rows);
}

/** Distinct plaintext categories present in the data. */
export async function getCategories() {
  const rows = await all(
    "SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL AND category <> '' ORDER BY category;",
  );
  return rows.map(r => r.category);
}

/** The earliest and latest transaction dates (epoch ms), or nulls if empty. */
export async function getDateBounds() {
  const rows = await all(
    'SELECT MIN(date) AS minD, MAX(date) AS maxD FROM transactions;',
  );
  if (!rows[0] || rows[0].minD == null) {
    return {min: null, max: null};
  }
  return {min: rows[0].minD, max: rows[0].maxD};
}

export default {
  insert,
  insertMany,
  update,
  setReceipt,
  remove,
  count,
  getRecent,
  getByDateRange,
  getMonth,
  getAll,
  getCategories,
  getDateBounds,
  decodeRow,
  decodeRows,
};
