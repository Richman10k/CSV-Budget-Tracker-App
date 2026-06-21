/**
 * EmptyState.js — friendly empty/onboarding placeholder used across tabs when
 * there is no data yet (e.g. before the first CSV import).
 *
 * The icon sits in a glowing frosted well that gently floats up and down on a
 * loop (UI thread) and pulses its accent halo — a subtle, premium "alive" feel
 * without a heavy illustration.
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {fadeIn} from '../animations/SmoothAnimations';
import {colors, spacing, typography, glowShadow} from '../theme/theme';
import Button from './Button';

export default function EmptyState({
  icon = 'file-document-outline',
  title,
  message,
  actionLabel,
  onAction,
  actionIcon,
}) {
  const float = useSharedValue(0);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-8, {duration: 1600, easing: Easing.inOut(Easing.ease)}),
        withTiming(0, {duration: 1600, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.85, {duration: 1600, easing: Easing.inOut(Easing.ease)}),
        withTiming(0.4, {duration: 1600, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );
  }, [float, glow]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{translateY: float.value}],
  }));
  const glowStyle = useAnimatedStyle(() => ({opacity: glow.value}));

  return (
    <Animated.View entering={fadeIn()} style={styles.container}>
      <Animated.View style={[styles.iconWrap, floatStyle]}>
        <Animated.View
          style={[styles.glowRing, glowShadow(colors.accent, 0.9, 28), glowStyle]}
        />
        <View style={styles.iconCircle}>
          <Icon name={icon} size={44} color={colors.accent} />
        </View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: colors.accent,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {...typography.heading, textAlign: 'center'},
  message: {
    ...typography.label,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  action: {marginTop: spacing.xl},
});
