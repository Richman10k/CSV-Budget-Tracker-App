/**
 * getDeviceFrameRate.js — detect the device's display refresh capability
 * (60 / 90 / 120 Hz) using a pure-JS requestAnimationFrame sampler.
 *
 * There is no public React Native API for the panel refresh rate, so we measure
 * it: rAF fires once per displayed frame, so the average inter-frame delta over
 * a short window reveals the achievable FPS. This adds no native dependency.
 */

let cachedTier = null; // {fps, tier} once measured

/** Snap a measured FPS to the nearest common tier. */
function tierFromFps(fps) {
  if (fps >= 110) {
    return 120;
  }
  if (fps >= 80) {
    return 90;
  }
  return 60;
}

/**
 * Measure the refresh rate over ~`durationMs`. Resolves to
 * { fps: <measured>, tier: 60|90|120 }. The result is cached after first call.
 */
export function measureFrameRate(durationMs = 1000) {
  if (cachedTier) {
    return Promise.resolve(cachedTier);
  }
  return new Promise(resolve => {
    let frames = 0;
    let start = null;
    let last = null;

    const tick = now => {
      if (start === null) {
        start = now;
        last = now;
        frames = 0;
        requestAnimationFrame(tick);
        return;
      }
      frames += 1;
      last = now;
      if (now - start < durationMs) {
        requestAnimationFrame(tick);
      } else {
        const elapsed = last - start;
        const fps = elapsed > 0 ? (frames * 1000) / elapsed : 60;
        cachedTier = {fps: Math.round(fps), tier: tierFromFps(fps)};
        resolve(cachedTier);
      }
    };

    requestAnimationFrame(tick);
  });
}

/** Last measured tier (defaults to 60 until measureFrameRate resolves). */
export function getFrameRateTier() {
  return cachedTier ? cachedTier.tier : 60;
}

/** Reset the cache (mainly for tests). */
export function resetFrameRateCache() {
  cachedTier = null;
}

export default {measureFrameRate, getFrameRateTier, resetFrameRateCache};
