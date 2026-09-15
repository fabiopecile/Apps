import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GlowButton } from './GlowButton';
import { useFeedback } from '@/lib/feedback';
import { useT } from '@/lib/i18n';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * The two ticks that have to happen before money changes hands.
 *
 * Everything on sale here is a digital unlock that arrives the instant the
 * payment clears, and a digital unlock only stops being returnable if the buyer
 * was asked two specific things beforehand: that performance may begin
 * immediately, and that they understand this ends their right of withdrawal.
 * Ask badly, or not at all, and the fourteen days keep running on something the
 * buyer already has and cannot give back.
 *
 * So this sits between every buy button and Stripe. Not as a formality to be
 * clicked through — the boxes start unticked, both are required, and the
 * documents are one tap away, opened at the paragraph being agreed to rather
 * than at a contents page. A confirmation nobody can read is not a
 * confirmation.
 *
 * Kept as one component used by both shops so there is a single place where
 * this can be got right or wrong, rather than two that drift.
 */
export function PurchaseConsent({
  visible,
  /** What is being bought, already translated: "Beerpong Pro", "🇦🇹 Österreich". */
  item,
  /** Already formatted for the language: "4,99 €". */
  price,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  item: string;
  price: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const feedback = useFeedback();
  const [terms, setTerms] = useState(false);
  const [waiver, setWaiver] = useState(false);

  /**
   * Both boxes clear every time the sheet opens.
   *
   * A consent remembered from the last purchase is not a consent given for this
   * one, and the point of asking is that somebody read it — which they will not
   * do twice if it is already ticked.
   */
  const close = (then: () => void) => {
    setTerms(false);
    setWaiver(false);
    then();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => close(onCancel)}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{t('consent.title')}</Text>
            <Pressable onPress={() => close(onCancel)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.what}>{t('consent.what', { item, price })}</Text>

            <Check
              checked={terms}
              label={t('consent.terms')}
              onPress={() => {
                feedback.tap();
                setTerms((on) => !on);
              }}
            />
            <Check
              checked={waiver}
              label={t('consent.waiver')}
              onPress={() => {
                feedback.tap();
                setWaiver((on) => !on);
              }}
            />

            <Text style={styles.why}>{t('consent.why')}</Text>

            <Pressable
              onPress={() => {
                feedback.tap();
                // Straight to the withdrawal notice, because that is the one
                // being agreed to. The others are one tap further.
                close(onCancel);
                router.push('/legal?doc=withdrawal');
              }}
              style={styles.readLink}
            >
              <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.readText}>{t('consent.read')}</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.actions}>
            <GlowButton
              label={t('common.cancel')}
              variant="ghost"
              size="sm"
              onPress={() => close(onCancel)}
            />
            <GlowButton
              label={t('consent.continue')}
              accent={colors.gold}
              disabled={!terms || !waiver}
              onPress={() => close(onConfirm)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Check({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.check}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.background} /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.backgroundElevated,
    paddingBottom: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.headingBlack, fontSize: 19, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  what: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.gold,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.neon, borderColor: colors.neon },
  checkLabel: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  why: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  readLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  readText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
