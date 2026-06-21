/**
 * haptics.js — tactile-feedback stub (intentionally a no-op).
 *
 * This app ships with ZERO Android permissions on purpose (it's 100% offline —
 * see android/app/src/main/AndroidManifest.xml). React Native's Vibration API
 * requires the VIBRATE permission; calling it without that permission throws a
 * native SecurityException that crosses the bridge asynchronously and CRASHES
 * the app on the very interaction that triggered it (e.g. switching tabs).
 *
 * Rather than add a permission and widen the app's footprint, haptics are
 * disabled. The premium press feedback is purely visual (Reanimated scale +
 * glow). These functions stay as no-ops so call sites remain stable and a future
 * maintainer can re-enable haptics in one place if the VIBRATE permission is
 * ever added.
 */
export function tapHaptic() {}

export function selectionHaptic() {}

export function successHaptic() {}

export default {tapHaptic, selectionHaptic, successHaptic};
