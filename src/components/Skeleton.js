/**
 * Skeleton.js — shimmer placeholders for loading states.
 *
 * A frosted base block with a moving light-sweep gradient (SVG) that loops on
 * the UI thread via Reanimated, matching premium fintech loaders. Compose the
 * primitives (Skeleton / SkeletonCircle) or drop in <SkeletonList> for a
 * ready-made transaction-style placeholder.
 */
import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {colors, radius, spacing} from '../theme/theme';

function Sweep({width}) {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, {duration: 1200, easing: Easing.inOut(Easing.ease)}),
      -1,
      false,
    );
  }, [x]);
  const style = useAnimatedStyle(() => ({
    transform: [{translateX: x.value * (width || 0)}],
  }));
  if (!width) {
    return null;
  }
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width} height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height="100%" fill="url(#shimmer)" />
      </Svg>
    </Animated.View>
  );
}

export default function Skeleton({width = '100%', height = 16, style, round = radius.sm}) {
  const [w, setW] = useState(0);
  return (
    <View
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[styles.base, {height, borderRadius: round, width}, style]}>
      <Sweep width={w} />
    </View>
  );
}

export function SkeletonCircle({size = 40, style}) {
  return <Skeleton width={size} height={size} round={size / 2} style={style} />;
}

/** A single transaction-row-shaped placeholder. */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <SkeletonCircle size={40} />
      <View style={styles.rowText}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="40%" height={11} style={{marginTop: 8}} />
      </View>
      <Skeleton width={56} height={14} />
    </View>
  );
}

/** N stacked skeleton rows for list loading states. */
export function SkeletonList({count = 6}) {
  return (
    <View>
      {Array.from({length: count}).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  row: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  rowText: {flex: 1, marginLeft: spacing.md, marginRight: spacing.md},
});
