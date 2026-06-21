/**
 * FAB.js — frosted floating action button with an expandable radial menu.
 *
 * Tapping the main button springs it open into a stack of mini frosted action
 * cards (icon + label), each entering with a staggered spring. The "+" rotates
 * to an "×" and a dim backdrop catches outside taps. All motion runs on the UI
 * thread (Reanimated). (Haptics are a no-op — the app ships with no permissions.)
 *
 * Pass `actions`: [{ icon, label, onPress, color? }]. With a single action it
 * acts as a plain floating button (no menu).
 */
import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getSpring} from '../animations/FrameRateManager';
import {enterFromBottom} from '../animations/SmoothAnimations';
import {tapHaptic} from '../utils/haptics';
import {colors, spacing, typography, radius, shadow, glowShadow} from '../theme/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActionItem({action, index, onPress}) {
  const color = action.color || colors.accent;
  return (
    <Animated.View
      entering={enterFromBottom(index)}
      exiting={FadeOut.duration(120)}
      style={styles.actionRow}>
      <View style={styles.actionLabelWrap}>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </View>
      <Pressable
        onPress={onPress}
        android_ripple={{color: colors.ripple, borderless: true, radius: 28}}
        style={[styles.actionBtn, glowShadow(color, 0.4, 14)]}>
        <Icon name={action.icon} size={22} color={color} />
      </Pressable>
    </Animated.View>
  );
}

export default function FAB({
  actions = [],
  icon = 'plus',
  color = colors.accent,
  extraBottom = 0,
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const single = actions.length === 1;

  const setOpenState = next => {
    setOpen(next);
    progress.value = withSpring(next ? 1 : 0, getSpring());
  };

  const onMainPress = () => {
    tapHaptic();
    if (single) {
      actions[0].onPress?.();
      return;
    }
    setOpenState(!open);
  };

  const runAction = fn => {
    tapHaptic();
    setOpenState(false);
    // let the menu start closing before the (possibly heavy) action fires
    setTimeout(() => fn?.(), 60);
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${progress.value * 135}deg`}, {scale: scale.value}],
  }));

  const bottom = Math.max(insets.bottom, 12) + 64 + extraBottom;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open && !single ? (
        <AnimatedPressable
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(160)}
          onPress={() => setOpenState(false)}
          style={styles.backdrop}
        />
      ) : null}

      <View style={[styles.dock, {bottom, right: spacing.lg}]} pointerEvents="box-none">
        {open && !single ? (
          <View style={styles.actions}>
            {actions.map((a, i) => (
              <ActionItem
                key={a.label || i}
                action={a}
                index={actions.length - 1 - i}
                onPress={() => runAction(a.onPress)}
              />
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={single ? actions[0]?.label : open ? 'Close menu' : 'Open menu'}
          onPress={onMainPress}
          onPressIn={() => {
            scale.value = withSpring(0.92, getSpring());
          }}
          onPressOut={() => {
            scale.value = withSpring(1, getSpring());
          }}
          android_ripple={{color: colors.ripple, borderless: true, radius: 34}}
          style={[styles.fab, {backgroundColor: color}, glowShadow(color, 0.65, 22)]}>
          <Animated.View style={iconStyle}>
            <Icon name={icon} size={28} color={colors.onAccent} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,7,12,0.55)',
  },
  dock: {position: 'absolute', alignItems: 'flex-end'},
  actions: {alignItems: 'flex-end', marginBottom: spacing.md},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionLabelWrap: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderFrost,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.md,
    ...shadow.card,
  },
  actionLabel: {...typography.label, color: colors.text},
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderFrost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
});
