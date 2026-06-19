/**
 * SettingsTab.js — security options, PIN management, data import/export, and
 * destructive actions. Reinforces the app's privacy guarantees in the About
 * section.
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {SlideInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import PINLock from '../auth/PINLock';
import {useCsvImport} from './HomeTab';
import {colors, spacing, typography, radius} from '../theme/theme';

const AUTO_LOCK_OPTIONS = [15, 30, 60, 120];
const APP_VERSION = '1.0.0';

function SettingRow({icon, label, subtitle, right, onPress, danger}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? {color: colors.ripple} : undefined}
      style={styles.row}>
      <Icon
        name={icon}
        size={22}
        color={danger ? colors.expense : colors.accent}
        style={styles.rowIcon}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && {color: colors.expense}]}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function SectionLabel({children}) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function SettingsTab() {
  const {
    settings,
    updateSettings,
    exportData,
    clearAllData,
    rerunDetection,
    lock,
    transactions,
  } = useAppData();
  const handleImport = useCsvImport();
  const [changingPin, setChangingPin] = useState(false);

  const cycleAutoLock = () => {
    const idx = AUTO_LOCK_OPTIONS.indexOf(settings.autoLockSeconds);
    const next = AUTO_LOCK_OPTIONS[(idx + 1) % AUTO_LOCK_OPTIONS.length];
    updateSettings({autoLockSeconds: next});
  };

  const onExport = async () => {
    if (transactions.length === 0) {
      Alert.alert('Nothing to export', 'Import some transactions first.');
      return;
    }
    try {
      const path = await exportData();
      Alert.alert('Exported', `Saved to:\n${path}`);
    } catch (e) {
      Alert.alert('Export failed', e.message || 'Could not export data.');
    }
  };

  const onClear = () => {
    Alert.alert(
      'Clear all data',
      'This permanently deletes all transactions, subscriptions, and budgets on this device. Your PIN is kept. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>Security</SectionLabel>
        <Card padded={false}>
          <SettingRow
            icon="fingerprint"
            label="Biometric unlock"
            subtitle="Use fingerprint / face to unlock"
            right={
              <Switch
                value={!!settings.biometricsEnabled}
                onValueChange={v => updateSettings({biometricsEnabled: v})}
                trackColor={{true: colors.accent, false: colors.surfaceMuted}}
                thumbColor={colors.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="timer-lock"
            label="Auto-lock"
            subtitle="Lock after inactivity"
            onPress={cycleAutoLock}
            right={<Text style={styles.value}>{settings.autoLockSeconds}s</Text>}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cellphone-lock"
            label="Lock when minimized"
            subtitle="Require unlock after leaving the app"
            right={
              <Switch
                value={!!settings.lockOnBackground}
                onValueChange={v => updateSettings({lockOnBackground: v})}
                trackColor={{true: colors.accent, false: colors.surfaceMuted}}
                thumbColor={colors.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="lock-reset"
            label="Change PIN"
            onPress={() => setChangingPin(true)}
            right={<Icon name="chevron-right" size={22} color={colors.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="lock"
            label="Lock now"
            onPress={lock}
            right={<Icon name="chevron-right" size={22} color={colors.textMuted} />}
          />
        </Card>

        <SectionLabel>Data</SectionLabel>
        <Card padded={false}>
          <SettingRow
            icon="file-upload"
            label="Import CSV"
            subtitle="Add transactions from your bank"
            onPress={handleImport}
            right={<Icon name="chevron-right" size={22} color={colors.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="file-download"
            label="Export data"
            subtitle="Save a decrypted CSV to your device"
            onPress={onExport}
            right={<Icon name="chevron-right" size={22} color={colors.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="magnify-scan"
            label="Rescan subscriptions"
            subtitle="Re-detect recurring charges"
            onPress={rerunDetection}
            right={<Icon name="chevron-right" size={22} color={colors.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-can"
            label="Clear all data"
            subtitle="Delete everything on this device"
            onPress={onClear}
            danger
          />
        </Card>

        <SectionLabel>About</SectionLabel>
        <Card>
          <View style={styles.aboutRow}>
            <Icon name="shield-check" size={20} color={colors.accent} />
            <Text style={styles.aboutText}>
              100% offline. Your data is AES-256 encrypted on this device and
              never leaves it — no cloud, no accounts, no tracking.
            </Text>
          </View>
          <Text style={styles.version}>CSV Budget Tracker v{APP_VERSION}</Text>
        </Card>
        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal
        visible={changingPin}
        transparent
        animationType="fade"
        onRequestClose={() => setChangingPin(false)}>
        <View style={styles.backdrop}>
          <Animated.View entering={SlideInDown.duration(260)} style={styles.pinSheet}>
            <Pressable
              onPress={() => setChangingPin(false)}
              hitSlop={10}
              style={styles.closePin}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
            <PINLock
              mode="set"
              title="Set a new PIN"
              subtitle="Enter and confirm a new 4-digit PIN."
              onSuccess={() => {
                setChangingPin(false);
                Alert.alert('PIN updated', 'Your new PIN is now active.');
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {flexDirection: 'row', alignItems: 'center', padding: spacing.lg},
  rowIcon: {marginRight: spacing.md},
  rowText: {flex: 1},
  rowLabel: {...typography.body, fontWeight: '600'},
  rowSub: {...typography.caption, marginTop: 2},
  value: {...typography.label, color: colors.accent},
  divider: {height: 1, backgroundColor: colors.border, marginLeft: 56},
  aboutRow: {flexDirection: 'row', alignItems: 'flex-start'},
  aboutText: {
    ...typography.label,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.md,
    lineHeight: 20,
  },
  version: {...typography.caption, marginTop: spacing.md, textAlign: 'center'},
  bottomPad: {height: spacing.xxl},
  backdrop: {flex: 1, backgroundColor: colors.overlay, justifyContent: 'center'},
  pinSheet: {
    backgroundColor: colors.surfaceElevated,
    margin: spacing.lg,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  closePin: {alignSelf: 'flex-end'},
});
