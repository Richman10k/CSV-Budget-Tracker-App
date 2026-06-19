/**
 * BiometricAuth.js — fingerprint / face unlock via react-native-biometrics.
 *
 * We use a simple presence check (simplePrompt) to gate app access. The actual
 * data-encryption key lives in the Android Keystore (see Crypto/SecureStorage);
 * biometrics gate *access* to the unlocked session, and a user PIN is the
 * fallback when biometrics are unavailable or fail.
 */
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';

// allowDeviceCredentials:false -> if biometrics fail we fall back to OUR PIN,
// not the device lockscreen, keeping the app's auth self-contained.
const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: false,
});

/**
 * Capability check. Returns { available, biometryType, label }.
 * biometryType is one of BiometryTypes (TouchID/FaceID/Biometrics) or null.
 */
export async function getBiometricCapability() {
  try {
    const {available, biometryType} = await rnBiometrics.isSensorAvailable();
    let label = 'Biometrics';
    if (biometryType === BiometryTypes.FaceID) {
      label = 'Face Unlock';
    } else if (biometryType === BiometryTypes.TouchID) {
      label = 'Fingerprint';
    } else if (biometryType === BiometryTypes.Biometrics) {
      label = 'Fingerprint / Face';
    }
    return {available: !!available, biometryType: biometryType || null, label};
  } catch (e) {
    return {available: false, biometryType: null, label: 'Biometrics'};
  }
}

/**
 * Show the system biometric prompt.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authenticate(promptMessage = 'Unlock CSV Budget Tracker') {
  try {
    const {success, error} = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Use PIN',
    });
    return {success: !!success, error};
  } catch (e) {
    return {success: false, error: e && e.message ? e.message : 'Biometric error'};
  }
}

export default {getBiometricCapability, authenticate};
