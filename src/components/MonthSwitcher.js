/**
 * MonthSwitcher.js — "< June 2026 >" pill for moving between months.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PressableScale from './PressableScale';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatMonthYear} from '../utils/formatDate';

export default function MonthSwitcher({year, month, onChange}) {
  const ms = new Date(year, month, 1).getTime();

  const shift = delta => {
    const d = new Date(year, month + delta, 1);
    onChange({year: d.getFullYear(), month: d.getMonth()});
  };

  return (
    <View style={styles.container}>
      <PressableScale
        onPress={() => shift(-1)}
        hitSlop={10}
        scaleTo={0.88}
        rippleBorderless
        rippleRadius={20}
        style={styles.arrow}>
        <Icon name="chevron-left" size={24} color={colors.text} />
      </PressableScale>
      <Text style={styles.label}>{formatMonthYear(ms)}</Text>
      <PressableScale
        onPress={() => shift(1)}
        hitSlop={10}
        scaleTo={0.88}
        rippleBorderless
        rippleRadius={20}
        style={styles.arrow}>
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
  label: {...typography.label, color: colors.text, flex: 1, textAlign: 'center'},
});
