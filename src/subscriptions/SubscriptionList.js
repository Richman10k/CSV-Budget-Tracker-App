/**
 * SubscriptionList.js — status-tabbed list of subscriptions (Active /
 * Cancelled / Trial) with a card per subscription showing cost, next due date,
 * and any risk flags.
 */
import React, {useState, useMemo} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PressableScale from '../components/PressableScale';
import {
  colors,
  spacing,
  typography,
  radius,
  subscriptionStatusColor,
} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';
import {formatShortDate} from '../utils/formatDate';
import {monthlyEquivalent} from '../utils/detectRecurring';
import {describeFlag} from './SubscriptionDetector';

const STATUS_TABS = [
  {key: 'active', label: 'Active'},
  {key: 'cancelled', label: 'Cancelled'},
  {key: 'trial', label: 'Trial'},
];

function StatusTab({label, count, active, onPress}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label} {count > 0 ? `(${count})` : ''}
      </Text>
    </PressableScale>
  );
}

function SubscriptionCard({sub, currency, onPress}) {
  const monthly = monthlyEquivalent(sub.amount, sub.interval);
  const tint = subscriptionStatusColor(sub.status);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardRow}>
          <View style={[styles.logo, {backgroundColor: `${tint}22`}]}>
            <Text style={[styles.logoText, {color: tint}]}>
              {(sub.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.name} numberOfLines={1}>
              {sub.name}
            </Text>
            <Text style={[styles.meta, {color: tint}]}>
              {formatCurrency(monthly, currency)}/mo · {sub.interval}
            </Text>
            {sub.nextDue ? (
              <Text style={styles.due}>Next: {formatShortDate(sub.nextDue)}</Text>
            ) : null}
          </View>
          <View style={styles.amountWrap}>
            <Text style={[styles.amount, {color: tint}]}>
              {formatCurrency(sub.amount, currency)}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </View>
        </View>
        {sub.flags && sub.flags.length > 0 ? (
          <View style={styles.flags}>
            {sub.flags.map(f => (
              <View key={f} style={styles.flag}>
                <Icon name="alert-circle-outline" size={12} color={colors.warning} />
                <Text style={styles.flagText}>{describeFlag(f)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
  );
}

export default function SubscriptionList({subscriptions, currency = 'USD', onSelect}) {
  const [status, setStatus] = useState('active');

  const counts = useMemo(() => {
    const c = {active: 0, cancelled: 0, trial: 0};
    subscriptions.forEach(s => {
      if (c[s.status] != null) {
        c[s.status] += 1;
      }
    });
    return c;
  }, [subscriptions]);

  const visible = useMemo(
    () => subscriptions.filter(s => s.status === status),
    [subscriptions, status],
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {STATUS_TABS.map(t => (
          <StatusTab
            key={t.key}
            label={t.label}
            count={counts[t.key]}
            active={status === t.key}
            onPress={() => setStatus(t.key)}
          />
        ))}
      </View>
      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({item, index}) => (
          <SubscriptionCard
            sub={item}
            index={index}
            currency={currency}
            onPress={() => onSelect(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="autorenew"
            title={`No ${status} subscriptions`}
            message={
              status === 'active'
                ? 'Import a CSV and recurring charges will appear here automatically.'
                : `You have no ${status} subscriptions.`
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {backgroundColor: colors.accent, borderColor: colors.accent},
  tabLabel: {...typography.label, color: colors.textSecondary},
  tabLabelActive: {color: colors.black},
  list: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1},
  card: {marginBottom: spacing.md},
  cardRow: {flexDirection: 'row', alignItems: 'center'},
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoText: {...typography.heading, color: colors.accent},
  name: {...typography.body, fontWeight: '700'},
  meta: {...typography.caption, marginTop: 2},
  due: {...typography.caption, color: colors.textSecondary, marginTop: 1},
  amountWrap: {flexDirection: 'row', alignItems: 'center'},
  amount: {fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 2},
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  flagText: {...typography.caption, color: colors.warning, marginLeft: 4},
});
