/**
 * FileImporter.js — pick a CSV from device storage and read it as UTF-8.
 *
 * Uses the Android Storage Access Framework (react-native-document-picker) so
 * no broad storage permission is required, and react-native-fs to read the
 * file content. `copyTo: 'cachesDirectory'` gives us a stable file:// path to
 * read reliably regardless of the original content:// provider.
 */
import DocumentPicker, {types, isCancel} from 'react-native-document-picker';
import RNFS from 'react-native-fs';

/**
 * Present the system file picker and return the file's text content.
 * @returns {Promise<{cancelled:boolean, content?:string, fileName?:string}>}
 */
export async function pickCsvFile() {
  let picked;
  try {
    const results = await DocumentPicker.pick({
      type: [types.csv, types.plainText, types.allFiles],
      copyTo: 'cachesDirectory',
      mode: 'open',
    });
    picked = Array.isArray(results) ? results[0] : results;
  } catch (err) {
    if (isCancel(err)) {
      return {cancelled: true};
    }
    throw new Error('Could not open the file picker. Please try again.');
  }

  if (!picked) {
    return {cancelled: true};
  }

  const path = picked.fileCopyUri || picked.uri;
  if (!path) {
    throw new Error('The selected file could not be accessed.');
  }

  try {
    const content = await RNFS.readFile(decodeURIComponent(path), 'utf8');
    return {
      cancelled: false,
      content,
      fileName: picked.name || 'import.csv',
    };
  } catch (err) {
    throw new Error(
      'Could not read the file. Make sure it is a valid CSV exported from your bank.',
    );
  }
}

/**
 * Write CSV text to the device Downloads folder (falls back to the app's
 * private external dir if Downloads is not writable). Returns the saved path.
 */
export async function saveCsvFile(fileName, content) {
  const safeName = String(fileName || 'export.csv').replace(/[^\w.-]+/g, '_');
  const targets = [
    RNFS.DownloadDirectoryPath,
    RNFS.ExternalDirectoryPath,
    RNFS.DocumentDirectoryPath,
  ].filter(Boolean);

  let lastError = null;
  for (const dir of targets) {
    const dest = `${dir}/${safeName}`;
    try {
      await RNFS.writeFile(dest, content, 'utf8');
      return dest;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    lastError ? `Could not save file: ${lastError.message}` : 'Could not save file.',
  );
}

export default {pickCsvFile, saveCsvFile};
