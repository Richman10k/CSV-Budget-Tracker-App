/**
 * SubscriptionsTab.js — subscriptions screen: a cost summary, a rescan action,
 * the status-tabbed list, and a manual "add subscription" flow.
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import SubscriptionList from '../subscriptions/SubscriptionList';
import SubscriptionFormModal from '../subscriptions/SubscriptionFormModal';
import {useCsvImport} from './HomeTab';
import {colors, spacing, typography} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

function Stat({label, value, color}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color && {color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SubscriptionsTab({navigation}) {
  const {
    subscriptions,
    transactions,
    subscriptionSummary,
    settings,
    addSubscription,
    rerunDetection,
    busy,
  } = useAppData();
  const [adding, setAdding] = useState(false);
  const handleImport = useCsvImport();
  const currency = settings.currency || 'USD';

  if (transactions.length === 0 && subscriptions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header
          title="Subscriptions"
          rightIcon="plus"
          onRightPress={() => setAdding(true)}
        />
        <EmptyState
          icon="autorenew"
          title="No subscriptions found"
          message="Import a CSV and we'll automatically detect recurring charges — or add one manually."
          actionLabel="Import CSV"
          actionIcon="file-upload"
          onAction={handleImport}
        />
        <SubscriptionFormModal
          visible={adding}
          onClose={() => setAdding(false)}
          onSubmit={async data => {
            await addSubscription(data);
            setAdding(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Subscriptions"
        subtitle={`${subscriptionSummary.activeCount} active`}
        rightIcon="plus"
        onRightPress={() => setAdding(true)}
      />

      <Card elevated style={styles.summary}>
        <View style={styles.statsRow}>
          <Stat
            label="Monthly"
            value={formatCurrency(subscriptionSummary.monthlyTotal, currency)}
            color={colors.accent}
          />
          <Stat
            label="Yearly"
            value={formatCurrency(subscriptionSummary.yearlyTotal, currency)}
          />
          <Stat label="Due soon" value={String(subscriptionSummary.dueSoon)} />
        </View>
        <Pressable
          onPress={rerunDetection}
          android_ripple={{color: colors.ripple}}
          style={styles.rescan}>
          <Icon
            name={busy ? 'loading' : 'magnify-scan'}
            size={18}
            color={colors.accent}
          />
          <Text style={styles.rescanText}>
            {busy ? 'Scanning…' : 'Rescan transactions'}
          </Text>
        </Pressable>
      </Card>

      <SubscriptionList
        subscriptions={subscriptions}
        currency={currency}
        onSelect={sub => navigation.navigate('SubscriptionDetail', {subId: sub.id})}
      />

      <SubscriptionFormModal
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={async data => {
          await addSubscription(data);
          setAdding(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  summary: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
  statsRow: {flexDirection: 'row', justifyContent: 'space-between'},
  stat: {alignItems: 'center', flex: 1},
  statValue: {fontSize: 18, fontWeight: '800', color: colors.text},
  statLabel: {...typography.caption, marginTop: 2},
  rescan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rescanText: {...typography.label, color: colors.accent, marginLeft: spacing.sm},
});
