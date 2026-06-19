/**
 * Card.js — elevated surface container. When `onPress` is provided it becomes a
 * touchable with an Android ripple and a subtle scale animation.
 */
import React from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import {usePressScale} from '../animations/SmoothAnimations';
import {colors, radius, spacing, shadow} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated = false,
}) {
  const {animatedStyle, onPressIn, onPressOut} = usePressScale(0.985);

  const baseStyle = [
    styles.card,
    elevated && styles.elevated,
    padded && styles.padded,
    style,
  ];

  if (!onPress) {
    return <View style={baseStyle}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      android_ripple={{color: colors.ripple, borderless: false}}
      style={[...baseStyle, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadow.card,
  },
  padded: {padding: spacing.lg},
});
