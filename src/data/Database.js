/**
 * Database.js — SQLite access layer (react-native-sqlite-storage).
 *
 * Storage strategy:
 *   - Sensitive values (amount, balance, description, merchant, notes,
 *     subscription name, budget limit) are encrypted by the model layer with
 *     AES-256 before they ever reach SQLite, so the .db file holds only
 *     ciphertext for those columns.
 *   - Non-sensitive, indexable columns (date, type, category, status) stay in
 *     plaintext so we can sort/filter efficiently with SQL.
 *   - Every query is parameterized (no string concatenation) to eliminate SQL
 *     injection.
 */
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);
// Never log SQL/params — they could contain (encrypted) sensitive payloads.
SQLite.DEBUG(false);

const DB_NAME = 'csvbudget.db';
const SCHEMA_VERSION = 1;

let dbInstance = null;
let openPromise = null;

const CREATE_META = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );`;

const CREATE_TRANSACTIONS = `
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    enc_description TEXT,
    enc_amount TEXT NOT NULL,
    enc_balance TEXT,
    enc_merchant TEXT,
    dedupe_hash TEXT UNIQUE,
    source TEXT,
    created_at INTEGER NOT NULL
  );`;

const CREATE_SUBSCRIPTIONS = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enc_name TEXT NOT NULL,
    merchant_key TEXT,
    enc_amount TEXT NOT NULL,
    interval TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    category TEXT,
    next_due INTEGER,
    last_charge INTEGER,
    enc_notes TEXT,
    flags TEXT,
    auto_detected INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`;

const CREATE_BUDGETS = `
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    enc_limit TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`;

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);',
  'CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);',
  'CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);',
  'CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);',
];

async function createSchema(db) {
  await db.executeSql(CREATE_META);
  await db.executeSql(CREATE_TRANSACTIONS);
  await db.executeSql(CREATE_SUBSCRIPTIONS);
  await db.executeSql(CREATE_BUDGETS);
  for (const stmt of INDEXES) {
    await db.executeSql(stmt);
  }
  await db.executeSql(
    'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);',
    ['schema_version', String(SCHEMA_VERSION)],
  );
}

/**
 * Open (once) and return the shared database handle. Concurrent callers share a
 * single open promise so we never open the DB twice.
 */
export async function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  if (!openPromise) {
    openPromise = (async () => {
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      await createSchema(db);
      dbInstance = db;
      return db;
    })().catch(err => {
      // Reset so a later retry can attempt to open again.
      openPromise = null;
      throw err;
    });
  }
  return openPromise;
}

/** Execute a write/DDL statement; returns the raw ResultSet. */
export async function run(sql, params = []) {
  const db = await getDatabase();
  const [result] = await db.executeSql(sql, params);
  return result;
}

/** Execute a SELECT and return an array of plain row objects. */
export async function all(sql, params = []) {
  const result = await run(sql, params);
  const rows = [];
  const len = result.rows.length;
  for (let i = 0; i < len; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

/** Execute a SELECT expected to return a single row (or null). */
export async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length ? rows[0] : null;
}

/**
 * Run many statements inside a single transaction (fast bulk insert).
 * Each entry is either a SQL string or a [sql, params] tuple.
 */
export async function batch(statements) {
  const db = await getDatabase();
  await db.sqlBatch(statements);
}

/** Permanently delete all user data (used by Settings -> Clear all data). */
export async function wipeDatabase() {
  const db = await getDatabase();
  await db.sqlBatch([
    'DELETE FROM transactions;',
    'DELETE FROM subscriptions;',
    'DELETE FROM budgets;',
    "DELETE FROM sqlite_sequence WHERE name IN ('transactions','subscriptions','budgets');",
  ]);
}

/** Close the database (e.g. when the app is being torn down). */
export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    openPromise = null;
  }
}

export default {
  getDatabase,
  run,
  all,
  get,
  batch,
  wipeDatabase,
  closeDatabase,
};
