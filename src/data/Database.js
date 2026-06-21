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
// Bump this and add a MIGRATIONS entry whenever the schema changes.
const SCHEMA_VERSION = 3;

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

/** True if `table` already has a column named `column`. */
async function hasColumn(db, table, column) {
  const [res] = await db.executeSql(`PRAGMA table_info(${table});`);
  for (let i = 0; i < res.rows.length; i++) {
    if (res.rows.item(i).name === column) {
      return true;
    }
  }
  return false;
}

/** ALTER TABLE ADD COLUMN, but only if the column isn't already present. */
async function addColumn(db, table, column, type) {
  if (!(await hasColumn(db, table, column))) {
    await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

/**
 * Forward-only migrations keyed by the schema version they bring the DB UP TO.
 * Each runs exactly once; they must be idempotent (guarded) so a retry is safe.
 * All new sensitive values are encrypted by the model layer (enc_* columns).
 */
const MIGRATIONS = {
  // v2 — Automation & Insights: subscription price-change details + the
  // "ignore as recurring" pattern store.
  2: async db => {
    await addColumn(db, 'subscriptions', 'enc_price_change', 'TEXT');
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS recurring_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_key TEXT NOT NULL,
        enc_amount TEXT,
        interval TEXT,
        action TEXT NOT NULL DEFAULT 'ignore',
        created_at INTEGER NOT NULL
      );`);
    await db.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_rp_merchant ON recurring_patterns(merchant_key);',
    );
  },
  // v3 — Photo receipts: encrypted reference ({id, ext}) per transaction.
  3: async db => {
    await addColumn(db, 'transactions', 'enc_receipt_uri', 'TEXT');
  },
};

/** Create the base (v1) tables + indexes. Idempotent. */
async function createBaseSchema(db) {
  await db.executeSql(CREATE_META);
  await db.executeSql(CREATE_TRANSACTIONS);
  await db.executeSql(CREATE_SUBSCRIPTIONS);
  await db.executeSql(CREATE_BUDGETS);
  for (const stmt of INDEXES) {
    await db.executeSql(stmt);
  }
}

async function readVersion(db) {
  const [res] = await db.executeSql(
    'SELECT value FROM meta WHERE key = ?;',
    ['schema_version'],
  );
  if (res.rows.length === 0) {
    return null;
  }
  return parseInt(res.rows.item(0).value, 10) || null;
}

/**
 * Bring the database up to SCHEMA_VERSION: create base tables, then apply any
 * pending forward migrations in order. A brand-new DB starts at v1 (the base
 * schema) and then runs 2..N.
 */
async function createSchema(db) {
  await createBaseSchema(db);
  let current = (await readVersion(db)) || 1; // null => fresh DB == base v1
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) {
      await migrate(db);
    }
    current = v;
  }
  await db.executeSql('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);', [
    'schema_version',
    String(SCHEMA_VERSION),
  ]);
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
    'DELETE FROM recurring_patterns;',
    "DELETE FROM sqlite_sequence WHERE name IN ('transactions','subscriptions','budgets','recurring_patterns');",
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
