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

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import MonthSwitcher from '../components/MonthSwitcher';
import SpendingOverview from '../budget/SpendingOverview';
import {CategoryDonut} from '../budget/CategoryChart';
import {useCsvImport} from './HomeTab';
import {colors, spacing, typography, radius, colorForCategory} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

const TOTAL_KEY = 'TOTAL';

function BudgetRow({label, spent, limit, color, currency, onEdit}) {
  const hasLimit = limit > 0;
  const pct = hasLimit ? Math.min(spent / limit, 1) : 0;
  const over = hasLimit && spent > limit;
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
        <Text style={styles.budgetValue}>
          {formatCurrency(spent, currency)}
          {hasLimit ? (
            <Text style={styles.budgetLimit}> / {formatCurrency(limit, currency)}</Text>
          ) : (
            <Text style={styles.setLimit}>  Set limit</Text>
          )}
        </Text>
      </View>
      {hasLimit ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct * 100}%`,
                backgroundColor: over ? colors.expense : colors.accent,
              },
            ]}
          />
        </View>
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
  const totalBudget = budgets[TOTAL_KEY] || 0;

  const openEditor = (category, label, current) => {
    setEditing({category, label});
    setDraft(current ? String(current) : '');
  };

  const saveEditor = async () => {
    const value = parseFloat(draft);
    if (value > 0) {
      await setBudget(editing.category, value);
    } else {
      await removeBudget(editing.category);
    }
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
            currency={currency}
            onEdit={() => openEditor(TOTAL_KEY, 'Total monthly budget', totalBudget)}
          />
          <View style={styles.divider} />
          {categories.map((c, i) => (
            <View key={c.name}>
              <BudgetRow
                label={c.name}
                spent={c.amount}
                limit={budgets[c.name] || 0}
                color={colorForCategory(c.name)}
                currency={currency}
                onEdit={() => openEditor(c.name, c.name, budgets[c.name] || 0)}
              />
              {i < categories.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
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
            <Text style={styles.modalSub}>Set a monthly limit (0 to remove).</Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Button label="Save limit" icon="content-save" fullWidth onPress={saveEditor} />
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
  setLimit: {color: colors.accent},
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {height: 8, borderRadius: radius.pill},
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
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
});
