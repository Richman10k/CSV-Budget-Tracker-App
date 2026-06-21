/**
 * Card.js — the app's standard frosted-glass container.
 *
 * Re-skinned to the Liquid-Glass aesthetic: a translucent frosted base (the
 * #0A0A0A canvas bleeds through), a thin glowing hairline border, a top frost
 * sheen, and a deep shadow when `elevated`. When `onPress` is provided it
 * becomes a touchable with an Android ripple + subtle scale animation.
 *
 * The API is unchanged (children/onPress/style/padded/elevated) so every
 * existing usage across the app inherits the new look for free. For richer
 * hero surfaces (press glow pulse, accent halo) use <FrostedCard> instead.
 */
import React from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import GlassHighlight from './GlassHighlight';
import {usePressScale} from '../animations/SmoothAnimations';
import {colors, radius, spacing, glass, shadow} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Card({
  children,
  onPress,
  style,
  padded = true,
  elevated = false,
  sheen = true,
  glowColor,
}) {
  const {animatedStyle, onPressIn, onPressOut} = usePressScale(0.985);

  const baseStyle = [
    glass.base,
    elevated && styles.elevated,
    padded && styles.padded,
    style,
  ];

  const inner = (
    <>
      {sheen ? <GlassHighlight radius={radius.lg} glowColor={glowColor} /> : null}
      {children}
    </>
  );

  if (!onPress) {
    return <View style={baseStyle}>{inner}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      android_ripple={{color: colors.ripple, borderless: false}}
      style={[...baseStyle, animatedStyle]}>
      {inner}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  elevated: {
    backgroundColor: colors.cardFrostElevated,
    ...shadow.card,
  },
  padded: {padding: spacing.lg},
});
