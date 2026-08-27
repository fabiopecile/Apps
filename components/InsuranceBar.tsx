import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import type { Matchday, TipInsurance } from '@/lib/database.types';

interface InsuranceBarProps {
  matchday: Matchday | null;
  insurance: TipInsurance | null;
  cost: number;
  /** Earned coins only - bought coins cannot pay for this. */
  available: number;
  buying: boolean;
  onBuy: () => Promise<{ error: string | null }>;
}

export function InsuranceBar({
  matchday,
  insurance,
  cost,
  available,
  buying,
  onBuy,
}: InsuranceBarProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!matchday) return null;

  const deadlinePassed = new Date(matchday.deadline).getTime() <= Date.now();

  // Settled: say what it did, including when it did nothing - a policy that
  // silently disappears feels like the money went missing.
  if (insurance?.settled_at) {
    const paid = insurance.points_awarded ?? 0;
    return (
      <View style={[styles.bar, paid > 0 ? styles.barPaid : styles.barIdle]}>
        <Ionicons
          name={paid > 0 ? 'shield-checkmark' : 'shield-outline'}
          size={16}
          color={paid > 0 ? colors.success : colors.textMuted}
        />
        <Text style={[styles.barText, paid > 0 && { color: colors.success }]}>
          {paid > 0
            ? `Versicherung hat gegriffen: +${paid} ${paid === 1 ? 'Punkt' : 'Punkte'}`
            : 'Versicherung lief aus – du warst über der Grenze'}
        </Text>
      </View>
    );
  }

  // Bought, matchday still running.
  if (insurance) {
    return (
      <View style={[styles.bar, styles.barActive]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.gold} />
        <Text style={[styles.barText, { color: colors.gold }]}>
          Spieltag versichert · mindestens {insurance.points_per_tip} Punkt pro getipptem Spiel
        </Text>
      </View>
    );
  }

  // Nothing to offer once the round is locked.
  if (deadlinePassed) return null;

  const canAfford = available >= cost;

  const handleBuy = async () => {
    setError(null);
    const result = await onBuy();
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <Pressable style={[styles.bar, styles.barOffer]} onPress={() => setOpen(true)}>
        <Ionicons name="shield-outline" size={16} color={colors.gold} />
        <Text style={[styles.barText, { color: colors.text }]}>Spieltag versichern</Text>
        <View style={styles.priceTag}>
          <Ionicons name="logo-bitcoin" size={11} color={colors.gold} />
          <Text style={styles.priceText}>{cost}</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.shieldCircle}>
                <Ionicons name="shield-checkmark" size={26} color={colors.gold} />
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.sheetTitle}>Tipp-Versicherung</Text>
            <Text style={styles.sheetSubtitle}>Spieltag {matchday.number}</Text>

            <Text style={styles.body}>
              Läuft der Spieltag schlecht, bekommst du{' '}
              <Text style={styles.bodyStrong}>mindestens 1 Punkt für jedes Spiel, das du getippt hast</Text>.
              Holst du mehr, passiert nichts – die Versicherung greift nur nach unten.
            </Text>

            <View style={styles.example}>
              <Text style={styles.exampleLabel}>BEISPIEL</Text>
              <Text style={styles.exampleText}>
                9 Spiele getippt, nur 4 Punkte geholt → aufgefüllt auf 9. Macht +5 Punkte.
              </Text>
            </View>

            <View style={styles.noticeRow}>
              <Ionicons name="lock-closed" size={13} color={colors.blue} />
              <Text style={styles.notice}>
                Nur mit <Text style={styles.bodyStrong}>verdienten</Text> Coins bezahlbar. Gekaufte Coins
                zählen hier nicht – Punkte gibt es nicht für Geld.
              </Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Deine verdienten Coins</Text>
              <Text style={[styles.balanceValue, !canAfford && { color: colors.danger }]}>
                {available} / {cost}
              </Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={buying ? 'Wird abgeschlossen...' : `Für ${cost} Coins versichern`}
              variant="red"
              disabled={!canAfford || buying}
              onPress={handleBuy}
            />

            {!canAfford ? (
              <Text style={styles.hint}>
                Verdiene Coins mit richtigen Tipps (10 pro Treffer) und am Glücksrad.
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  barOffer: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  barActive: { backgroundColor: colors.goldDark, borderColor: colors.gold },
  barPaid: { backgroundColor: colors.surface, borderColor: colors.success },
  barIdle: { backgroundColor: colors.surface, borderColor: colors.border },
  barText: { flex: 1, color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: '600' },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.goldDark,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  priceText: { color: colors.gold, fontSize: fontSizes.xs, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.goldDark,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', letterSpacing: -0.6 },
  sheetSubtitle: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: -spacing.sm },
  body: { color: colors.text, fontSize: fontSizes.md, lineHeight: 22 },
  bodyStrong: { color: colors.white, fontWeight: '800' },
  example: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  exampleLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  exampleText: { color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 19 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notice: { flex: 1, color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 17 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  balanceLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  balanceValue: { color: colors.gold, fontSize: fontSizes.lg, fontWeight: '800' },
  error: { color: colors.danger, fontSize: fontSizes.sm },
  hint: { color: colors.textFaint, fontSize: fontSizes.xs, textAlign: 'center' },
});
