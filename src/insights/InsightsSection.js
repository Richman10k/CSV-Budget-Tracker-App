/**
 * InsightsSection.js — dashboard card listing rule-based insight rows with
 * staggered fade-ins and a 6-month spending sparkline. Reads nothing itself;
 * the parent passes computed insights + series (see generateInsights).
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../components/Card';
import Sparkline from './Sparkline';
import {colors, spacing, typography} from '../theme/theme';
import {formatCurrency} from '../utils/formatCurrency';

const TONE_COLOR = {
  positive: colors.income,
  warning: colors.warning,
  negative: colors.expense,
  neutral: colors.info,
};

function InsightRow({insight}) {
  const color = TONE_COLOR[insight.tone] || colors.info;
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, {backgroundColor: `${color}22`}]}>
        <Icon name={insight.icon} size={18} color={color} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.detail}>{insight.detail}</Text>
      </View>
    </View>
  );
}

export default function InsightsSection({insights = [], series = [], currency = 'USD'}) {
  if (insights.length === 0) {
    return null;
  }
  const trendUp =
    series.length >= 2 && series[series.length - 1] > series[series.length - 2];
  return (
    <Card>
      {series.length >= 2 ? (
        <View style={styles.trend}>
          <View style={{flex: 1}}>
            <Text style={styles.trendLabel}>Spending trend</Text>
            <Text style={styles.trendValue}>
              {formatCurrency(series[series.length - 1], currency)} this month
            </Text>
          </View>
          <Sparkline
            data={series}
            color={trendUp ? colors.expense : colors.income}
          />
        </View>
      ) : null}
      {insights.map((insight, i) => (
        <InsightRow key={insight.id} insight={insight} index={i} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendLabel: {...typography.caption},
  trendValue: {...typography.heading, fontSize: 16, marginTop: 2},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: {flex: 1},
  title: {...typography.body, fontWeight: '700'},
  detail: {...typography.caption, marginTop: 1},
});
