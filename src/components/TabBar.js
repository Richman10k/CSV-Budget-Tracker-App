/**
 * TabBar.js — custom bottom navigation bar for React Navigation.
 *
 * Renders five tabs with icons + labels and a spring-animated pill that glides
 * under the focused tab (UI thread, smooth up to 120 fps).
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
import {colors, spacing, radius} from '../theme/theme';
import {getSpring} from '../animations/FrameRateManager';

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

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorX.value}],
    width: tabWidth,
  }));

  return (
    <View
      style={[styles.container, {paddingBottom: Math.max(insets.bottom, 8)}]}
      onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
      {tabWidth > 0 ? (
        <Animated.View style={[styles.indicatorWrap, indicatorStyle]}>
          <View style={styles.indicatorPill} />
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
        const tint = focused ? colors.accent : colors.textMuted;

        const onPress = () => {
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
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? {selected: true} : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || meta.label}
            onPress={onPress}
            android_ripple={{color: colors.ripple, borderless: true, radius: 32}}
            style={styles.tab}>
            <Icon name={focused ? meta.on : meta.off} size={24} color={tint} />
            <Text style={[styles.label, {color: tint}]} numberOfLines={1}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4},
  label: {fontSize: 11, fontWeight: '700', marginTop: 3},
  indicatorWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
  },
  indicatorPill: {
    width: 36,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
