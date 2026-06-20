/**
 * BudgetTab.js — budget tracking: an animated category donut, spending vs the
 * overall monthly limit, and editable per-category budgets.
 */
import React, {useState} from 'react';
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
import Animated, {SlideInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import MonthSwitcher from '../components/MonthSwitcher';
import SpendingOverview from '../budget/SpendingOverview';
import {CategoryDonut} from '../budget/CategoryChart';
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

function BudgetRow({label, spent, limit, hasLimit, color, currency, onEdit}) {
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
        </>
      ) : null}
    </Pressable>
  );
}

export default function BudgetTab() {
  const {monthData, budgets, selectedMonth, setSelectedMonth, settings, setBudget, removeBudget} =
    useAppData();
  const handleImport = useCsvImport();
  const currency = settings.currency || 'USD';
  const [editing, setEditing] = useState(null); // {category, label, current}
  const [draft, setDraft] = useState('');

  const categories = monthData.categories;
  const hasTotal = hasKey(budgets, TOTAL_KEY);
  const totalBudget = budgets[TOTAL_KEY] || 0;

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
        />

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
          budgetLimit={totalBudget}
          currency={currency}
        />

        <View style={styles.gap} />
        <Text style={styles.sectionTitle}>Budgets</Text>
        <Card>
          <BudgetRow
            label="Total monthly budget"
            spent={monthData.spending}
            limit={totalBudget}
            hasLimit={hasTotal}
            currency={currency}
            onEdit={() =>
              openEditor(TOTAL_KEY, 'Total monthly budget', totalBudget, hasTotal)
            }
          />
          <View style={styles.divider} />
          {categories.map((c, i) => {
            const hasLimit = hasKey(budgets, c.name);
            const limit = budgets[c.name] || 0;
            return (
              <View key={c.name}>
                <BudgetRow
                  label={c.name}
                  spent={c.amount}
                  limit={limit}
                  hasLimit={hasLimit}
                  color={colorForCategory(c.name)}
                  currency={currency}
                  onEdit={() => openEditor(c.name, c.name, limit, hasLimit)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm},
  gap: {height: spacing.lg},
  bottomPad: {height: spacing.xxl},
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
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
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
