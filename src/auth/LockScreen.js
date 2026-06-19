/**
 * LockScreen.js — the auth gate shown whenever the app is locked.
 *
 * Flow:
 *   - First launch (no PIN yet): prompt the user to create a PIN, then unlock.
 *   - Returning user: try biometrics automatically (if enabled + available);
 *     on failure/cancel fall back to the PIN keypad. A "Use PIN" link is always
 *     available.
 */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {getBiometricCapability, authenticate} from './BiometricAuth';
import {getPinRecord} from '../encryption/SecureStorage';
import PINLock from './PINLock';
import Button from '../components/Button';
import {LoadingScreen} from '../components/Spinner';
import {fadeIn} from '../animations/SmoothAnimations';
import {colors, spacing, typography} from '../theme/theme';

export default function LockScreen({onUnlock, biometricsEnabled = true}) {
  const [phase, setPhase] = useState('init'); // init|setPin|pin|biometric
  const [capLabel, setCapLabel] = useState('Biometrics');
  const triedBiometric = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const record = await getPinRecord();
      if (!mounted) {
        return;
      }
      if (!record) {
        setPhase('setPin');
        return;
      }
      const cap = await getBiometricCapability();
      if (!mounted) {
        return;
      }
      if (biometricsEnabled && cap.available) {
        setCapLabel(cap.label);
        setPhase('biometric');
      } else {
        setPhase('pin');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [biometricsEnabled]);

  const runBiometric = useCallback(async () => {
    const {success} = await authenticate('Unlock CSV Budget Tracker');
    if (success) {
      onUnlock();
    } else {
      setPhase('pin');
    }
  }, [onUnlock]);

  // Auto-prompt biometrics once when entering that phase.
  useEffect(() => {
    if (phase === 'biometric' && !triedBiometric.current) {
      triedBiometric.current = true;
      runBiometric();
    }
  }, [phase, runBiometric]);

  if (phase === 'init') {
    return <LoadingScreen label="" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View entering={fadeIn()} style={styles.brand}>
        <View style={styles.logo}>
          <Icon name="shield-lock" size={36} color={colors.accent} />
        </View>
        <Text style={styles.appName}>CSV Budget Tracker</Text>
        <Text style={styles.tagline}>Private. Offline. Encrypted.</Text>
      </Animated.View>

      <View style={styles.body}>
        {phase === 'setPin' ? (
          <PINLock
            mode="set"
            subtitle="Create a 4-digit PIN to secure your data."
            onSuccess={onUnlock}
          />
        ) : null}

        {phase === 'pin' ? (
          <PINLock mode="verify" onSuccess={onUnlock} />
        ) : null}

        {phase === 'biometric' ? (
          <View style={styles.bioWrap}>
            <Icon name="fingerprint" size={72} color={colors.accent} />
            <Text style={styles.bioText}>Unlock with {capLabel}</Text>
            <Button
              label={`Unlock with ${capLabel}`}
              icon="fingerprint"
              onPress={runBiometric}
              style={styles.bioBtn}
            />
            <Button
              label="Use PIN instead"
              variant="ghost"
              onPress={() => setPhase('pin')}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  brand: {alignItems: 'center', marginTop: spacing.xxl},
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {...typography.title, marginTop: spacing.md},
  tagline: {...typography.caption, marginTop: 4},
  body: {flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%'},
  bioWrap: {alignItems: 'center', width: '100%', paddingHorizontal: spacing.xl},
  bioText: {...typography.label, marginVertical: spacing.lg},
  bioBtn: {marginBottom: spacing.md, alignSelf: 'stretch'},
});
