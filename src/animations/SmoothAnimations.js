/**
 * SmoothAnimations.js — reusable Reanimated presets + hooks.
 *
 * Everything here runs on the UI thread, so animations track the display's
 * native refresh rate (up to 120 fps). Components import these instead of
 * hand-rolling worklets so motion stays consistent app-wide.
 */
import {useCallback, useEffect} from 'react';
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
    // Clean, shape-matching press: a uniform scale + fade (no Android ripple,
    // which renders as a mismatched rectangle on rounded/translucent surfaces).
    opacity.value = withTiming(0.9, {duration: 80});
  }, [scale, opacity, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, getSpring());
    opacity.value = withTiming(1, {duration: 140});
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

/**
 * Bottom-sheet / popup reveal driven by a single shared value (NOT the layout
 * `entering` prop, which is glitchy inside an Android <Modal>). Returns a sheet
 * style (slide-up + fade) and a backdrop style (fade) that spring open when
 * `visible` flips true. Pair with a <Modal animationType="none"> so RN doesn't
 * double-animate. Smooth + snappy on the UI thread.
 */
export function useSheetReveal(visible, {offset = 48} = {}) {
  // Start hidden so the open transition always plays on the first visible frame.
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withSpring(visible ? 1 : 0, {
      damping: 24,
      stiffness: 260,
      mass: 0.7,
    });
  }, [visible, t]);
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{translateY: (1 - t.value) * offset}],
  }));
  const backdropStyle = useAnimatedStyle(() => ({opacity: t.value}));
  return {sheetStyle, backdropStyle};
}

/** Centered popup reveal (fade + subtle scale) for dialogs that aren't sheets. */
export function usePopupReveal(visible) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withSpring(visible ? 1 : 0, {
      damping: 22,
      stiffness: 260,
      mass: 0.7,
    });
  }, [visible, t]);
  const popupStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{scale: 0.94 + 0.06 * t.value}],
  }));
  const backdropStyle = useAnimatedStyle(() => ({opacity: t.value}));
  return {popupStyle, backdropStyle};
}

export default {
  EASING,
  usePressScale,
  usePopAnimation,
  enterFromBottom,
  fadeIn,
  modalSlideUp,
  smoothLayout,
  useSheetReveal,
  usePopupReveal,
};
