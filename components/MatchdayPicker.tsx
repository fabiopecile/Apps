import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Matchday } from '@/lib/database.types';

interface MatchdayPickerProps {
  /** All rounds of the selected league, sorted by deadline. */
  matchdays: Matchday[];
  selectedId: string | null;
  /** The round that is current right now — always reachable in one tap. */
  currentId: string | null;
  onSelect: (id: string) => void;
}

export function MatchdayPicker({ matchdays, selectedId, currentId, onSelect }: MatchdayPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (matchdays.length === 0) return null;

  const index = matchdays.findIndex((m) => m.id === selectedId);
  const selected = index >= 0 ? matchdays[index] : null;
  const previous = index > 0 ? matchdays[index - 1] : null;
  const next = index >= 0 && index < matchdays.length - 1 ? matchdays[index + 1] : null;
  const isCurrent = !!currentId && selectedId === currentId;

  const label = selected ? t('tipps.matchday', { number: selected.number }) : t('tipps.matchdayFallback');

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.arrow, !previous && styles.arrowDisabled]}
        disabled={!previous}
        onPress={() => previous && onSelect(previous.id)}
        hitSlop={6}
      >
        <Ionicons name="chevron-back" size={18} color={previous ? colors.white : colors.textFaint} />
      </Pressable>

      <Pressable style={styles.current} onPress={() => setOpen(true)}>
        <Text style={styles.currentLabel}>{label}</Text>
        {isCurrent ? <Text style={styles.currentBadge}>{t('tipps.currentBadge')}</Text> : null}
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={[styles.arrow, !next && styles.arrowDisabled]}
        disabled={!next}
        onPress={() => next && onSelect(next.id)}
        hitSlop={6}
      >
        <Ionicons name="chevron-forward" size={18} color={next ? colors.white : colors.textFaint} />
      </Pressable>

      {/* Stepping a few rounds away should never mean tapping back one by one. */}
      {!isCurrent && currentId ? (
        <Pressable style={styles.todayButton} onPress={() => onSelect(currentId)}>
          <Ionicons name="time-outline" size={13} color={colors.blue} />
          <Text style={styles.todayText}>{t('tipps.backToCurrent')}</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('tipps.chooseRound')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
              {matchdays.map((matchday) => {
                const active = matchday.id === selectedId;
                const isNow = matchday.id === currentId;
                return (
                  <Pressable
                    key={matchday.id}
                    style={[styles.chip, isNow && styles.chipNow, active && styles.chipActive]}
                    onPress={() => {
                      onSelect(matchday.id);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{matchday.number}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.legend}>
              <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
              <Text style={styles.legendText}>{t('tipps.legendSelected')}</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.blue, marginLeft: spacing.md }]} />
              <Text style={styles.legendText}>{t('tipps.legendCurrent')}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.4 },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentLabel: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  currentBadge: {
    color: colors.blue,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  todayButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  todayText: { color: colors.blue, fontWeight: '700', fontSize: fontSizes.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    width: 52,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipNow: { borderColor: colors.blue },
  chipActive: { backgroundColor: colors.redDark, borderColor: colors.red },
  chipText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  chipTextActive: { color: colors.white },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: fontSizes.xs },
});
