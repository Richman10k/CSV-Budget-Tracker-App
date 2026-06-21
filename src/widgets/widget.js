/**
 * widget.js — thin JS wrapper over the native WidgetModule bridge.
 *
 * Pushes already-formatted display values to the Android home-screen widget.
 * Safe no-op on platforms / builds where the native module isn't present.
 */
import {NativeModules, Platform} from 'react-native';

const {WidgetModule} = NativeModules;

/**
 * @param {Object} data
 * @param {string} data.net         formatted today's net, e.g. "-$42.10"
 * @param {string} data.netColor    hex color for the net value
 * @param {string} data.topCategory short line, e.g. "Top: Groceries"
 * @param {number} data.progress    budget usage 0-100
 */
export function updateWidget(data) {
  if (Platform.OS !== 'android' || !WidgetModule) {
    return;
  }
  try {
    WidgetModule.updateWidget(data);
  } catch (e) {
    // Widget is best-effort; never let it break the app.
  }
}

export default {updateWidget};
