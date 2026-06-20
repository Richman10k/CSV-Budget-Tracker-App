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
import TransactionRow, {ROW_HEIGHT} from '../components/TransactionRow';
import {useCsvImport} from './HomeTab';
import {colors, spacing, typography, radius} from '../theme/theme';

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

export default function TransactionsTab() {
  const {transactions, settings, resetActivity} = useAppData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
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

  const renderItem = useCallback(
    ({item}) => <TransactionRow transaction={item} currency={currency} />,
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
  chipLabelActive: {color: colors.black},
  separator: {height: SEP_HEIGHT, backgroundColor: colors.border, marginLeft: 68},
  listContent: {paddingBottom: spacing.xxl},
  noResults: {alignItems: 'center', paddingTop: spacing.xxl},
  noResultsText: {...typography.label},
});
