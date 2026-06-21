/**
 * TabBar.js — custom frosted, pill-style bottom navigation for React Navigation.
 *
 * A floating glass bar with a glowing indigo pill that springs under the focused
 * tab, focused-icon scale-up, and a subtle haptic tick on tap. All motion runs
 * on the UI thread (Reanimated) so it stays smooth up to 120fps.
 */
import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing, radius, glowShadow} from '../theme/theme';
import {getSpring} from '../animations/FrameRateManager';
import {tapHaptic} from '../utils/haptics';

const ROW_HEIGHT = 56;

// Route name -> icon (focused / unfocused) + short label.
const TAB_META = {
  Home: {on: 'home-variant', off: 'home-variant-outline', label: 'Home'},
  Subscriptions: {on: 'autorenew', off: 'autorenew', label: 'Subs'},
  Transactions: {
    on: 'swap-horizontal-bold',
    off: 'swap-horizontal',
    label: 'Activity',
  },
  Budget: {on: 'chart-donut', off: 'chart-donut', label: 'Budget'},
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? {selected: true} : {}}
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      android_ripple={{color: colors.ripple, borderless: true, radius: 36}}
      style={styles.tab}>
      <Animated.View style={iconStyle}>
        <Icon name={focused ? meta.on : meta.off} size={24} color={tint} />
      </Animated.View>
      <Text style={[styles.label, {color: tint}]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabBar({state, descriptors, navigation}) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const tabCount = state.routes.length;
  const tabWidth = barWidth ? barWidth / tabCount : 0;

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      indicatorX.value = withSpring(state.index * tabWidth, getSpring());
    }
  }, [state.index, tabWidth, indicatorX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorX.value}],
    width: tabWidth,
  }));

  return (
    <View style={[styles.container, {paddingBottom: Math.max(insets.bottom, 10)}]}>
      <View
        style={styles.row}
        onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 ? (
          <Animated.View style={[styles.pillWrap, pillStyle]} pointerEvents="none">
            <View style={[styles.pill, glowShadow(colors.accent, 0.45, 14)]} />
          </Animated.View>
        ) : null}

        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const focused = state.index === index;
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
    width: '58%',
    height: ROW_HEIGHT - 12,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.45)',
  },
});
