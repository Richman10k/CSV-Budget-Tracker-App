/**
 * TransactionsTab.js — full transaction history with debounced search and
 * income/expense filters. Uses a tuned FlatList (fixed row height +
 * getItemLayout) so scrolling stays smooth at high refresh rates.
 */
import React, {useState, useMemo, useCallback} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useAppData} from '../context/AppDataContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import PressableScale from '../components/PressableScale';
import FAB from '../components/FAB';
import Card from '../components/Card';
import TransactionRow, {ROW_HEIGHT} from '../components/TransactionRow';
import TransactionDetailModal from '../transactions/TransactionDetailModal';
import {useCsvImport} from './HomeTab';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

const FILTERS = [
  {key: 'all', label: 'All'},
  {key: 'expense', label: 'Expenses'},
  {key: 'income', label: 'Income'},
];

const SEP_HEIGHT = 1;

function FilterChip({label, active, onPress}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Running totals for the current filter/search. In "All" it shows expenses
 * (left, red) and income (right, green); the Expenses/Income tabs show just
 * their own total.
 */
function SummaryBar({filter, income, expense, currency}) {
  if (filter === 'expense') {
    return (
      <Card style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Total expenses</Text>
          <Text style={[styles.sumValue, {color: colors.expense}]}>
            {formatCurrency(expense, currency)}
          </Text>
        </View>
      </Card>
    );
  }
  if (filter === 'income') {
    return (
      <Card style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Total income</Text>
          <Text style={[styles.sumValue, {color: colors.income}]}>
            {formatCurrency(income, currency)}
          </Text>
        </View>
      </Card>
    );
  }
  return (
    <Card style={styles.summary}>
      <View style={styles.sumSplit}>
        <View style={styles.sumCol}>
          <Text style={styles.sumLabel}>Expenses</Text>
          <Text style={[styles.sumValue, {color: colors.expense}]}>
            {formatCurrency(expense, currency)}
          </Text>
        </View>
        <View style={styles.sumDivider} />
        <View style={[styles.sumCol, styles.sumColRight]}>
          <Text style={styles.sumLabel}>Income</Text>
          <Text style={[styles.sumValue, {color: colors.income}]}>
            {formatCurrency(income, currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function TransactionsTab({navigation}) {
  const {transactions, settings, resetActivity} = useAppData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const handleImport = useCsvImport();
  const currency = settings.currency || 'USD';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(t => {
      if (filter !== 'all' && t.type !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.merchant && t.merchant.toLowerCase().includes(q))
      );
    });
  }, [transactions, query, filter]);

  // Totals over the currently shown (filtered + searched) transactions.
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filtered.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return {income, expense};
  }, [filtered]);

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        transaction={item}
        currency={currency}
        onPress={t => setSelectedId(t.id)}
      />
    ),
    [currency],
  );

  const getItemLayout = useCallback(
    (_data, index) => ({
      length: ROW_HEIGHT,
      offset: (ROW_HEIGHT + SEP_HEIGHT) * index,
      index,
    }),
    [],
  );

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Transactions" />
        <EmptyState
          icon="format-list-bulleted"
          title="No transactions yet"
          message="Import a CSV from your bank to see your full transaction history."
          actionLabel="Import CSV"
          actionIcon="file-upload"
          onAction={handleImport}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Transactions" subtitle={`${transactions.length} total`} />
      <View style={styles.controls}>
        <SearchBar onChange={setQuery} />
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </View>
      </View>

      <SummaryBar
        filter={filter}
        income={totals.income}
        expense={totals.expense}
        currency={currency}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onScrollBeginDrag={resetActivity}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={11}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No matching transactions.</Text>
          </View>
        }
      />

      <TransactionDetailModal
        transactionId={selectedId}
        visible={selectedId != null}
        onClose={() => setSelectedId(null)}
      />

      <FAB
        actions={[
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
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  controls: {paddingHorizontal: spacing.lg, paddingBottom: spacing.sm},
  filters: {flexDirection: 'row', marginTop: spacing.md},
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {backgroundColor: colors.accent, borderColor: colors.accent},
  chipLabel: {...typography.label, color: colors.textSecondary},
  chipLabelActive: {color: colors.onAccent, fontWeight: '700'},
  summary: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sumSplit: {flexDirection: 'row', alignItems: 'center'},
  sumCol: {flex: 1},
  sumColRight: {alignItems: 'flex-end'},
  sumDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  sumLabel: {...typography.overline},
  sumValue: {fontSize: 20, fontWeight: '800', marginTop: 3},
  separator: {height: SEP_HEIGHT, backgroundColor: colors.border, marginLeft: 83},
  listContent: {paddingBottom: 110},
  noResults: {alignItems: 'center', paddingTop: spacing.xxl},
  noResultsText: {...typography.label},
});
