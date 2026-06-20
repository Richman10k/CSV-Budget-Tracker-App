/**
 * PressableScale.js — the app's single, uniform "tappable" primitive.
 *
 * Every interactive element (rows, chips, tabs, icon buttons) uses this so the
 * press feedback — a subtle UI-thread scale + fade plus an Android ripple — is
 * identical everywhere. Smooth at any refresh rate.
 */
import React from 'react';
import {Pressable} from 'react-native';
import Animated from 'react-native-reanimated';
import {usePressScale} from '../animations/SmoothAnimations';
import {colors} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({
  children,
  onPress,
  scaleTo = 0.97,
  rippleBorderless = false,
  rippleRadius,
  hitSlop,
  disabled = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
}) {
  const {animatedStyle, onPressIn, onPressOut} = usePressScale(scaleTo);
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      android_ripple={{
        color: colors.ripple,
        borderless: rippleBorderless,
        radius: rippleRadius,
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
