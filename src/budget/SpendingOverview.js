/**
 * SpendingOverview.js — headline "spent this month" card with an animated
 * progress bar against the monthly budget and income/expense chips. Shared by
 * the Home and Budget tabs.
 */
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../components/Card';
import {colors, spacing, typography, radius} from '../theme/theme';
import {getDurations} from '../animations/FrameRateManager';
import {formatCurrency} from '../utils/formatCurrency';

function ProgressBar({fraction, danger}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, {duration: getDurations().slow});
  }, [p]);
  const style = useAnimatedStyle(() => ({
    width: trackWidth * Math.min(fraction, 1) * p.value,
  }));
  return (
    <View
      style={styles.track}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.fill,
          {backgroundColor: danger ? colors.expense : colors.accent},
          style,
        ]}
      />
    </View>
  );
}

function Chip({icon, label, value, color}) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={18} color={color} />
      <View style={styles.chipText}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={[styles.chipValue, {color}]}>{value}</Text>
      </View>
    </View>
  );
}

export default function SpendingOverview({
  spending = 0,
  income = 0,
  budgetLimit = 0,
  currency = 'USD',
}) {
  const hasBudget = budgetLimit > 0;
  const fraction = hasBudget ? spending / budgetLimit : 0;
  const remaining = budgetLimit - spending;
  const over = hasBudget && remaining < 0;

  return (
    <Card elevated>
      <Text style={styles.caption}>Spent this month</Text>
      <Text style={styles.amount}>{formatCurrency(spending, currency)}</Text>

      {hasBudget ? (
        <>
          <ProgressBar fraction={fraction} danger={over} />
          <View style={styles.budgetRow}>
            <Text style={styles.budgetText}>
              of {formatCurrency(budgetLimit, currency)} budget
            </Text>
            <Text style={[styles.remaining, over && {color: colors.expense}]}>
              {over
                ? `${formatCurrency(Math.abs(remaining), currency)} over`
                : `${formatCurrency(remaining, currency)} left`}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.noBudget}>Set a monthly budget in the Budget tab.</Text>
      )}

      <View style={styles.chips}>
        <Chip
          icon="arrow-up-circle"
          label="Income"
          value={formatCurrency(income, currency)}
          color={colors.income}
        />
        <Chip
          icon="arrow-down-circle"
          label="Expenses"
          value={formatCurrency(spending, currency)}
          color={colors.expense}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  caption: {...typography.caption},
  amount: {...typography.display, marginVertical: spacing.xs},
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {height: 10, borderRadius: radius.pill},
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  budgetText: {...typography.caption},
  remaining: {...typography.label, color: colors.accent},
  noBudget: {...typography.caption, marginTop: spacing.md},
  chips: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  chip: {flexDirection: 'row', alignItems: 'center', flex: 1},
  chipText: {marginLeft: spacing.sm},
  chipLabel: {...typography.caption},
  chipValue: {fontSize: 16, fontWeight: '700'},
});
