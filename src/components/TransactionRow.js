/**
 * TransactionRow.js — a single transaction line (icon, name, category/date,
 * signed amount). Memoized + fixed height so FlatList can virtualize smoothly.
 */
import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography, colorForCategory} from '../theme/theme';
import {formatRelative} from '../utils/formatDate';
import {formatSigned} from '../utils/formatCurrency';

export const ROW_HEIGHT = 68;

function TransactionRow({transaction, currency = 'USD', onPress}) {
  const isIncome = transaction.type === 'income';
  const tint = colorForCategory(transaction.category);

  return (
    <Pressable
      onPress={onPress ? () => onPress(transaction) : undefined}
      android_ripple={onPress ? {color: colors.ripple} : undefined}
      style={styles.row}>
      <View style={[styles.accentBar, {backgroundColor: tint}]} />
      <View style={[styles.iconWrap, {backgroundColor: `${tint}22`}]}>
        <Icon
          name={isIncome ? 'arrow-up' : 'arrow-down'}
          size={20}
          color={isIncome ? colors.income : colors.expense}
        />
      </View>
      <View style={styles.center}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {transaction.category} · {formatRelative(transaction.date)}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          {color: isIncome ? colors.income : colors.expense},
        ]}
        numberOfLines={1}>
        {formatSigned(transaction.amount, transaction.type, currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  accentBar: {
    width: 3,
    height: 34,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  center: {flex: 1, marginRight: spacing.md},
  name: {...typography.body, fontWeight: '600'},
  meta: {...typography.caption, marginTop: 2},
  amount: {fontSize: 16, fontWeight: '700'},
});

export default React.memo(TransactionRow);
