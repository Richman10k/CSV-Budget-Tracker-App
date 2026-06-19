/**
 * HomeTab.js — the dashboard: month spending overview, subscription summary,
 * top spending categories, and recent transactions. Shows an onboarding empty
 * state until the first CSV is imported.
 */
import React, {useCallback} from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import TransactionRow from '../components/TransactionRow';
import MonthSwitcher from '../components/MonthSwitcher';
import SpendingOverview from '../budget/SpendingOverview';
import {CategoryBars} from '../budget/CategoryChart';
import {fadeIn} from '../animations/SmoothAnimations';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

export function useCsvImport() {
  const {importCsv} = useAppData();
  return useCallback(async () => {
    try {
      const result = await importCsv();
      if (result.cancelled) {
        return;
      }
      const errorNote =
        result.errors && result.errors.length
          ? `\n${result.errors.length} row(s) were skipped (invalid data).`
          : '';
      Alert.alert(
        'Import complete',
        `${result.inserted} added, ${result.skipped} duplicate(s) skipped.${errorNote}`,
      );
    } catch (e) {
      Alert.alert('Import failed', e.message || 'Could not import the file.');
    }
  }, [importCsv]);
}

function SectionHeader({title, actionLabel, onAction}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Text style={styles.action} onPress={onAction}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

export default function HomeTab({navigation}) {
  const {
    transactions,
    monthData,
    selectedMonth,
    setSelectedMonth,
    subscriptionSummary,
    budgets,
    settings,
    resetActivity,
  } = useAppData();

  const handleImport = useCsvImport();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  const currency = settings.currency || 'USD';
  const totalBudget = budgets.TOTAL || 0;
  const topCategories = monthData.categories.slice(0, 5);
  const recent = transactions.slice(0, 6);

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="CSV Budget Tracker" subtitle="Your private money dashboard" />
        <EmptyState
          icon="upload"
          title="Import your transactions"
          message="Export a CSV from your bank, then import it here. Everything stays encrypted on this device."
          actionLabel="Import CSV"
          actionIcon="file-upload"
          onAction={handleImport}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Dashboard"
        subtitle="Your spending at a glance"
        scrollY={scrollY}
        rightIcon="file-upload"
        onRightPress={handleImport}
      />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={resetActivity}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <MonthSwitcher
          year={selectedMonth.year}
          month={selectedMonth.month}
          onChange={setSelectedMonth}
        />

        <View style={styles.gap} />
        <SpendingOverview
          spending={monthData.spending}
          income={monthData.income}
          budgetLimit={totalBudget}
          currency={currency}
        />

        <View style={styles.gap} />
        <Card onPress={() => navigation.navigate('Subscriptions')}>
          <View style={styles.subRow}>
            <View style={styles.subIcon}>
              <Icon name="autorenew" size={24} color={colors.accent} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.subTitle}>
                {subscriptionSummary.activeCount} active subscriptions
              </Text>
              <Text style={styles.subMeta}>
                {formatCurrency(subscriptionSummary.monthlyTotal, currency)}/mo ·{' '}
                {formatCurrency(subscriptionSummary.yearlyTotal, currency)}/yr
              </Text>
            </View>
            {subscriptionSummary.flaggedCount > 0 ? (
              <View style={styles.flagBadge}>
                <Icon name="alert" size={14} color={colors.black} />
                <Text style={styles.flagText}>{subscriptionSummary.flaggedCount}</Text>
              </View>
            ) : (
              <Icon name="chevron-right" size={22} color={colors.textMuted} />
            )}
          </View>
        </Card>

        {topCategories.length > 0 ? (
          <Animated.View entering={fadeIn(80)}>
            <View style={styles.gap} />
            <SectionHeader title="Top categories" />
            <Card>
              <CategoryBars data={topCategories} currency={currency} />
            </Card>
          </Animated.View>
        ) : null}

        <View style={styles.gap} />
        <SectionHeader
          title="Recent transactions"
          actionLabel="See all"
          onAction={() => navigation.navigate('Transactions')}
        />
        <Card padded={false}>
          {recent.map((t, i) => (
            <View key={t.id}>
              <TransactionRow transaction={t} currency={currency} />
              {i < recent.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </Card>
        <View style={styles.bottomPad} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  gap: {height: spacing.lg},
  bottomPad: {height: spacing.xxl},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {...typography.heading},
  action: {...typography.label, color: colors.accent},
  subRow: {flexDirection: 'row', alignItems: 'center'},
  subIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  subTitle: {...typography.body, fontWeight: '700'},
  subMeta: {...typography.caption, marginTop: 2},
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flagText: {color: colors.black, fontWeight: '800', marginLeft: 2, fontSize: 12},
  divider: {height: 1, backgroundColor: colors.border, marginLeft: 68},
});
