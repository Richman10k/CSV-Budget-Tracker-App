/**
 * HomeTab.js — the dashboard: month spending overview, subscription summary,
 * top spending categories, and recent transactions. A parallax indigo "aurora"
 * glows behind the hero and drifts as you scroll; sections stagger in on mount;
 * a frosted FAB exposes quick actions. Shows an onboarding empty state until the
 * first CSV is imported.
 */
import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, Alert, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, {Defs, RadialGradient, Stop, Rect} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import TransactionRow from '../components/TransactionRow';
import MonthSwitcher from '../components/MonthSwitcher';
import FAB from '../components/FAB';
import SpendingOverview from '../budget/SpendingOverview';
import {CategoryBars} from '../budget/CategoryChart';
import InsightsSection from '../insights/InsightsSection';
import {generateInsights, monthlySpendingSeries} from '../insights/generateInsights';
import {enterFromBottom} from '../animations/SmoothAnimations';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

const {width: SCREEN_W} = Dimensions.get('window');
const HERO_HEIGHT = 360;

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

/** Indigo aurora glow behind the dashboard hero, parallaxing on scroll. */
function HeroBackdrop({scrollY}) {
  const style = useAnimatedStyle(() => {
    if (!scrollY) {
      return {};
    }
    const translateY = interpolate(
      scrollY.value,
      [0, 300],
      [0, -100],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 240],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {transform: [{translateY}], opacity};
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.hero, style]}>
      <Svg width={SCREEN_W} height={HERO_HEIGHT}>
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="20%" r="70%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.40" />
            <Stop offset="0.5" stopColor={colors.accent} stopOpacity="0.10" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height={HERO_HEIGHT} fill="url(#heroGlow)" />
      </Svg>
    </Animated.View>
  );
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
    subscriptions,
    monthData,
    selectedMonth,
    setSelectedMonth,
    subscriptionSummary,
    budgets,
    settings,
    resetActivity,
    dataMonthRange,
  } = useAppData();

  const handleImport = useCsvImport();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  const currency = settings.currency || 'USD';
  const totalBudget = budgets.TOTAL || 0;
  const topCategories = monthData.categories.slice(0, 5);
  // Recent list is scoped to the selected month so switching months never shows
  // transactions that belong to a different month.
  const recent = monthData.transactions.slice(0, 6);

  const insights = useMemo(
    () =>
      generateInsights(transactions, subscriptions, {
        selectedMonth,
        budgets,
        fmt: n => formatCurrency(n, currency),
      }),
    [transactions, subscriptions, selectedMonth, budgets, currency],
  );
  const series = useMemo(() => monthlySpendingSeries(transactions, 6), [transactions]);

  const fabActions = [
    {icon: 'file-upload', label: 'Import CSV', onPress: handleImport},
    {
      icon: 'chart-donut',
      label: 'Budget',
      color: colors.info,
      onPress: () => navigation.navigate('Budget'),
    },
    {
      icon: 'autorenew',
      label: 'Subscriptions',
      color: colors.income,
      onPress: () => navigation.navigate('Subscriptions'),
    },
  ];

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeroBackdrop />
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
      <HeroBackdrop scrollY={scrollY} />
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
        <Animated.View entering={enterFromBottom(0)}>
          <MonthSwitcher
            year={selectedMonth.year}
            month={selectedMonth.month}
            onChange={setSelectedMonth}
            min={dataMonthRange?.min}
            max={dataMonthRange?.max}
          />
        </Animated.View>

        <View style={styles.gap} />
        <Animated.View entering={enterFromBottom(1)}>
          <SpendingOverview
            spending={monthData.spending}
            income={monthData.income}
            budgetLimit={totalBudget}
            currency={currency}
          />
        </Animated.View>

        <View style={styles.gap} />
        <Animated.View entering={enterFromBottom(2)}>
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
        </Animated.View>

        {insights.length > 0 ? (
          <Animated.View entering={enterFromBottom(3)}>
            <View style={styles.gap} />
            <SectionHeader title="Insights" />
            <InsightsSection insights={insights} series={series} currency={currency} />
          </Animated.View>
        ) : null}

        {topCategories.length > 0 ? (
          <Animated.View entering={enterFromBottom(4)}>
            <View style={styles.gap} />
            <SectionHeader title="Top categories" />
            <Card>
              <CategoryBars data={topCategories} currency={currency} />
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={enterFromBottom(5)}>
          <View style={styles.gap} />
          <SectionHeader
            title="Recent transactions"
            actionLabel="See all"
            onAction={() => navigation.navigate('Transactions')}
          />
          <Card padded={recent.length === 0}>
            {recent.length === 0 ? (
              <Text style={styles.emptyMonth}>No transactions this month.</Text>
            ) : (
              recent.map((t, i) => (
                <View key={t.id}>
                  <TransactionRow transaction={t} currency={currency} />
                  {i < recent.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))
            )}
          </Card>
        </Animated.View>
        <View style={styles.bottomPad} />
      </Animated.ScrollView>

      <FAB actions={fabActions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  hero: {position: 'absolute', top: -40, left: 0, right: 0, alignItems: 'center'},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl},
  gap: {height: spacing.lg},
  bottomPad: {height: spacing.xxxl},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {...typography.heading},
  action: {...typography.label, color: colors.accent},
  emptyMonth: {...typography.label, color: colors.textSecondary, textAlign: 'center'},
  subRow: {flexDirection: 'row', alignItems: 'center'},
  subIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
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
  divider: {height: 1, backgroundColor: colors.border, marginLeft: 83},
});
