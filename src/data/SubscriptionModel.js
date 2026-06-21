/**
 * SubscriptionModel.js — CRUD for subscriptions with field encryption.
 *
 * Domain shape (decrypted):
 *   {
 *     id, name, merchantKey, amount (per-charge), interval,
 *     status ('active'|'cancelled'|'trial'), category,
 *     nextDue (ms|null), lastCharge (ms|null), notes,
 *     flags (string[]), autoDetected (bool), createdAt, updatedAt
 *   }
 */
import {encrypt, decrypt, sanitizeText} from '../encryption/Crypto';
import {run, all, get} from './Database';

const VALID_STATUS = ['active', 'cancelled', 'trial'];

function normalizeStatus(status) {
  return VALID_STATUS.includes(status) ? status : 'active';
}

/** Decrypt a raw subscription row into a domain object. */
export async function decodeRow(row) {
  const [name, amountStr, notes] = await Promise.all([
    decrypt(row.enc_name),
    decrypt(row.enc_amount),
    row.enc_notes ? decrypt(row.enc_notes) : Promise.resolve(''),
  ]);
  let flags = [];
  try {
    flags = row.flags ? JSON.parse(row.flags) : [];
  } catch (e) {
    flags = [];
  }
  let priceChange = null;
  if (row.enc_price_change) {
    try {
      const json = await decrypt(row.enc_price_change);
      priceChange = json ? JSON.parse(json) : null;
    } catch (e) {
      priceChange = null;
    }
  }
  return {
    id: row.id,
    name,
    merchantKey: row.merchant_key,
    amount: parseFloat(amountStr) || 0,
    interval: row.interval || 'monthly',
    status: row.status,
    category: row.category || 'Subscriptions',
    nextDue: row.next_due || null,
    lastCharge: row.last_charge || null,
    notes,
    flags,
    priceChange,
    autoDetected: !!row.auto_detected,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
        `DELETE FROM subscriptions WHERE id IN (${placeholders});`,
        corruptIds,
      );
    } catch (e) {
      // best-effort cleanup
    }
  }
  return good;
}

/* ------------------------------- Writes -------------------------------- */

/** Insert a subscription (manual add or detected). Returns the new id. */
export async function insert(sub) {
  const now = Date.now();
  const [encName, encAmount, encNotes] = await Promise.all([
    encrypt(sanitizeText(sub.name || 'Subscription', 128)),
    encrypt(String(Number(sub.amount || 0).toFixed(2))),
    encrypt(sanitizeText(sub.notes || '')),
  ]);
  const encPriceChange = sub.priceChange
    ? await encrypt(JSON.stringify(sub.priceChange))
    : null;
  const result = await run(
    `INSERT INTO subscriptions
       (enc_name, merchant_key, enc_amount, interval, status, category,
        next_due, last_charge, enc_notes, flags, enc_price_change,
        auto_detected, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      encName,
      sanitizeText(sub.merchantKey || '', 128),
      encAmount,
      sub.interval || 'monthly',
      normalizeStatus(sub.status),
      sanitizeText(sub.category || 'Subscriptions', 64),
      sub.nextDue || null,
      sub.lastCharge || null,
      encNotes,
      JSON.stringify(sub.flags || []),
      encPriceChange,
      sub.autoDetected ? 1 : 0,
      now,
      now,
    ],
  );
  return result.insertId || null;
}

/** Update mutable fields of a subscription. */
export async function update(id, patch) {
  const sets = [];
  const params = [];
  const map = {
    interval: 'interval',
    category: 'category',
    nextDue: 'next_due',
    lastCharge: 'last_charge',
    merchantKey: 'merchant_key',
  };
  Object.keys(map).forEach(key => {
    if (patch[key] != null) {
      sets.push(`${map[key]} = ?`);
      params.push(patch[key]);
    }
  });
  if (patch.status != null) {
    sets.push('status = ?');
    params.push(normalizeStatus(patch.status));
  }
  if (patch.name != null) {
    sets.push('enc_name = ?');
    params.push(await encrypt(sanitizeText(patch.name, 128)));
  }
  if (patch.amount != null) {
    sets.push('enc_amount = ?');
    params.push(await encrypt(String(Number(patch.amount).toFixed(2))));
  }
  if (patch.notes != null) {
    sets.push('enc_notes = ?');
    params.push(await encrypt(sanitizeText(patch.notes)));
  }
  if (patch.flags != null) {
    sets.push('flags = ?');
    params.push(JSON.stringify(patch.flags));
  }
  if (patch.priceChange !== undefined) {
    sets.push('enc_price_change = ?');
    params.push(
      patch.priceChange ? await encrypt(JSON.stringify(patch.priceChange)) : null,
    );
  }
  sets.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);
  await run(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?;`, params);
}

/** Convenience: change only the status (active/cancelled/trial). */
export async function setStatus(id, status) {
  await update(id, {status});
}

export async function remove(id) {
  await run('DELETE FROM subscriptions WHERE id = ?;', [id]);
}

/**
 * Reconcile auto-detected subscriptions with a freshly computed list.
 *   - Existing match (by merchant_key): refresh amount/interval/dates/flags but
 *     PRESERVE the user's status (e.g. a manual "cancelled").
 *   - New merchant: insert as active + auto_detected.
 *   - Previously auto-detected + still active but no longer detected: removed
 *     (kept if the user had marked it cancelled/trial, so manual intent wins).
 */
export async function syncDetected(detected) {
  const existingRows = await all('SELECT * FROM subscriptions;');
  const existing = await decodeRows(existingRows);
  const byKey = new Map(existing.map(s => [s.merchantKey, s]));
  const detectedKeys = new Set();

  for (const d of detected) {
    detectedKeys.add(d.merchantKey);
    const match = byKey.get(d.merchantKey);
    if (match) {
      await update(match.id, {
        amount: d.amount,
        interval: d.interval,
        nextDue: d.nextDue,
        lastCharge: d.lastCharge,
        category: d.category,
        flags: d.flags,
        priceChange: d.priceChange || null,
      });
    } else {
      await insert({...d, autoDetected: true, status: 'active'});
    }
  }

  // Remove stale auto-detected actives that vanished from the data.
  for (const s of existing) {
    if (
      s.autoDetected &&
      s.status === 'active' &&
      !detectedKeys.has(s.merchantKey)
    ) {
      await remove(s.id);
    }
  }
}

/* ------------------------------- Reads --------------------------------- */

export async function getAll() {
  const rows = await all('SELECT * FROM subscriptions ORDER BY next_due ASC;');
  return decodeRows(rows);
}

export async function getByStatus(status) {
  const rows = await all(
    'SELECT * FROM subscriptions WHERE status = ? ORDER BY next_due ASC;',
    [normalizeStatus(status)],
  );
  return decodeRows(rows);
}

export async function getById(id) {
  const row = await get('SELECT * FROM subscriptions WHERE id = ?;', [id]);
  return row ? decodeRow(row) : null;
}

export async function count() {
  const rows = await all('SELECT COUNT(*) AS c FROM subscriptions;');
  return rows[0] ? rows[0].c : 0;
}

export default {
  insert,
  update,
  setStatus,
  remove,
  syncDetected,
  getAll,
  getByStatus,
  getById,
  count,
  decodeRow,
  decodeRows,
};
