/**
 * receiptStore.js — encrypted photo/PDF receipt storage.
 *
 * Receipt files are read as base64, AES-encrypted with the app key (same Crypto
 * as the rest of the data), and written to the app's private documents dir as
 * "<id>.enc". To view, we decrypt to a short-lived file in the cache dir and
 * return a file:// URI. Nothing readable is persisted outside the encrypted
 * blob; the transaction row only stores {id, ext} (itself encrypted).
 */
import RNFS from 'react-native-fs';
import DocumentPicker, {types, isCancel} from 'react-native-document-picker';
import {encrypt, decrypt} from '../encryption/Crypto';

const DIR = `${RNFS.DocumentDirectoryPath}/receipts`;

async function ensureDir() {
  if (!(await RNFS.exists(DIR))) {
    await RNFS.mkdir(DIR);
  }
}

/** Present the picker for an image or PDF. Returns {cancelled} or file info. */
export async function pickReceipt() {
  try {
    const results = await DocumentPicker.pick({
      type: [types.images, types.pdf],
      copyTo: 'cachesDirectory',
      mode: 'open',
    });
    const f = Array.isArray(results) ? results[0] : results;
    if (!f) {
      return {cancelled: true};
    }
    const path = f.fileCopyUri || f.uri;
    const name = f.name || 'receipt';
    const extFromName = (name.split('.').pop() || '').toLowerCase();
    const ext =
      extFromName ||
      (f.type && f.type.includes('pdf') ? 'pdf' : 'jpg');
    return {cancelled: false, path: decodeURIComponent(path), ext, mime: f.type};
  } catch (e) {
    if (isCancel(e)) {
      return {cancelled: true};
    }
    throw new Error('Could not open the file picker. Please try again.');
  }
}

/** Encrypt a source file and store it. Returns {id, ext}. */
export async function saveEncrypted(srcPath, ext) {
  await ensureDir();
  const base64 = await RNFS.readFile(srcPath, 'base64');
  const cipher = await encrypt(base64);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await RNFS.writeFile(`${DIR}/${id}.enc`, cipher, 'utf8');
  return {id, ext: ext || 'jpg'};
}

/** Decrypt a stored receipt to a temp cache file; returns a file:// URI or null. */
export async function resolveForView(meta) {
  if (!meta || !meta.id) {
    return null;
  }
  const enc = `${DIR}/${meta.id}.enc`;
  if (!(await RNFS.exists(enc))) {
    return null;
  }
  const cipher = await RNFS.readFile(enc, 'utf8');
  const base64 = await decrypt(cipher);
  const tmp = `${RNFS.CachesDirectoryPath}/receipt-${meta.id}.${meta.ext || 'jpg'}`;
  await RNFS.writeFile(tmp, base64, 'base64');
  return `file://${tmp}`;
}

/** Delete a stored receipt blob (best-effort). */
export async function deleteReceipt(meta) {
  if (!meta || !meta.id) {
    return;
  }
  const enc = `${DIR}/${meta.id}.enc`;
  try {
    if (await RNFS.exists(enc)) {
      await RNFS.unlink(enc);
    }
  } catch (e) {
    // best-effort
  }
}

/** Delete stored blobs no longer referenced by any transaction. Returns count. */
export async function cleanupOrphans(referencedIds) {
  try {
    await ensureDir();
    const files = await RNFS.readDir(DIR);
    let removed = 0;
    for (const f of files) {
      const id = f.name.replace(/\.enc$/, '');
      if (!referencedIds.has(id)) {
        try {
          await RNFS.unlink(f.path);
          removed += 1;
        } catch (e) {
          // ignore
        }
      }
    }
    return removed;
  } catch (e) {
    return 0;
  }
}

export default {pickReceipt, saveEncrypted, resolveForView, deleteReceipt, cleanupOrphans};
