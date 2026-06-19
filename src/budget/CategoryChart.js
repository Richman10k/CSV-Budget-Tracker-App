/**
 * CategoryChart.js — custom, animated spending charts.
 *
 *   - CategoryDonut: an SVG ring (react-native-svg) whose segments sweep in on
 *     load via Reanimated animatedProps.
 *   - CategoryBars: an animated horizontal bar list for "top categories".
 *
 * Built by hand (no chart library) for the smallest bundle and full control of
 * the up-to-120fps animation.
 */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import {colors, spacing, typography, radius, colorForCategory} from '../theme/theme';
import {getDurations, EASING} from '../animations/FrameRateManager';
import {formatCurrency} from '../utils/formatCurrency';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DonutSegment({progress, fraction, offset, color, size, strokeWidth}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProps = useAnimatedProps(() => {
    const len = Math.max(fraction * circumference * progress.value - 1, 0);
    return {strokeDasharray: [len, circumference]};
  });

  // Start at 12 o'clock (-90deg) then offset by the cumulative fraction.
  const rotation = -90 + offset * 360;

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      transform={`rotate(${rotation} ${cx} ${cy})`}
      animatedProps={animatedProps}
    />
  );
}

export function CategoryDonut({data = [], size = 180, strokeWidth = 22, centerLabel, centerValue, currency = 'USD'}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {duration: getDurations().slow, easing: EASING});
  }, [progress]);

  const total = data.reduce((sum, d) => sum + Math.abs(d.amount), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const fraction = total > 0 ? Math.abs(d.amount) / total : 0;
    const offset = cumulative;
    cumulative += fraction;
    return {
      key: `${d.name}-${i}`,
      fraction,
      offset,
      color: d.color || colorForCategory(d.name),
    };
  });

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
        {segments.map(s => (
          <DonutSegment
            key={s.key}
            progress={progress}
            fraction={s.fraction}
            offset={s.offset}
            color={s.color}
            size={size}
            strokeWidth={strokeWidth}
          />
        ))}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.centerValue} numberOfLines={1}>
          {centerValue != null ? formatCurrency(centerValue, currency) : formatCurrency(total, currency)}
        </Text>
        {centerLabel ? <Text style={styles.centerLabel}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
}

function Bar({fraction, color, index}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      Math.min(index, 8) * 40,
      withTiming(1, {duration: getDurations().base, easing: EASING}),
    );
  }, [p, index]);
  const style = useAnimatedStyle(() => ({
    width: trackWidth * Math.min(fraction, 1) * p.value,
  }));
  return (
    <View
      style={styles.barTrack}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.barFill, {backgroundColor: color}, style]} />
    </View>
  );
}

export function CategoryBars({data = [], currency = 'USD'}) {
  const max = data.reduce((m, d) => Math.max(m, Math.abs(d.amount)), 0);
  return (
    <View>
      {data.map((d, i) => {
        const color = d.color || colorForCategory(d.name);
        return (
          <View key={`${d.name}-${i}`} style={styles.barRow}>
            <View style={styles.barHeader}>
              <View style={styles.barLabelWrap}>
                <View style={[styles.dot, {backgroundColor: color}]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {d.name}
                </Text>
              </View>
              <Text style={styles.barAmount}>{formatCurrency(d.amount, currency)}</Text>
            </View>
            <Bar fraction={max > 0 ? Math.abs(d.amount) / max : 0} color={color} index={i} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {...typography.heading},
  centerLabel: {...typography.caption, marginTop: 2},
  barRow: {marginBottom: spacing.md},
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabelWrap: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm},
  barLabel: {...typography.label, color: colors.text, flexShrink: 1},
  barAmount: {...typography.label, color: colors.textSecondary},
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: {height: 10, borderRadius: radius.pill},
});

export default CategoryDonut;
