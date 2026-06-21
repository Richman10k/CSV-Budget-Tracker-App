/**
 * MonthSwitcher.js — "< June 2026 >" pill for moving between months.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PressableScale from './PressableScale';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatMonthYear} from '../utils/formatDate';

/** Comparable index for a {year, month}. */
function idx(year, month) {
  return year * 12 + month;
}

export default function MonthSwitcher({year, month, onChange, min, max}) {
  const ms = new Date(year, month, 1).getTime();
  const current = idx(year, month);

  // Disable arrows past the edges of the available data range (when provided),
  // so you can't scroll into months the CSV has no data for.
  const canPrev = !min || current > idx(min.year, min.month);
  const canNext = !max || current < idx(max.year, max.month);

  const shift = delta => {
    if ((delta < 0 && !canPrev) || (delta > 0 && !canNext)) {
      return;
    }
    const d = new Date(year, month + delta, 1);
    onChange({year: d.getFullYear(), month: d.getMonth()});
  };

  return (
    <View style={styles.container}>
      <PressableScale
        onPress={() => shift(-1)}
        disabled={!canPrev}
        hitSlop={10}
        scaleTo={0.88}
        rippleBorderless
        rippleRadius={20}
        style={[styles.arrow, !canPrev && styles.arrowDisabled]}>
        <Icon name="chevron-left" size={24} color={colors.text} />
      </PressableScale>
      <Text style={styles.label}>{formatMonthYear(ms)}</Text>
      <PressableScale
        onPress={() => shift(1)}
        disabled={!canNext}
        hitSlop={10}
        scaleTo={0.88}
        rippleBorderless
        rippleRadius={20}
        style={[styles.arrow, !canNext && styles.arrowDisabled]}>
        <Icon name="chevron-right" size={24} color={colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {opacity: 0.25},
  label: {...typography.label, color: colors.text, flex: 1, textAlign: 'center'},
});
