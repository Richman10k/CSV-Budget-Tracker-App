/**
 * healthCheck.js — lightweight, on-device data maintenance.
 *
 * Runs cheap integrity + sanity checks over the SQLite database and reports
 * what it found. Fixes are conservative and non-destructive to user data:
 * VACUUM to reclaim space and (when receipts exist) orphaned-file cleanup.
 * Suspicious dates are reported, never silently altered.
 */
import {all, get, run} from '../data/Database';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Inspect the database. Returns a plain report object (safe to keep in state).
 * @returns {Promise<{ranAt, integrityOk, suspiciousDates, ok}>}
 */
export async function runHealthCheck() {
  const now = Date.now();
  const future = now + 370 * DAY; // > ~1 year ahead is almost certainly a typo
  const past = new Date(2000, 0, 1).getTime();

  let integrityOk = true;
  try {
    const rows = await all('PRAGMA integrity_check;');
    const first = rows[0] ? Object.values(rows[0])[0] : 'ok';
    integrityOk = first === 'ok';
  } catch (e) {
    integrityOk = false;
  }

  let suspiciousDates = 0;
  try {
    const row = await get(
      'SELECT COUNT(*) AS c FROM transactions WHERE date > ? OR date < ?;',
      [future, past],
    );
    suspiciousDates = row ? row.c : 0;
  } catch (e) {
    suspiciousDates = 0;
  }

  const ok = integrityOk && suspiciousDates === 0;
  return {ranAt: now, integrityOk, suspiciousDates, ok};
}

/**
 * Apply the safe fixes: reclaim free space with VACUUM. (Receipt orphan cleanup
 * is wired in once receipts exist.) Returns a fresh report.
 */
export async function fixHealth() {
  try {
    await run('VACUUM;');
  } catch (e) {
    // VACUUM can't run inside a transaction; ignore if the platform refuses.
  }
  return runHealthCheck();
}

export default {runHealthCheck, fixHealth};
