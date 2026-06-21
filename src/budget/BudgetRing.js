/**
 * BudgetRing.js — circular spend-vs-limit progress ring (react-native-svg) that
 * springs to its value on the UI thread via Reanimated. Color is supplied by
 * the caller (see theme.budgetStatus) so green/amber/red stays consistent with
 * the rest of the Budget screen.
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import {colors, typography} from '../theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function BudgetRing({
  fraction = 0,
  color = colors.accent,
  size = 96,
  strokeWidth = 10,
  centerValue,
  centerLabel,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(Math.max(0, Math.min(fraction, 1)), {
      damping: 16,
      stiffness: 120,
      mass: 0.6,
    });
  }, [fraction, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{width: size, height: size}}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Soft glowing halo following the filled arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeOpacity={0.22}
          strokeWidth={strokeWidth + 8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Animated progress arc, starting at 12 o'clock */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={styles.center}>
        {centerValue != null ? (
          <Text style={[styles.value, {color}]} numberOfLines={1}>
            {centerValue}
          </Text>
        ) : null}
        {centerLabel ? (
          <Text style={styles.label} numberOfLines={1}>
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {...typography.heading, fontSize: 16},
  label: {...typography.caption, marginTop: 1},
});
