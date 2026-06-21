/**
 * Button.js — touchable with scale/opacity press animation (Reanimated, UI
 * thread) plus an Android ripple. Variants cover the app's needs.
 */
import React from 'react';
import {Pressable, Text, StyleSheet, View, ActivityIndicator} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {usePressScale} from '../animations/SmoothAnimations';
import {colors, radius, spacing, glowShadow} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VARIANTS = {
  primary: {bg: colors.accent, fg: colors.onAccent, border: 'transparent', glow: colors.accent},
  secondary: {bg: colors.surfaceMuted, fg: colors.text, border: colors.borderFrost},
  ghost: {bg: 'transparent', fg: colors.accent, border: 'transparent'},
  danger: {bg: colors.expense, fg: colors.white, border: 'transparent', glow: colors.expense},
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) {
  const {animatedStyle, onPressIn, onPressOut} = usePressScale(0.97);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.base,
        {backgroundColor: v.bg, borderColor: v.border},
        v.glow && !isDisabled && glowShadow(v.glow, 0.5, 16),
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Icon
              name={icon}
              size={20}
              color={v.fg}
              style={label ? styles.iconSpacing : null}
            />
          ) : null}
          {label ? (
            <Text style={[styles.label, {color: v.fg}]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {alignSelf: 'stretch'},
  disabled: {opacity: 0.45},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  iconSpacing: {marginRight: spacing.sm},
  label: {fontSize: 16, fontWeight: '700'},
});
