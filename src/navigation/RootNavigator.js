/**
 * RootNavigator.js — top-level gate. Shows the LockScreen until the session is
 * unlocked, then the BudgetDashboard tabs. Any touch resets the auto-lock
 * inactivity timer, and a busy overlay covers long-running operations.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {useAppData} from '../context/AppDataContext';
import LockScreen from '../auth/LockScreen';
import BudgetDashboard from '../budget/BudgetDashboard';
import Spinner, {LoadingScreen} from '../components/Spinner';
import {colors, spacing, typography} from '../theme/theme';

function BusyOverlay({label}) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.overlayCard}>
        <Spinner size={32} />
        <Text style={styles.overlayLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function RootNavigator() {
  const {ready, unlocked, settings, unlock, resetActivity, busy} = useAppData();

  if (!ready) {
    return <LoadingScreen label="" />;
  }

  return (
    <View style={styles.root} onTouchStart={resetActivity}>
      {unlocked ? (
        <BudgetDashboard />
      ) : (
        <LockScreen
          onUnlock={unlock}
          biometricsEnabled={settings.biometricsEnabled}
        />
      )}
      {unlocked && busy ? <BusyOverlay label={busy} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderRadius: 18,
    alignItems: 'center',
  },
  overlayLabel: {...typography.label, marginTop: spacing.md},
});
