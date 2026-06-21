/**
 * SmoothAnimations.js — reusable Reanimated presets + hooks.
 *
 * Everything here runs on the UI thread, so animations track the display's
 * native refresh rate (up to 120 fps). Components import these instead of
 * hand-rolling worklets so motion stays consistent app-wide.
 */
import {useCallback} from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  SlideInDown,
  Layout,
} from 'react-native-reanimated';
import {getSpring, getDurations} from './FrameRateManager';

export const EASING = Easing.bezier(0.22, 1, 0.36, 1); // smooth "out-quint"-ish

/**
 * Press feedback: returns an animated style + handlers that scale a touchable
 * down slightly while pressed. Buttery on the UI thread.
 */
export function usePressScale(scaleTo = 0.96) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(scaleTo, getSpring());
    // Subtle depress only — a heavy opacity drop reads as a cheap "grey-out".
    opacity.value = withTiming(0.96, {duration: 90});
  }, [scale, opacity, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, getSpring());
    opacity.value = withTiming(1, {duration: 160});
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return {animatedStyle, onPressIn, onPressOut};
}

/**
 * A subtle "pop" used to acknowledge an action (e.g. saving). Drives a shared
 * value through 1 -> 1.08 -> 1.
 */
export function usePopAnimation() {
  const scale = useSharedValue(1);
  const pop = useCallback(() => {
    scale.value = withSequence(
      withTiming(1.08, {duration: 110, easing: EASING}),
      withSpring(1, getSpring()),
    );
  }, [scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));
  return {animatedStyle, pop};
}

/** Standard entering animation for list items / cards (staggered by index). */
export function enterFromBottom(index = 0) {
  const {base} = getDurations();
  return FadeInDown.duration(base)
    .delay(Math.min(index, 8) * 40)
    .easing(EASING);
}

/** Generic fade-in for screen content. */
export function fadeIn(delay = 0) {
  const {base} = getDurations();
  return FadeIn.duration(base).delay(delay);
}

/** Modal / bottom-sheet slide-up. */
export function modalSlideUp() {
  const {slow} = getDurations();
  return SlideInDown.duration(slow).easing(EASING);
}

/** Smooth layout transition for reflowing lists. */
export const smoothLayout = Layout.springify().damping(18).stiffness(200);

export default {
  EASING,
  usePressScale,
  usePopAnimation,
  enterFromBottom,
  fadeIn,
  modalSlideUp,
  smoothLayout,
};
