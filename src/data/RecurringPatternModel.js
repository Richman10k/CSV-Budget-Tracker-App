/**
 * RecurringPatternModel.js — stores merchant patterns the user has chosen to
 * exclude from automatic subscription detection ("Ignore as recurring").
 *
 * Shape (decrypted): { id, merchantKey, amount, interval, action, createdAt }
 * The amount is encrypted at rest; merchant_key stays plaintext so the detector
 * can match quickly.
 */
import {encrypt, decrypt, sanitizeText} from '../encryption/Crypto';
import {run, all} from './Database';

/** Add (or refresh) an ignore rule for a merchant pattern. */
export async function ignore({merchantKey, amount, interval}) {
  const key = sanitizeText(merchantKey || '', 128);
  if (!key) {
    return;
  }
  const now = Date.now();
  const encAmount = await encrypt(String(Number(amount || 0).toFixed(2)));
  // De-dupe: one ignore rule per merchant key.
  await run('DELETE FROM recurring_patterns WHERE merchant_key = ? AND action = ?;', [
    key,
    'ignore',
  ]);
  await run(
    `INSERT INTO recurring_patterns (merchant_key, enc_amount, interval, action, created_at)
     VALUES (?, ?, ?, ?, ?);`,
    [key, encAmount, interval || null, 'ignore', now],
  );
}

/** Remove an ignore rule (re-allow detection for this merchant). */
export async function unignore(merchantKey) {
  await run('DELETE FROM recurring_patterns WHERE merchant_key = ? AND action = ?;', [
    sanitizeText(merchantKey || '', 128),
    'ignore',
  ]);
}

/** All ignore rules as decoded objects. */
export async function getAll() {
  const rows = await all('SELECT * FROM recurring_patterns ORDER BY created_at DESC;');
  return Promise.all(
    rows.map(async row => ({
      id: row.id,
      merchantKey: row.merchant_key,
      amount: row.enc_amount ? parseFloat(await decrypt(row.enc_amount)) || 0 : 0,
      interval: row.interval || null,
      action: row.action,
      createdAt: row.created_at,
    })),
  );
}

/** Set of merchant keys to exclude from detection. */
export async function getIgnoredKeys() {
  const rows = await all(
    "SELECT DISTINCT merchant_key FROM recurring_patterns WHERE action = 'ignore';",
  );
  return new Set(rows.map(r => r.merchant_key));
}

export default {ignore, unignore, getAll, getIgnoredKeys};
