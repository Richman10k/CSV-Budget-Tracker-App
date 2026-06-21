/**
 * CashFlowScreen.js — projected subscription outflows for the next 6–12 months.
 * Color-coded bars scale to the busiest month; tap a month to expand its
 * charges. Pure projection from active subscriptions (see cashFlow.js).
 */
import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, Pressable, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeInDown, LinearTransition} from 'react-native-reanimated';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import {projectCashFlow} from './cashFlow';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';
import {formatMonthYear} from '../utils/formatDate';

function MonthRow({bucket, max, currency, expanded, onToggle, index}) {
  const frac = max > 0 ? bucket.total / max : 0;
  // Heavier months trend warmer (amber -> red) so spikes stand out.
  const color =
    frac >= 0.85 ? colors.expense : frac >= 0.5 ? colors.warning : colors.accent;
  const ms = new Date(bucket.year, bucket.month, 1).getTime();
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}
      layout={LinearTransition.springify()}>
      <Pressable
        onPress={onToggle}
        android_ripple={{color: colors.ripple}}
        style={styles.monthRow}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthLabel}>{formatMonthYear(ms)}</Text>
          <Text style={[styles.monthTotal, {color}]}>
            {formatCurrency(bucket.total, currency)}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, {width: `${Math.max(frac * 100, 2)}%`, backgroundColor: color}]} />
        </View>
        {expanded && bucket.items.length > 0 ? (
          <View style={styles.items}>
            {bucket.items.map((it, i) => (
              <View key={`${it.name}-${i}`} style={styles.item}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={styles.itemAmount}>
                  {formatCurrency(it.amount, currency)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function CashFlowScreen({navigation}) {
  const {subscriptions, settings} = useAppData();
  const currency = settings.currency || 'USD';
  const [months, setMonths] = useState(6);
  const [expanded, setExpanded] = useState(null);

  const buckets = useMemo(
    () => projectCashFlow(subscriptions, {months}),
    [subscriptions, months],
  );
  const max = useMemo(() => buckets.reduce((m, b) => Math.max(m, b.total), 0), [buckets]);
  const grandTotal = useMemo(() => buckets.reduce((s, b) => s + b.total, 0), [buckets]);
  const hasData = max > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Cash flow"
        subtitle="Projected subscription outflows"
        leftIcon="arrow-left"
        onLeftPress={() => navigation.goBack()}
      />
      {!hasData ? (
        <EmptyState
          icon="calendar-blank"
          title="No upcoming charges"
          message="Add or detect active subscriptions to see projected outflows here."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card elevated style={styles.summary}>
            <Text style={styles.summaryLabel}>
              Projected over {months} months
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(grandTotal, currency)}
            </Text>
            <View style={styles.rangeRow}>
              {[6, 12].map(n => {
                const active = months === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setMonths(n)}
                    android_ripple={{color: colors.ripple}}
                    style={[styles.rangeChip, active && styles.rangeChipActive]}>
                    <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                      {n} months
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {buckets.map((b, i) => (
            <MonthRow
              key={`${b.year}-${b.month}`}
              bucket={b}
              max={max}
              currency={currency}
              index={i}
              expanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  summary: {marginBottom: spacing.md},
  summaryLabel: {...typography.caption},
  summaryValue: {...typography.display, fontSize: 30, marginTop: spacing.xs},
  rangeRow: {flexDirection: 'row', marginTop: spacing.md},
  rangeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  rangeChipActive: {backgroundColor: colors.accent, borderColor: colors.accent},
  rangeText: {...typography.label, color: colors.textSecondary},
  rangeTextActive: {color: colors.black},
  monthRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthLabel: {...typography.body, fontWeight: '700'},
  monthTotal: {...typography.body, fontWeight: '800'},
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {height: 8, borderRadius: radius.pill},
  items: {marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm},
  item: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
  itemName: {...typography.label, color: colors.textSecondary, flex: 1, marginRight: spacing.md},
  itemAmount: {...typography.label, color: colors.text},
  bottomPad: {height: spacing.xxl},
});
