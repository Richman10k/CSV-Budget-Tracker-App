/**
 * PINLock.js — numeric PIN entry used as the biometric fallback and for
 * setting/changing the PIN in Settings.
 *
 * Modes:
 *   - 'set'    : enter a new PIN, then confirm it, then persist a PBKDF2 hash.
 *   - 'verify' : check an entered PIN against the stored hash (with lockout).
 *
 * The PIN is never stored in plaintext; only {salt, hash, iterations} is kept
 * (see Crypto.hashPin / verifyPin + SecureStorage).
 */
import React, {useState, useCallback, useEffect} from 'react';
import {View, Text, Pressable, StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {hashPin, verifyPin} from '../encryption/Crypto';
import {storePinRecord, getPinRecord} from '../encryption/SecureStorage';
import {colors, spacing, typography} from '../theme/theme';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PINLock({mode = 'verify', onSuccess, title, subtitle}) {
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState(null); // for 'set' confirm stage
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const shake = useSharedValue(0);
  const {width, height} = useWindowDimensions();
  const compact = width > height; // landscape — shrink the keypad to fit

  const isConfirmStage = mode === 'set' && firstPin !== null;
  const heading =
    title ||
    (mode === 'set'
      ? isConfirmStage
        ? 'Confirm your PIN'
        : 'Create a PIN'
      : 'Enter your PIN');

  const triggerShake = useCallback(() => {
    shake.value = withSequence(
      withTiming(-10, {duration: 50}),
      withTiming(10, {duration: 50}),
      withTiming(-6, {duration: 50}),
      withTiming(0, {duration: 50}),
    );
  }, [shake]);

  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shake.value}],
  }));

  const handleComplete = useCallback(
    async pin => {
      if (mode === 'set') {
        if (!isConfirmStage) {
          setFirstPin(pin);
          setEntry('');
          return;
        }
        // confirm stage
        if (pin !== firstPin) {
          setError('PINs do not match. Try again.');
          setFirstPin(null);
          setEntry('');
          triggerShake();
          return;
        }
        const record = hashPin(pin);
        await storePinRecord(record);
        onSuccess && onSuccess();
        return;
      }

      // verify mode
      const stored = await getPinRecord();
      if (verifyPin(pin, stored)) {
        setAttempts(0);
        onSuccess && onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setEntry('');
        triggerShake();
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setError('Too many attempts. Locked for 30s.');
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - next} attempts left.`);
        }
      }
    },
    [mode, isConfirmStage, firstPin, attempts, onSuccess, triggerShake],
  );

  // Clear the lockout when the cooldown elapses.
  useEffect(() => {
    if (!lockedUntil) {
      return undefined;
    }
    const remaining = lockedUntil - Date.now();
    const t = setTimeout(() => {
      setLockedUntil(0);
      setAttempts(0);
      setError('');
    }, Math.max(remaining, 0));
    return () => clearTimeout(t);
  }, [lockedUntil]);

  const locked = lockedUntil > Date.now();

  const press = useCallback(
    key => {
      if (locked) {
        return;
      }
      setError('');
      if (key === 'del') {
        setEntry(prev => prev.slice(0, -1));
        return;
      }
      setEntry(prev => {
        if (prev.length >= PIN_LENGTH) {
          return prev;
        }
        const next = prev + key;
        if (next.length === PIN_LENGTH) {
          // Defer so the last dot renders before verification work.
          setTimeout(() => handleComplete(next), 60);
        }
        return next;
      });
    },
    [locked, handleComplete],
  );

  return (
    <View style={styles.container}>
      <Icon name="lock" size={40} color={colors.accent} />
      <Text style={styles.title}>{heading}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <Animated.View style={[styles.dots, dotsStyle]}>
        {Array.from({length: PIN_LENGTH}).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < entry.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      <Text style={styles.error}>{error || ' '}</Text>

      <View style={styles.keypad}>
        {KEYS.map((k, idx) => {
          if (k === '') {
            return <View key={idx} style={[styles.key, compact && styles.keyCompact]} />;
          }
          return (
            <Pressable
              key={idx}
              onPress={() => press(k)}
              disabled={locked}
              android_ripple={{color: colors.ripple, borderless: true, radius: 40}}
              style={[styles.key, compact && styles.keyCompact]}>
              {k === 'del' ? (
                <Icon name="backspace-outline" size={26} color={colors.text} />
              ) : (
                <Text style={styles.keyText}>{k}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', width: '100%'},
  title: {...typography.heading, marginTop: spacing.md},
  subtitle: {...typography.label, marginTop: spacing.xs, textAlign: 'center'},
  dots: {flexDirection: 'row', marginTop: spacing.xl, marginBottom: spacing.sm},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginHorizontal: spacing.sm,
  },
  dotFilled: {backgroundColor: colors.accent, borderColor: colors.accent},
  error: {...typography.caption, color: colors.expense, height: 18},
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  key: {
    width: 100,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCompact: {height: 54},
  keyText: {fontSize: 30, fontWeight: '600', color: colors.text},
});
