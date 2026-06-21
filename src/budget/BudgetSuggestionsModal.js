/**
 * BudgetSuggestionsModal.js — bottom sheet that proposes monthly budgets from
 * recent spending. Each row can be toggled on/off; "Apply" writes the selected
 * limits in one batch. Suggestions are computed by automations/budgetSuggestions
 * and passed in by the Budget tab.
 */
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../components/Button';
import {useSheetReveal} from '../animations/SmoothAnimations';
import {colors, spacing, typography, radius, colorForCategory} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

export default function BudgetSuggestionsModal({
  visible,
  suggestions = [],
  months = 0,
  currency = 'USD',
  lookback = 3,
  onChangeLookback,
  onApply,
  onClose,
}) {
  // Track which categories are selected (default: all on each open).
  const [selected, setSelected] = useState({});
  const wasVisible = useRef(false);
  const {sheetStyle, backdropStyle} = useSheetReveal(visible);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      const initial = {};
      suggestions.forEach(s => {
        initial[s.category] = true;
      });
      setSelected(initial);
    }
    wasVisible.current = visible;
  }, [visible, suggestions]);

  const selectedCount = useMemo(
    () => suggestions.filter(s => selected[s.category]).length,
    [suggestions, selected],
  );
  const allOn = selectedCount === suggestions.length && suggestions.length > 0;

  const toggle = category =>
    setSelected(prev => ({...prev, [category]: !prev[category]}));

  const toggleAll = () => {
    const next = {};
    suggestions.forEach(s => {
      next[s.category] = !allOn;
    });
    setSelected(next);
  };

  const apply = () => {
    const entries = suggestions
      .filter(s => selected[s.category])
      .map(s => [s.category, s.suggested]);
    onApply(entries);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          pointerEvents="none"
          style={[styles.scrim, backdropStyle]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
              <Text style={styles.title}>Suggested budgets</Text>
              <Text style={styles.subtitle}>
                {months > 0
                  ? `Based on your last ${months} month${months > 1 ? 's' : ''} of spending`
                  : 'Import transactions to get suggestions'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Lookback selector */}
          <View style={styles.lookbackRow}>
            {[3, 6].map(n => {
              const active = lookback === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => onChangeLookback && onChangeLookback(n)}
                  android_ripple={{color: colors.ripple}}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    Last {n} mo
                  </Text>
                </Pressable>
              );
            })}
            {suggestions.length > 0 ? (
              <Pressable onPress={toggleAll} style={styles.selectAll} hitSlop={8}>
                <Text style={styles.selectAllText}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {suggestions.length === 0 ? (
              <Text style={styles.empty}>
                No spending history to base suggestions on yet.
              </Text>
            ) : (
              suggestions.map(s => {
                const on = !!selected[s.category];
                return (
                  <Pressable
                    key={s.category}
                    onPress={() => toggle(s.category)}
                    android_ripple={{color: colors.ripple}}
                    style={styles.row}>
                    <View
                      style={[
                        styles.dot,
                        {backgroundColor: colorForCategory(s.category)},
                      ]}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {s.category}
                      </Text>
                      <Text style={styles.rowMeta}>
                        avg {formatCurrency(s.avgMonthly, currency)}/mo
                        {s.hasLimit
                          ? ` · now ${formatCurrency(s.current, currency)}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.suggested}>
                      {formatCurrency(s.suggested, currency)}
                    </Text>
                    <Switch
                      value={on}
                      onValueChange={() => toggle(s.category)}
                      trackColor={{true: colors.accent, false: colors.surfaceMuted}}
                      thumbColor={colors.white}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Button
            label={
              selectedCount > 0
                ? `Apply ${selectedCount} budget${selectedCount > 1 ? 's' : ''}`
                : 'Select budgets to apply'
            }
            icon="check-all"
            fullWidth
            disabled={selectedCount === 0}
            onPress={apply}
            style={styles.apply}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  scrim: {...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay},
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    alignSelf: 'center',
    marginVertical: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md},
  title: {...typography.title},
  subtitle: {...typography.caption, marginTop: 2},
  lookbackRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm},
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {backgroundColor: colors.accent, borderColor: colors.accent},
  chipText: {...typography.caption, color: colors.textSecondary, fontWeight: '700'},
  chipTextActive: {color: colors.onAccent},
  selectAll: {marginLeft: 'auto'},
  selectAllText: {...typography.label, color: colors.accent},
  list: {marginTop: spacing.xs},
  empty: {...typography.label, color: colors.textSecondary, paddingVertical: spacing.xl},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md},
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: spacing.md},
  rowText: {flex: 1, marginRight: spacing.sm},
  rowName: {...typography.body, fontWeight: '600'},
  rowMeta: {...typography.caption, marginTop: 1},
  suggested: {...typography.body, fontWeight: '800', color: colors.text, marginRight: spacing.md},
  apply: {marginTop: spacing.md},
});
