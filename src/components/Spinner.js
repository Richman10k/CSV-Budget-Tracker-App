/**
 * Spinner.js — Reanimated rotating loader (UI-thread, smooth at any refresh).
 * Also exports a centered LoadingScreen for full-screen loading states.
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../theme/theme';

export default function Spinner({size = 28, color = colors.accent}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {duration: 900, easing: Easing.linear}),
      -1,
      false,
    );
  }, [rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  return (
    <Animated.View style={style}>
      <Icon name="loading" size={size} color={color} />
    </Animated.View>
  );
}

export function LoadingScreen({label = 'Loading…'}) {
  return (
    <View style={styles.screen}>
      <Spinner size={36} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  label: {...typography.label, marginTop: spacing.md},
});
