/**
 * BudgetTab.js — budget tracking: an animated category donut, spending vs the
 * overall monthly limit, and editable per-category budgets.
 */
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {SlideInDown, FadeIn} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import MonthSwitcher from '../components/MonthSwitcher';
import SpendingOverview from '../budget/SpendingOverview';
import BudgetRing from '../budget/BudgetRing';
import BudgetSuggestionsModal from '../budget/BudgetSuggestionsModal';
import {CategoryDonut} from '../budget/CategoryChart';
import {suggestBudgets} from '../automations/budgetSuggestions';
import {computeCarryIn} from '../automations/rollingBudget';
import {useCsvImport} from './HomeTab';
import {
  colors,
  spacing,
  typography,
  radius,
  colorForCategory,
  budgetStatus,
} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

const TOTAL_KEY = 'TOTAL';

function hasKey(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key);
}

function BudgetRow({label, spent, limit, hasLimit, color, currency, carry = 0, onEdit}) {
  const status = budgetStatus(spent, limit, hasLimit);
  const pct = Math.min(status.ratio, 1);
  const remaining = limit - spent;
  return (
    <Pressable
      onPress={onEdit}
      android_ripple={{color: colors.ripple}}
      style={styles.budgetRow}>
      <View style={styles.budgetTop}>
        <View style={styles.budgetLabelWrap}>
          {color ? <View style={[styles.dot, {backgroundColor: color}]} /> : null}
          <Text style={styles.budgetLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {hasLimit ? (
          <Text style={styles.budgetValue}>
            {formatCurrency(spent, currency)}
            <Text style={styles.budgetLimit}>
              {' '}/ {formatCurrency(limit, currency)}
            </Text>
          </Text>
        ) : (
          <View style={styles.setLimitWrap}>
            <Icon name="pencil-outline" size={14} color={colors.accent} />
            <Text style={styles.setLimit}>Set limit</Text>
          </View>
        )}
      </View>
      {hasLimit ? (
        <>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {width: `${pct * 100}%`, backgroundColor: status.color},
              ]}
            />
          </View>
          <View style={styles.budgetMeta}>
            <Text style={[styles.budgetPct, {color: status.color}]}>
              {Math.round(status.ratio * 100)}% used
            </Text>
            <Text style={[styles.budgetRemain, {color: status.color}]}>
              {status.state === 'over'
                ? `${formatCurrency(Math.abs(remaining), currency)} over`
                : `${formatCurrency(Math.max(remaining, 0), currency)} left`}
            </Text>
          </View>
          {carry > 0 ? (
            <Text style={styles.carryNote}>
              + {formatCurrency(carry, currency)} rolled over from last month
            </Text>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}

export default function BudgetTab() {
  const {
    monthData,
    budgets,
    transactions,
    selectedMonth,
    setSelectedMonth,
    dataMonthRange,
    settings,
    setBudget,
    applyBudgets,
    removeBudget,
    updateSettings,
  } = useAppData();
  const handleImport = useCsvImport();
  const currency = settings.currency || 'USD';
  const [editing, setEditing] = useState(null); // {category, label, hasLimit}
  const [draft, setDraft] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [lookback, setLookback] = useState(3);

  const categories = monthData.categories;
  const hasTotal = hasKey(budgets, TOTAL_KEY);
  const totalBudget = budgets[TOTAL_KEY] || 0;

  // Rolling budgets: unused budget from last month is added to this month.
  const rolling = !!settings.rollingBudgets;
  const carryIn = useMemo(
    () => (rolling ? computeCarryIn(transactions, budgets, selectedMonth) : {}),
    [rolling, transactions, budgets, selectedMonth],
  );
  const carryFor = key => (rolling ? carryIn[key] || 0 : 0);
  const effTotal = totalBudget + carryFor(TOTAL_KEY);

  // Spent-this-month per category (0 for budgeted categories with no spend).
  const spentByCat = useMemo(() => {
    const m = {};
    categories.forEach(c => {
      m[c.name] = c.amount;
    });
    return m;
  }, [categories]);

  // Rings for the total + every budgeted category, colored by health. Limits
  // are the effective (base + carry-in) limits when rolling is on.
  const ringItems = useMemo(() => {
    const items = [];
    if (hasTotal) {
      items.push({
        key: TOTAL_KEY,
        label: 'Total',
        spent: monthData.spending,
        limit: totalBudget + (rolling ? carryIn[TOTAL_KEY] || 0 : 0),
      });
    }
    Object.keys(budgets)
      .filter(k => k !== TOTAL_KEY)
      .sort((a, b) => (spentByCat[b] || 0) - (spentByCat[a] || 0))
      .forEach(k =>
        items.push({
          key: k,
          label: k,
          spent: spentByCat[k] || 0,
          limit: budgets[k] + (rolling ? carryIn[k] || 0 : 0),
        }),
      );
    return items.map(it => {
      const status = budgetStatus(it.spent, it.limit, true);
      return {
        ...it,
        color: status.color,
        pct: Math.round(status.ratio * 100),
        fraction: Math.min(status.ratio, 1),
      };
    });
  }, [budgets, hasTotal, totalBudget, monthData.spending, spentByCat, rolling, carryIn]);

  // Total-budget warning (animated) once usage crosses 80%.
  const totalStatus = budgetStatus(monthData.spending, effTotal, hasTotal);
  const overCount = ringItems.filter(r => r.key !== TOTAL_KEY && r.spent > r.limit).length;
  const showWarning =
    hasTotal && (totalStatus.state === 'near' || totalStatus.state === 'over');

  // Live budget suggestions from recent history (recomputed with the lookback).
  const {months: suggestMonths, suggestions} = useMemo(
    () => suggestBudgets(transactions, budgets, {lookbackMonths: lookback}),
    [transactions, budgets, lookback],
  );

  const applySuggestions = async entries => {
    await applyBudgets(entries);
    setSuggestOpen(false);
  };

  const openEditor = (category, label, current, hasLimit) => {
    setEditing({category, label, hasLimit});
    setDraft(hasLimit ? String(current) : '');
  };

  // $0 is a valid limit ("spend nothing here"); only an explicit Remove clears
  // the budget. Blank/invalid input just closes without changing anything.
  const saveEditor = async () => {
    const value = parseFloat(draft);
    if (Number.isFinite(value) && value >= 0) {
      await setBudget(editing.category, value);
    }
    setEditing(null);
  };

  const removeEditor = async () => {
    await removeBudget(editing.category);
    setEditing(null);
  };

  if (monthData.transactions.length === 0 && categories.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Budget" />
        <MonthSwitcher
          year={selectedMonth.year}
          month={selectedMonth.month}
          onChange={setSelectedMonth}
        />
        <EmptyState
          icon="chart-donut"
          title="Nothing to budget yet"
          message="Import transactions to track spending against your budget for this month."
          actionLabel="Import CSV"
          actionIcon="file-upload"
          onAction={handleImport}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Budget" subtitle="Spending vs your limits" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <MonthSwitcher
          year={selectedMonth.year}
          month={selectedMonth.month}
          onChange={setSelectedMonth}
          min={dataMonthRange?.min}
          max={dataMonthRange?.max}
        />

        {showWarning ? (
          <Animated.View
            entering={FadeIn.duration(260)}
            style={[styles.warning, {borderColor: totalStatus.color}]}>
            <Icon name="alert" size={20} color={totalStatus.color} />
            <Text style={[styles.warningText, {color: totalStatus.color}]}>
              {totalStatus.state === 'over'
                ? `Over budget by ${formatCurrency(
                    monthData.spending - effTotal,
                    currency,
                  )}`
                : `You've used ${Math.round(
                    totalStatus.ratio * 100,
                  )}% of your monthly budget`}
              {overCount > 0
                ? ` · ${overCount} categor${overCount > 1 ? 'ies' : 'y'} over`
                : ''}
            </Text>
          </Animated.View>
        ) : null}

        {categories.length > 0 ? (
          <Card elevated style={styles.donutCard}>
            <CategoryDonut
              data={categories.slice(0, 6).map(c => ({
                name: c.name,
                amount: c.amount,
                color: colorForCategory(c.name),
              }))}
              centerLabel="this month"
              centerValue={monthData.spending}
              currency={currency}
              size={190}
            />
            <View style={styles.legend}>
              {categories.slice(0, 6).map(c => (
                <View key={c.name} style={styles.legendItem}>
                  <View style={[styles.dot, {backgroundColor: colorForCategory(c.name)}]} />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <View style={styles.gap} />
        <SpendingOverview
          spending={monthData.spending}
          income={monthData.income}
          budgetLimit={effTotal}
          currency={currency}
        />

        {ringItems.length > 0 ? (
          <>
            <View style={styles.gap} />
            <Text style={styles.sectionTitle}>Budget health</Text>
            <Card>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ringsRow}>
                {ringItems.map(item => (
                  <View key={item.key} style={styles.ringItem}>
                    <BudgetRing
                      fraction={item.fraction}
                      color={item.color}
                      centerValue={`${item.pct}%`}
                      size={92}
                    />
                    <Text style={styles.ringLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={styles.ringSub} numberOfLines={1}>
                      {formatCurrency(item.spent, currency)} /{' '}
                      {formatCurrency(item.limit, currency)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Card>
          </>
        ) : null}

        <View style={styles.gap} />
        <View style={styles.budgetsHeader}>
          <Text style={styles.sectionTitle}>Budgets</Text>
          <View style={styles.budgetsActions}>
            <Pressable
              onPress={() => updateSettings({rollingBudgets: !rolling})}
              android_ripple={{color: colors.ripple, borderless: true}}
              hitSlop={8}
              style={styles.suggestBtn}>
              <Icon
                name={rolling ? 'sync' : 'sync-off'}
                size={16}
                color={rolling ? colors.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.suggestBtnText,
                  {color: rolling ? colors.accent : colors.textMuted},
                ]}>
                Rolling
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSuggestOpen(true)}
              android_ripple={{color: colors.ripple, borderless: true}}
              hitSlop={8}
              style={styles.suggestBtn}>
              <Icon name="auto-fix" size={16} color={colors.accent} />
              <Text style={styles.suggestBtnText}>Auto-budget</Text>
            </Pressable>
          </View>
        </View>
        <Card>
          <BudgetRow
            label="Total monthly budget"
            spent={monthData.spending}
            limit={effTotal}
            hasLimit={hasTotal}
            carry={carryFor(TOTAL_KEY)}
            currency={currency}
            onEdit={() =>
              openEditor(TOTAL_KEY, 'Total monthly budget', totalBudget, hasTotal)
            }
          />
          <View style={styles.divider} />
          {categories.map((c, i) => {
            const hasLimit = hasKey(budgets, c.name);
            const base = budgets[c.name] || 0;
            const carry = carryFor(c.name);
            return (
              <View key={c.name}>
                <BudgetRow
                  label={c.name}
                  spent={c.amount}
                  limit={base + carry}
                  hasLimit={hasLimit}
                  carry={carry}
                  color={colorForCategory(c.name)}
                  currency={currency}
                  onEdit={() => openEditor(c.name, c.name, base, hasLimit)}
                />
                {i < categories.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            );
          })}
        </Card>
        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal
        visible={!!editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <Animated.View entering={SlideInDown.duration(260)} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{editing?.label}</Text>
            <Text style={styles.modalSub}>
              Set a monthly limit. Enter 0 for a strict “spend nothing” target.
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <Button label="Save limit" icon="content-save" fullWidth onPress={saveEditor} />
            {editing?.hasLimit ? (
              <Button
                label="Remove limit"
                icon="trash-can-outline"
                variant="ghost"
                fullWidth
                onPress={removeEditor}
                style={styles.removeBtn}
              />
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <BudgetSuggestionsModal
        visible={suggestOpen}
        suggestions={suggestions}
        months={suggestMonths}
        currency={currency}
        lookback={lookback}
        onChangeLookback={setLookback}
        onApply={applySuggestions}
        onClose={() => setSuggestOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  gap: {height: spacing.lg},
  bottomPad: {height: spacing.xxl},
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {...typography.label, marginLeft: spacing.sm, flex: 1},
  ringsRow: {paddingVertical: spacing.xs, paddingRight: spacing.sm},
  ringItem: {alignItems: 'center', width: 108, marginRight: spacing.sm},
  ringLabel: {...typography.label, color: colors.text, marginTop: spacing.sm, maxWidth: 104},
  ringSub: {...typography.caption, marginTop: 1, maxWidth: 104},
  budgetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetsActions: {flexDirection: 'row', alignItems: 'center'},
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  suggestBtnText: {...typography.label, color: colors.accent, marginLeft: 4},
  donutCard: {alignItems: 'center', marginTop: spacing.lg},
  legend: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.lg},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 4,
  },
  legendText: {...typography.caption, color: colors.textSecondary, flexShrink: 1},
  sectionTitle: {...typography.heading, marginBottom: spacing.sm},
  budgetRow: {paddingVertical: spacing.md},
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabelWrap: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm},
  budgetLabel: {...typography.body, fontWeight: '600', flexShrink: 1},
  budgetValue: {...typography.label, color: colors.text},
  budgetLimit: {color: colors.textSecondary},
  setLimitWrap: {flexDirection: 'row', alignItems: 'center'},
  setLimit: {...typography.label, color: colors.accent, marginLeft: 4},
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {height: 8, borderRadius: radius.pill},
  budgetMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetPct: {...typography.caption, fontWeight: '700'},
  budgetRemain: {...typography.caption, fontWeight: '700'},
  carryNote: {...typography.caption, color: colors.accent, marginTop: 2},
  divider: {height: 1, backgroundColor: colors.border},
  backdrop: {flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {...typography.title},
  modalSub: {...typography.caption, marginTop: spacing.xs, marginBottom: spacing.lg},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  currencyPrefix: {fontSize: 20, fontWeight: '700', color: colors.textSecondary},
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  removeBtn: {marginTop: spacing.sm},
});
