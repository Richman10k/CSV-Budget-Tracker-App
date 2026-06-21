/**
 * AnimatedNumber.js — a number that counts to its value on the UI thread.
 *
 * Drives an (uneditable) TextInput's `text` prop via Reanimated useAnimatedProps
 * + withTiming, so the digits tick up smoothly (up to 120fps) with zero JS-thread
 * re-renders. Formatting runs inside a worklet (Intl isn't worklet-safe), so we
 * do thousands separators + optional decimals/prefix/suffix by hand.
 *
 * Use <AnimatedCurrency> for money headlines; it wires the currency symbol in.
 */
import React, {useEffect} from 'react';
import {TextInput, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import {getDurations} from '../animations/FrameRateManager';
import {currencySymbol} from '../utils/formatCurrency';
import {colors, typography} from '../theme/theme';

Animated.addWhitelistedNativeProps({text: true});
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function formatNumber(n, prefix, suffix, decimals) {
  'worklet';
  const neg = n < 0;
  const v = Math.abs(n);
  let intPart;
  let frac = '';
  if (decimals > 0) {
    const factor = Math.pow(10, decimals);
    const rounded = Math.round(v * factor);
    intPart = Math.floor(rounded / factor);
    let f = String(rounded % factor);
    while (f.length < decimals) {
      f = '0' + f;
    }
    frac = '.' + f;
  } else {
    intPart = Math.round(v);
  }
  const s = String(intPart);
  let out = '';
  let count = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    count++;
    if (count % 3 === 0 && i > 0) {
      out = ',' + out;
    }
  }
  return (neg ? '-' : '') + prefix + out + frac + suffix;
}

export default function AnimatedNumber({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  from = 0,
  duration,
  style,
  accessibilityLabel,
}) {
  const v = useSharedValue(from);
  const dur = duration ?? getDurations().slow;

  useEffect(() => {
    v.value = withTiming(value, {duration: dur});
  }, [value, v, dur]);

  const animatedProps = useAnimatedProps(() => ({
    text: formatNumber(v.value, prefix, suffix, decimals),
    // keep iOS/Android in sync; defaultValue avoids an initial empty flash
    defaultValue: formatNumber(v.value, prefix, suffix, decimals),
  }));

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      accessibilityLabel={accessibilityLabel}
      underlineColorAndroid="transparent"
      style={[styles.input, style]}
      animatedProps={animatedProps}
    />
  );
}

/** Money headline counter — counts up with the right currency symbol. */
export function AnimatedCurrency({
  value = 0,
  currency = 'USD',
  decimals = 2,
  style,
  ...rest
}) {
  return (
    <AnimatedNumber
      value={value}
      prefix={currencySymbol(currency)}
      decimals={decimals}
      style={style}
      accessibilityLabel={`${currencySymbol(currency)}${value}`}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.display,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
});
