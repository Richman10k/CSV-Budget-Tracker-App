/**
 * FrostedCard.js — the app's premium "Liquid Glass" surface.
 *
 * Composition (bottom → top):
 *   1. a translucent frosted base (lets the #0A0A0A canvas bleed through)
 *   2. a thin glowing border + deep drop shadow for floating depth
 *   3. an SVG frost sheen on the top edge (light reflection) via GlassHighlight
 *   4. an accent glow-border overlay that pulses in while pressed
 *
 * When `onPress` is supplied it animates on the UI thread (Reanimated spring):
 * a subtle scale to 0.97, a small opacity dip, and the accent glow pulse — so
 * it stays buttery up to 120fps. Use this for hero / feature surfaces; the
 * lighter <Card> is fine for plain containers.
 */
import React from 'react';
import {View, Pressable, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GlassHighlight from './GlassHighlight';
import {getSpring} from '../animations/FrameRateManager';
import {colors, radius, spacing, glass, glowShadow} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FrostedCard({
  children,
  onPress,
  onLongPress,
  style,
  padded = true,
  intensity = 'base', // 'base' | 'elevated'
  glowColor, // optional neon halo color (defaults to indigo accent when pressable)
  sheen = true,
  cardRadius = radius.lg,
  pressScale = 0.97,
  accessibilityLabel,
}) {
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const onPressIn = () => {
    scale.value = withSpring(pressScale, getSpring());
    press.value = withTiming(1, {duration: 120});
  };
  const onPressOut = () => {
    scale.value = withSpring(1, getSpring());
    press.value = withTiming(0, {duration: 260});
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: 1 - 0.03 * press.value,
  }));
  // A soft, capped glow — never a hard full-opacity outline.
  const glowStyle = useAnimatedStyle(() => ({opacity: press.value * 0.5}));

  const halo = glowColor || (onPress ? colors.accent : null);

  const base = [
    intensity === 'elevated' ? glass.elevated : glass.base,
    {borderRadius: cardRadius},
    halo && glowShadow(halo, 0.35, 16),
    padded && styles.padded,
    style,
  ];

  const inner = (
    <>
      {sheen ? <GlassHighlight radius={cardRadius} glowColor={glowColor} /> : null}
      {onPress ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowBorder,
            {borderColor: halo || colors.accent, borderRadius: cardRadius},
            glowStyle,
          ]}
        />
      ) : null}
      {children}
    </>
  );

  if (!onPress) {
    return <View style={base}>{inner}</View>;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      android_ripple={{color: colors.ripple, borderless: false}}
      style={[...base, animatedStyle]}>
      {inner}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  padded: {padding: spacing.lg},
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
});
