/**
 * TransactionDetailModal.js — bottom sheet for a single transaction with an
 * encrypted photo/PDF receipt: attach, view (decrypted to a temp file), or
 * remove. Reads the live transaction from context by id so it reflects updates
 * after attaching/removing.
 */
import React, {useState, useEffect, useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {SlideInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppData} from '../context/AppDataContext';
import Button from '../components/Button';
import {colors, spacing, typography, radius} from '../theme/theme';
import {formatSigned} from '../utils/formatCurrency';
import {formatDate} from '../utils/formatDate';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'bmp'];

export default function TransactionDetailModal({transactionId, visible, onClose}) {
  const {transactions, settings, attachReceipt, removeReceipt, resolveReceipt} =
    useAppData();
  const currency = settings.currency || 'USD';
  const tx = useMemo(
    () => transactions.find(t => t.id === transactionId),
    [transactions, transactionId],
  );

  const [uri, setUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const receipt = tx && tx.receipt;
  const isImage = receipt && IMAGE_EXTS.includes((receipt.ext || '').toLowerCase());

  // Decrypt the receipt to a temp file whenever it changes.
  useEffect(() => {
    let active = true;
    if (visible && receipt) {
      setLoading(true);
      resolveReceipt(receipt)
        .then(u => active && setUri(u))
        .catch(() => active && setUri(null))
        .finally(() => active && setLoading(false));
    } else {
      setUri(null);
    }
    return () => {
      active = false;
    };
  }, [visible, receipt, resolveReceipt]);

  const onAttach = async () => {
    setBusy(true);
    try {
      await attachReceipt(tx.id);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await removeReceipt(tx.id, receipt);
      setUri(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(260)} style={styles.sheet}>
          <View style={styles.handle} />
          {!tx ? (
            <Text style={styles.muted}>Transaction not found.</Text>
          ) : (
            <>
              <View style={styles.headerRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.name} numberOfLines={2}>
                    {tx.description}
                  </Text>
                  <Text style={styles.meta}>
                    {tx.category} · {formatDate(tx.date)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    {color: tx.type === 'income' ? colors.income : colors.expense},
                  ]}>
                  {formatSigned(tx.amount, tx.type, currency)}
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Receipt</Text>
              <View style={styles.receiptBox}>
                {loading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : receipt ? (
                  isImage && uri ? (
                    <Pressable onPress={() => setFullScreen(true)} style={styles.thumbWrap}>
                      <Image source={{uri}} style={styles.thumb} resizeMode="cover" />
                      <Text style={styles.tapHint}>Tap to view full size</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.fileRow}>
                      <Icon name="file-document" size={28} color={colors.accent} />
                      <Text style={styles.fileText}>
                        {receipt.ext ? receipt.ext.toUpperCase() : 'FILE'} receipt attached
                      </Text>
                    </View>
                  )
                ) : (
                  <Text style={styles.muted}>No receipt attached.</Text>
                )}
              </View>

              {receipt ? (
                <Button
                  label="Remove receipt"
                  icon="trash-can-outline"
                  variant="ghost"
                  fullWidth
                  loading={busy}
                  onPress={onRemove}
                />
              ) : (
                <Button
                  label="Attach receipt"
                  icon="camera-plus"
                  fullWidth
                  loading={busy}
                  onPress={onAttach}
                />
              )}
            </>
          )}
        </Animated.View>
      </View>

      {/* Full-size, in-app image preview (no external file:// exposure). */}
      <Modal visible={fullScreen} transparent onRequestClose={() => setFullScreen(false)}>
        <Pressable style={styles.fullBackdrop} onPress={() => setFullScreen(false)}>
          {uri ? (
            <Image source={{uri}} style={styles.fullImage} resizeMode="contain" />
          ) : null}
          <Text style={styles.fullHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  headerRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg},
  name: {...typography.title, fontSize: 18},
  meta: {...typography.caption, marginTop: 2},
  amount: {fontSize: 18, fontWeight: '800', marginLeft: spacing.md},
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  receiptBox: {
    minHeight: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  thumbWrap: {alignItems: 'center'},
  thumb: {width: '100%', height: 200, borderRadius: radius.sm, aspectRatio: undefined},
  tapHint: {...typography.caption, marginTop: spacing.sm},
  fileRow: {flexDirection: 'row', alignItems: 'center'},
  fileText: {...typography.label, color: colors.accent, marginLeft: spacing.sm},
  muted: {...typography.label, color: colors.textSecondary},
  fullBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullImage: {width: '100%', height: '80%'},
  fullHint: {...typography.caption, marginTop: spacing.lg},
});

