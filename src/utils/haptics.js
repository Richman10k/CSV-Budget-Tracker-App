/**
 * haptics.js — tiny tactile-feedback helper.
 *
 * Uses React Native's built-in Vibration API so we get subtle haptics with no
 * extra native dependency. Durations are tuned to feel like a light "tick" on
 * Android; iOS plays its fixed system vibration. All calls are guarded so they
 * never throw on devices without a vibrator.
 */
import {Vibration} from 'react-native';

export function tapHaptic() {
  try {
    Vibration.vibrate(8);
  } catch (e) {
    // no vibrator / not permitted — ignore
  }
}

export function selectionHaptic() {
  try {
    Vibration.vibrate(5);
  } catch (e) {}
}

export function successHaptic() {
  try {
    Vibration.vibrate([0, 12, 45, 18]);
  } catch (e) {}
}

export default {tapHaptic, selectionHaptic, successHaptic};
