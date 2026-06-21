/**
 * Header.js — screen header with an optional scroll-driven collapse.
 *
 * Pass a Reanimated `scrollY` shared value (from an Animated.ScrollView /
 * FlatList onScroll handler) and the subtitle fades + the title gently lifts as
 * the user scrolls, all on the UI thread.
 */
import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PressableScale from './PressableScale';
import {colors, spacing, typography} from '../theme/theme';

function HeaderAction({icon, onPress, color = colors.text, accent = false}) {
  if (!icon) {
    return <View style={styles.actionPlaceholder} />;
  }
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={12}
      scaleTo={0.86}
      rippleBorderless
      rippleRadius={24}
      style={[styles.action, accent && styles.actionAccent]}>
      <Icon name={icon} size={22} color={color} />
    </PressableScale>
  );
}

export default function Header({
  title,
  subtitle,
  scrollY,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
}) {
  // Default to a static value so hooks run unconditionally even without scrollY.
  const sharedScroll = scrollY;

  const titleStyle = useAnimatedStyle(() => {
    if (!sharedScroll) {
      return {};
    }
    const translateY = interpolate(
      sharedScroll.value,
      [0, 80],
      [0, -4],
      Extrapolation.CLAMP,
    );
    return {transform: [{translateY}]};
  });

  const subtitleStyle = useAnimatedStyle(() => {
    if (!sharedScroll) {
      return {};
    }
    const opacity = interpolate(
      sharedScroll.value,
      [0, 48],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      sharedScroll.value,
      [0, 48],
      [20, 0],
      Extrapolation.CLAMP,
    );
    return {opacity, height};
  });

  return (
    <View style={styles.container}>
      <HeaderAction icon={leftIcon} onPress={onLeftPress} />
      <View style={styles.center}>
        <Animated.Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Animated.Text>
        {subtitle ? (
          <Animated.Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
            {subtitle}
          </Animated.Text>
        ) : null}
      </View>
      <HeaderAction
        icon={rightIcon}
        onPress={onRightPress}
        color={colors.accent}
        accent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  center: {flex: 1, alignItems: 'flex-start', justifyContent: 'center'},
  title: {...typography.title},
  subtitle: {...typography.caption, marginTop: 2},
  action: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionAccent: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.40)',
  },
  actionPlaceholder: {width: 42, height: 42},
});
