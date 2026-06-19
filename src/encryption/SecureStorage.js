/**
 * SecureStorage.js — thin wrapper over the two secure native stores.
 *
 *   - react-native-sensitive-info  -> holds the AES master key in the
 *     hardware-backed Android Keystore. The key never appears in plaintext
 *     anywhere else and is not included in device backups.
 *   - react-native-encrypted-storage -> holds the PIN hash record and
 *     non-secret app settings (also Keystore-backed encryption).
 *
 * Keeping these behind one module means the rest of the app never talks to a
 * raw storage API and we can swap implementations without ripple effects.
 */
import SInfo from 'react-native-sensitive-info';
import EncryptedStorage from 'react-native-encrypted-storage';

// Namespacing for the Keystore-backed shared preferences / keychain service.
const KEYSTORE_OPTS = {
  sharedPreferencesName: 'csvbt_secure_prefs',
  keychainService: 'csvbt_keychain',
};

const MASTER_KEY = 'csvbt.master_key.v1';
const PIN_KEY = 'csvbt.pin_record.v1';
const SETTINGS_KEY = 'csvbt.settings.v1';

/* ----------------------------- Master key ----------------------------- */

/** Read the base64 master key from the Keystore (or null on first launch). */
export async function getMasterKeyMaterial() {
  try {
    const value = await SInfo.getItem(MASTER_KEY, KEYSTORE_OPTS);
    return value || null;
  } catch (e) {
    return null;
  }
}

/** Persist the base64 master key into the Keystore. */
export async function setMasterKeyMaterial(base64Key) {
  await SInfo.setItem(MASTER_KEY, base64Key, KEYSTORE_OPTS);
}

/* ------------------------------- PIN ----------------------------------- */

/** Store the PBKDF2 PIN record {salt, hash, iterations} (never the PIN). */
export async function storePinRecord(record) {
  await EncryptedStorage.setItem(PIN_KEY, JSON.stringify(record));
}

/** Read the PIN record, or null if no PIN has been set. */
export async function getPinRecord() {
  try {
    const raw = await EncryptedStorage.getItem(PIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** True if the user has configured a PIN. */
export async function hasPin() {
  const record = await getPinRecord();
  return !!record;
}

export async function clearPinRecord() {
  try {
    await EncryptedStorage.removeItem(PIN_KEY);
  } catch (e) {
    // already absent
  }
}

/* ----------------------------- Settings -------------------------------- */

const DEFAULT_SETTINGS = {
  biometricsEnabled: true,
  autoLockSeconds: 30,
  currency: 'USD',
  lockOnBackground: true,
};

/** Read app settings merged over sensible defaults. */
export async function getSettings() {
  try {
    const raw = await EncryptedStorage.getItem(SETTINGS_KEY);
    return raw ? {...DEFAULT_SETTINGS, ...JSON.parse(raw)} : {...DEFAULT_SETTINGS};
  } catch (e) {
    return {...DEFAULT_SETTINGS};
  }
}

/** Persist a (partial) settings patch and return the merged result. */
export async function saveSettings(patch) {
  const current = await getSettings();
  const merged = {...current, ...patch};
  await EncryptedStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

/* ------------------------------ Wipe ----------------------------------- */

/**
 * Remove the PIN and settings (used by "Clear all data"). The master key is
 * left in place so the (now empty) database remains readable; callers that
 * want a full reset should also delete the database file.
 */
export async function clearSecureAppData() {
  await clearPinRecord();
  try {
    await EncryptedStorage.removeItem(SETTINGS_KEY);
  } catch (e) {
    // ignore
  }
}

export default {
  getMasterKeyMaterial,
  setMasterKeyMaterial,
  storePinRecord,
  getPinRecord,
  hasPin,
  clearPinRecord,
  getSettings,
  saveSettings,
  clearSecureAppData,
};
