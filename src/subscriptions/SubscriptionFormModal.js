/**
 * SubscriptionFormModal.js — bottom-sheet form used for both adding a new
 * subscription and editing an existing one.
 */
import React, {useState, useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {SlideInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../components/Button';
import {colors, spacing, typography, radius} from '../theme/theme';

const INTERVALS = ['weekly', 'monthly', 'yearly'];
const STATUSES = ['active', 'trial', 'cancelled'];

function Field({label, children}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented({options, value, onChange}) {
  return (
    <View style={styles.segmented}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            android_ripple={{color: colors.ripple}}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SubscriptionFormModal({
  visible,
  initial,
  title = 'Add subscription',
  onSubmit,
  onClose,
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('monthly');
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('Subscriptions');
  const [notes, setNotes] = useState('');

  // Seed the form only when the sheet opens (false -> true). Re-running on every
  // `initial` change would wipe the fields as the user types, because callers
  // may pass a fresh `initial` object (e.g. {status}) on each render.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.name || '');
      setAmount(initial?.amount != null ? String(initial.amount) : '');
      setInterval(initial?.interval || 'monthly');
      setStatus(initial?.status || 'active');
      setCategory(initial?.category || 'Subscriptions');
      setNotes(initial?.notes || '');
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  // A subscription can be $0 (e.g. a free trial), so allow zero — only require
  // a name and a valid, non-negative number.
  const parsedAmount = parseFloat(amount);
  const canSave =
    name.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0;

  const submit = () => {
    if (!canSave) {
      return;
    }
    onSubmit({
      name: name.trim(),
      amount: parsedAmount,
      interval,
      status,
      category: category.trim() || 'Subscriptions',
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(280)} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Field label="Name">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Netflix"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field label="Amount per charge">
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field label="Billing interval">
              <Segmented options={INTERVALS} value={interval} onChange={setInterval} />
            </Field>
            <Field label="Status">
              <Segmented options={STATUSES} value={status} onChange={setStatus} />
            </Field>
            <Field label="Category">
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Subscriptions"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field label="Notes (optional)">
              <TextInput
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Anything to remember…"
                placeholderTextColor={colors.textMuted}
              />
            </Field>

            <Button
              label="Save"
              icon="content-save"
              onPress={submit}
              disabled={!canSave}
              fullWidth
              style={styles.save}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'},
  backdropTouch: {...StyleSheet.absoluteFillObject},
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {...typography.title},
  field: {marginBottom: spacing.lg},
  fieldLabel: {...typography.label, marginBottom: spacing.sm},
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  multiline: {minHeight: 72, textAlignVertical: 'top'},
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: {backgroundColor: colors.accent},
  segmentText: {...typography.label, color: colors.textSecondary},
  segmentTextActive: {color: colors.onAccent, fontWeight: '700'},
  save: {marginTop: spacing.sm, marginBottom: spacing.xl},
});
