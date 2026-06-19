/**
 * EmptyState.js — friendly empty/onboarding placeholder used across tabs when
 * there is no data yet (e.g. before the first CSV import).
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {fadeIn} from '../animations/SmoothAnimations';
import {colors, spacing, typography} from '../theme/theme';
import Button from './Button';

export default function EmptyState({
  icon = 'file-document-outline',
  title,
  message,
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <Animated.View entering={fadeIn()} style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={44} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {...typography.heading, textAlign: 'center'},
  message: {
    ...typography.label,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  action: {marginTop: spacing.xl},
});
