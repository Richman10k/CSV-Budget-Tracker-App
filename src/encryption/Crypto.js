/**
 * Crypto.js — application-layer cryptography for CSV Budget Tracker.
 *
 * Design goals (solid, not overboard):
 *   - A 256-bit master key is generated with a CSPRNG and stored ONLY in the
 *     Android Keystore (via SecureStorage / react-native-sensitive-info).
 *   - Sensitive transaction/subscription fields are encrypted with
 *     AES-256-CBC and authenticated with HMAC-SHA256 (encrypt-then-MAC)
 *     before being written to SQLite, so the on-disk database never contains
 *     plaintext amounts, descriptions, or merchant names.
 *   - PINs are never stored — only a PBKDF2-SHA256 salted hash is kept.
 *
 * We use crypto-js for the primitives (pure JS, no fragile native build) and
 * react-native-get-random-values to provide a real CSPRNG via
 * global.crypto.getRandomValues (crypto-js alone would fall back to
 * Math.random, which is NOT cryptographically secure).
 */
import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

import {getMasterKeyMaterial, setMasterKeyMaterial} from './SecureStorage';

const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 16; // AES block size
// PBKDF2 stretches the PIN hash. crypto-js runs this on the JS thread, so a very
// high count noticeably delays unlock. A 4-digit PIN only has 10k combinations,
// so the real protections are the Keystore-backed storage + the 5-try lockout;
// 12k iterations keeps a sensible cost while making unlock feel instant.
const PBKDF2_ITERATIONS = 12000;

// Built at runtime from \u escapes so the source file stays pure ASCII
// (control characters: U+0000..U+001F and U+007F).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

// Cached derived keys for the lifetime of an unlocked session. Cleared on lock.
let cachedEncKey = null; // CryptoJS.WordArray
let cachedMacKey = null; // CryptoJS.WordArray

/** Generate `n` cryptographically secure random bytes as a CryptoJS WordArray. */
function secureRandomWordArray(n) {
  const bytes = new Uint8Array(n);
  // Provided by react-native-get-random-values (Android Keystore-backed RNG).
  global.crypto.getRandomValues(bytes);
  const words = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] || 0) << 24) |
        ((bytes[i + 1] || 0) << 16) |
        ((bytes[i + 2] || 0) << 8) |
        (bytes[i + 3] || 0),
    );
  }
  return CryptoJS.lib.WordArray.create(words, n);
}

/**
 * Load the master key from the Keystore, generating + persisting one on first
 * launch. Derives separate encryption and MAC sub-keys (key separation).
 */
async function ensureKeys() {
  if (cachedEncKey && cachedMacKey) {
    return;
  }
  let b64 = await getMasterKeyMaterial();
  if (!b64) {
    const fresh = secureRandomWordArray(KEY_BYTES);
    b64 = CryptoJS.enc.Base64.stringify(fresh);
    await setMasterKeyMaterial(b64);
  }
  const master = CryptoJS.enc.Base64.parse(b64);
  // Derive sub-keys deterministically from the master key (HKDF-like).
  cachedEncKey = CryptoJS.HmacSHA256('csvbt/enc/v1', master);
  cachedMacKey = CryptoJS.HmacSHA256('csvbt/mac/v1', master);
}

/** Constant-time comparison of two hex strings to avoid timing leaks. */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Encrypt a UTF-8 string. Returns a compact, self-describing token:
 *   "v1:<base64 iv>:<base64 ciphertext>:<base64 hmac>"
 */
export async function encrypt(plaintext) {
  await ensureKeys();
  const iv = secureRandomWordArray(IV_BYTES);
  const cipher = CryptoJS.AES.encrypt(String(plaintext), cachedEncKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ctB64 = CryptoJS.enc.Base64.stringify(cipher.ciphertext);
  const ivB64 = CryptoJS.enc.Base64.stringify(iv);
  // MAC covers iv + ciphertext (encrypt-then-MAC).
  const mac = CryptoJS.HmacSHA256(ivB64 + ':' + ctB64, cachedMacKey);
  const macB64 = CryptoJS.enc.Base64.stringify(mac);
  return `v1:${ivB64}:${ctB64}:${macB64}`;
}

/**
 * Decrypt a token produced by encrypt(). Verifies the HMAC first and throws on
 * tamper / wrong key. Returns the original UTF-8 string.
 */
export async function decrypt(token) {
  await ensureKeys();
  if (typeof token !== 'string' || !token.startsWith('v1:')) {
    throw new Error('Invalid ciphertext format');
  }
  const [, ivB64, ctB64, macB64] = token.split(':');
  if (!ivB64 || !ctB64 || !macB64) {
    throw new Error('Malformed ciphertext');
  }
  const expectedMac = CryptoJS.HmacSHA256(ivB64 + ':' + ctB64, cachedMacKey);
  const expectedHex = CryptoJS.enc.Hex.stringify(expectedMac);
  const actualHex = CryptoJS.enc.Hex.stringify(
    CryptoJS.enc.Base64.parse(macB64),
  );
  if (!constantTimeEqual(expectedHex, actualHex)) {
    throw new Error('Authentication failed (data tampered or wrong key)');
  }
  const iv = CryptoJS.enc.Base64.parse(ivB64);
  const ciphertext = CryptoJS.enc.Base64.parse(ctB64);
  const decrypted = CryptoJS.AES.decrypt({ciphertext}, cachedEncKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Deterministic keyed token (HMAC-SHA256 hex) for the same input. Used to build
 * leak-resistant de-duplication keys: identical transactions hash equally, but
 * the value reveals nothing without the master key.
 */
export async function deterministicToken(input) {
  await ensureKeys();
  return CryptoJS.HmacSHA256(String(input), cachedMacKey).toString(
    CryptoJS.enc.Hex,
  );
}

/** Forget derived keys from memory (called when the app locks). */
export function clearKeyCache() {
  cachedEncKey = null;
  cachedMacKey = null;
}

/* ----------------------------- PIN hashing ----------------------------- */

/** Hash a PIN with PBKDF2-SHA256 + a fresh random salt. */
export function hashPin(pin) {
  const salt = secureRandomWordArray(16);
  const hash = CryptoJS.PBKDF2(String(pin), salt, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return {
    salt: CryptoJS.enc.Base64.stringify(salt),
    hash: CryptoJS.enc.Hex.stringify(hash),
    iterations: PBKDF2_ITERATIONS,
  };
}

/** Verify a PIN against a stored {salt, hash, iterations} record. */
export function verifyPin(pin, stored) {
  if (!stored || !stored.salt || !stored.hash) {
    return false;
  }
  const salt = CryptoJS.enc.Base64.parse(stored.salt);
  const computed = CryptoJS.PBKDF2(String(pin), salt, {
    keySize: 256 / 32,
    iterations: stored.iterations || PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return constantTimeEqual(CryptoJS.enc.Hex.stringify(computed), stored.hash);
}

/* --------------------------- Input sanitizing -------------------------- */

/**
 * Strip control characters and cap length on free-text imported from CSV.
 * Prevents control-character payloads from being stored / rendered.
 */
export function sanitizeText(value, maxLength = 256) {
  if (value == null) {
    return '';
  }
  const cleaned = String(value).replace(CONTROL_CHARS_RE, '').trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Neutralize spreadsheet formula-injection when EXPORTING data back to CSV.
 * Values beginning with = + - @ are prefixed with a single quote so that
 * spreadsheet apps treat them as text, never formulas.
 */
export function neutralizeFormula(value) {
  const s = String(value == null ? '' : value);
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

export default {
  encrypt,
  decrypt,
  clearKeyCache,
  hashPin,
  verifyPin,
  sanitizeText,
  neutralizeFormula,
};
