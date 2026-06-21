/**
 * FrameRateManager.js — adapts animation timing to the device's refresh rate.
 *
 * Reanimated runs animations on the UI thread, so they already render at the
 * panel's native refresh rate (120 Hz on a Pixel 10 Pro, 90/60 elsewhere).
 * This manager simply tunes durations/springs so motion feels equally crisp at
 * every tier: snappier on high-refresh panels, slightly gentler on 60 Hz to
 * avoid perceived jank.
 */
import {useEffect, useState} from 'react';
import {measureFrameRate, getFrameRateTier} from '../utils/getDeviceFrameRate';

// Base (designed-for-120) durations in ms. Lower tiers get a mild stretch.
// Tuned snappy — long animations read as sluggish on a finance dashboard.
const BASE_DURATIONS = {fast: 110, base: 180, slow: 280};

const TIER_SCALE = {
  120: 1.0,
  90: 1.12,
  60: 1.25,
};

/** Duration set scaled for the current (or provided) refresh tier. */
export function getDurations(tier = getFrameRateTier()) {
  const scale = TIER_SCALE[tier] || 1.0;
  return {
    fast: Math.round(BASE_DURATIONS.fast * scale),
    base: Math.round(BASE_DURATIONS.base * scale),
    slow: Math.round(BASE_DURATIONS.slow * scale),
  };
}

/** A spring config tuned per tier (stiffer springs on faster displays). */
export function getSpring(tier = getFrameRateTier()) {
  switch (tier) {
    case 120:
      return {damping: 18, stiffness: 220, mass: 0.7};
    case 90:
      return {damping: 18, stiffness: 190, mass: 0.8};
    case 60:
    default:
      return {damping: 20, stiffness: 160, mass: 0.9};
  }
}

/**
 * React hook: measures the refresh rate once on mount and returns the live
 * tier (60/90/120) plus derived durations/spring. Components can use these to
 * keep motion buttery on every device.
 */
export function useFrameRate() {
  const [tier, setTier] = useState(getFrameRateTier());

  useEffect(() => {
    let mounted = true;
    measureFrameRate().then(result => {
      if (mounted) {
        setTier(result.tier);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    tier,
    durations: getDurations(tier),
    spring: getSpring(tier),
  };
}

export default {getDurations, getSpring, useFrameRate};
