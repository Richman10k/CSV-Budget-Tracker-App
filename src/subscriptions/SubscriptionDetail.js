/**
 * SubscriptionDetail.js — full view of a single subscription with edit, cancel/
 * reactivate, and delete actions.
 */
import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import {LoadingScreen} from '../components/Spinner';
import SubscriptionFormModal from './SubscriptionFormModal';
import {describeFlag} from './SubscriptionDetector';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDate} from '../utils/formatDate';
import {monthlyEquivalent} from '../utils/detectRecurring';

function InfoRow({label, value, valueColor}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && {color: valueColor}]}>{value}</Text>
    </View>
  );
}

export default function SubscriptionDetail({route, navigation}) {
  const {subId} = route.params || {};
  const {
    subscriptions,
    settings,
    updateSubscription,
    setSubscriptionStatus,
    deleteSubscription,
  } = useAppData();
  const [editing, setEditing] = useState(false);
  const currency = settings.currency || 'USD';

  const sub = useMemo(
    () => subscriptions.find(s => s.id === subId),
    [subscriptions, subId],
  );

  if (!sub) {
    return <LoadingScreen label="" />;
  }

  const monthly = monthlyEquivalent(sub.amount, sub.interval);
  const isActive = sub.status === 'active';

  const confirmDelete = () => {
    Alert.alert('Delete subscription', `Remove "${sub.name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSubscription(sub.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Subscription"
        leftIcon="arrow-left"
        onLeftPress={() => navigation.goBack()}
        rightIcon="pencil"
        onRightPress={() => setEditing(true)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>
              {(sub.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{sub.name}</Text>
          <Text style={styles.amount}>
            {formatCurrency(sub.amount, currency)}{' '}
            <Text style={styles.per}>/ {sub.interval}</Text>
          </Text>
          <View style={[styles.statusPill, styles[`status_${sub.status}`]]}>
            <Text style={styles.statusText}>{sub.status.toUpperCase()}</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <InfoRow label="Monthly cost" value={formatCurrency(monthly, currency)} />
          <InfoRow label="Yearly cost" value={formatCurrency(monthly * 12, currency)} />
          {sub.nextDue ? (
            <InfoRow label="Next due" value={formatDate(sub.nextDue)} />
          ) : null}
          {sub.lastCharge ? (
            <InfoRow label="Last charge" value={formatDate(sub.lastCharge)} />
          ) : null}
          <InfoRow label="Category" value={sub.category} />
          <InfoRow
            label="Source"
            value={sub.autoDetected ? 'Auto-detected' : 'Manually added'}
          />
        </Card>

        {sub.flags && sub.flags.length > 0 ? (
          <Card style={[styles.card, styles.flagCard]}>
            <Text style={styles.flagsTitle}>
              <Icon name="alert" size={16} color={colors.warning} /> Heads up
            </Text>
            {sub.flags.map(f => (
              <Text key={f} style={styles.flagLine}>
                • {describeFlag(f)}
              </Text>
            ))}
          </Card>
        ) : null}

        {sub.notes ? (
          <Card style={styles.card}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notes}>{sub.notes}</Text>
          </Card>
        ) : null}

        <Button
          label={isActive ? 'Mark as cancelled' : 'Reactivate'}
          icon={isActive ? 'close-circle' : 'check-circle'}
          variant="secondary"
          fullWidth
          onPress={() =>
            setSubscriptionStatus(sub.id, isActive ? 'cancelled' : 'active')
          }
          style={styles.actionBtn}
        />
        <Button
          label="Delete subscription"
          icon="trash-can"
          variant="danger"
          fullWidth
          onPress={confirmDelete}
          style={styles.actionBtn}
        />
      </ScrollView>

      <SubscriptionFormModal
        visible={editing}
        title="Edit subscription"
        initial={sub}
        onClose={() => setEditing(false)}
        onSubmit={async data => {
          try {
            await updateSubscription(sub.id, data);
            setEditing(false);
          } catch (e) {
            Alert.alert('Could not save', e.message || 'Please try again.');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl},
  hero: {alignItems: 'center', marginVertical: spacing.lg},
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {fontSize: 32, fontWeight: '800', color: colors.accent},
  name: {...typography.title, marginTop: spacing.md},
  amount: {...typography.heading, color: colors.text, marginTop: spacing.xs},
  per: {...typography.label, color: colors.textSecondary},
  statusPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  status_active: {backgroundColor: colors.accentDim},
  status_cancelled: {backgroundColor: colors.surfaceMuted},
  status_trial: {backgroundColor: '#3A2E0B'},
  statusText: {...typography.caption, color: colors.text, fontWeight: '800'},
  card: {marginTop: spacing.md},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: {...typography.label},
  infoValue: {...typography.body, fontWeight: '600'},
  flagCard: {borderColor: colors.warning},
  flagsTitle: {...typography.label, color: colors.warning, marginBottom: spacing.sm},
  flagLine: {...typography.body, color: colors.textSecondary, marginTop: 2},
  notesLabel: {...typography.label, marginBottom: spacing.xs},
  notes: {...typography.body, color: colors.textSecondary, lineHeight: 22},
  actionBtn: {marginTop: spacing.md},
});
