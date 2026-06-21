/**
 * TabBar.js — custom frosted, pill-style bottom navigation for React Navigation.
 *
 * Shows three primary destinations — Home, Activity, Settings. Budget and
 * Subscriptions are reached from the "+" FAB instead, so they're registered as
 * screens but hidden from the bar (when one of them is active, no pill shows).
 *
 * A glowing indigo pill springs under the focused tab and the focused icon
 * scales up. All motion runs on the UI thread (Reanimated). Press feedback is a
 * clean scale (no ripple). (Haptics are a no-op — the app ships with no
 * permissions; see utils/haptics.)
 */
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import PressableScale from './PressableScale';
import {colors, spacing, radius, glowShadow} from '../theme/theme';
import {getSpring} from '../animations/FrameRateManager';
import {tapHaptic} from '../utils/haptics';

const ROW_HEIGHT = 62;

// The three destinations shown in the bar, in display order.
const PRIMARY = ['Home', 'Transactions', 'Settings'];

const TAB_META = {
  Home: {on: 'home-variant', off: 'home-variant-outline', label: 'Home'},
  Transactions: {
    on: 'swap-horizontal-bold',
    off: 'swap-horizontal',
    label: 'Activity',
  },
  Settings: {on: 'cog', off: 'cog-outline', label: 'Settings'},
};

function TabItem({focused, meta, label, onPress, accessibilityLabel}) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, getSpring());
    lift.value = withSpring(focused ? 1 : 0, getSpring());
  }, [focused, scale, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}, {translateY: -2 * lift.value}],
  }));

  const tint = focused ? colors.accent : colors.textMuted;

  return (
    <PressableScale
      scaleTo={0.9}
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={styles.tab}>
      <Animated.View style={iconStyle}>
        <Icon name={focused ? meta.on : meta.off} size={24} color={tint} />
      </Animated.View>
      <Text style={[styles.label, {color: tint}]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

export default function TabBar({state, descriptors, navigation}) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  // Only the primary destinations appear in the bar.
  const visibleRoutes = PRIMARY.map(name =>
    state.routes.find(r => r.name === name),
  ).filter(Boolean);
  const tabCount = visibleRoutes.length;
  const tabWidth = barWidth ? barWidth / tabCount : 0;

  const focusedName = state.routes[state.index]?.name;
  const focusedVisibleIndex = visibleRoutes.findIndex(
    r => r.name === focusedName,
  );
  const showPill = focusedVisibleIndex >= 0;

  const indicatorX = useSharedValue(0);
  useEffect(() => {
    if (tabWidth > 0 && focusedVisibleIndex >= 0) {
      indicatorX.value = withSpring(focusedVisibleIndex * tabWidth, getSpring());
    }
  }, [focusedVisibleIndex, tabWidth, indicatorX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorX.value}],
    width: tabWidth,
  }));

  return (
    <View style={[styles.container, {paddingBottom: Math.max(insets.bottom, 10)}]}>
      <View
        style={styles.row}
        onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 && showPill ? (
          <Animated.View style={[styles.pillWrap, pillStyle]} pointerEvents="none">
            <View style={[styles.pill, glowShadow(colors.accent, 0.3, 10)]} />
          </Animated.View>
        ) : null}

        {visibleRoutes.map(route => {
          const {options} = descriptors[route.key];
          const focused = route.name === focusedName;
          const meta = TAB_META[route.name] || {
            on: 'circle',
            off: 'circle-outline',
            label: route.name,
          };

          const onPress = () => {
            tapHaptic();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              meta={meta}
              label={meta.label}
              onPress={onPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardFrostElevated,
    borderTopWidth: 1,
    borderTopColor: colors.borderFrost,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  label: {fontSize: 11, fontWeight: '700', marginTop: 4},
  pillWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    // Generous, rounded highlight that comfortably wraps the icon + label.
    width: '74%',
    height: ROW_HEIGHT - 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.40)',
  },
});
